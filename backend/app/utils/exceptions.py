from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.utils.logger import get_logger

logger = get_logger("app.utils.exceptions")


class MediGuardException(Exception):
    """Base exception for all MediGuard V2 application exceptions."""
    def __init__(
        self,
        message: str,
        error_code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class SessionNotFoundException(MediGuardException):
    """Exception raised when a patient session cannot be located in the DB."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="SESSION_NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )


class ValidationException(MediGuardException):
    """Raised when request payload verification fails clinical validation bounds."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details
        )


class AgentExecutionException(MediGuardException):
    """Raised when an orchestrator or specialist agent execution fails."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AGENT_EXECUTION_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )


class DatabaseException(MediGuardException):
    """Raised when database interactions (Supabase, Pinecone) fail."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details
        )


class DatabaseConnectionException(DatabaseException):
    """Subclass mapping specifically for connection establishment issues."""
    pass


class AuthenticationException(MediGuardException):
    """Exception raised when credentials fail validation or session expires."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_FAILED",
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details
        )


class ForbiddenException(MediGuardException):
    """Exception raised when a clinician attempts an unauthorized action."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="FORBIDDEN_ACCESS",
            status_code=status.HTTP_403_FORBIDDEN,
            details=details
        )


class ReportGenerationException(MediGuardException):
    """Raised when compiling clinical analysis documents or FHIR resources fails."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="REPORT_GENERATION_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details
        )


class LLMException(MediGuardException):
    """Raised when upstream LLM gateway or Bedrock invokes fail."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="LLM_ERROR",
            status_code=status.HTTP_502_BAD_GATEWAY,
            details=details
        )


class FHIRImportException(MediGuardException):
    """Raised when querying public FHIR systems fails."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="FHIR_IMPORT_FAILED",
            status_code=status.HTTP_502_BAD_GATEWAY,
            details=details
        )



def register_exception_handlers(app: FastAPI) -> None:
    """Registers standard, structured global exception hooks for FastAPI."""
    
    @app.exception_handler(MediGuardException)
    async def mediguard_exception_handler(request: Request, exc: MediGuardException):
        logger.error(
            "MediGuard Exception Intercepted",
            error_code=exc.error_code,
            message=exc.message,
            path=request.url.path,
            details=exc.details
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "error_code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        import json
        # Safely serialize errors — Pydantic errors may contain non-JSON-serializable objects (e.g. ValueError)
        raw_errors = exc.errors()
        safe_errors = json.loads(json.dumps(raw_errors, default=str))
        details = {"errors": safe_errors}
        logger.warning(
            "Request Validation Failed",
            path=request.url.path,
            details=details
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": True,
                "error_code": "VALIDATION_ERROR",
                "message": "Invalid request payload provided.",
                "details": details,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.exception("Intercepted Unhandled Generic Exception", path=request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": True,
                "error_code": "INTERNAL_ERROR",
                "message": "An unexpected server exception occurred. Please contact system administrators.",
                "details": {},
                "timestamp": datetime.utcnow().isoformat()
            }
        )
