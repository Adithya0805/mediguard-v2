import os
import sys

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.rag.fallback_kb import FALLBACK_KNOWLEDGE_BASE
from app.rag.embeddings import get_pinecone_index, get_embeddings
from app.utils.logger import get_logger

logger = get_logger("scripts.seed_pinecone")

def seed_database():
    """Seeds the cloud Pinecone index namespace with curated clinical references."""
    logger.info("Starting clinical references Pinecone seeding workflow...")
    
    try:
        # 1. Connect to Pinecone and Embeddings client
        index = get_pinecone_index()
        embeddings = get_embeddings()
        
        logger.info("Generating embeddings and upserting data chunks...")
        
        for idx, entry in enumerate(FALLBACK_KNOWLEDGE_BASE):
            text_chunk = entry["text"]
            source = entry["source"]
            keywords_list = entry["keywords"]
            
            logger.info("Embedding chunk", index=idx, source=source)
            
            # Generate e5 embedding vector
            vector = embeddings.embed_query(text_chunk)
            
            # Upsert payload
            payload = {
                "id": f"ref-chunk-{idx}",
                "values": vector,
                "metadata": {
                    "text": text_chunk,
                    "source": source,
                    "keywords": ", ".join(keywords_list)
                }
            }
            
            # Execute upsert to Pinecone
            index.upsert(
                vectors=[payload],
                namespace="medical-kb"
            )
            
        logger.info("Pinecone clinical references index seeding COMPLETED successfully!")
        
    except Exception as e:
        logger.error(
            "Pinecone seeding transaction failed. Confirm PINECONE_API_KEY and PINECONE_INDEX_NAME are configured in .env",
            error=str(e)
        )

if __name__ == "__main__":
    seed_database()
