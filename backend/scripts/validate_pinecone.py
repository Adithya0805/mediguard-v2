#!/usr/bin/env python3
"""
MediGuard V2 — Pinecone Live Connection & Index Validator
Validates serverless index presence, namespace stats, and upsert/query cycles with embeddings.
"""

import os
import sys
import time
import subprocess
from pinecone import Pinecone

# Add parent path to allow root package importing
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.rag.embeddings import get_embeddings, get_pinecone_index

def validate_pinecone():
    print("=============================================================================")
    print("               MEDIGUARD V2 - PINECONE INTEGRATION VALIDATOR")
    print("=============================================================================")

    api_key = settings.PINECONE_API_KEY
    index_name = settings.PINECONE_INDEX_NAME
    
    is_mock = not api_key or "your-pinecone" in api_key or "mock" in api_key
    
    print(f"Pinecone Index: {index_name}")
    print(f"API Key:        {api_key[:8]}... [Masked]")
    
    if is_mock:
        print("[WARNING] Pinecone API key is currently a mock placeholder.")
        print("Please configure real credentials in .env to run live index validations.\n")
        print("Pinecone: 1 ISSUES (Mock Mode Active)")
        return False

    issues = 0

    # Test 1: Connect and Check Index
    print("\n[Test 1] Confirming index presence on Pinecone console...")
    start_time = time.perf_counter()
    try:
        pc = Pinecone(api_key=api_key)
        existing_indexes = [idx.name for idx in pc.list_indexes()]
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  Indexes listed: {existing_indexes} ({latency:.2f}ms)")
        
        if index_name not in existing_indexes:
            print(f"  [ACTION] Index '{index_name}' is missing. Executing setup_pinecone_index.py...")
            setup_script = os.path.join(os.path.dirname(__file__), "setup_pinecone_index.py")
            res = subprocess.run([sys.executable, setup_script], capture_output=True, text=True)
            if res.returncode == 0:
                print("  [PASS] Index created successfully!")
            else:
                print(f"  [FAIL] setup_pinecone_index.py failed: {res.stderr}")
                issues += 1
                print("\nPinecone: 1 ISSUES (Index Missing and Setup Failed)")
                return False
        else:
            print(f"  [PASS] Vector index '{index_name}' successfully verified.")
            
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [FAIL] Failed to list indices: {str(e)} ({latency:.2f}ms)")
        print("\nPinecone: 1 ISSUES (List indices failed)")
        return False

    # Test 2: Connecting and Getting Stats
    print("\n[Test 2] Connecting and retrieving index stats...")
    start_time = time.perf_counter()
    try:
        index = get_pinecone_index()
        stats = index.describe_index_stats()
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [PASS] Connected successfully. Response: {latency:.2f}ms")
        print(f"         Total Vector Count: {stats.get('total_vector_count', 0)}")
        print(f"         Index Dimension:    {stats.get('dimension', 0)}")
        print(f"         Namespaces Mapped:  {list(stats.get('namespaces', {}).keys())}")
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [FAIL] Failed to describe index stats: {str(e)} ({latency:.2f}ms)")
        issues += 1

    # Test 3: Load Embeddings and upsert test vector
    test_id = "test-vector-001"
    namespace = "test"
    
    if issues == 0:
        print("\n[Test 3] Loading embeddings and upserting test vector...")
        start_time = time.perf_counter()
        try:
            # Init embedding model
            embeddings = get_embeddings()
            
            # Embed content
            sample_text = "Acute coronary syndrome (ACS) corresponds to a group of clinical symptoms compatible with acute myocardial ischemia."
            print(f"  Generating embeddings for: \"{sample_text[:40]}...\"")
            vector = embeddings.embed_query(sample_text)
            
            # Prepare metadata
            metadata = {
                "text": sample_text,
                "source": "MediGuard Validator Checkups",
                "test": True
            }
            
            # Upsert
            index.upsert(vectors=[(test_id, vector, metadata)], namespace=namespace)
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [PASS] Test vector upserted with E5-Multilingual. Latency: {latency:.2f}ms")
        except Exception as e:
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [FAIL] Embed/Upsert process failed: {str(e)} ({latency:.2f}ms)")
            issues += 1

    # Test 4: Query index for the vector
    if issues == 0:
        print("\n[Test 4] Querying index with vector similarity search...")
        start_time = time.perf_counter()
        try:
            embeddings = get_embeddings()
            query_vector = embeddings.embed_query("acute myocardial ischemia symptoms")
            
            res = index.query(
                vector=query_vector,
                top_k=3,
                include_metadata=True,
                namespace=namespace
            )
            latency = (time.perf_counter() - start_time) * 1000
            
            # Check if our test vector returned
            match_ids = [match.id for match in res.matches]
            if test_id in match_ids:
                match_val = [m for m in res.matches if m.id == test_id][0]
                print(f"  [PASS] Test vector located! Rank match score: {match_val.score:.4f}")
                print(f"         Preview: \"{match_val.metadata.get('text', '')[:40]}...\"")
                print(f"         Query response time: {latency:.2f}ms")
            else:
                print(f"  [FAIL] Vector query failed to locate upserted data. Matches: {match_ids} ({latency:.2f}ms)")
                issues += 1
        except Exception as e:
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [FAIL] Vector query query failed: {str(e)} ({latency:.2f}ms)")
            issues += 1

    # Test 5: Delete test vector (Cleanup)
    if issues == 0:
        print("\n[Test 5] Purging test vector records...")
        start_time = time.perf_counter()
        try:
            index.delete(ids=[test_id], namespace=namespace)
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [PASS] Cleanup complete. Latency: {latency:.2f}ms")
        except Exception as e:
            latency = (time.perf_counter() - start_time) * 1000
            print(f"  [FAIL] Cleanup warning: {str(e)} ({latency:.2f}ms)")

    print("\n=============================================================================")
    if issues == 0:
        print("  FINAL INTEGRATION SUMMARY: \033[92mPinecone: READY\033[0m")
        print("=============================================================================")
        return True
    else:
        print(f"  FINAL INTEGRATION SUMMARY: \033[91mPinecone: {issues} ISSUES\033[0m")
        print("=============================================================================")
        return False

if __name__ == "__main__":
    validate_pinecone()
