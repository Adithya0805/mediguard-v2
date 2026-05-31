from functools import lru_cache
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # ── Application Settings ─────────────────
    APP_NAME: str = Field(default="MediGuard V2")
    APP_ENV: str = Field(default="development")
    APP_PORT: int = Field(default=8000)
    SECRET_KEY: str = Field(default="dev-secret-key-32-chars-long-at-least-here-12345")

    # Allowed Origins for CORS configuration
    ALLOWED_ORIGINS: list[str] = Field(default=[])

    # Railway specific tracing
    RAILWAY_ENVIRONMENT: Optional[str] = Field(default=None)

    def __init__(self, **values):
        super().__init__(**values)
        if not self.ALLOWED_ORIGINS:
            if self.APP_ENV.lower() == "production":
                self.ALLOWED_ORIGINS = ["https://mediguard-v2.vercel.app"]
            else:
                self.ALLOWED_ORIGINS = ["http://localhost:3000", "http://localhost:3001"]

    # ── AWS Bedrock Settings ──────────────────
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = Field(default="us-east-1")
    BEDROCK_MODEL_ID: str = Field(default="anthropic.claude-3-sonnet-20240229-v1:0")

    # ── Multi-Provider Settings ───────────────
    GEMINI_API_KEY: Optional[str] = Field(default=None)
    GROQ_API_KEY: Optional[str] = Field(default=None)
    LLM_PROVIDER: str = Field(default="bedrock")  # "bedrock", "gemini", or "groq"

    # ── Pinecone Settings ─────────────────────
    PINECONE_API_KEY: str
    PINECONE_INDEX_NAME: str = Field(default="mediguard-medical-kb")
    PINECONE_ENVIRONMENT: Optional[str] = Field(default="us-east-1-aws")

    # ── Supabase Settings ─────────────────────
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_KEY: str

    # ── LangSmith Settings ────────────────────
    LANGCHAIN_TRACING_V2: bool = Field(default=False)
    LANGCHAIN_API_KEY: Optional[str] = Field(default=None)
    LANGCHAIN_PROJECT: str = Field(default="mediguard-v2")


@lru_cache
def get_settings() -> Settings:
    """Returns a cached instance of application settings."""
    return Settings()


# Export a default settings instance
settings = get_settings()
