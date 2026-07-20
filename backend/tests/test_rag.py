import pytest
from app.rag.fallback_kb import search_fallback_kb, FALLBACK_KNOWLEDGE_BASE
from app.rag.retriever import MedicalRetriever, format_context

def test_fallback_kb_search_by_keyword():
    """Verifies that offline RAG keyword matching resolves correct medical resources."""
    # 1. Test ACS search
    results_acs = search_fallback_kb("acute coronary syndrome chest pain")
    assert len(results_acs) > 0
    assert "AHA/ACC 2026 Acute Coronary Syndrome" in results_acs[0]["source"]
    assert "12-lead electrocardiogram (ECG)" in results_acs[0]["text"]
    assert results_acs[0]["score"] >= 0.80

    # 2. Test Stroke search
    results_stroke = search_fallback_kb("hemiparesis with slurred speech droop")
    assert len(results_stroke) > 0
    assert "AHA/ASA 2026 Acute Ischemic Stroke" in results_stroke[0]["source"]
    assert "NIH Stroke Scale (NIHSS)" in results_stroke[0]["text"]
    
    # 3. Test Drug interaction search
    results_med = search_fallback_kb("aspirin warfarin bleeding interactions")
    assert len(results_med) > 0
    assert "antiplatelet agents (Aspirin)" in results_med[0]["text"]

def test_fallback_kb_no_matches():
    """Verifies that searching irrelevant terms returns empty match results."""
    results = search_fallback_kb("unrelated clinical parameters")
    assert len(results) == 0

async def test_medical_retriever_offline_fallback():
    """Verifies that MedicalRetriever executes fallback when index connection is unconfigured."""
    retriever = MedicalRetriever()
    # Force retriever into offline fallback mode by clearing credentials
    retriever.index = None
    retriever.embeddings = None
    
    results = await retriever.retrieve("crushing substernal chest pain")
    assert len(results) > 0
    assert "12-lead electrocardiogram" in results[0]["text"]
    assert "AHA/ACC" in results[0]["citation"]

def test_format_context():
    """Verifies that retrieved chunks format into clean context sections with source citations."""
    sample_results = [
        {
            "text": "Guideline A",
            "citation": "Source X",
            "score": 0.8854,
            "source_type": "manual",
            "pmid": None,
            "title": None,
            "authors": None,
            "journal": None,
            "year": None,
            "pubmed_url": None,
            "topic": None,
            "priority": None,
        }
    ]
    context = format_context(sample_results)
    assert "Source X" in context
    assert "Guideline A" in context
    
    empty_context = format_context([])
    assert "No relevant clinical context" in empty_context
