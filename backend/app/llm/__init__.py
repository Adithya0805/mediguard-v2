# MediGuard V2 — LLM Package
from app.llm.bedrock_client import get_llm, get_fast_llm, get_reasoning_llm
from app.llm.router         import LLMRouter, llm_router

__all__ = [
    "get_llm",
    "get_fast_llm",
    "get_reasoning_llm",
    "LLMRouter",
    "llm_router",
]
