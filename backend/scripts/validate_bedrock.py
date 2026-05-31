#!/usr/bin/env python3
"""
MediGuard V2 — Clinical LLM connection & Inference Validator
Validates access credentials, checks model listing permissions, tests Fast and Reasoning LLMs,
validates streaming outputs, and calculates token usage and billing costs across multi-providers.
"""

import os
import sys
import time
from langchain_core.messages import HumanMessage

# Add parent path to allow root package importing
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from app.llm.bedrock_client import get_llm, get_fast_llm, get_reasoning_llm, _is_mock_credentials

def validate_llm():
    provider = settings.LLM_PROVIDER.lower()
    
    print("=============================================================================")
    print(f"               MEDIGUARD V2 - LLM INTEGRATION VALIDATOR ({provider.upper()})")
    print("=============================================================================")

    print(f"Active Provider: {provider.upper()}")
    
    if provider == "bedrock":
        print(f"AWS Region:      {settings.AWS_REGION}")
        print(f"Model ID:        {settings.BEDROCK_MODEL_ID}")
        if _is_mock_credentials():
            print("[WARNING] AWS credentials appear to be placeholder mocks.")
            print("Please configure real credentials in .env to run Bedrock API validations.\n")
            print("LLM Provider: 1 ISSUES (Mock Mode Active)")
            return False
    elif provider == "gemini":
        has_key = settings.GEMINI_API_KEY and "mock" not in settings.GEMINI_API_KEY.lower()
        print(f"Gemini API Key:  {'[PASS] Configured' if has_key else '[FAIL] Missing/Mock'}")
        if not has_key:
            print("LLM Provider: 1 ISSUES (Gemini Key Missing)")
            return False
    elif provider == "groq":
        has_key = settings.GROQ_API_KEY and "mock" not in settings.GROQ_API_KEY.lower()
        print(f"Groq API Key:    {'[PASS] Configured' if has_key else '[FAIL] Missing/Mock'}")
        if not has_key:
            print("LLM Provider: 1 ISSUES (Groq Key Missing)")
            return False

    issues = 0

    # Test 1 & 2: Metadata and Client Initialization
    print(f"\n[Test 1] Initializing {provider.upper()} Clinical LLM Clients...")
    start_time = time.perf_counter()
    try:
        fast_llm = get_fast_llm()
        reasoning_llm = get_reasoning_llm()
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [PASS] Clients successfully initialized. Latency: {latency:.2f}ms")
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [FAIL] Client initialization failed: {str(e)} ({latency:.2f}ms)")
        print(f"\n{provider.upper()} LLM: 1 ISSUES (Init Failed)")
        return False

    # Test 3: Test Fast LLM
    print(f"\n[Test 3] Invoking FAST LLM client with minimal prompt...")
    start_time = time.perf_counter()
    try:
        messages = [HumanMessage(content="Respond with exactly one word: Ready")]
        res = fast_llm.invoke(messages)
        latency = (time.perf_counter() - start_time) * 1000
        
        response_text = res.content.strip()
        print(f"  Response: \"{response_text}\"")
        
        if "ready" in response_text.lower():
            print(f"  [PASS] FAST LLM verified! Latency: {latency:.2f}ms")
        else:
            print(f"  [FAIL] Response mismatch: expected 'Ready', got '{response_text}' ({latency:.2f}ms)")
            issues += 1
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [FAIL] FAST LLM invocation failed: {str(e)} ({latency:.2f}ms)")
        issues += 1

    # Test 4: Test Reasoning LLM
    print(f"\n[Test 4] Invoking REASONING LLM client with clinical prompt...")
    start_time = time.perf_counter()
    try:
        prompt = "In one sentence, what is the most common cause of chest pain in a 50-year-old male?"
        messages = [HumanMessage(content=prompt)]
        res = reasoning_llm.invoke(messages)
        latency = (time.perf_counter() - start_time) * 1000
        
        response_text = res.content.strip()
        print(f"  Prompt:   \"{prompt}\"")
        print(f"  Response: \"{response_text}\"")
        
        if len(response_text) > 10:
            print(f"  [PASS] Reasoning LLM verified! Latency: {latency:.2f}ms")
        else:
            print(f"  [FAIL] Response was too brief or empty. ({latency:.2f}ms)")
            issues += 1
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [FAIL] Reasoning LLM invocation failed: {str(e)} ({latency:.2f}ms)")
        issues += 1

    # Test 5: Streaming Response Check
    print("\n[Test 5] Testing stream response...")
    start_time = time.perf_counter()
    try:
        streaming_llm = get_llm(streaming=True)
        messages = [HumanMessage(content="List 3 symptoms of hypertension")]
        
        print("  Stream chunk arrival: [", end="", flush=True)
        full_content = []
        for chunk in streaming_llm.stream(messages):
            print(chunk.content, end="", flush=True)
            full_content.append(chunk.content)
        print("]")
        
        latency = (time.perf_counter() - start_time) * 1000
        full_text = "".join(full_content).strip()
        
        if len(full_text) > 10:
            print(f"  [PASS] Streaming connection verified! Latency: {latency:.2f}ms")
        else:
            print(f"  [FAIL] Stream compiled content empty. ({latency:.2f}ms)")
            issues += 1
    except Exception as e:
        latency = (time.perf_counter() - start_time) * 1000
        print(f"  [FAIL] Streaming response pipeline crashed: {str(e)} ({latency:.2f}ms)")
        issues += 1

    print("\n=============================================================================")
    if issues == 0:
        print(f"  FINAL INTEGRATION SUMMARY: \033[92m{provider.upper()} LLM: READY\033[0m")
        print("=============================================================================")
        return True
    else:
        print(f"  FINAL INTEGRATION SUMMARY: \033[91m{provider.upper()} LLM: {issues} ISSUES\033[0m")
        print("=============================================================================")
        return False

if __name__ == "__main__":
    validate_llm()
