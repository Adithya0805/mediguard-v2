# Interview Preparation Guide

---

## Section 1: 30-Second Pitch

"MediGuard V2 is an enterprise multi-agent Clinical Decision Support System deployed in production. Built using Next.js 14 and FastAPI, it orchestrates five specialized Claude-powered AI agents in a LangGraph workflow. It integrates Pinecone RAG against PubMed studies and real-time OpenFDA safety checks to generate ranked differential diagnoses, safety alerts, and HL7 FHIR-compliant reports in under sixty seconds. The entire stack is fully secure, multi-tenant isolated, and safety-validated."

---

## Section 2: Technical Questions & Answers

### Q1: Why LangGraph over a simple chain?
**A:** LangGraph allows us to build stateful, multi-agent systems with loops and conditional routing, which a simple linear chain cannot support. It orchestrates a supervisor pattern where agents write to a shared StateGraph, enabling an emergency bypass gate to fast-track critical cases. This cycle ensures each specialist agent executes in parallel or sequence based on the evolving patient state.

### Q2: How do you prevent AI hallucination?
**A:** We ground all diagnostic reasoning using Retrieval-Augmented Generation (RAG) against a vector database loaded with 500+ peer-reviewed PubMed articles, forcing the models to cite specific sources for every claim. Additionally, our automated CI/CD safety pipeline evaluates responses using DeepEval's HallucinationGuardMetric. We also implement structured schema outputs (Pydantic) to keep agent data parsing deterministic.

### Q3: Why AWS Bedrock over OpenAI?
**A:** AWS Bedrock provides enterprise-grade data isolation within a virtual private cloud, ensuring patient information is never used to train public base models. It also allows us to route dynamically to cost-efficient models, utilizing Claude 3 Haiku for parsing and Claude 3 Sonnet for clinical reasoning.

### Q4: What is FHIR and why does it matter?
**A:** FHIR (Fast Healthcare Interoperability Resources) is the global HL7 data standard for exchanging electronic health records. By compiling our outputs into FHIR R4 JSON bundles, MediGuard V2 can integrate with commercial EHR systems like Epic and Cerner.

### Q5: How does multi-tenancy work?
**A:** Multi-tenancy is enforced at the database level using Supabase Row Level Security (RLS) policies tied to JWT clinical credentials. Every database transaction requires a verified institution code, preventing any hospital from reading or writing another's records. All API requests are scoped to the authenticated clinician's tenant, ensuring clinical data isolation.

### Q6: Walk me through the patient flow:
**A:** 
1. The physician enters patient data using voice dictation, typed logs, or FHIR patient ID imports.
2. The Intake Agent parses unstructured inputs into a clean, structured JSON clinical schema.
3. The Symptom Agent grades symptom severity and assigns a triage urgency level.
4. If urgency is "critical," the pipeline fast-tracks directly to reporting, skipping intermediate nodes.
5. In normal flows, the Diagnosis Agent queries the Pinecone vector index to generate a ranked differential diagnosis.
6. The Drug Agent cross-references current medications against 100K+ OpenFDA records for interactions.
7. The Report Agent compiles all agent outputs into visual PDFs and FHIR R4 JSON bundles.
8. The clinician retrieves and downloads the signed documents from the Case Tracker portal.

### Q7: What was the hardest challenge?
**A:** The hardest challenge was an asynchronous race condition where Next.js navigated away from the intake page before the background pipeline trigger request completed, leaving sessions stuck. We solved this by awaiting a `202 Accepted` response from the backend before allowing navigation, and added a React `useEffect` hook to auto-trigger the analysis if a session is ever loaded in a pending state. This approach eliminated stuck sessions in production.

### Q8: How would you scale to 1000 hospitals?
**A:** We would offload graph execution to Celery background task workers coordinated by Redis to keep FastAPI routes non-blocking. Real-time agent status feeds would scale using a Redis Pub/Sub WebSocket adapter to distribute messages across multiple API servers. Finally, we would partition Pinecone indices using hospital-specific namespaces to maintain isolation and retrieval speeds.

---

## Section 3: Numbers to Memorize

| Metric | Number |
| :--- | :--- |
| PubMed articles | 500+ |
| FDA drug records | 100,000+ |
| DeepEval test cases | 50 |
| Custom safety metrics | 6 |
| AI agents | 5 |
| Average pipeline time | ~63 seconds |
| PDF document types | 4 |
| FHIR resources per bundle | 16 |
| Clinical topics covered | 23 |
| Days to build | 10 |

---

## Section 4: Project Links

* **Live Demo**: [https://mediguard-v2.vercel.app/demo](https://mediguard-v2.vercel.app/demo)
* **Showcase Page**: [https://mediguard-v2.vercel.app/showcase](https://mediguard-v2.vercel.app/showcase)
* **GitHub Repository**: [https://github.com/Adithya0805/mediguard-v2](https://github.com/Adithya0805/mediguard-v2)
* **LinkedIn Profile**: [https://www.linkedin.com/in/adithya-kuppusamy-854746270](https://www.linkedin.com/in/adithya-kuppusamy-854746270)
* **Portfolio Website**: [https://adithyaai.is-cool.dev](https://adithyaai.is-cool.dev)
