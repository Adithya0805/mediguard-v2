# MediGuard V2 🏥

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg?style=flat&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.100%2B-green.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Orchestrator-orange.svg?style=flat)](https://github.com/langchain-ai/langgraph)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
[![AWS Bedrock](https://img.shields.io/badge/AWS%20Bedrock-Claude%20Haiku%204.5%20%2F%20Sonnet%204-red.svg?style=flat&logo=amazon-aws)](https://aws.amazon.com/bedrock/)
[![Pinecone](https://img.shields.io/badge/Pinecone-VectorDB-blueviolet.svg?style=flat)](https://www.pinecone.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-emerald.svg?style=flat&logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Production](https://img.shields.io/badge/Status-Production--Ready-brightgreen.svg?style=flat-square)](#)

## 🌐 Live Links

| Target Platform | Live Deployment Link |
| :--- | :--- |
| **🖥️ Clinical Portal** | [mediguard-v2.vercel.app](https://mediguard-v2.vercel.app) |
| **🎮 Live Demo (No Login)** | [mediguard-v2.vercel.app/demo](https://mediguard-v2.vercel.app/demo) |
| **⚙️ API Documentation** | [mediguard-v2.onrender.com/docs](https://mediguard-v2.onrender.com/docs) |
| **📖 Project Showcase** | [mediguard-v2.vercel.app/showcase](https://mediguard-v2.vercel.app/showcase) |

---

## 🎯 What is MediGuard V2?

MediGuard V2 is an assistant program that helps doctors make medical decisions by reviewing patient information in real time. It uses artificial intelligence to compile lists of possible illnesses, checks to make sure a patient's current medications will not react badly with new treatments, and automatically packages all findings into standardized hospital records.

Built using collaborative multi-agent workflows, the system orchestrates five independent clinical reasoning agents in a directed state graph. By combining patient vitals, structured medical histories, and real-time integrations with federal health registries and peer-reviewed studies, MediGuard V2 helps clinicians reduce diagnostic oversights and streamline intake administrative tasks in under 60 seconds.

---

## 🤖 The 5-Agent Pipeline

| Agent | Core LLM Model | Primary Clinical Task | Execution Speed |
| :--- | :--- | :--- | :--- |
| **1. Intake Agent** | Claude Haiku 4.5 | Parses voice, text, or FHIR imports into structured clinical JSON | ~8 seconds |
| **2. Symptom Agent** | Claude Sonnet 4 | Severity grading, ICD-10 anatomical mapping, and triage level assignment | ~12 seconds |
| **3. Diagnosis Agent** | Claude Sonnet 4 (reasoning) | Computes differential diagnosis grounded in vector-retrieved PubMed articles | ~20 seconds |
| **4. Drug Check Agent** | Claude Haiku 4.5 | Compares medication regimens against OpenFDA database for safety alerts | ~8 seconds |
| **5. Report Agent** | Claude Sonnet 4 | Compiles medical summaries, PDFs, and HL7 FHIR R4 standard bundles | ~15 seconds |

> **Multi-provider LLM routing**: AWS Bedrock is the default provider (Claude Haiku 4.5 / Sonnet 4). Google Gemini and Groq are supported as drop-in alternatives via the `LLM_PROVIDER` environment variable, with automatic fallback tiers (fast / balanced / reasoning).

---

## 🚀 Recent Upgrades

- **Report Agent hardening (this release)** — The final synthesis node now tolerates malformed, partial, or `null` LLM output: markdown fences, prose-wrapped and multi-line JSON, single-element array responses, and non-dict payloads are all parsed defensively; every downstream field is normalised to a safe default; `report_metadata` can never be `null`; mandatory clinical disclaimers are always merged; and the report is enriched with primary diagnosis, citations, and drug-safety data from the shared state so it is fully self-contained for persistence, PDF, and FHIR generation. Generation uses a bounded single retry (tracked via the state retry counter) before falling back to a physician-review-required report that still persists cleanly. Covered by 24 dedicated unit tests.
- **On-demand PDF generation** — PDFs and structured documents are now generated on demand instead of being stored in S3, simplifying storage and keeping every report instantly reproducible.
- **Portfolio showcase & docs** — New showcase page, project documentation, and interview-prep guides.
- **Smart failed-state recovery** — Replaces the generic session error with a contextual failed-state handler and a one-click re-trigger button so interrupted pipelines can be resumed.
- **Test suite overhaul** — Resolved 102 prior backend test failures; the suite now runs 130+ tests cleanly across agents, safety guardrails, API contracts, and caching.

---

## ✨ 10 Features Deployed in 10 Days

1. **Day 1: WebSocket Telemetry Streaming** — 5 collaborative agents stream active execution status and clinical tokens in real time.
2. **Day 2: OpenFDA API Integration** — Automatic screening of 100,000+ real FDA records to detect drug-drug interactions and allergy warnings.
3. **Day 3: Three-Factor Secure Access** — Clinician authentication gated by JWT keys, unique institution codes, and append-only audit tracking.
4. **Day 4: HL7 FHIR R4 Data Ingestion** — Direct EHR patient import from public FHIR sandboxes (Epic/Cerner compatible).
5. **Day 5: Interactive Analytics Dashboard** — Multi-tenant analytics with 8 charts compiling performance metrics from Supabase PostgreSQL database.
6. **Day 6: Voice-Dictation Intake** — Instant clinician intake powered by Web Speech API voice recording and structured entity extraction.
7. **Day 7: Automated Safety Testing** — CI/CD deployment gated by 20 DeepEval clinical cases, 6 evaluation metrics, and 3 deploy gates validating clinical reasoning consistency.
8. **Day 8: PubMed Evidence Grounding** — Vector Search (RAG) against 500+ indexed PubMed medical articles to ground diagnosis.
9. **Day 9: Database Row Level Security (RLS)** — Multi-tenant hospital isolation enforced at the PostgreSQL database level.
10. **Day 10: Public Demo Mode** — Zero-auth public access permitting instant pipeline simulation on pre-built clinical emergency scenarios.

---

## 🏗️ Tech Stack

| Layer | Technologies & Frameworks |
| :--- | :--- |
| **AI / Orchestration** | LangGraph (StateGraph, Supervisor), AWS Bedrock (Claude Haiku 4.5 / Sonnet 4, with Gemini & Groq fallback), Pinecone Vector DB, DeepEval |
| **Backend** | Python 3.11, FastAPI, WebSockets, JWT, Docker |
| **Database** | PostgreSQL (Supabase), Row Level Security (RLS), In-Memory TTL Cache |
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, Recharts, Framer Motion, Web Speech API |
| **DevOps** | GitHub Actions, Render Cloud, Vercel CDN Proxy, LangSmith |
| **Standards** | HL7 FHIR R4, ICD-10 Classification, OpenFDA |

---

## 🛡️ Clinical Safety Approach

* **DeepEval Automated Gating**: Every codebase modification triggers a safety evaluation suite of 20 clinical test cases scored across 6 metrics. Three deploy gates must pass — an 85% overall pass rate, a 95% clinical safety score, and a 90% hallucination ceiling — otherwise the deployment pipeline is blocked.
* **PubMed Evidence-Based Grounding**: Diagnostic suggestions are strictly grounded using Retrieval-Augmented Generation (RAG) against a vector database containing indexed medical studies, complete with citations.
* **Report Generation Guardrails**: The final report agent validates and normalises every LLM response, always merges mandatory clinical disclaimers, and falls back to an explicit "physician review required" report rather than ever persisting a broken or empty report.
* **Mandatory Physician Gatekeeping**: The system implements strict warnings, disclaimers, and watermarks across all screens and generated PDFs, enforcing that all outputs function as guidance only.

---

## 🚀 Local Setup

### 1. Prerequisites
* Python 3.11+
* Node.js 18+
* Vector DB: Pinecone account
* Relational DB: Supabase database
* LLM: AWS Bedrock credentials (or a Gemini / Groq API key)

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/Adithya0805/mediguard-v2.git
cd mediguard-v2
```

**Backend Setup:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

**Frontend Setup:**
```bash
cd ../frontend
npm install
```

### 3. Environment Setup
Configure `.env` in `backend/` using the following parameters:
```env
SECRET_KEY=your_auth_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=your_index_name

# LLM provider — "bedrock" (default), "gemini", or "groq"
LLM_PROVIDER=bedrock
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
# GEMINI_API_KEY=your_gemini_key
# GROQ_API_KEY=your_groq_key
```

### 4. Run Commands
**Start Backend Engine:**
```bash
cd backend
.venv\Scripts\activate  # Windows
uvicorn app.main:app --reload --port 8000
```
**Start Frontend Portal:**
```bash
cd frontend
npm run dev
```
Open `http://localhost:3000` in your browser.

### 5. Run Tests & Linting
```bash
cd backend
.venv\Scripts\python.exe -m pytest -q                          # full test suite
.venv\Scripts\python.exe -m ruff check app/ tests/             # linter
.venv\Scripts\python.exe evals/run_eval.py --use-mock          # safety eval (offline)
```

---

## 🎮 Demo Mode

No signup is required to try the system. Clinicians and reviewers can visit [mediguard-v2.vercel.app/demo](https://mediguard-v2.vercel.app/demo) to execute the complete multi-agent reasoning graph. Reviewers can select from five pre-built clinical emergency scenarios (Cardiac, Stroke, Respiratory, Drug Interaction, and Hypertensive Crisis) to observe agent collaboration, OpenFDA warning checks, and dynamic PDF document compilation.

---

## 👨‍💻 Built By

* **Developer**: Adithya Kuppusamy
* **Role**: AI & Data Science Engineer
* **Location**: Tamil Nadu, India
* **Website**: [adithyaai.is-cool.dev](https://adithyaai.is-cool.dev)
* **Profiles**: [LinkedIn](https://www.linkedin.com/in/adithya-kuppusamy-854746270) | [GitHub](https://github.com/Adithya0805)

---

## ⚠️ Clinical Disclaimer

**IMPORTANT CLINICAL COMPLIANCE NOTICE:**
**MediGuard V2 is an artificial intelligence-powered clinical decision support system designed solely for educational, portfolio, and research evaluation. It does not replace professional clinical judgment. All diagnoses, drug warnings, and recommended actions must be reviewed and signed off by a licensed medical practitioner before any patient treatment or care pathway is modified.**
