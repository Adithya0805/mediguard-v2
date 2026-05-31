from pinecone import Pinecone
from langchain_community.embeddings import HuggingFaceEmbeddings
from app.config import settings
from app.utils.logger import get_logger
from app.utils.exceptions import DatabaseConnectionException

logger = get_logger("app.rag.embeddings")

# Singleton index and model instance caching
_pinecone_index = None
_embeddings_model = None


def get_embeddings() -> HuggingFaceEmbeddings:
    """Returns a cached LangChain HuggingFaceEmbeddings instance for multilingual-e5-large."""
    global _embeddings_model
    if _embeddings_model is not None:
        return _embeddings_model
        
    try:
        logger.info("Initializing HuggingFace multilingual-e5-large embedding client...")
        _embeddings_model = HuggingFaceEmbeddings(
            model_name="intfloat/multilingual-e5-large"
        )
        logger.info("Multilingual E5 Large embeddings model initialized successfully.")
        return _embeddings_model
    except Exception as e:
        logger.error("Failed to construct HuggingFace embeddings model client", error=str(e))
        raise DatabaseConnectionException(f"Failed to initialize embeddings: {str(e)}")


def get_pinecone_index():
    """Returns a connected index instance for Pinecone operations."""
    global _pinecone_index
    if _pinecone_index is not None:
        return _pinecone_index
        
    try:
        api_key = settings.PINECONE_API_KEY
        index_name = settings.PINECONE_INDEX_NAME
        
        if not api_key or "your-pinecone" in api_key or "mock" in api_key:
            raise DatabaseConnectionException(
                "Pinecone API Key is unconfigured or uses mock placeholder values."
            )
            
        pc = Pinecone(api_key=api_key)
        _pinecone_index = pc.Index(index_name)
        logger.info("Pinecone connection to index established successfully.", index=index_name)
        return _pinecone_index
        
    except Exception as e:
        logger.error("Failed to establish Pinecone index connection", error=str(e))
        raise DatabaseConnectionException(f"Failed to connect to Pinecone: {str(e)}")
