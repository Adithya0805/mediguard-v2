"""
MediGuard V2 — Clinical Symptom Cluster Knowledge Base
Day 6: Smart Symptom Intelligence

This is the in-memory knowledge base for clinical symptom suggestions.
No LLM calls are made — all lookups are pure dictionary operations < 1ms.
"""

SYMPTOM_CLUSTERS: dict = {

    # ── CARDIAC ─────────────────────────────────────────────────────────────

    "chest pain": {
        "display": "Chest Pain",
        "icd10_category": "R07",
        "related_symptoms": [
            "radiation to left arm",
            "radiation to jaw",
            "diaphoresis",
            "dyspnea",
            "nausea",
            "palpitations",
            "dizziness",
            "syncope",
            "epigastric pain",
        ],
        "clinical_context": "cardiac",
        "red_flag_combinations": [
            ["radiation to left arm", "diaphoresis"],
            ["radiation to jaw", "dyspnea"],
            ["syncope", "diaphoresis"],
        ],
        "ask_about": [
            "How long has the pain been present?",
            "Does it radiate to the arm or jaw?",
            "Is there associated sweating?",
            "Any previous cardiac history?",
        ],
        "urgency_hint": "high",
    },

    "palpitations": {
        "display": "Palpitations",
        "icd10_category": "R00.2",
        "related_symptoms": [
            "chest pain",
            "shortness of breath",
            "dizziness",
            "syncope",
            "anxiety",
            "sweating",
            "fatigue",
        ],
        "clinical_context": "cardiac",
        "red_flag_combinations": [
            ["syncope", "chest pain"],
            ["shortness of breath", "tachycardia"],
        ],
        "ask_about": [
            "Regular or irregular rhythm?",
            "Any associated chest pain?",
            "Did they lose consciousness?",
            "Onset sudden or gradual?",
        ],
        "urgency_hint": "medium",
    },

    "syncope": {
        "display": "Syncope / Loss of Consciousness",
        "icd10_category": "R55",
        "related_symptoms": [
            "palpitations",
            "chest pain",
            "dizziness",
            "diaphoresis",
            "nausea",
            "weakness",
            "seizure",
        ],
        "clinical_context": "cardiac",
        "red_flag_combinations": [
            ["chest pain", "diaphoresis"],
            ["palpitations", "tachycardia"],
            ["seizure", "confusion"],
        ],
        "ask_about": [
            "Was there a warning before loss of consciousness?",
            "How long were they unconscious?",
            "Any cardiac history?",
            "Any seizure-like movements?",
        ],
        "urgency_hint": "high",
    },

    # ── NEUROLOGICAL ─────────────────────────────────────────────────────────

    "headache": {
        "display": "Headache",
        "icd10_category": "R51",
        "related_symptoms": [
            "nausea",
            "vomiting",
            "photophobia",
            "phonophobia",
            "neck stiffness",
            "visual disturbances",
            "fever",
            "confusion",
            "weakness",
        ],
        "clinical_context": "neurological",
        "red_flag_combinations": [
            ["neck stiffness", "fever"],
            ["sudden onset", "worst headache of life"],
            ["visual disturbances", "hypertension"],
        ],
        "ask_about": [
            "Was onset sudden or gradual?",
            "Any neck stiffness?",
            "Any visual changes?",
            "Fever present?",
        ],
        "urgency_hint": "medium",
    },

    "dizziness": {
        "display": "Dizziness / Vertigo",
        "icd10_category": "R42",
        "related_symptoms": [
            "nausea",
            "vomiting",
            "tinnitus",
            "hearing loss",
            "headache",
            "syncope",
            "palpitations",
            "weakness",
            "visual disturbances",
        ],
        "clinical_context": "neurological",
        "red_flag_combinations": [
            ["headache", "weakness"],
            ["syncope", "palpitations"],
            ["sudden onset", "diplopia"],
        ],
        "ask_about": [
            "Room spinning or lightheaded?",
            "Any hearing changes?",
            "Did they lose consciousness?",
            "Any recent head injury?",
        ],
        "urgency_hint": "medium",
    },

    "weakness": {
        "display": "Weakness / Fatigue",
        "icd10_category": "R53",
        "related_symptoms": [
            "numbness",
            "tingling",
            "slurred speech",
            "facial drooping",
            "confusion",
            "headache",
            "vision changes",
            "difficulty walking",
        ],
        "clinical_context": "neurological",
        "red_flag_combinations": [
            ["unilateral", "facial drooping"],
            ["slurred speech", "sudden onset"],
            ["arm weakness", "leg weakness"],
        ],
        "ask_about": [
            "One side or both sides?",
            "Any speech difficulties?",
            "Sudden or gradual onset?",
            "Any facial drooping?",
        ],
        "urgency_hint": "high",
    },

    "confusion": {
        "display": "Confusion / Altered Mental Status",
        "icd10_category": "R41.3",
        "related_symptoms": [
            "fever",
            "headache",
            "seizure",
            "weakness",
            "speech difficulty",
            "agitation",
            "memory loss",
        ],
        "clinical_context": "neurological",
        "red_flag_combinations": [
            ["fever", "neck stiffness"],
            ["sudden onset", "focal weakness"],
            ["seizure", "confusion"],
        ],
        "ask_about": [
            "Sudden or gradual onset?",
            "Any fever?",
            "Any seizure activity?",
            "Baseline mental status?",
        ],
        "urgency_hint": "critical",
    },

    "seizure": {
        "display": "Seizure / Convulsions",
        "icd10_category": "R56",
        "related_symptoms": [
            "confusion",
            "loss of consciousness",
            "incontinence",
            "tongue bite",
            "post-ictal state",
            "headache",
            "weakness",
        ],
        "clinical_context": "neurological",
        "red_flag_combinations": [
            ["first seizure", "fever"],
            ["status epilepticus", "prolonged"],
            ["head trauma", "seizure"],
        ],
        "ask_about": [
            "First seizure or known epileptic?",
            "Duration of seizure?",
            "Any post-ictal confusion?",
            "Any recent head trauma or fever?",
        ],
        "urgency_hint": "critical",
    },

    # ── RESPIRATORY ───────────────────────────────────────────────────────────

    "shortness of breath": {
        "display": "Shortness of Breath / Dyspnea",
        "icd10_category": "R06.0",
        "related_symptoms": [
            "chest pain",
            "cough",
            "wheezing",
            "orthopnea",
            "ankle swelling",
            "fatigue",
            "palpitations",
            "cyanosis",
            "fever",
        ],
        "clinical_context": "respiratory",
        "red_flag_combinations": [
            ["spo2 < 90", "cyanosis"],
            ["chest pain", "tachycardia"],
            ["sudden onset", "pleuritic chest pain"],
        ],
        "ask_about": [
            "Is it worse lying flat?",
            "Any associated chest pain?",
            "Oxygen saturation reading?",
            "Recent immobilization or travel?",
        ],
        "urgency_hint": "high",
    },

    "cough": {
        "display": "Cough",
        "icd10_category": "R05",
        "related_symptoms": [
            "shortness of breath",
            "fever",
            "sputum production",
            "hemoptysis",
            "chest pain",
            "wheezing",
            "night sweats",
            "weight loss",
        ],
        "clinical_context": "respiratory",
        "red_flag_combinations": [
            ["hemoptysis", "weight loss"],
            ["high fever", "productive cough"],
            ["cough", "spo2 < 90"],
        ],
        "ask_about": [
            "Productive or dry cough?",
            "Any blood in sputum?",
            "Duration of cough?",
            "Any fever or night sweats?",
        ],
        "urgency_hint": "low",
    },

    # ── GASTROINTESTINAL ─────────────────────────────────────────────────────

    "abdominal pain": {
        "display": "Abdominal Pain",
        "icd10_category": "R10",
        "related_symptoms": [
            "nausea",
            "vomiting",
            "diarrhea",
            "constipation",
            "bloating",
            "loss of appetite",
            "fever",
            "jaundice",
            "rectal bleeding",
            "urinary symptoms",
        ],
        "clinical_context": "gastrointestinal",
        "red_flag_combinations": [
            ["rigid abdomen", "severe pain"],
            ["rectal bleeding", "weight loss"],
            ["jaundice", "fever", "pain"],
        ],
        "ask_about": [
            "Location of pain?",
            "Onset sudden or gradual?",
            "Any vomiting or diarrhea?",
            "Last bowel movement?",
        ],
        "urgency_hint": "medium",
    },

    "nausea": {
        "display": "Nausea",
        "icd10_category": "R11",
        "related_symptoms": [
            "vomiting",
            "abdominal pain",
            "diarrhea",
            "loss of appetite",
            "dizziness",
            "headache",
            "fever",
        ],
        "clinical_context": "gastrointestinal",
        "red_flag_combinations": [
            ["severe vomiting", "dehydration"],
            ["blood in vomit", "abdominal pain"],
        ],
        "ask_about": [
            "Any vomiting?",
            "Blood in vomit?",
            "Duration?",
            "Recent food intake?",
        ],
        "urgency_hint": "low",
    },

    "bleeding": {
        "display": "Bleeding / Hemorrhage",
        "icd10_category": "R58",
        "related_symptoms": [
            "pain",
            "dizziness",
            "weakness",
            "hypotension",
            "tachycardia",
            "pallor",
        ],
        "clinical_context": "hematological",
        "red_flag_combinations": [
            ["heavy bleeding", "hypotension"],
            ["hemoptysis", "respiratory distress"],
            ["gastrointestinal bleed", "tachycardia"],
        ],
        "ask_about": [
            "Site and quantity of bleeding?",
            "Onset and duration?",
            "On anticoagulants?",
            "Any trauma?",
        ],
        "urgency_hint": "high",
    },

    # ── INFECTIOUS ────────────────────────────────────────────────────────────

    "fever": {
        "display": "Fever / Pyrexia",
        "icd10_category": "R50",
        "related_symptoms": [
            "chills",
            "rigors",
            "sweating",
            "headache",
            "body aches",
            "fatigue",
            "loss of appetite",
            "confusion",
            "neck stiffness",
            "rash",
        ],
        "clinical_context": "infectious",
        "red_flag_combinations": [
            ["neck stiffness", "photophobia"],
            ["confusion", "hypotension"],
            ["rash", "petechiae"],
        ],
        "ask_about": [
            "Temperature reading?",
            "Duration of fever?",
            "Any rash?",
            "Recent travel history?",
        ],
        "urgency_hint": "medium",
    },

    "rash": {
        "display": "Rash / Skin Eruption",
        "icd10_category": "R21",
        "related_symptoms": [
            "fever",
            "itching",
            "blistering",
            "petechiae",
            "urticaria",
            "swelling",
            "joint pain",
        ],
        "clinical_context": "dermatological",
        "red_flag_combinations": [
            ["petechiae", "fever"],
            ["urticaria", "dyspnea"],
            ["rash", "hypotension"],
        ],
        "ask_about": [
            "Distribution of rash?",
            "Any associated fever?",
            "Recent medications or exposures?",
            "Any petechiae or purpura?",
        ],
        "urgency_hint": "medium",
    },

    # ── MUSCULOSKELETAL ───────────────────────────────────────────────────────

    "back pain": {
        "display": "Back Pain",
        "icd10_category": "M54",
        "related_symptoms": [
            "leg weakness",
            "numbness",
            "urinary incontinence",
            "saddle anesthesia",
            "radiating leg pain",
            "fever",
        ],
        "clinical_context": "musculoskeletal",
        "red_flag_combinations": [
            ["saddle anesthesia", "urinary incontinence"],
            ["fever", "severe back pain"],
            ["leg weakness", "sudden onset"],
        ],
        "ask_about": [
            "Any leg weakness or numbness?",
            "Any bladder or bowel changes?",
            "Trauma history?",
            "Fever present?",
        ],
        "urgency_hint": "medium",
    },

    "joint pain": {
        "display": "Joint Pain / Arthralgia",
        "icd10_category": "M25.5",
        "related_symptoms": [
            "swelling",
            "redness",
            "fever",
            "rash",
            "morning stiffness",
            "fatigue",
        ],
        "clinical_context": "musculoskeletal",
        "red_flag_combinations": [
            ["fever", "hot swollen joint"],
            ["multiple joints", "rash"],
        ],
        "ask_about": [
            "Single or multiple joints?",
            "Any warmth or redness?",
            "Morning stiffness duration?",
            "Any recent infection?",
        ],
        "urgency_hint": "low",
    },

    "trauma": {
        "display": "Trauma / Injury",
        "icd10_category": "T14",
        "related_symptoms": [
            "pain",
            "swelling",
            "laceration",
            "bruising",
            "loss of consciousness",
            "confusion",
            "inability to weight bear",
        ],
        "clinical_context": "trauma",
        "red_flag_combinations": [
            ["head trauma", "loss of consciousness"],
            ["spinal injury", "weakness"],
            ["penetrating trauma", "hypotension"],
        ],
        "ask_about": [
            "Mechanism of injury?",
            "Any loss of consciousness?",
            "Neurological symptoms?",
            "Tetanus status?",
        ],
        "urgency_hint": "high",
    },

    # ── GENITOURINARY ─────────────────────────────────────────────────────────

    "urinary symptoms": {
        "display": "Urinary Symptoms",
        "icd10_category": "R30",
        "related_symptoms": [
            "fever",
            "flank pain",
            "hematuria",
            "dysuria",
            "frequency",
            "urgency",
            "nausea",
        ],
        "clinical_context": "urological",
        "red_flag_combinations": [
            ["fever", "flank pain"],
            ["hematuria", "weight loss"],
            ["urinary retention", "confusion"],
        ],
        "ask_about": [
            "Burning or pain on urination?",
            "Blood in urine?",
            "Fever or flank pain?",
            "Frequency and urgency?",
        ],
        "urgency_hint": "medium",
    },

    # ── ENDOCRINE/METABOLIC ───────────────────────────────────────────────────

    "swelling": {
        "display": "Swelling / Edema",
        "icd10_category": "R60",
        "related_symptoms": [
            "shortness of breath",
            "ankle swelling",
            "weight gain",
            "orthopnea",
            "fatigue",
            "chest pain",
        ],
        "clinical_context": "cardiovascular",
        "red_flag_combinations": [
            ["bilateral leg swelling", "dyspnea"],
            ["unilateral swelling", "calf tenderness"],
        ],
        "ask_about": [
            "Unilateral or bilateral?",
            "Pitting or non-pitting?",
            "Any associated shortness of breath?",
            "Duration and progression?",
        ],
        "urgency_hint": "medium",
    },

    "weight loss": {
        "display": "Weight Loss (Unintentional)",
        "icd10_category": "R63.4",
        "related_symptoms": [
            "loss of appetite",
            "fatigue",
            "night sweats",
            "cough",
            "fever",
            "diarrhea",
        ],
        "clinical_context": "systemic",
        "red_flag_combinations": [
            ["weight loss", "night sweats", "cough"],
            ["weight loss", "hemoptysis"],
            ["weight loss", "rectal bleeding"],
        ],
        "ask_about": [
            "How much weight lost and over what period?",
            "Any night sweats?",
            "Any cough or blood in stool?",
            "Change in appetite?",
        ],
        "urgency_hint": "medium",
    },

    # ── OPHTHALMOLOGICAL ─────────────────────────────────────────────────────

    "vision problems": {
        "display": "Visual Disturbances",
        "icd10_category": "H53",
        "related_symptoms": [
            "headache",
            "eye pain",
            "diplopia",
            "photophobia",
            "nausea",
            "weakness",
            "slurred speech",
        ],
        "clinical_context": "neurological",
        "red_flag_combinations": [
            ["sudden vision loss", "headache"],
            ["diplopia", "weakness"],
            ["eye pain", "nausea"],
        ],
        "ask_about": [
            "Sudden or gradual onset?",
            "One eye or both?",
            "Any associated headache?",
            "Double vision or blurring?",
        ],
        "urgency_hint": "high",
    },

    # ── PSYCHIATRIC ───────────────────────────────────────────────────────────

    "anxiety": {
        "display": "Anxiety / Panic",
        "icd10_category": "F41",
        "related_symptoms": [
            "palpitations",
            "shortness of breath",
            "chest pain",
            "diaphoresis",
            "tremor",
            "dizziness",
        ],
        "clinical_context": "psychiatric",
        "red_flag_combinations": [
            ["chest pain", "diaphoresis"],
            ["sudden onset", "palpitations"],
        ],
        "ask_about": [
            "First episode or recurring?",
            "Any chest pain or palpitations?",
            "Triggered by specific situation?",
            "Any cardiac history?",
        ],
        "urgency_hint": "low",
    },

    "depression": {
        "display": "Depression / Low Mood",
        "icd10_category": "F32",
        "related_symptoms": [
            "fatigue",
            "sleep disturbance",
            "loss of appetite",
            "weight loss",
            "anhedonia",
            "suicidal ideation",
        ],
        "clinical_context": "psychiatric",
        "red_flag_combinations": [
            ["suicidal ideation", "plan"],
            ["depression", "psychosis"],
        ],
        "ask_about": [
            "Any thoughts of self-harm or suicide?",
            "Duration of symptoms?",
            "Sleep and appetite changes?",
            "Functioning at work/home?",
        ],
        "urgency_hint": "medium",
    },

    # ── PAIN (GENERAL) ────────────────────────────────────────────────────────

    "pain": {
        "display": "Pain (General)",
        "icd10_category": "R52",
        "related_symptoms": [
            "fever",
            "swelling",
            "nausea",
            "weakness",
        ],
        "clinical_context": "general",
        "red_flag_combinations": [
            ["severe pain", "hypotension"],
        ],
        "ask_about": [
            "Location and character of pain?",
            "Severity on 0-10 scale?",
            "Radiation?",
            "What makes it better or worse?",
        ],
        "urgency_hint": "medium",
    },
}


# ── SYMPTOM ALIASES ───────────────────────────────────────────────────────────
# Maps colloquial / informal terms to their clinical equivalents

SYMPTOM_ALIASES: dict[str, str] = {
    "sweating":                "diaphoresis",
    "sweating a lot":          "diaphoresis",
    "heavy sweating":          "diaphoresis",
    "throwing up":             "vomiting",
    "been sick":               "vomiting",
    "stomach's killing her":   "abdominal pain",
    "stomach ache":            "abdominal pain",
    "tummy pain":              "abdominal pain",
    "can't breathe":           "dyspnea",
    "trouble breathing":       "dyspnea",
    "struggling to breathe":   "dyspnea",
    "can't breathe properly":  "dyspnea",
    "heart racing":            "palpitations",
    "heart's been racing":     "palpitations",
    "racing heart":            "palpitations",
    "passed out":              "syncope",
    "fainted":                 "syncope",
    "blacked out":             "syncope",
    "fits":                    "seizure",
    "fitting":                 "seizure",
    "dizzy":                   "dizziness",
    "feeling dizzy":           "dizziness",
    "light headed":            "dizziness",
    "lightheaded":             "dizziness",
    "tired":                   "fatigue",
    "exhausted":               "fatigue",
    "no energy":               "fatigue",
    "confused":                "confusion",
    "not making sense":        "confusion",
    "tight chest":             "chest tightness",
    "chest tightness":         "chest tightness",
    "blood in urine":          "hematuria",
    "blood in pee":            "hematuria",
    "no appetite":             "anorexia",
    "not eating":              "anorexia",
    "yellow skin":             "jaundice",
    "yellow eyes":             "jaundice",
    "double vision":           "diplopia",
    "seeing double":           "diplopia",
    "blurred vision":          "visual disturbances",
    "blurry vision":           "visual disturbances",
    "stiff neck":              "neck stiffness",
    "neck's stiff":            "neck stiffness",
    "shortness of breath":     "dyspnea",
    "short of breath":         "dyspnea",
    "nauseous":                "nausea",
    "feeling sick":            "nausea",
    "feel sick":               "nausea",
    "vomiting":                "vomiting",
    "diarrhea":                "diarrhea",
    "diarrhoea":               "diarrhea",
    "rash on skin":            "rash",
    "skin rash":               "rash",
    "sore back":               "back pain",
    "back's killing me":       "back pain",
    "joint pain":              "joint pain",
    "achy joints":             "joint pain",
    "swollen":                 "swelling",
    "puffy":                   "swelling",
    "losing weight":           "weight loss",
    "lost weight":             "weight loss",
    "can't see properly":      "vision problems",
    "vision blurry":           "vision problems",
    "anxious":                 "anxiety",
    "panic attack":            "anxiety",
    "feeling down":            "depression",
    "very depressed":          "depression",
    "in pain":                 "pain",
    "painful":                 "pain",
}
