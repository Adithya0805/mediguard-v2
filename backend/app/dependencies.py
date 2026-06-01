from typing import AsyncGenerator, Optional
from fastapi import Header, HTTPException, Request, status, Depends
from app.config import Settings, get_settings
from app.db.supabase_client import get_supabase_client
from app.rag.retriever import MedicalRetriever
from app.utils.logger import get_logger
from app.utils.exceptions import DatabaseException

logger = get_logger("app.dependencies")

# Cache instance for Retriever
_retriever_instance = None


async def get_db() -> AsyncGenerator:
    """Yields a connected Supabase client instance, managing connection lifespan logging."""
    logger.debug("Acquiring Supabase connection...")
    try:
        client = get_supabase_client()
        yield client
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to acquire Supabase DB client session", error=str(e))
        raise DatabaseException(f"Database session acquisition failed: {str(e)}")
    finally:
        logger.debug("Releasing Supabase connection session lifecycle.")


def get_retriever() -> MedicalRetriever:
    """Returns a globally cached singleton instance of the RAG MedicalRetriever."""
    global _retriever_instance
    if _retriever_instance is None:
        logger.info("Initializing application-wide cached MedicalRetriever singleton...")
        _retriever_instance = MedicalRetriever()
    return _retriever_instance


def get_settings_dep(settings: Settings = Depends(get_settings)) -> Settings:
    """Dependency injection helper returning active global configuration settings."""
    return settings


def verify_api_key(
    request: Request,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    settings: Settings = Depends(get_settings)
) -> str:
    """Validates security token credentials provided in X-API-Key header or api_key query param."""
    client_ip = request.client.host if request.client else "unknown-ip"
    
    # Support both X-API-Key header and api_key query parameter for browser actions
    api_key_val = x_api_key or request.query_params.get("api_key")
    
    if not api_key_val:
        logger.warning("Missing API key credentials in request", client_ip=client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header or api_key query parameter credentials."
        )
        
    # Securely check key match
    if api_key_val != settings.SECRET_KEY:
        logger.warning(
            "Unauthorized API key access attempt",
            client_ip=client_ip,
            attempted_key=api_key_val[:4] + "****" if len(api_key_val) > 4 else "****"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key credentials."
        )
        
    logger.debug("Successfully authenticated client request via API key.", client_ip=client_ip)
    return api_key_val


def verify_jwt_token(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    settings: Settings = Depends(get_settings)
) -> dict:
    """
    Validates signed clinician JWT credentials provided in the Authorization header or query param.
    """
    client_ip = request.client.host if request.client else "unknown-ip"
    
    token = None
    if authorization:
        if authorization.startswith("Bearer "):
            token = authorization.split(" ")[1].strip()
        else:
            logger.warning("Invalid Authorization header format", client_ip=client_ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Authorization token format. Must be Bearer <token>."
            )
    else:
        # Fallback to query parameter token (useful for browser file downloads like PDF)
        token = request.query_params.get("token")
        
    if not token:
        logger.warning("Missing Authorization credentials in request", client_ip=client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer header or token query parameter."
        )
    
    try:
        from jose import jwt
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: missing subject."
            )
        return {
            "username": username,
            "name": payload.get("name"),
            "role": payload.get("role"),
            "specialty": payload.get("specialty")
        }
    except Exception as e:
        logger.warning("JWT verification failed", client_ip=client_ip, error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired clinical session token."
        )


def verify_clinical_auth(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    settings: Settings = Depends(get_settings)
) -> dict:
    """
    Validates either the clinician JWT Bearer token/query token or the X-API-Key credential.
    Returns standard clinician/agent metadata dict.
    """
    if authorization or request.query_params.get("token"):
        return verify_jwt_token(request, authorization, settings)
    
    # API Key fallback verification
    verify_api_key(request, x_api_key, settings)
    return {
        "username": "api-integration@mediguard.ai",
        "name": "API Service Integration",
        "role": "system",
        "specialty": "Integration"
    }


