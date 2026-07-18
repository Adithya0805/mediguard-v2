# Curated list of topic configs for PubMed RAG knowledge base.
# Contains queries for each clinical domain MediGuard V2 handles.

PUBMED_SEARCH_QUERIES = [
    # ── CARDIOVASCULAR ──────────────────
    {
        "topic": "acute_coronary_syndrome",
        "display": "Acute Coronary Syndrome",
        "category": "cardiovascular",
        "queries": [
            "acute coronary syndrome diagnosis clinical presentation",
            "STEMI NSTEMI differential diagnosis emergency",
            "chest pain triage emergency department diagnosis",
            "troponin elevation diagnostic criteria ACS"
        ],
        "max_per_query": 15,
        "priority": "critical"
    },
    {
        "topic": "heart_failure",
        "display": "Heart Failure",
        "category": "cardiovascular",
        "queries": [
            "heart failure diagnosis clinical criteria",
            "dyspnea cardiac etiology diagnosis",
            "BNP NT-proBNP heart failure diagnosis"
        ],
        "max_per_query": 10,
        "priority": "high"
    },
    {
        "topic": "hypertension",
        "display": "Hypertension Management",
        "category": "cardiovascular",
        "queries": [
            "hypertensive crisis emergency management",
            "hypertension diagnosis treatment guidelines",
            "blood pressure target clinical outcomes"
        ],
        "max_per_query": 10,
        "priority": "high"
    },
    {
        "topic": "arrhythmia",
        "display": "Cardiac Arrhythmias",
        "category": "cardiovascular",
        "queries": [
            "atrial fibrillation diagnosis management",
            "palpitations diagnosis workup emergency",
            "tachycardia differential diagnosis"
        ],
        "max_per_query": 10,
        "priority": "high"
    },
    # ── RESPIRATORY ─────────────────────
    {
        "topic": "pulmonary_embolism",
        "display": "Pulmonary Embolism",
        "category": "respiratory",
        "queries": [
            "pulmonary embolism diagnosis D-dimer CT angiography",
            "Wells score pulmonary embolism clinical prediction",
            "venous thromboembolism diagnosis treatment"
        ],
        "max_per_query": 15,
        "priority": "critical"
    },
    {
        "topic": "pneumonia",
        "display": "Pneumonia",
        "category": "respiratory",
        "queries": [
            "community acquired pneumonia diagnosis treatment",
            "pneumonia severity PSI CURB-65 score",
            "chest X-ray pneumonia diagnosis"
        ],
        "max_per_query": 10,
        "priority": "high"
    },
    {
        "topic": "asthma_copd",
        "display": "Asthma and COPD",
        "category": "respiratory",
        "queries": [
            "asthma exacerbation management emergency",
            "COPD exacerbation diagnosis treatment",
            "bronchospasm differential diagnosis"
        ],
        "max_per_query": 10,
        "priority": "high"
    },
    # ── NEUROLOGICAL ────────────────────
    {
        "topic": "stroke",
        "display": "Stroke and TIA",
        "category": "neurological",
        "queries": [
            "ischemic stroke diagnosis NIHSS thrombolysis",
            "TIA diagnosis risk stratification ABCD2 score",
            "stroke mimics differential diagnosis emergency",
            "FAST criteria stroke recognition prehospital"
        ],
        "max_per_query": 15,
        "priority": "critical"
    },
    {
        "topic": "meningitis",
        "display": "Meningitis and Encephalitis",
        "category": "neurological",
        "queries": [
            "bacterial meningitis diagnosis lumbar puncture",
            "meningitis clinical presentation diagnosis adults",
            "encephalitis diagnosis differential"
        ],
        "max_per_query": 10,
        "priority": "critical"
    },
    {
        "topic": "headache",
        "display": "Headache Disorders",
        "category": "neurological",
        "queries": [
            "thunderclap headache subarachnoid hemorrhage diagnosis",
            "migraine diagnosis treatment clinical",
            "secondary headache red flags diagnosis"
        ],
        "max_per_query": 10,
        "priority": "high"
    },
    {
        "topic": "seizure",
        "display": "Seizure Disorders",
        "category": "neurological",
        "queries": [
            "first seizure evaluation diagnosis adults",
            "status epilepticus management emergency",
            "seizure differential diagnosis syncope"
        ],
        "max_per_query": 10,
        "priority": "high"
    },
    # ── GASTROINTESTINAL ────────────────
    {
        "topic": "acute_abdomen",
        "display": "Acute Abdomen",
        "category": "gastrointestinal",
        "queries": [
            "acute abdominal pain diagnosis differential emergency",
            "appendicitis diagnosis clinical Alvarado score",
            "acute pancreatitis diagnosis severity Ranson criteria"
        ],
        "max_per_query": 10,
        "priority": "high"
    },
    {
        "topic": "gastrointestinal_bleeding",
        "display": "GI Bleeding",
        "category": "gastrointestinal",
        "queries": [
            "upper GI bleeding diagnosis management endoscopy",
            "GI bleed risk stratification Glasgow Blatchford score"
        ],
        "max_per_query": 10,
        "priority": "high"
    },
    # ── INFECTIOUS DISEASE ──────────────
    {
        "topic": "sepsis",
        "display": "Sepsis",
        "category": "infectious",
        "queries": [
            "sepsis diagnosis qSOFA SIRS criteria 2024",
            "septic shock management surviving sepsis campaign",
            "sepsis biomarkers procalcitonin lactate diagnosis"
        ],
        "max_per_query": 15,
        "priority": "critical"
    },
    {
        "topic": "fever_diagnosis",
        "display": "Fever of Unknown Origin",
        "category": "infectious",
        "queries": [
            "fever unknown origin diagnosis workup",
            "fever adult emergency evaluation diagnosis",
            "infectious disease diagnosis fever returning traveler"
        ],
        "max_per_query": 10,
        "priority": "medium"
    },
    # ── ENDOCRINE ───────────────────────
    {
        "topic": "diabetes_emergency",
        "display": "Diabetic Emergencies",
        "category": "endocrine",
        "queries": [
            "diabetic ketoacidosis DKA diagnosis management",
            "hypoglycemia diagnosis treatment emergency",
            "hyperglycemic crisis management clinical"
        ],
        "max_per_query": 10,
        "priority": "critical"
    },
    {
        "topic": "thyroid",
        "display": "Thyroid Disorders",
        "category": "endocrine",
        "queries": [
            "thyroid storm diagnosis management",
            "hypothyroidism diagnosis clinical presentation",
            "hyperthyroidism symptoms diagnosis"
        ],
        "max_per_query": 8,
        "priority": "medium"
    },
    # ── PHARMACOLOGY ────────────────────
    {
        "topic": "drug_interactions",
        "display": "Drug Interactions",
        "category": "pharmacology",
        "queries": [
            "clinically significant drug interactions emergency medicine",
            "anticoagulant drug interactions warfarin management",
            "serotonin syndrome drug interaction SSRI diagnosis",
            "drug interaction adverse events hospitalized patients"
        ],
        "max_per_query": 15,
        "priority": "critical"
    },
    {
        "topic": "drug_contraindications",
        "display": "Drug Contraindications",
        "category": "pharmacology",
        "queries": [
            "medication contraindications clinical safety",
            "drug allergy cross-reactivity penicillin",
            "renal dosing adjustment common medications"
        ],
        "max_per_query": 10,
        "priority": "high"
    },
    # ── EMERGENCY MEDICINE ──────────────
    {
        "topic": "triage_scoring",
        "display": "Emergency Triage",
        "category": "emergency",
        "queries": [
            "emergency triage scoring systems clinical validation",
            "early warning score NEWS2 clinical outcomes",
            "vital signs abnormal thresholds clinical significance"
        ],
        "max_per_query": 10,
        "priority": "high"
    },
    {
        "topic": "anaphylaxis",
        "display": "Anaphylaxis",
        "category": "emergency",
        "queries": [
            "anaphylaxis diagnosis management epinephrine",
            "allergic reaction severity grading clinical"
        ],
        "max_per_query": 10,
        "priority": "critical"
    },
    # ── DIAGNOSTICS ─────────────────────
    {
        "topic": "ecg_interpretation",
        "display": "ECG Interpretation",
        "category": "diagnostics",
        "queries": [
            "ECG interpretation clinical decision making",
            "ST elevation diagnosis MI criteria",
            "ECG arrhythmia diagnosis emergency"
        ],
        "max_per_query": 10,
        "priority": "high"
    },
    {
        "topic": "lab_interpretation",
        "display": "Laboratory Interpretation",
        "category": "diagnostics",
        "queries": [
            "troponin interpretation acute coronary syndrome diagnosis",
            "D-dimer clinical utility diagnosis",
            "CBC interpretation clinical significance",
            "creatinine eGFR kidney function diagnosis"
        ],
        "max_per_query": 10,
        "priority": "high"
    },
    # ── CLINICAL DECISION MAKING ────────
    {
        "topic": "clinical_decision_support",
        "display": "Clinical Decision Support",
        "category": "clinical_ai",
        "queries": [
            "clinical decision support AI machine learning emergency medicine",
            "differential diagnosis clinical reasoning physicians",
            "diagnostic accuracy clinical prediction rules"
        ],
        "max_per_query": 10,
        "priority": "medium"
    }
]

PRIORITY_QUERIES = [q for q in PUBMED_SEARCH_QUERIES if q["priority"] in ["critical", "high"]]
