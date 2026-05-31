#!/usr/bin/env python3
"""
MediGuard V2 — System Master Health Dashboard
Performs isolated connection tests for Supabase, Pinecone, LLM Providers, LangSmith,
FastAPI Backend, and Next.js Frontend. Renders a beautiful colored dashboard.
"""

import os
import sys
import time
import httpx
import boto3
from pinecone import Pinecone
from supabase import create_client

# Add parent path to allow root package importing
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings

# ANSI Color Codes
GREEN = "\033[92m"
AMBER = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
BOLD = "\033[1m"
RESET = "\033[0m"

def check_supabase() -> tuple:
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_ANON_KEY
    if not url or "mock" in url.lower() or "placeholder" in url.lower() or "your-project" in url.lower():
        return f"{AMBER}[MOCK]{RESET}", 0
        
    start = time.perf_counter()
    try:
        sb = create_client(url, key)
        # Check standard audit logs select
        sb.table("audit_logs").select("id").limit(1).execute()
        duration = (time.perf_counter() - start) * 1000
        return f"{GREEN}[READY]{RESET}", int(duration)
    except Exception:
        return f"{RED}[FAIL]{RESET}", 0

def check_pinecone() -> tuple:
    api_key = settings.PINECONE_API_KEY
    index_name = settings.PINECONE_INDEX_NAME
    if not api_key or "mock" in api_key.lower() or "placeholder" in api_key.lower():
        return f"{AMBER}[MOCK]{RESET}", 0
        
    start = time.perf_counter()
    try:
        pc = Pinecone(api_key=api_key)
        idx = pc.Index(index_name)
        idx.describe_index_stats()
        duration = (time.perf_counter() - start) * 1000
        return f"{GREEN}[READY]{RESET}", int(duration)
    except Exception:
        return f"{RED}[FAIL]{RESET}", 0

def get_vector_count() -> str:
    api_key = settings.PINECONE_API_KEY
    index_name = settings.PINECONE_INDEX_NAME
    if not api_key or "mock" in api_key.lower() or "placeholder" in api_key.lower():
        return "0 vectors"
    try:
        pc = Pinecone(api_key=api_key)
        idx = pc.Index(index_name)
        stats = idx.describe_index_stats()
        count = stats.get("total_vector_count", 0)
        return f"{count:,} vectors"
    except Exception:
        return "Unavailable"

def check_bedrock(model_id: str) -> tuple:
    if "mock" in settings.AWS_ACCESS_KEY_ID.lower() or "placeholder" in settings.AWS_ACCESS_KEY_ID.lower():
        return f"{AMBER}[MOCK]{RESET}", 0
        
    start = time.perf_counter()
    try:
        session = boto3.Session(
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        client = session.client("bedrock-runtime")
        
        # Fast invoke using raw client with minimal token payload
        body = '{"prompt": "\\n\\nHuman: Say \\"Ready\\"\\n\\nAssistant:", "max_tokens_to_sample": 5}'
        client.invoke_model(
            modelId=model_id,
            contentType="application/json",
            accept="application/json",
            body=body
        )
        duration = (time.perf_counter() - start) * 1000
        return f"{GREEN}[READY]{RESET}", int(duration)
    except Exception:
        return f"{RED}[FAIL]{RESET}", 0

def check_gemini(model_id: str) -> tuple:
    api_key = settings.GEMINI_API_KEY
    if not api_key or "mock" in api_key.lower() or "placeholder" in api_key.lower() or "your-free" in api_key.lower():
        return f"{AMBER}[MOCK]{RESET}", 0
        
    start = time.perf_counter()
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from langchain_core.messages import HumanMessage
        client = ChatGoogleGenerativeAI(model=model_id, google_api_key=api_key)
        client.invoke([HumanMessage(content="Say Ready")])
        duration = (time.perf_counter() - start) * 1000
        return f"{GREEN}[READY]{RESET}", int(duration)
    except Exception:
        return f"{RED}[FAIL]{RESET}", 0

def check_groq(model_id: str) -> tuple:
    api_key = settings.GROQ_API_KEY
    if not api_key or "mock" in api_key.lower() or "placeholder" in api_key.lower():
        return f"{AMBER}[MOCK]{RESET}", 0
        
    start = time.perf_counter()
    try:
        from langchain_groq import ChatGroq
        from langchain_core.messages import HumanMessage
        client = ChatGroq(model=model_id, groq_api_key=api_key)
        client.invoke([HumanMessage(content="Say Ready")])
        duration = (time.perf_counter() - start) * 1000
        return f"{GREEN}[READY]{RESET}", int(duration)
    except Exception:
        return f"{RED}[FAIL]{RESET}", 0

def check_langsmith() -> str:
    api_key = settings.LANGCHAIN_API_KEY
    tracing = settings.LANGCHAIN_TRACING_V2
    if not api_key or "mock" in api_key.lower() or "placeholder" in api_key.lower():
        return f"{AMBER}[MOCK]{RESET}"
    if not tracing:
        return f"{AMBER}[DISABLED]{RESET}"
    return f"{GREEN}[READY]{RESET}"

def check_fastapi() -> tuple:
    start = time.perf_counter()
    try:
        # Check standard health endpoint
        res = httpx.get("http://127.0.0.1:8000/api/v1/health", timeout=1.0)
        duration = (time.perf_counter() - start) * 1000
        if res.status_code == 200:
            return f"{GREEN}[READY]{RESET}", int(duration)
        return f"{AMBER}[OFFLINE]{RESET}", 0
    except Exception:
        return f"{AMBER}[OFFLINE]{RESET}", 0

def check_frontend() -> str:
    try:
        # Check Next.js landing server
        res = httpx.get("http://localhost:3000", timeout=1.0)
        if res.status_code in [200, 308]:
            return f"{GREEN}[READY]{RESET}   port 3000"
        return f"{AMBER}[OFFLINE]{RESET}"
    except Exception:
        return f"{AMBER}[OFFLINE]{RESET}"

def main():
    print("Executing system checks... Please wait.")
    
    # Run all checkers with timestamps
    sb_status, sb_ms = check_supabase()
    pc_status, pc_ms = check_pinecone()
    
    # LLM Routing checks
    provider = settings.LLM_PROVIDER.lower()
    
    llm_name_1 = ""
    llm_name_2 = ""
    llm_status_1 = ""
    llm_status_2 = ""
    llm_ms_1 = 0
    llm_ms_2 = 0
    
    if provider == "gemini":
        llm_name_1 = "Gemini Flash (Fast)"
        llm_name_2 = "Gemini Pro (Reason)"
        llm_status_1, llm_ms_1 = check_gemini("gemini-1.5-flash")
        llm_status_2, llm_ms_2 = check_gemini("gemini-1.5-pro")
    elif provider == "groq":
        llm_name_1 = "Groq Llama 8B (Fast)"
        llm_name_2 = "Groq Llama 70B (Reason)"
        llm_status_1, llm_ms_1 = check_groq("llama3-8b-8192")
        llm_status_2, llm_ms_2 = check_groq("llama3-70b-8192")
    else:
        llm_name_1 = "AWS Bedrock (Haiku)"
        llm_name_2 = "AWS Bedrock (Sonnet)"
        llm_status_1, llm_ms_1 = check_bedrock("anthropic.claude-haiku-4-5-20251001-v1:0")
        llm_status_2, llm_ms_2 = check_bedrock(settings.BEDROCK_MODEL_ID)
        
    ls_status = check_langsmith()
    kb_stats = get_vector_count()
    api_status, api_ms = check_fastapi()
    fe_status = check_frontend()
    
    # Compute overall status
    statuses = [sb_status, pc_status, llm_status_1, llm_status_2]
    has_failed = any(f"{RED}[FAIL]" in s for s in statuses)
    has_mock = any(f"{AMBER}[MOCK]" in s for s in statuses) or "MOCK" in ls_status
    
    if has_failed:
        overall = f"[FAIL] {RED}{BOLD}SYSTEM ISSUES DETECTED{RESET}"
        overall_desc = "Some essential integrations are unreachable. Run setups first."
    elif has_mock:
        overall = f"[WARN] {AMBER}{BOLD}LOCAL MOCK RUNTIME ACTIVE{RESET}"
        overall_desc = "MediGuard is operating offline with local stubs. Configure live keys for production."
    else:
        overall = f"[PASS] {GREEN}{BOLD}ALL SYSTEMS OPERATING READY{RESET}"
        overall_desc = "MediGuard V2 is ready for clinical decision support use."

    # Render Dashboard Panel
    border = "=" * 57
    print(f"\n{border}")
    print(f"  {BOLD}MEDIGUARD V2 - INTEGRATIONS HEALTH DASHBOARD{RESET}")
    print(border)
    print(f"  Supabase Database     {sb_status:<15} {f'{sb_ms}ms' if sb_ms else ''}")
    print(f"  Pinecone Vector DB    {pc_status:<15} {f'{pc_ms}ms' if pc_ms else ''}")
    print(f"  {llm_name_1:<22} {llm_status_1:<15} {f'{llm_ms_1}ms' if llm_ms_1 else ''}")
    print(f"  {llm_name_2:<22} {llm_status_2:<15} {f'{llm_ms_2}ms' if llm_ms_2 else ''}")
    print(f"  LangSmith Tracing     {ls_status:<15}")
    print(f"  Medical Knowledge KB  [{BLUE}{kb_stats}{RESET}]")
    print(f"  FastAPI Backend       {api_status:<15} {f'{api_ms}ms' if api_ms else ''}")
    print(f"  Frontend (Next.js)    {fe_status:<15}")
    print(border)
    print(f"  Overall Status: {overall}")
    print(f"  {overall_desc}")
    print(f"{border}\n")

if __name__ == "__main__":
    main()
