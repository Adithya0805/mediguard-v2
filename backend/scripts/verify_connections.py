#!/usr/bin/env python
"""Verification script to confirm Supabase and Pinecone client connectivity in MediGuard V2."""

import os
import sys

# Add parent path to allow root package importing
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.db.supabase_client import get_supabase_client
from app.rag.embeddings import get_pinecone_index, get_embeddings
from app.utils.logger import get_logger

logger = get_logger("scripts.verify_connections")


def mask_key(val: str) -> str:
    """Masks secrets showing only the first 4 characters."""
    if not val or len(val) <= 4:
        return "****"
    return f"{val[:4]}****************"


def run_checks():
    print("=============================================================================")
    print("                MEDIGUARD V2 - DATABASE CONNECTION CHECKER")
    print("=============================================================================")
    
    # 1. Print Config Summary
    print("\n--- 1. Settings Configurations Masked Summary ---")
    print(f"APP_NAME:             {settings.APP_NAME}")
    print(f"APP_ENV:              {settings.APP_ENV}")
    print(f"APP_PORT:             {settings.APP_PORT}")
    print(f"AWS_REGION:           {settings.AWS_REGION}")
    print(f"BEDROCK_MODEL_ID:     {settings.BEDROCK_MODEL_ID}")
    print(f"PINECONE_INDEX_NAME:  {settings.PINECONE_INDEX_NAME}")
    print(f"PINECONE_API_KEY:     {mask_key(settings.PINECONE_API_KEY)}")
    print(f"SUPABASE_URL:         {settings.SUPABASE_URL}")
    print(f"SUPABASE_ANON_KEY:    {mask_key(settings.SUPABASE_ANON_KEY)}")
    print(f"SUPABASE_SERVICE_KEY: {mask_key(settings.SUPABASE_SERVICE_KEY)}")
    
    # 2. Check Supabase
    print("\n--- 2. Connecting to Supabase ---")
    try:
        sb = get_supabase_client()
        if sb is not None:
            print("[PASS] Supabase Singleton client created successfully!")
        else:
            print("[FAIL] Supabase connection returned None.")
    except Exception as e:
        print(f"[FAIL] Supabase connection: {str(e)}")
        
    # 3. Check Pinecone Index
    print("\n--- 3. Connecting to Pinecone Index ---")
    try:
        idx = get_pinecone_index()
        if idx is not None:
            print("[PASS] Pinecone index client connected successfully!")
        else:
            print("[FAIL] Pinecone connection returned None.")
    except Exception as e:
        print(f"[FAIL] Pinecone connection: {str(e)}")
        
    # 4. Check Embeddings
    print("\n--- 4. Initializing Embeddings Model ---")
    try:
        emb = get_embeddings()
        if emb is not None:
            print("[PASS] LangChain HuggingFace embedding client initialized successfully!")
        else:
            print("[FAIL] Embeddings initialization returned None.")
    except Exception as e:
        print(f"[FAIL] Embeddings connection: {str(e)}")
        
    print("\n=============================================================================")


if __name__ == "__main__":
    run_checks()
