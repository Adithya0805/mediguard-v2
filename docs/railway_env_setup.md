# 🛠️ Railway Production Environment Variables Guide — MediGuard V2

This guide outlines every environment variable required to run the MediGuard V2 backend successfully in a production context on **Railway**, including secure generation methods and CLI deployment checklists.

---

## 🔑 Required Production Environment Variables

Configure these variables inside the **Variables** tab of your Railway backend service dashboard:

| Variable | Recommended Production Value | Description & Notes |
| :--- | :--- | :--- |
| **`APP_ENV`** | `production` | Enables JSON logging (no colors), strict secure headers, and production CORS policies. |
| **`APP_PORT`** | `8000` | Internally mapped by Railway. Railway injects its own dynamic `$PORT` variable which overrides this. |
| **`SECRET_KEY`** | `[Generate a secure 64-character hexadecimal key]` | Used for signing JWT authentication tokens. **Do not use the development default.** |
| **`ALLOWED_ORIGINS`** | `["https://mediguard-v2.vercel.app"]` | CORS allowlist for your Vercel Next.js portal URL. |
| **`AWS_ACCESS_KEY_ID`** | `[Your AWS IAM User Access Key]` | Access key for your AWS account with Bedrock runtime permissions. |
| **`AWS_SECRET_ACCESS_KEY`** | `[Your AWS IAM User Secret Key]` | Secret key for your AWS account. |
| **`AWS_REGION`** | `us-east-1` | AWS region where Bedrock is active (Claude 3.5 Sonnet / Flash). |
| **`BEDROCK_MODEL_ID`** | `anthropic.claude-3-5-sonnet-20240620-v1:0` | Target production LLM for multi-agent diagnostic orchestration. |
| **`LLM_PROVIDER`** | `bedrock` | Sets Bedrock as the main model runtime provider (can fall back to `gemini` or `groq`). |
| **`PINECONE_API_KEY`** | `[Your Pinecone Production API Key]` | API key for the Pinecone vector index. |
| **`PINECONE_INDEX_NAME`** | `mediguard-medical-kb` | Production vector index containing embedded medical guidelines. |
| **`PINECONE_ENVIRONMENT`** | `us-east-1` | Cloud region where your Pinecone index is provisioned. |
| **`SUPABASE_URL`** | `[Your Production Supabase Project URL]` | Public API endpoint for your Supabase database instance. |
| **`SUPABASE_ANON_KEY`** | `[Your Supabase Anon Public Key]` | Client API key for Supabase client-side routing. |
| **`SUPABASE_SERVICE_KEY`** | `[Your Supabase Service Role Secret Key]` | High-privilege secret bypass key for database writing (keep private). |
| **`LANGCHAIN_TRACING_V2`** | `true` | Enforces LangSmith operational metrics tracing on production queries. |
| **`LANGCHAIN_API_KEY`** | `[Your LangSmith Cloud API Key]` | API key connecting to your LangSmith trace dashboard. |
| **`LANGCHAIN_PROJECT`** | `mediguard-v2-production` | Target LangSmith workspace name for sorting metrics. |

---

## 🔒 Generating a Secure SECRET_KEY

To generate a production-safe random 256-bit signing key for your JWT tokens, run this command in your local terminal:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the generated 64-character hexadecimal output and paste it directly into your Railway `SECRET_KEY` variable.

---

## 🚀 Railway CLI Deployment Steps

Follow these steps to link, configure, and push the MediGuard V2 backend to Railway using the terminal:

### 1. Install the Railway CLI
Install the CLI tool globally via npm:
```bash
npm install -g @railway/cli
```

### 2. Authenticate the CLI
Log in to your Railway account in your browser:
```bash
railway login
```

### 3. Link Your Local Code to a Project
Go to your `backend/` directory and link it to your existing project or create a new one:
```bash
cd backend/
railway link
```

### 4. Bulk Set Environment Variables
You can set multiple environment variables directly via the CLI:
```bash
railway variables set APP_ENV=production LLM_PROVIDER=bedrock AWS_REGION=us-east-1
```
*(Tip: You can also bulk-upload secrets by dragging and dropping a `.env.production` file into the Railway dashboard UI.)*

### 5. Deploy Your Containers
Trigger a manual production build and deploy step:
```bash
railway up
```

### 6. Inspect Operational Logs
View real-time backend startup or execution logs to verify success:
```bash
railway logs
```

### 7. Fetch the Public URL
Generate or fetch your service's public domain URL:
```bash
railway domain
```
*(Take note of this URL, e.g., `https://mediguard-backend.up.railway.app`, as you will need to map it in Vercel settings!)*
