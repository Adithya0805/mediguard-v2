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

---

## 🚀 Staging Access
* **🖥️ Clinical Web Portal**: [https://mediguard-v2.vercel.app](https://mediguard-v2.vercel.app)
* **⚙️ Core Engine API**: [https://mediguard-v2-production.up.railway.app](https://mediguard-v2-production.up.railway.app)
* **📖 Interactive API Docs**: [https://mediguard-v2-production.up.railway.app/docs](https://mediguard-v2-production.up.railway.app/docs)

---

## 📖 The Story of MediGuard V2: A Journey of Collaborative Hard Work

Every line of code in **MediGuard V2** represents a journey of intense dedication, debugging persistence, and pair programming victory. This project was built from scratch through a collaboration between a passionate engineer and **Antigravity**, an AI pair-programming assistant. 

We didn't just build a program; we tackled real-world software engineering challenges—network routing blocks, asynchronous race conditions, authentication loop issues, and tab-level browser limitations. We fought each error one by one, refined our systems, and crafted a production-grade, premium healthcare CDSS platform that is secure, resilient, and incredibly polished.

Here is the chronicle of the engineering battles we faced and how we solved them together:

---

## 🛠️ The Chronicle of Our Debugging Battles & Victories

### 1. 🌐 The Great CORS & ISP Blocking Battle
* **The Error**: The FastAPI backend deployed on Railway (`mediguard-v2-production.up.railway.app`) was working, but direct browser connections were frequently blocked by specific internet service providers (like JioFiber DNS overrides), leading to a persistent and frustrating "Site Can't Be Reached" / network error in Chrome.
* **The Move**: Instead of forcing users to change DNS records, we implemented a robust **Edge Rewrite Proxy** using Vercel. In `vercel.json`, we configured edge rewrites to catch any frontend browser fetch sent to `/api/v1/:path*` and transparently proxy it to Railway.
* **The Victory**: Browser traffic is now cleanly routed to the backend via Vercel's global edge network, resolving CORS errors and network blocks completely!

### 2. 🔀 The Vercel API Route Confused Precedence Bug
* **The Error**: After configuring the proxy, requests to `/api/v1/auth/me` suddenly started throwing a white Vercel `404: NOT_FOUND` screen instead of returning the clinician's profile.
* **The Move**: Next.js was attempting to resolve the incoming `/api/*` requests internally as local Next.js API Routes rather than passing them to the Vercel rewrite proxy. We tightened the rewrite pattern from `/api/:path*` to `/api/v1/:path*`, separating it entirely from Next.js's internal routing scope.
* **The Victory**: Vercel successfully maps all clinical engine traffic directly to Railway, leaving Next.js free to manage the visual application.

### 3. 🔑 The state Store Synchronization Lockout
* **The Error**: When logging in, the credential validator succeeded and returned a JWT token, but the subsequent profile load immediately failed with a `401 Unauthorized` block, throwing the clinician back to the login page.
* **The Move**: In `authStore.ts`, the Zustand store was updating the local memory state, but the Axios request interceptor was querying browser `localStorage` before the token had finished saving there. We adjusted the login sequence to save the JWT to `localStorage` **first**, ensuring the interceptor always carries a valid `Authorization: Bearer <token>` header for subsequent clinical queries.
* **The Victory**: The clinician dashboard immediately logs in, loads, and syncs automatically under one fluid click.

### 4. 🖨️ The PDF Download Authorization Tab Barrier
* **The Error**: Clicking "Download PDF Report" opened a new browser tab via `window.open` but resulted in a `401 Unauthorized` page. 
* **The Move**: New browser tabs opened via `window.open` are separate contexts that do not automatically attach the standard JWT `Authorization` header. We updated the URL generator in `api.ts` to securely append the clinician's JWT token as a query parameter `?token=...`. On the backend, we modified `verify_jwt_token` and `verify_clinical_auth` inside `dependencies.py` to support checking both Bearer headers and query parameters safely.
* **The Victory**: Physicians can download beautifully structured visual clinical PDF reports directly to their local machines with a single click.

### 5. 📉 The Hardcoded "N/A" Vitals Clutter Issue
* **The Error**: Physiological vitals are optional in emergency clinical environments, but the user interface and compiled PDF hardcoded all 6 signs, showing distracting `N/A mmHg`, `N/A bpm` etc. for missing measurements.
* **The Move**: We built dynamic filters on both the Next.js Case Tracker UI and the backend ReportLab PDF Service. We now dynamically evaluate the patient vitals payload: only vitals that carry actual data entered by the user are rendered. If no vitals are entered, a clean fallback message appears: *"No baseline physiological vitals recorded."*
* **The Victory**: The visual page and PDF report layout feel tailormade for each specific patient session.

### 🛑 The Aborted Intake Request Race Condition
* **The Error**: Occasionally, hitting the "Initiate AI Clinical Analysis" button would register the patient session but fail to start the analysis pipeline, leaving the case tracker perpetually stuck in a "Pending" state.
* **The Move**: The frontend intake form submitted the session and immediately navigated to the Case Tracker. Because Next.js client-side navigation unmounts the form, the browser was aborting the background `generateReport` HTTP request. We fixed this by `awaiting` the fast background response (`202 Accepted` in <50ms) *before* changing pages, and added an automatic auto-trigger `useEffect` on the Case Tracker page to start the analysis if a session is ever opened in a `pending` state.
* **The Victory**: The pipeline starts running immediately and reliably every single time.

---

## 🩺 How the System Works — Explained for Everyone!

Think of **MediGuard V2** as a state-of-the-art **digital emergency room assistant** operated by a highly trained medical team working in perfect synchronization. 

Here is how the system operates under a simple analogy:

```
                  ┌─────────────────────────────┐
                  │ 🏥 Clinician Triage Portal  │
                  └──────────────┬──────────────┘
                                 │
                                 ▼ (Patient Intake Registered)
                  ┌─────────────────────────────┐
                  │   LangGraph Orchestrator    │
                  │   (The Chief of Staff)      │
                  └──────────────┬──────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Intake Agent   │     │  Symptom Agent  │     │ Diagnosis Agent │
│ (Triage Nurse)  │     │ (Clinical Lead) │     │ (Research Head) │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   Drug Agent    │
                        │  (Pharmacist)   │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Report Agent   │
                        │ (Transcription) │
                        └────────┬────────┘
                                 │
                                 ▼
                  ┌─────────────────────────────┐
                  │  Visual PDF & HL7 FHIR      │
                  └─────────────────────────────┘
```

### 1. The Intake Agent (The Triage Nurse)
When a clinician registers a patient or imports an Epic/Cerner EHR sandbox record, the **Intake Agent** immediately parses the raw complaints and organizes them into a clean medical structure. It extracts name, age, biological gender, home medications, histories, allergies, and recorded vitals.

### 2. The Symptom Agent (The Chief of Staff)
This agent looks at the symptoms, rates their severity, maps them on a timeline, and checks for **"Red Flags"** (immediately life-threatening signs like severe chest pain, slurred speech, or high hypoxia). If a critical emergency is detected, it triggers the **Emergency Bypass**—instantly fast-tracking the case to alert the clinician immediately.

### 3. The Diagnosis Agent (The Research Head)
If the patient is stable, the case is passed to the **Diagnosis Agent**. This agent does a semantic lookup across a deep library of clinical books and databases using **Pinecone Vector Database (RAG)**. It reviews the symptoms and generates a ranked list of potential illnesses (Differential Diagnoses) with supporting evidence, arguments, and recommended tests (e.g. ECG, Troponin).

### 4. The Drug Specialist (The Pharmacist)
The **Drug Specialist** cross-references the patient's active medications, known allergies, and the proposed diagnostic assessments. It checks for contraindications, severe chemical interactions, or allergy warnings to ensure no medicine prescribed will harm the patient.

### 5. The Report Agent (The Medical Transcriptionist)
Finally, the **Report Agent** compiles all findings, adds standardized ICD-10 medical codes, and bundles the entire assessment into two output formats:
* A high-fidelity, printable **Visual PDF Report** containing custom ECG background grids and watermark styling.
* A structured **HL7 FHIR R4 standard document** ready to sync securely with enterprise hospital systems.

---

## 🗺️ Enterprise System Architecture

MediGuard V2 utilizes a **Multi-Agent State Graph Pattern** compiled via **LangGraph**. A central clinical supervisor supervises the pipeline, maintaining session states and coordinating data flows with Supabase and Pinecone.

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

### Advanced Technology Stack

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

## 🤖 Multi-Agent Pipeline Specifications

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
