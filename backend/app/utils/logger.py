import logging
import sys
from typing import Any
import structlog
from app.config import settings


def add_production_metadata(_, __, event_dict):
    """Processor to inject Railway-specific production metadata into structured logs."""
    if settings.APP_ENV.lower() == "production":
        event_dict["service"] = "mediguard-v2-backend"
        event_dict["environment"] = "production"
        event_dict["version"] = "2.0.0"
    return event_dict


def configure_logger() -> None:
    """Configures structlog to behave differently based on APP_ENV."""
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.format_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
        add_production_metadata,
    ]

    if settings.APP_ENV.lower() == "production":
        # Production JSON logging configuration (no colors)
        processors = shared_processors + [
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ]
        log_formatter = logging.Formatter("%(message)s")
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(log_formatter)
    else:
        # Development pretty-printing console logging configuration with colors
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True),
        ]
        handler = logging.StreamHandler(sys.stdout)

    # Attach to standard root logger and configure default levels
    root_logger = logging.getLogger()
    log_level = logging.INFO if settings.APP_ENV.lower() == "production" else logging.DEBUG
    root_logger.setLevel(log_level)
    root_logger.handlers = [handler]

    structlog.configure(
        processors=processors,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


# Run logger configuration on module load
configure_logger()


def get_logger(name: str) -> Any:
    """Returns a structlog logger configured for the specified module name."""
    return structlog.get_logger(name)


def get_request_logger(request_id: str) -> Any:
    """Returns a structlog logger pre-bound with request_id for distributed tracing."""
    return structlog.get_logger().bind(request_id=request_id)
