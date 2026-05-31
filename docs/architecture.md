# System Architecture - MediGuard V2

This document details the architecture design decisions for the MediGuard V2 Clinical Decision Support System.

## Architecture Paradigm

We utilize a **Multi-Agent Orchestrator Model** orchestrated via **LangGraph**. A centralized supervisor acts as the primary coordinator, passing tasks to domain-specialist agents and retaining a unified medical state.

```
       [ Client Application ]
                 │ (HTTP / WS)
                 ▼
          [ FastAPI App ]
                 │
                 ▼
    [ Supervisor / Orchestrator ]
      /      │        │        \
     ▼       ▼        ▼         ▼
[Intake] [Symptom] [DDx/RAG] [Drug Check]
     \       │        │        /
      ▼      ▼        ▼       ▼
        [ Report Generator ]
```

## Storage & RAG
- **Supabase**: Relational storage for Patient Records, Session History, Clinical Audits, and Agent States.
- **Pinecone**: High-performance medical literature vector database containing embedded medical documents (PubMed, clinical guidelines) for RAG querying.

## Observability & Evaluation
- **LangSmith**: Used to log trace metrics, inspect latency, evaluate prompt variations, and verify graph pathways.
- **Structlog**: Unified structured logs outputted to JSON in production, enabling ingestion by cloud watch groups or ELK stacks.
