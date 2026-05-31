"""
MediGuard V2 — Multi-Provider Clinical LLM Client Factory
Provides three LLM configurations tuned for clinical tasks across AWS Bedrock, Gemini, and Groq:
  - get_llm()           → balanced, general-purpose (default)
  - get_fast_llm()      → Haiku / Flash — fast, cheap, classification tasks
  - get_reasoning_llm() → Sonnet / Gemini Pro — heavy reasoning, differential diagnosis
"""
import time
from typing import Any
import boto3
from botocore.config import Config as BotocoreConfig
from langchain_aws import ChatBedrock
from app.config import settings
from app.utils.logger import get_logger

logger = get_logger("app.llm.bedrock_client")

# ── Bedrock model IDs ────────────────────────────────────────────────────────
HAIKU_MODEL_ID   = "anthropic.claude-haiku-4-5-20251001-v1:0"
SONNET_MODEL_ID  = settings.BEDROCK_MODEL_ID   # claude-sonnet-4-20250514-v1:0


def _build_bedrock_client():
    """Creates a botocore boto3 Session and returns a bedrock-runtime client."""
    retry_config = BotocoreConfig(
        region_name=settings.AWS_REGION,
        retries={
            "max_attempts": 3,
            "mode": "adaptive",           # exponential back-off with jitter
        },
        connect_timeout=10,
        read_timeout=120,
    )

    session = boto3.Session(
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )

    return session.client("bedrock-runtime", config=retry_config)


def _is_mock_credentials() -> bool:
    """Detect placeholder / mock AWS credentials."""
    return (
        "mock" in settings.AWS_ACCESS_KEY_ID.lower()
        or "placeholder" in settings.AWS_ACCESS_KEY_ID.lower()
        or settings.AWS_ACCESS_KEY_ID == "your-aws-access-key-id"
    )


def get_llm(model_id: str = None, streaming: bool = False) -> Any:
    """
    Returns a balanced LLM client for general clinical tasks.
    Supports AWS Bedrock, Google Gemini, and Groq.
    """
    from app.utils.exceptions import LLMException  # local import avoids circular

    provider = settings.LLM_PROVIDER.lower()

    # 1. Google Gemini Provider
    if provider == "gemini":
        if not settings.GEMINI_API_KEY or "mock" in settings.GEMINI_API_KEY.lower():
            raise LLMException(message="Gemini API Key is not configured in environment variables.")
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            resolved_model = model_id or "gemini-3.5-flash"
            logger.info("Initialising Gemini LLM client", model=resolved_model, streaming=streaming)
            return ChatGoogleGenerativeAI(
                model=resolved_model,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.1,
                streaming=streaming,
            )
        except Exception as exc:
            logger.error("Failed to build Gemini client", error=str(exc))
            raise LLMException(message=f"Gemini client initialization failed: {str(exc)}")

    # 2. Groq Provider
    elif provider == "groq":
        if not settings.GROQ_API_KEY or "mock" in settings.GROQ_API_KEY.lower():
            raise LLMException(message="Groq API Key is not configured in environment variables.")
        try:
            from langchain_groq import ChatGroq
            resolved_model = model_id or "llama3-70b-8192"
            logger.info("Initialising Groq LLM client", model=resolved_model, streaming=streaming)
            return ChatGroq(
                model=resolved_model,
                groq_api_key=settings.GROQ_API_KEY,
                temperature=0.1,
                streaming=streaming,
            )
        except Exception as exc:
            logger.error("Failed to build Groq client", error=str(exc))
            raise LLMException(message=f"Groq client initialization failed: {str(exc)}")

    # 3. Default AWS Bedrock Provider
    else:
        resolved_model = model_id or SONNET_MODEL_ID

        if _is_mock_credentials():
            logger.warning(
                "Mock AWS credentials detected — LLM calls will fail at runtime.",
                model_id=resolved_model,
            )

        logger.info("Initialising AWS Bedrock LLM client", model_id=resolved_model, streaming=streaming)

        try:
            bedrock_rt = _build_bedrock_client()

            model_kwargs = {
                "temperature": 0.1,
                "max_tokens": 4096,
                "top_p": 0.9,
            }

            chat = ChatBedrock(
                client=bedrock_rt,
                model_id=resolved_model,
                model_kwargs=model_kwargs,
                streaming=streaming,
            )

            logger.info(
                "ChatBedrock client ready",
                model_id=resolved_model,
                streaming=streaming,
                temperature=0.1,
                max_tokens=4096,
            )
            return chat

        except Exception as exc:
            logger.error(
                "Failed to build ChatBedrock client",
                model_id=resolved_model,
                error=str(exc),
            )
            raise LLMException(
                message=f"LLM client initialisation failed for model '{resolved_model}': {str(exc)}",
                details={"model_id": resolved_model, "error": str(exc)},
            )


def get_fast_llm() -> Any:
    """
    Returns a fast, low-cost LLM client (Claude Haiku, Gemini Flash, or Llama-3-8B).
    Used for: intake parsing, drug interaction checks — tasks favouring speed.
    """
    from app.utils.exceptions import LLMException

    provider = settings.LLM_PROVIDER.lower()

    if provider == "gemini":
        return get_llm(model_id="gemini-3.5-flash", streaming=False)
    
    elif provider == "groq":
        return get_llm(model_id="llama3-8b-8192", streaming=False)

    else:
        logger.info("Initialising FAST LLM client (Haiku)", model_id=HAIKU_MODEL_ID)

        try:
            bedrock_rt = _build_bedrock_client()

            chat = ChatBedrock(
                client=bedrock_rt,
                model_id=HAIKU_MODEL_ID,
                model_kwargs={
                    "temperature": 0.0,
                    "max_tokens": 1024,
                },
                streaming=False,
            )

            logger.info(
                "Fast ChatBedrock (Haiku) client ready",
                model_id=HAIKU_MODEL_ID,
                temperature=0.0,
                max_tokens=1024,
            )
            return chat

        except Exception as exc:
            logger.error(
                "Failed to build fast Haiku ChatBedrock client",
                model_id=HAIKU_MODEL_ID,
                error=str(exc),
            )
            raise LLMException(
                message=f"Fast LLM client initialisation failed: {str(exc)}",
                details={"model_id": HAIKU_MODEL_ID, "error": str(exc)},
            )


def get_reasoning_llm() -> Any:
    """
    Returns the most capable LLM client (Claude Sonnet, Gemini Pro, or Llama-3-70B).
    Used for: differential diagnosis — the highest-stakes clinical task.
    """
    from app.utils.exceptions import LLMException

    provider = settings.LLM_PROVIDER.lower()

    if provider == "gemini":
        return get_llm(model_id="gemini-3.5-flash", streaming=False)
    
    elif provider == "groq":
        return get_llm(model_id="llama3-70b-8192", streaming=False)

    else:
        logger.info("Initialising REASONING LLM client (Sonnet)", model_id=SONNET_MODEL_ID)

        try:
            bedrock_rt = _build_bedrock_client()

            chat = ChatBedrock(
                client=bedrock_rt,
                model_id=SONNET_MODEL_ID,
                model_kwargs={
                    "temperature": 0.1,
                    "max_tokens": 8192,
                    "top_p": 0.9,
                },
                streaming=False,
            )

            logger.info(
                "Reasoning ChatBedrock (Sonnet) client ready",
                model_id=SONNET_MODEL_ID,
                temperature=0.1,
                max_tokens=8192,
            )
            return chat

        except Exception as exc:
            logger.error(
                "Failed to build reasoning Sonnet ChatBedrock client",
                model_id=SONNET_MODEL_ID,
                error=str(exc),
            )
            raise LLMException(
                message=f"Reasoning LLM client initialisation failed: {str(exc)}",
                details={"model_id": SONNET_MODEL_ID, "error": str(exc)},
            )
