"""
MediGuard V2 — LLM Router
Maps clinical task types to the right LLM configuration.

Routing table:
  "intake"     → Haiku   (fast, cheap — parsing structured fields)
  "symptom"    → Sonnet  (balanced — symptom NLP + RAG context)
  "diagnosis"  → Sonnet  (reasoning — complex DDx generation)
  "drug_check" → Haiku   (fast — structured drug interaction lookup)
  "report"     → Sonnet  (balanced — narrative synthesis)
  default      → Sonnet
"""
from langchain_aws import ChatBedrock
from app.llm.bedrock_client import get_llm, get_fast_llm, get_reasoning_llm
from app.utils.logger import get_logger

logger = get_logger("app.llm.router")

# ── Task-to-model routing map ─────────────────────────────────────────────────
_FAST_TASKS      = {"intake", "drug_check"}
_REASONING_TASKS = {"diagnosis"}
_BALANCED_TASKS  = {"symptom", "report"}


class LLMRouter:
    """
    Singleton router that holds all three LLM client instances and routes
    incoming task-type labels to the correct ChatBedrock configuration.
    """

    def __init__(self):
        logger.info("Initialising LLMRouter — loading all three model tiers...")

        # Eagerly initialise each variant once — reused across agent calls
        try:
            self._fast_llm      = get_fast_llm()
            logger.info("Fast LLM (Haiku) loaded", tier="fast")
        except Exception as exc:
            logger.warning("Fast LLM unavailable — falling back to balanced", error=str(exc))
            self._fast_llm = None

        try:
            self._balanced_llm  = get_llm()
            logger.info("Balanced LLM (Sonnet) loaded", tier="balanced")
        except Exception as exc:
            logger.warning("Balanced LLM unavailable", error=str(exc))
            self._balanced_llm = None

        try:
            self._reasoning_llm = get_reasoning_llm()
            logger.info("Reasoning LLM (Sonnet-max) loaded", tier="reasoning")
        except Exception as exc:
            logger.warning("Reasoning LLM unavailable — falling back to balanced", error=str(exc))
            self._reasoning_llm = None

        logger.info(
            "LLMRouter ready",
            fast_available=self._fast_llm is not None,
            balanced_available=self._balanced_llm is not None,
            reasoning_available=self._reasoning_llm is not None,
        )

    def route(self, task_type: str) -> ChatBedrock:
        """
        Returns the appropriate ChatBedrock client for the given task type.

        Args:
            task_type: One of 'intake', 'symptom', 'diagnosis', 'drug_check', 'report'.

        Returns:
            ChatBedrock instance suitable for the task.
        """
        task_lower = task_type.lower()
        logger.info("Routing LLM request", task_type=task_lower)

        if task_lower in _FAST_TASKS:
            client = self._fast_llm or self._balanced_llm
            logger.info("Routed to FAST model", task_type=task_lower)

        elif task_lower in _REASONING_TASKS:
            client = self._reasoning_llm or self._balanced_llm
            logger.info("Routed to REASONING model", task_type=task_lower)

        else:
            # balanced tasks + default fallback
            client = self._balanced_llm
            logger.info("Routed to BALANCED model", task_type=task_lower)

        if client is None:
            from app.utils.exceptions import LLMException
            raise LLMException(
                message=f"No LLM client available for task type '{task_type}'.",
                details={"task_type": task_type},
            )

        return client


# ── Module-level singleton ────────────────────────────────────────────────────
llm_router = LLMRouter()
