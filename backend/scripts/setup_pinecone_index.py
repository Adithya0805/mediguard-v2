#!/usr/bin/env python
"""Setup script to verify and create Pinecone indexes for MediGuard V2."""

import os
import sys
from pinecone import Pinecone, ServerlessSpec

# Add parent path to import app package modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger("scripts.setup_pinecone_index")


def setup_index():
    print("Starting Pinecone Index Setup...")
    api_key = settings.PINECONE_API_KEY
    index_name = settings.PINECONE_INDEX_NAME
    
    if not api_key or "your-pinecone" in api_key or "mock" in api_key:
        print("[FAIL] Pinecone API Key is unconfigured. Please check .env file.")
        return
        
    try:
        pc = Pinecone(api_key=api_key)
        
        # Retrieve list of active indexes
        print(f"Retrieving active indices from Pinecone...")
        existing_indexes = [idx.name for idx in pc.list_indexes()]
        
        if index_name in existing_indexes:
            print(f"[SKIP] Index '{index_name}' already exists. Setup skipped.")
            logger.info("Pinecone setup skipped as index already exists", index=index_name)
            return
            
        print(f"[ACTION] Creating serverless Pinecone index '{index_name}'...")
        logger.info("Creating serverless Pinecone index...", index=index_name)
        
        pc.create_index(
            name=index_name,
            dimension=1024,  # Matches multilingual-e5-large vector length
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region="us-east-1"
            )
        )
        print(f"[SUCCESS] Serverless index '{index_name}' created successfully on AWS us-east-1.")
        logger.info("Serverless Pinecone index constructed successfully", index=index_name)
        
    except Exception as e:
        print(f"[ERROR] Failed to set up Pinecone index: {str(e)}")
        logger.error("Failed to complete Pinecone index setup workflow", error=str(e))


if __name__ == "__main__":
    setup_index()
