# 🛡️ MediGuard V2 — Enterprise Multi-Agent Clinical Decision Support System (CDSS)

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg?style=flat&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-v0.100%2B-green.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Orchestrator-orange.svg?style=flat)](https://github.com/langchain-ai/langgraph)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg?style=flat&logo=next.js)](https://nextjs.org/)
[![AWS Bedrock](https://img.shields.io/badge/AWS%20Bedrock-Claude%203.5-red.svg?style=flat&logo=amazon-aws)](https://aws.amazon.com/bedrock/)
[![Pinecone](https://img.shields.io/badge/Pinecone-VectorDB-blueviolet.svg?style=flat)](https://www.pinecone.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-emerald.svg?style=flat&logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Production](https://img.shields.io/badge/Status-Production--Ready-brightgreen.svg?style=flat-square)](#)

MediGuard V2 is an advanced, production-grade Multi-Agent Clinical Decision Support System (CDSS) engineered to assist emergency physicians and clinical staff with intake routing, symptom analysis, differential diagnosis generation (DDx), drug-drug interaction validation, and HL7 FHIR syndication.

---

## 🚀 Live Staging Deployments

* **🖥️ Clinical Web Portal**: [https://mediguard-v2.vercel.app](https://mediguard-v2.vercel.app)
* **⚙️ Core Engine API**: [https://mediguard-backend.up.railway.app](https://mediguard-backend.up.railway.app)
* **📖 Interactive API Reference**: [https://mediguard-backend.up.railway.app/docs](https://mediguard-backend.up.railway.app/docs)

---

## 🩺 What is MediGuard V2?

MediGuard V2 represents the next generation of artificial intelligence in high-acuity healthcare environments. Built to operate in busy emergency departments (EDs), the system analyzes complex patient intake data, extracts key structured clinical metrics, references curated local and cloud-based medical knowledge bases (RAG), checks for medication interaction warnings against active drug lists, and creates formatted diagnostic reports within seconds. 

By utilizing a multi-agent state graph architecture, MediGuard V2 ensures clinical reliability. Each specialized clinical agent evaluates a specific part of the patient's triage file under strict supervisor coordination, applying rule-based and LLM-driven safety boundaries to prevent diagnostic hallucination or interaction blindspots.

---

## 🗺️ System Architecture

MediGuard V2 uses a **Multi-Agent Supervisor Design Pattern** compiled via **LangGraph**. A central clinical supervisor acts as the routing orchestrator, passing state variables dynamically to specialized agents and synchronizing inputs with Supabase and Pinecone.

```
       [ Clinician Web Client ]
                  │
                  ▼ (HTTPS / WSS Edge Rewrite)
        [ Vercel CDN Proxy ]
                  │
                  ▼
         [ Railway Gateway ]
                  │
                  ▼
      [ Supervisor Orchestrator ]
       /      │        │        \
      ▼       ▼        ▼         ▼
 [Intake] [Symptom] [DDx/RAG] [Drug Check]
      \       │        │        /
       ▼      ▼        ▼       ▼
         [ Report Generator ]
                  │
                  ▼
         [ Supabase / Pinecone ]
```

### Enterprise Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | Next.js 14, React, Zustand, Vanilla CSS | Gorgeous responsive dashboard with session persistence. |
| **Core API** | FastAPI, Python 3.11, Uvicorn | High-performance asynchronous endpoint routing. |
| **Agent Orchestrator**| LangGraph, LangChain | State-machine graph and supervisor coordination routing. |
| **Reasoning Models** | AWS Bedrock (Claude 3.5 Sonnet & Haiku) | Secure, HIPAA-compliant diagnostic reasoning and parsing. |
| **Vector Index** | Pinecone Cloud Vector DB | Semantic clinical literature vector retrieval. |
| **Relational Storage**| Supabase, PostgreSQL | Relational audit, patient session, and credential tables. |
| **Auditing & Trace** | LangSmith, Structlog | End-to-end distributed trace and production JSON logging. |

---

## 🤖 Multi-Agent Pipeline

| Specialist Agent | Core LLM Model | Clinical Responsibility | Core Output Property |
| :--- | :--- | :--- | :--- |
| **Supervisor** | `Claude 3.5 Sonnet` | State evaluation, active session routing, and checklist audits. | `next_agent_step` |
| **Intake Agent** | `Claude 3 Haiku` | Parsing structured and unstructured clinician logs into JSON schemas. | `parsed_intake_data` |
| **Symptom Agent** | `Claude 3.5 Sonnet` | Timeline analysis, severity rating, and anatomical classification. | `symptoms_analysis` |
| **Diagnosis (DDx)**| `Claude 3.5 Sonnet` | Local & Pinecone RAG querying for prioritizing differential diagnoses. | `differential_diagnoses` |
| **Drug Check** | `Claude 3 Haiku` | Validating allergy profiles and active drug-drug interaction warnings. | `interaction_warnings` |
| **Report Agent** | `Claude 3.5 Sonnet` | Compiling clinical descriptions, ICD-10 coding, and HL7 FHIR formats. | `clinical_composition` |

---

## 📄 Clinical Output Formats

### 1. PDF Clinical Report
Compiles all agent evaluations into a structured, highly formatted PDF document complete with triage headers, prioritized differential diagnosis tables, drug interaction warnings, and signature sections.

### 2. HL7 FHIR R4 Composition
Generates a structured clinical bundle conforming to global **HL7 FHIR R4** standards:
* **`Patient`**: Demographics and contact parameters.
* **`Observation`**: Dynamic clinical vitals (blood pressure, heart rate, oxygenation).
* **`AllergyIntolerance`**: Validated allergy sensitivities.
* **`MedicationStatement`**: Active home medications.
* **`Composition`**: Main clinical document linking all observations under the authenticated practitioner's digital signature.

---

## 🛠️ Local Development Setup

### Prerequisites
* Python 3.11 or higher
* Node.js 18 or higher
* Active credentials for AWS Bedrock, Supabase, and Pinecone

### 1. Clone & Enter Repository
```bash
git clone https://github.com/adithya-kuppusamy/mediguard-v2.git
cd mediguard-v2
```

### 2. Configure Backend Engine
```bash
cd backend/
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
cp .env.example .env  # Add your AWS and Database keys
uvicorn app.main:app --reload --port 8000
```

### 3. Run Supabase Database & Knowledge Base Seeding
* Run the SQL table schemas in your Supabase SQL Editor dashboard.
* Populate your Pinecone vector index with clinical literature:
```bash
python scripts/seed_pinecone.py
```

### 4. Configure Frontend Portal
```bash
cd ../frontend
npm install
cp .env.example .env.local
npm run dev
```
Navigate to `http://localhost:3000` to interact with your local portal!

---

## 🚀 Cloud Deployment

* **Backend API (Railway)**: Containerized deployment using Docker. Declared via `railway.json` and optimized with custom structured logging. Refer to [Railway Env Setup Guide](docs/railway_env_setup.md).
* **Frontend Portal (Vercel)**: Deployed to Vercel global edge network, routing backend queries via Edge Rewrite Rules to bypass CORS limits. Refer to [Vercel Env Setup Guide](docs/vercel_env_setup.md).
* **CI/CD Automation (GitHub Actions)**: Automated code tests, lint checking (Ruff/Mypy), and deployment push triggers are managed via [ci.yml](.github/workflows/ci.yml).

---

## ⚖️ Clinical Disclaimer

> [!CAUTION]
> **IMPORTANT MEDICAL NOTICE & SAFETY DISCLAIMER**
> 
> **MediGuard V2 is an artificial intelligence-powered clinical DECISION SUPPORT tool.** It is designed for educational, research, and assistive support workflows only. It is **not** a substitute for professional clinical judgment, diagnosis, or treatment. 
> 
> **All outputs, recommendations, drug interaction checks, and generated reports must be carefully reviewed and verified by a licensed, qualified physician before any clinical action, prescription, or diagnostic pathway is pursued.** The developers and institutions associated with this project assume no liability for clinical decisions made based on this software.
