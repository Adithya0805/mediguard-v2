#!/usr/bin/env python3
"""
MediGuard V2 — Credential Setup Wizard
GUIDED INTERACTIVE CREDENTIAL SETTING & VALIDATION TOOL
"""

import os
import sys
import secrets
import re

# Ensure backend root is in search path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")

def mask_value(val: str) -> str:
    """Masks secret key values showing only the first 8 characters."""
    if not val:
        return "[NOT SET]"
    if len(val) <= 8:
        return "****"
    return f"{val[:8]}..." + "*" * (len(val) - 8)

def load_env_vars() -> dict:
    """Loads existing variables from .env if present."""
    env_vars = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    # Strip surrounding quotes
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    env_vars[key] = val
    return env_vars

def write_env_vars(env_vars: dict):
    """Writes updated variables to .env safely preserving categories."""
    lines = [
        "# ── Application ──────────────────────────",
        f'APP_NAME="{env_vars.get("APP_NAME", "MediGuard V2")}"',
        f'APP_ENV={env_vars.get("APP_ENV", "development")}',
        f'APP_PORT={env_vars.get("APP_PORT", 8000)}',
        f'SECRET_KEY={env_vars.get("SECRET_KEY", "")}',
        "",
        "# ── AWS Bedrock ───────────────────────────",
        f'AWS_ACCESS_KEY_ID={env_vars.get("AWS_ACCESS_KEY_ID", "")}',
        f'AWS_SECRET_ACCESS_KEY={env_vars.get("AWS_SECRET_ACCESS_KEY", "")}',
        f'AWS_REGION={env_vars.get("AWS_REGION", "us-east-1")}',
        f'BEDROCK_MODEL_ID={env_vars.get("BEDROCK_MODEL_ID", "anthropic.claude-3-sonnet-20240229-v1:0")}',
        "",
        "# ── Pinecone ──────────────────────────────",
        f'PINECONE_API_KEY={env_vars.get("PINECONE_API_KEY", "")}',
        f'PINECONE_INDEX_NAME={env_vars.get("PINECONE_INDEX_NAME", "mediguard-medical-kb")}',
        f'PINECONE_ENVIRONMENT={env_vars.get("PINECONE_ENVIRONMENT", "us-east-1-aws")}',
        "",
        "# ── Supabase ──────────────────────────────",
        f'SUPABASE_URL={env_vars.get("SUPABASE_URL", "")}',
        f'SUPABASE_ANON_KEY={env_vars.get("SUPABASE_ANON_KEY", "")}',
        f'SUPABASE_SERVICE_KEY={env_vars.get("SUPABASE_SERVICE_KEY", "")}',
        "",
        "# ── LangSmith ─────────────────────────────",
        f'LANGCHAIN_TRACING_V2={env_vars.get("LANGCHAIN_TRACING_V2", "false")}',
        f'LANGCHAIN_API_KEY={env_vars.get("LANGCHAIN_API_KEY", "")}',
        f'LANGCHAIN_PROJECT={env_vars.get("LANGCHAIN_PROJECT", "mediguard-v2")}'
    ]
    
    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

def run_wizard():
    print("=============================================================================")
    print("                MEDIGUARD V2 - CREDENTIAL SETUP WIZARD")
    print("=============================================================================")
    print(f"Target .env file: {ENV_PATH}\n")

    env_vars = load_env_vars()
    is_interactive = sys.stdin.isatty()

    if not is_interactive:
        print("[WARNING] Non-interactive execution context detected. Running check-only validation.")

    variables = [
        {
            "key": "SUPABASE_URL",
            "prompt": "Enter Supabase Project URL (e.g. https://xyz.supabase.co)",
            "validate": lambda x: x.startswith("https://"),
            "err_msg": "URL must begin with 'https://'",
            "critical": True
        },
        {
            "key": "SUPABASE_ANON_KEY",
            "prompt": "Enter Supabase Anon Public Key",
            "validate": lambda x: len(x) > 100,
            "err_msg": "Anon Key seems too short (< 100 chars)",
            "critical": True
        },
        {
            "key": "SUPABASE_SERVICE_KEY",
            "prompt": "Enter Supabase Service Role Key",
            "validate": lambda x: len(x) > 100,
            "err_msg": "Service Key seems too short (< 100 chars)",
            "critical": True
        },
        {
            "key": "PINECONE_API_KEY",
            "prompt": "Enter Pinecone Index API Key",
            "validate": lambda x: len(x) > 30,
            "err_msg": "Pinecone API key must be greater than 30 characters",
            "critical": True
        },
        {
            "key": "PINECONE_INDEX_NAME",
            "prompt": "Enter Pinecone Index Name",
            "validate": lambda x: len(x.strip()) > 0,
            "err_msg": "Index name cannot be empty",
            "critical": True
        },
        {
            "key": "AWS_ACCESS_KEY_ID",
            "prompt": "Enter AWS Access Key ID (starts with AKIA)",
            "validate": lambda x: x.startswith("AKIA"),
            "err_msg": "AWS Access Key ID standard format starts with 'AKIA'",
            "critical": True
        },
        {
            "key": "AWS_SECRET_ACCESS_KEY",
            "prompt": "Enter AWS Secret Access Key",
            "validate": lambda x: len(x) > 30,
            "err_msg": "Secret Key must be greater than 30 characters",
            "critical": True
        },
        {
            "key": "AWS_REGION",
            "prompt": "Enter AWS Bedrock Endpoint Region",
            "validate": lambda x: x in ["us-east-1", "us-east-2", "us-west-2", "eu-west-1", "ap-northeast-1", "sa-east-1"],
            "err_msg": "Region must be a valid AWS Bedrock region (e.g. us-east-1, us-west-2)",
            "critical": False
        },
        {
            "key": "BEDROCK_MODEL_ID",
            "prompt": "Enter AWS Bedrock Claude Model ID",
            "validate": lambda x: "anthropic" in x,
            "err_msg": "Model ID must contain 'anthropic' indicating Claude models",
            "critical": False
        },
        {
            "key": "LANGCHAIN_API_KEY",
            "prompt": "Enter LangSmith Project API Key (starts with ls__)",
            "validate": lambda x: x.startswith("ls__") or x == "",
            "err_msg": "LangChain API keys typically start with 'ls__'",
            "critical": False
        },
        {
            "key": "LANGCHAIN_PROJECT",
            "prompt": "Enter LangChain Observability Project Name",
            "validate": lambda x: len(x.strip()) > 0,
            "err_msg": "LangChain project name cannot be empty",
            "critical": False
        },
        {
            "key": "SECRET_KEY",
            "prompt": "Enter Application SECRET_KEY (Min 32 characters or 'auto' to generate)",
            "validate": lambda x: len(x) >= 32,
            "err_msg": "Secret key must be at least 32 characters long",
            "critical": False
        }
    ]

    summary = []

    for item in variables:
        key = item["key"]
        curr_val = env_vars.get(key, "")
        is_mock = "mock" in curr_val.lower() or "placeholder" in curr_val.lower() or "your-project" in curr_val.lower()
        
        print(f"\n* Checking Variable: {key}")
        print(f"   Current Value: {mask_value(curr_val)} {'(MOCK / PLACEHOLDER)' if is_mock else ''}")
        
        if not is_interactive:
            # Non-interactive mode validation
            if not curr_val:
                print(f"   [MISSING] {key} is empty.")
                summary.append((key, "MISSING", "red"))
            elif is_mock:
                print(f"   [WARNING] {key} has placeholder value.")
                summary.append((key, "MOCK/PLACEHOLDER", "amber"))
            elif not item["validate"](curr_val):
                print(f"   [WEAK] {key} fails validation: {item['err_msg']}.")
                summary.append((key, "WEAK", "amber"))
            else:
                print(f"   [VALID] {key} verified.")
                summary.append((key, "VALID", "green"))
            continue

        # Interactive Mode Prompts
        updated_val = None
        while True:
            prompt_str = f"   {item['prompt']}\n   Press Enter to KEEP or enter new value: "
            user_input = input(prompt_str).strip()
            
            if not user_input:
                # User pressed enter to keep current
                updated_val = curr_val
                break
            
            # Special case for SECRET_KEY auto-generation
            if key == "SECRET_KEY" and user_input.lower() == "auto":
                updated_val = secrets.token_hex(32)
                print(f"   [SUCCESS] Auto-generated secure token: {mask_value(updated_val)}")
                break
                
            if item["validate"](user_input):
                updated_val = user_input
                break
            else:
                print(f"   [ALERT] Invalid format: {item['err_msg']}.")
                confirm = input("   Do you want to force save anyway? (y/N): ").strip().lower()
                if confirm == "y":
                    updated_val = user_input
                    break

        env_vars[key] = updated_val
        is_updated_mock = "mock" in updated_val.lower() or "placeholder" in updated_val.lower()
        
        if not updated_val:
            summary.append((key, "MISSING", "red"))
        elif is_updated_mock:
            summary.append((key, "MOCK/PLACEHOLDER", "amber"))
        elif not item["validate"](updated_val):
            summary.append((key, "WEAK", "amber"))
        else:
            summary.append((key, "VALID", "green"))

    # Also make sure standard operational configs exist in dictionary
    if "APP_NAME" not in env_vars:
        env_vars["APP_NAME"] = "MediGuard V2"
    if "APP_ENV" not in env_vars:
        env_vars["APP_ENV"] = "development"
    if "APP_PORT" not in env_vars:
        env_vars["APP_PORT"] = "8000"
    if "PINECONE_ENVIRONMENT" not in env_vars:
        env_vars["PINECONE_ENVIRONMENT"] = "us-east-1-aws"
    if "LANGCHAIN_TRACING_V2" not in env_vars:
        env_vars["LANGCHAIN_TRACING_V2"] = "false"
    # Auto-enable LangSmith tracing if real API Key is entered
    if env_vars.get("LANGCHAIN_API_KEY") and env_vars.get("LANGCHAIN_API_KEY") != "mock-langsmith-api-key":
        env_vars["LANGCHAIN_TRACING_V2"] = "true"

    if is_interactive:
        write_env_vars(env_vars)
        print("\n[SUCCESS] Settings written to backend/app configuration successfully.")

    print("\n=============================================================================")
    print("                        CREDENTIALS STATUS REPORT SUMMARY")
    print("=============================================================================")
    for key, status, color in summary:
        color_code = "\033[92m" if color == "green" else "\033[93m" if color == "amber" else "\033[91m"
        reset_code = "\033[0m"
        print(f"  {key:<25} -> {color_code}[{status}]{reset_code}")
    print("=============================================================================")

if __name__ == "__main__":
    run_wizard()
