from typing import List, Dict, Any, Optional
import asyncio
from app.rag.embeddings import get_embeddings, get_pinecone_index
from app.rag.fallback_kb import search_fallback_kb
from app.utils.logger import get_logger

logger = get_logger("app.rag.retriever")


class MedicalRetriever:
    """Manages retrieving context from medical knowledge bases stored in Pinecone."""
    
    def __init__(self):
        try:
            self.index = get_pinecone_index()
            self.embeddings = get_embeddings()
            logger.info("MedicalRetriever successfully connected to Pinecone and Embeddings model.")
        except Exception as e:
            logger.warning("Failed to construct MedicalRetriever elements. Offline fallback will be active.", error=str(e))
            self.index = None
            self.embeddings = None

    async def retrieve(
        self,
        query: str,
        top_k: int = 5,
        namespace: Optional[str] = None,
        include_citations: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Embeds the query, searches Pinecone (both pubmed-medical-kb and medical-kb namespaces if namespace is None),
        applies threshold filtering, and boosts pubmed results by a 1.05 multiplier.
        Falls back to local keyword guidelines database if Pinecone is unconfigured/offline.
        """
        # Note: Optional import inside method to avoid circular reference issues if any
        from typing import Optional
        
        if not self.index or not self.embeddings:
            logger.warning("Pinecone vector index unconfigured. Executing offline RAG fallback search...", query=query)
            fallback_results = search_fallback_kb(query)[:top_k]
            results = []
            for res in fallback_results:
                results.append({
                    "text": res["text"],
                    "score": res["score"],
                    "source_type": "manual",
                    "pmid": None,
                    "title": None,
                    "authors": None,
                    "journal": None,
                    "year": None,
                    "citation": res["source"],
                    "pubmed_url": None,
                    "topic": None,
                    "priority": None
                })
            return results
            
        logger.info("Executing medical RAG query search...", query=query, top_k=top_k, namespace=namespace)
        
        try:
            # Generate search query vector embedding synchronously to avoid executor thread deadlocks on Windows
            query_vector = self.embeddings.embed_query(query)
            
            # Helper to query a single namespace synchronously in executor
            def query_namespace(ns: str):
                try:
                    return self.index.query(
                        vector=query_vector,
                        top_k=top_k,
                        namespace=ns,
                        include_metadata=True
                    )
                except Exception as ex:
                    logger.error(f"Error querying namespace {ns}", error=str(ex))
                    return {"matches": []}

            # Decide namespaces to query
            if namespace is not None:
                namespaces_to_query = [namespace]
            else:
                namespaces_to_query = ["pubmed-medical-kb", "medical-kb"]

            # Query namespaces in parallel
            import asyncio
            loop = asyncio.get_running_loop()
            tasks = [loop.run_in_executor(None, query_namespace, ns) for ns in namespaces_to_query]
            responses = await asyncio.gather(*tasks)
            
            merged_matches = []
            for ns, resp in zip(namespaces_to_query, responses):
                for match in resp.get("matches", []):
                    # Attach the namespace name to match metadata for source_type resolution
                    match["metadata"]["_namespace"] = ns
                    merged_matches.append(match)

            results = []
            seen_texts = set()
            seen_pmids = set()

            for match in merged_matches:
                score = match.get("score", 0.0)
                metadata = match.get("metadata", {})
                ns = metadata.get("_namespace", "")
                
                # Extract text block
                text_content = metadata.get("text", "") or metadata.get("preview", "")
                if not text_content:
                    continue
                
                # Check for duplicates by text block
                if text_content in seen_texts:
                    continue
                seen_texts.add(text_content)
                
                # Deduplicate by PMID
                pmid = metadata.get("pmid")
                if pmid:
                    if pmid in seen_pmids:
                        continue
                    seen_pmids.add(pmid)
                
                # Boost pubmed results by 1.05 multiplier
                is_pubmed = (ns == "pubmed-medical-kb" or metadata.get("source") == "pubmed")
                final_score = score
                if is_pubmed:
                    final_score = score * 1.05

                # Filter out results with pre-boosted score below 0.72
                if score < 0.72:
                    logger.debug("Discarded match below similarity threshold of 0.72", score=score, doc_id=match.get("id"))
                    continue
                
                results.append({
                    "text": text_content,
                    "score": final_score,
                    "source_type": "pubmed" if is_pubmed else "manual",
                    "pmid": pmid,
                    "title": metadata.get("title"),
                    "authors": metadata.get("authors"),
                    "journal": metadata.get("journal"),
                    "year": metadata.get("year"),
                    "citation": metadata.get("citation") or metadata.get("source") or "Clinical Guideline Reference",
                    "pubmed_url": metadata.get("pubmed_url"),
                    "topic": metadata.get("topic"),
                    "priority": metadata.get("priority")
                })
            
            # Sort by boosted score descending
            results.sort(key=lambda x: x["score"], reverse=True)
            logger.info("RAG search query returned merged matches count", count=len(results))
            return results[:top_k]
            
        except Exception as e:
            logger.error("Error executing Pinecone index query search", error=str(e))
            return []


def format_context(results: List[Dict[str, Any]]) -> str:
    """Formats retrieved chunks into a clean context string grouping PubMed vs Manual refs."""
    if not results:
        return "No relevant clinical context was found in reference databases."
        
    pubmed_results = [r for r in results if r["source_type"] == "pubmed"]
    manual_results = [r for r in results if r["source_type"] == "manual"]
    
    context_lines = ["=== EVIDENCE-BASED CONTEXT ===\n"]
    
    if pubmed_results:
        context_lines.append("PEER-REVIEWED LITERATURE:")
        for idx, r in enumerate(pubmed_results, 1):
            citation_str = r.get("citation") or f"{r['authors'] or 'Unknown Authors'}. {r['journal'] or 'Unknown Journal'}. {r['year'] or 'Unknown Year'}. PMID: {r['pmid']}"
            context_lines.append(
                f"[{idx}] {r['title']}\n"
                f"    Authors: {r['authors']}\n"
                f"    Journal: {r['journal']} ({r['year']})\n"
                f"    PMID: {r['pmid']}\n"
                f"    Relevance Score: {r['score']:.2f}\n\n"
                f"    Content: {r['text'][:400]}...\n\n"
                f"    Citation: {citation_str}\n"
                f"    URL: {r['pubmed_url']}\n"
                f"    ---"
            )
            
    if manual_results:
        if pubmed_results:
            context_lines.append("\nCLINICAL REFERENCE DATA:")
        else:
            context_lines.append("CLINICAL REFERENCE DATA:")
        for r in manual_results:
            citation_str = r.get("citation") or "Clinical Guideline Reference"
            context_lines.append(
                f"    Source: {citation_str}\n"
                f"    Content: {r['text'][:300]}\n"
                f"    ---"
            )
            
    context_lines.append("\n=== END EVIDENCE CONTEXT ===")
    context_lines.append(
        f"\nSources: {len(pubmed_results)} peer-reviewed articles, "
        f"{len(manual_results)} clinical refs"
    )
    
    return "\n".join(context_lines)


def get_citations_list(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extracts only PubMed sources and formats them into serialized citation mappings."""
    citations = []
    pubmed_results = [r for r in results if r["source_type"] == "pubmed"]
    
    for idx, r in enumerate(pubmed_results, 1):
        citations.append({
            "citation_number": idx,
            "citation": r.get("citation") or f"{r['authors'] or 'Unknown Authors'}. {r['journal'] or 'Unknown Journal'}. {r['year'] or 'Unknown Year'}. PMID: {r['pmid']}",
            "pmid": r["pmid"],
            "url": r["pubmed_url"],
            "relevance": "high" if r["score"] >= 0.85 else "medium"
        })
    return citations
