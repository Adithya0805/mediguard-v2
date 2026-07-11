from contextlib import asynccontextmanager
import uuid
import structlog
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.config import settings
from app.db.supabase_client import get_supabase_client
from app.dependencies import verify_api_key
from app.middleware.rate_limiter import RateLimiterMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.utils.exceptions import register_exception_handlers
from app.utils.logger import get_logger
from app.utils.metrics import metrics

# Initialize logger for application startup
logger = get_logger("app.main")

BANNER = """
=============================================================================
 __  __          _ _  _____                       _  __      ___  
|  \\/  |        | (_)/ ____|                     | | \\ \\    / / | 
| \\  / | ___  __| |_| |  __ _   _  __ _ _ __   __| |  \\ \\  / /| | 
| |\\/| |/ _ \\/ _` | | | |_ | | | |/ _` | '_ \\ / _` |   \\ \\/ / | | 
| |  | |  __/ (_| | | |__| | |_| | (_| | | | | (_| |    \\  /  |_| 
|_|  |_|\\___|\\__,_|_|\\_____|\\__,_|\\__,_|_| |_|\\__,_|     \\/   (_) 
                                                                    
                     Clinical Orchestrator Engine v2
=============================================================================
"""


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event handler for backend startup and shutdown states."""
    # Print beautiful banner to stdout
    print(BANNER)
    
    logger.info("Starting up MediGuard V2 Application...", environment=settings.APP_ENV, port=settings.APP_PORT)
    
    # 1. Test Supabase Database connection on startup
    logger.info("Verifying Supabase connectivity...")
    try:
        sb_client = get_supabase_client()
        # Ping table check (can fail safely if mock keys are present)
        sb_client.table("audit_logs").select("id").limit(1).execute()
        logger.info("[PASS] Startup Supabase database client verified successfully!")
    except Exception as e:
        logger.warning(
            "Startup Supabase connectivity warning - Database checks will fall back to stubs.",
            error=str(e)
        )
        
    # 2. Log all registered routes at DEBUG level
    logger.debug("Registering clinical endpoint routers...")
    for route in app.routes:
        methods = getattr(route, "methods", set())
        logger.debug("Indexed Route Handler", path=route.path, name=route.name, methods=list(methods))
        
    yield
    
    logger.info("Shutting down MediGuard V2 Application... Graceful shutdown complete.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-Agent AI Clinical Decision Support System (CDSS) Backend Engine",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware configurations for dev/prod environments
origins = list(settings.ALLOWED_ORIGINS)
# Add WebSocket equivalents to allowed origins for full compatibility
ws_origins = []
for origin in origins:
    if origin.startswith("http://"):
        ws_origins.append(origin.replace("http://", "ws://"))
    elif origin.startswith("https://"):
        ws_origins.append(origin.replace("https://", "wss://"))
origins = list(set(origins + ws_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key", "X-Request-ID"],
)

# Tracing request ID middleware
@app.middleware("http")
async def add_request_id_tracing_middleware(request, call_next):
    # Retrieve request ID from incoming request headers or generate a new one
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    
    # Store request_id in request state for downstream handlers to access
    request.state.request_id = request_id
    
    # Clear contextvars first to make sure there's no leakage
    structlog.contextvars.clear_contextvars()
    # Bind request_id to structlog contextvars so it's included in every log
    structlog.contextvars.bind_contextvars(request_id=request_id)
    
    response = await call_next(request)
    
    # Attach to the response headers for full distributed tracing transparency
    response.headers["X-Request-ID"] = request_id
    return response

# Security hardening: add OWASP-recommended headers to all responses
app.add_middleware(SecurityHeadersMiddleware, environment=settings.APP_ENV)

# Rate limiting: sliding-window per IP address
app.add_middleware(RateLimiterMiddleware)

# Call and bind the unified exceptions registry
register_exception_handlers(app)

# Root endpoint for checking health status quickly
@app.get("/", tags=["Health"])
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "documentation": "/docs"
    }


# Production Railway direct health check endpoint
@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "healthy"
    }


@app.get("/api/v1/metrics", tags=["Observability"])
async def get_metrics(api_key: str = Depends(verify_api_key)):
    """Returns real-time operational metrics for the MediGuard pipeline (API-key protected)."""
    return JSONResponse(content=metrics.snapshot())


# Mount the complete API Router
app.include_router(api_router, prefix="/api/v1")

# Mount the WebSocket router directly at root level (no /api/v1 prefix)
from app.api.v1.websocket import router as ws_router
app.include_router(ws_router)

