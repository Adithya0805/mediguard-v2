from typing import List, Dict, Any
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

    def retrieve(self, query: str, top_k: int = 5, namespace: str = "medical-kb") -> List[Dict[str, Any]]:
        """
        Embeds the query, searches Pinecone, and filters matches with score >= 0.75.
        Falls back to local keyword guidelines database if Pinecone is unconfigured/offline.
        """
        if not self.index or not self.embeddings:
            logger.warning("Pinecone vector index unconfigured. Executing offline RAG fallback search...", query=query)
            return search_fallback_kb(query)[:top_k]
            
        logger.info("Executing medical RAG query search...", query=query, top_k=top_k)
        
        try:
            # Generate search query vector embedding
            query_vector = self.embeddings.embed_query(query)
            
            # Query Pinecone index namespace
            response = self.index.query(
                vector=query_vector,
                top_k=top_k,
                namespace=namespace,
                include_metadata=True
            )
            
            results = []
            matches = response.get("matches", [])
            logger.info("Retrieved vectors count from Pinecone index", count=len(matches))
            
            for match in matches:
                score = match.get("score", 0.0)
                metadata = match.get("metadata", {})
                
                # Filter out results with score below 0.75
                if score < 0.75:
                    logger.debug("Discarded match below similarity threshold of 0.75", score=score, doc_id=match.get("id"))
                    continue
                    
                results.append({
                    "text": metadata.get("text", ""),
                    "source": metadata.get("source", "unknown"),
                    "score": score
                })
                
            logger.info("RAG search query returned filtered matches count", count=len(results))
            return results
            
        except Exception as e:
            logger.error("Error executing Pinecone index query search", error=str(e))
            return []


def format_context(results: List[Dict[str, Any]]) -> str:
    """Formats retrieved chunks into a clean context string with source citations."""
    if not results:
        return "No relevant clinical context was found in reference databases."
        
    formatted_chunks = []
    for idx, res in enumerate(results, 1):
        citation = f"[Source {idx}]: {res['source']} (Similarity Score: {res['score']:.4f})"
        snippet = f"{citation}\n{res['text']}"
        formatted_chunks.append(snippet)
        
    return "\n\n---\n\n".join(formatted_chunks)
