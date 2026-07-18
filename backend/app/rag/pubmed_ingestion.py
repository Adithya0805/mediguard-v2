import asyncio
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Callable
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.services.pubmed_client import pubmed_client
from app.rag.embeddings import get_embeddings, get_pinecone_index
from app.data.pubmed_search_queries import PUBMED_SEARCH_QUERIES, PRIORITY_QUERIES
from app.utils.logger import get_logger

logger = get_logger("app.rag.pubmed_ingestion")


class PubMedIngestionPipeline:
    """Manages searching, downloading, chunking, embedding and indexing PubMed literature to Pinecone."""

    def __init__(self):
        self._pinecone_index = None
        self._embeddings = None
        self.pubmed = pubmed_client
        self.namespace = "pubmed-medical-kb"
        self.batch_size = 50

    @property
    def pinecone_index(self):
        if self._pinecone_index is None:
            try:
                self._pinecone_index = get_pinecone_index()
            except Exception as e:
                logger.warning("Failed to initialize Pinecone index for PubMed ingestion pipeline.", error=str(e))
        return self._pinecone_index

    @property
    def embeddings(self):
        if self._embeddings is None:
            try:
                self._embeddings = get_embeddings()
            except Exception as e:
                logger.warning("Failed to initialize Embeddings model for PubMed ingestion pipeline.", error=str(e))
        return self._embeddings


    async def fetch_topic_articles(self, topic_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Searches and fetches articles for a given topic configuration across all queries."""
        all_articles = []
        seen_pmids = set()

        for query in topic_config["queries"]:
            try:
                logger.info("Searching PubMed for topic query", topic=topic_config["topic"], query=query)
                articles = await self.pubmed.search_and_fetch(
                    query=query,
                    max_results=topic_config["max_per_query"],
                    min_year=2018
                )
                
                for art in articles:
                    pmid = art["pmid"]
                    if pmid not in seen_pmids:
                        seen_pmids.add(pmid)
                        all_articles.append(art)
                
                # Rate limit safety delay between queries
                await asyncio.sleep(0.5)
            except Exception as e:
                logger.error("Failed fetching articles for topic query", query=query, error=str(e))

        # Filter: abstract word count >= 100 and must have content
        filtered_articles = [
            art for art in all_articles
            if art.get("word_count", 0) >= 100 and art.get("has_full_abstract", False)
        ]

        logger.info(
            "Topic articles fetch finalized",
            topic=topic_config["topic"],
            total_fetched=len(all_articles),
            after_dedup_and_filter=len(filtered_articles)
        )
        return filtered_articles

    def prepare_document(self, article: Dict[str, Any], topic_config: Dict[str, Any]) -> Document:
        """Convert parsed PubMed article to structured LangChain Document format."""
        content = f"""
TITLE: {article['title']}

AUTHORS: {article['authors']}

JOURNAL: {article['journal']}
PUBLISHED: {article['publication_date']}
PMID: {article['pmid']}
ARTICLE TYPE: {article['article_type']}

ABSTRACT:
{article['abstract']}

CITATION: {article['citation']}
SOURCE URL: {article['pubmed_url']}
        """.strip()

        metadata = {
            "pmid": article["pmid"],
            "title": article["title"][:200],
            "authors": article["authors"][:200],
            "journal": article["journal"][:100],
            "journal_abbr": article.get("journal_abbr", "")[:50],
            "year": str(article["publication_year"]),
            "article_type": article["article_type"],
            "citation": article["citation"][:300],
            "pubmed_url": article["pubmed_url"],
            "topic": topic_config["topic"],
            "category": topic_config["category"],
            "priority": topic_config["priority"],
            "source": "pubmed",
            "doi": article.get("doi", "") or "",
            "word_count": article["word_count"]
        }

        return Document(page_content=content, metadata=metadata)

    def chunk_document(self, document: Document) -> List[Document]:
        """Split long abstract documents while keeping metadata."""
        word_count = document.metadata.get("word_count", 0)

        # For long abstracts (> 400 words)
        if word_count > 400:
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=600,
                chunk_overlap=100,
                length_function=len,
                is_separator_regex=False
            )
            chunks = splitter.split_documents([document])
            
            # Enrich metadata with chunk index information
            for idx, chunk in enumerate(chunks):
                chunk.metadata["chunk_index"] = idx
            return chunks

        # For short abstracts (< 400 words)
        document.metadata["chunk_index"] = 0
        return [document]

    async def embed_and_upsert_batch(
        self,
        documents: List[Document],
        progress_callback: Optional[Callable[[int], None]] = None
    ) -> int:
        """Generates vector embeddings and indexes batches of documents into Pinecone index."""
        if not self.pinecone_index or not self.embeddings:
            logger.warning("Pinecone index or Embeddings unconfigured. Skipping batch embed and upsert.")
            return 0

        total_upserted = 0
        total_docs = len(documents)

        for i in range(0, total_docs, self.batch_size):
            batch = documents[i : i + self.batch_size]
            texts = [doc.page_content for doc in batch]
            metadatas = [doc.metadata for doc in batch]

            try:
                # Generate embeddings synchronously to avoid thread deadlocks on Windows
                vectors = self.embeddings.embed_documents(texts)

                upsert_data = []
                for vector, meta in zip(vectors, metadatas):
                    pmid = meta["pmid"]
                    chunk_idx = meta.get("chunk_index", 0)
                    vector_id = f"pubmed-{pmid}-{chunk_idx}"
                    
                    # Store exact text in metadata so retriever can access it
                    meta["text"] = texts[metadatas.index(meta)]
                    
                    upsert_data.append((vector_id, vector, meta))

                self.pinecone_index.upsert(vectors=upsert_data, namespace=self.namespace)
                total_upserted += len(batch)

                if progress_callback:
                    progress_callback(len(batch))

                # Quick sleep to prevent hitting Pinecone rate limits
                await asyncio.sleep(0.1)
                logger.info("Successfully upserted PubMed batch to Pinecone", count=len(batch), progress=f"{i+len(batch)}/{total_docs}")

            except Exception as e:
                logger.error("Failed to embed and upsert PubMed batch to Pinecone", start_index=i, error=str(e))
                raise e

        return total_upserted

    async def ingest_topic(self, topic_config: Dict[str, Any], max_results: Optional[int] = None) -> int:
        """Runs search, chunk, embed, and upsert for a single topic config."""
        config = topic_config.copy()
        if max_results is not None:
            config["max_per_query"] = max_results
            
        articles = await self.fetch_topic_articles(config)
        documents = []
        for article in articles:
            doc = self.prepare_document(article, config)
            chunks = self.chunk_document(doc)
            documents.extend(chunks)
            
        if documents:
            upserted = await self.embed_and_upsert_batch(documents)
            return upserted
        return 0

    async def run_full_ingestion(
        self,
        priority_only: bool = False,
        topics: Optional[List[str]] = None,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> Dict[str, Any]:
        """Main orchestrator executing RAG ingestion configuration."""
        if priority_only:
            configs = PRIORITY_QUERIES
        elif topics:
            configs = [q for q in PUBMED_SEARCH_QUERIES if q["topic"] in topics]
        else:
            configs = PUBMED_SEARCH_QUERIES

        stats = {
            "started_at": datetime.now(timezone.utc).isoformat(),
            "topics_processed": 0,
            "articles_fetched": 0,
            "articles_after_dedup": 0,
            "documents_after_chunking": 0,
            "vectors_upserted": 0,
            "failed_topics": [],
            "completed_at": None,
            "namespace": self.namespace
        }

        total_topics = len(configs)
        logger.info("Starting PubMed ingestion run", total_topics=total_topics, priority_only=priority_only)

        for idx, topic_config in enumerate(configs, 1):
            try:
                display_name = topic_config["display"]
                logger.info(f"Processing topic {idx}/{total_topics}: {display_name}")

                if progress_callback:
                    progress_callback("fetching", idx, total_topics)

                # 1. Fetch articles
                articles = await self.fetch_topic_articles(topic_config)
                stats["articles_fetched"] += len(articles)

                # 2. Chunk articles
                documents = []
                for article in articles:
                    doc = self.prepare_document(article, topic_config)
                    chunks = self.chunk_document(doc)
                    documents.extend(chunks)

                stats["documents_after_chunking"] += len(documents)

                if progress_callback:
                    progress_callback("indexing", idx, total_topics)

                # 3. Upsert chunks
                upserted = await self.embed_and_upsert_batch(documents)
                stats["vectors_upserted"] += upserted
                stats["topics_processed"] += 1

                logger.info(
                    f"✓ {display_name} processed successfully",
                    articles=len(articles),
                    chunks=len(documents),
                    vectors=upserted
                )

                # Delay between topics to respect NCBI servers
                await asyncio.sleep(1.0)

            except Exception as e:
                logger.error("Failed to run ingestion for topic", topic=topic_config["topic"], error=str(e))
                stats["failed_topics"].append(topic_config["topic"])

        stats["completed_at"] = datetime.now(timezone.utc).isoformat()

        print("\n" + "=" * 40)
        print("  PUBMED INGESTION COMPLETE")
        print("=" * 40)
        print(f"  Topics processed:          {stats['topics_processed']}/{total_topics}")
        print(f"  Articles fetched:          {stats['articles_fetched']}")
        print(f"  Chunks created:            {stats['documents_after_chunking']}")
        print(f"  Vectors upserted:          {stats['vectors_upserted']}")
        print(f"  Failed topics:             {len(stats['failed_topics'])}")
        print(f"  Namespace:                 {stats['namespace']}")
        print("=" * 40 + "\n")

        return stats
