import time
from typing import List
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.rag.embeddings import get_embeddings, get_pinecone_index
from app.utils.logger import get_logger

logger = get_logger("app.rag.ingestion")


def load_documents(file_paths: List[str]) -> List[Document]:
    """Loads text or PDF documents using appropriate LangChain loaders."""
    documents = []
    for path in file_paths:
        try:
            logger.info("Loading document", path=path)
            if path.endswith(".pdf"):
                loader = PyPDFLoader(path)
                docs = loader.load()
            else:
                loader = TextLoader(path, encoding="utf-8")
                docs = loader.load()
            documents.extend(docs)
            logger.info("Successfully loaded document", path=path, chunks_loaded=len(docs))
        except Exception as e:
            logger.error("Failed to load document", path=path, error=str(e))
    return documents


def chunk_documents(documents: List[Document]) -> List[Document]:
    """Chunks documents into overlapping pieces preserving source metadata."""
    logger.info("Splitting documents into chunks...", document_count=len(documents))
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=512,
        chunk_overlap=64,
        length_function=len,
        is_separator_regex=False
    )
    chunks = splitter.split_documents(documents)
    logger.info("Split documents complete", chunk_count=len(chunks))
    return chunks


def embed_and_upsert(chunks: List[Document], namespace: str = "medical-kb") -> None:
    """Generates embeddings and upserts chunks into Pinecone in batches of 100 with retry logic."""
    index = get_pinecone_index()
    embeddings_model = get_embeddings()
    
    batch_size = 100
    total_chunks = len(chunks)
    logger.info("Starting embedding generation and Pinecone upsert...", total_chunks=total_chunks)
    
    for i in range(0, total_chunks, batch_size):
        batch = chunks[i : i + batch_size]
        vectors = []
        
        # Prepare vectors for batch upsert
        for idx, chunk in enumerate(batch):
            global_index = i + idx
            try:
                # Embed content text using get_embeddings()
                vector = embeddings_model.embed_query(chunk.page_content)
                
                # Construct unique ID using source and chunk index
                source = chunk.metadata.get("source", "unknown")
                vector_id = f"{source}#chunk_{global_index}"
                
                # Package vector entry metadata
                metadata = {
                    "text": chunk.page_content,
                    "source": source,
                    "chunk_index": global_index,
                    "preview": chunk.page_content[:200]
                }
                
                # Check for standard metadata elements from file loader
                if "page" in chunk.metadata:
                    metadata["page"] = chunk.metadata["page"]
                    
                vectors.append((vector_id, vector, metadata))
                
            except Exception as e:
                logger.error("Failed to embed chunk content", index=global_index, error=str(e))
                
        # Perform upsert with retries
        if vectors:
            retries = 3
            for attempt in range(1, retries + 1):
                try:
                    logger.info("Upserting vectors batch", start=i, end=i + len(vectors))
                    index.upsert(vectors=vectors, namespace=namespace)
                    logger.info("Successfully upserted batch", count=len(vectors))
                    break
                except Exception as e:
                    logger.warning("Upsert attempt failed, retrying...", attempt=attempt, error=str(e))
                    if attempt == retries:
                        logger.error("Max retries exceeded for vector upsert batch", start=i)
                        raise e
                    time.sleep(2 ** attempt)  # Exponential backoff
                    
    logger.info("Medical knowledge base vector ingestion pipeline execution finalized.")
