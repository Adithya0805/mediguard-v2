# Pre-built clinical demo cases for MediGuard V2 public demo mode

DEMO_CASES = {
  "cardiac": {
    "label": "Cardiac Emergency",
    "description": "65M with classic ACS presentation",
    "expected_urgency": "high",
    "expected_primary": "Acute Coronary Syndrome",
    "patient_data": {
      "patient_name": "Demo Patient — Cardiac",
      "patient_age": 65,
      "patient_gender": "male",
      "chief_complaint": "Severe chest pain radiating to left arm for 1 hour with sweating and nausea",
      "symptoms": [
        "chest pain",
        "radiation to left arm",
        "diaphoresis",
        "nausea",
        "shortness of breath"
      ],
      "medical_history": [
        "hypertension",
        "type 2 diabetes mellitus"
      ],
      "current_medications": [
        "metformin 500mg BD",
        "lisinopril 10mg OD",
        "aspirin 81mg OD",
        "atorvastatin 20mg OD"
      ],
      "allergies": ["penicillin"],
      "vitals": {
        "bp": "168/98",
        "heart_rate": 112,
        "temperature": 37.2,
        "spo2": 94,
        "weight": 82,
        "height": 170
      }
    }
  },

  "stroke": {
    "label": "Stroke Alert",
    "description": "67F with FAST positive presentation",
    "expected_urgency": "critical",
    "expected_primary": "Ischemic Stroke",
    "patient_data": {
      "patient_name": "Demo Patient — Neurology",
      "patient_age": 67,
      "patient_gender": "female",
      "chief_complaint": "Sudden onset left facial drooping, slurred speech, right arm weakness — 45 mins ago",
      "symptoms": [
        "facial drooping",
        "slurred speech",
        "arm weakness",
        "sudden onset",
        "headache"
      ],
      "medical_history": [
        "hypertension",
        "atrial fibrillation"
      ],
      "current_medications": [
        "amlodipine 5mg OD",
        "warfarin 5mg OD"
      ],
      "allergies": [],
      "vitals": {
        "bp": "188/110",
        "heart_rate": 88,
        "temperature": 37.1,
        "spo2": 97,
        "weight": 68,
        "height": 162
      }
    }
  },

  "respiratory": {
    "label": "Respiratory Distress",
    "description": "42F post-flight with possible PE",
    "expected_urgency": "high",
    "expected_primary": "Pulmonary Embolism",
    "patient_data": {
      "patient_name": "Demo Patient — Respiratory",
      "patient_age": 42,
      "patient_gender": "female",
      "chief_complaint": "Sudden dyspnea and right-sided chest pain after 10-hour flight",
      "symptoms": [
        "dyspnea",
        "pleuritic chest pain",
        "right leg swelling",
        "tachycardia",
        "anxiety"
      ],
      "medical_history": [
        "oral contraceptive use"
      ],
      "current_medications": [
        "oral contraceptive pill"
      ],
      "allergies": [],
      "vitals": {
        "bp": "110/72",
        "heart_rate": 118,
        "temperature": 37.4,
        "spo2": 91,
        "weight": 62,
        "height": 165
      }
    }
  },

  "drug_interaction": {
    "label": "Drug Interaction Alert",
    "description": "70M on warfarin prescribed aspirin — dangerous combo",
    "expected_urgency": "medium",
    "expected_primary": "Drug Interaction Risk",
    "patient_data": {
      "patient_name": "Demo Patient — Pharmacy",
      "patient_age": 70,
      "patient_gender": "male",
      "chief_complaint": "Medication review — started aspirin 100mg for knee pain while on warfarin",
      "symptoms": [
        "knee pain",
        "joint stiffness"
      ],
      "medical_history": [
        "atrial fibrillation",
        "knee osteoarthritis"
      ],
      "current_medications": [
        "warfarin 5mg OD",
        "aspirin 100mg OD",
        "bisoprolol 5mg OD"
      ],
      "allergies": [],
      "vitals": {
        "bp": "128/76",
        "heart_rate": 68,
        "temperature": 36.8,
        "spo2": 98,
        "weight": 78,
        "height": 168
      }
    }
  },

  "hypertensive_crisis": {
    "label": "Hypertensive Crisis",
    "description": "52F with BP 210/128 and visual disturbances",
    "expected_urgency": "critical",
    "expected_primary": "Hypertensive Crisis",
    "patient_data": {
      "patient_name": "Demo Patient — General",
      "patient_age": 52,
      "patient_gender": "female",
      "chief_complaint": "Severe headache with visual disturbances for 2 days — stopped BP medications",
      "symptoms": [
        "severe headache",
        "visual disturbances",
        "nausea",
        "dizziness",
        "blurred vision"
      ],
      "medical_history": [
        "hypertension",
        "migraine history"
      ],
      "current_medications": [],
      "allergies": ["NSAIDs"],
      "vitals": {
        "bp": "210/128",
        "heart_rate": 92,
        "temperature": 37.0,
        "spo2": 98,
        "weight": 70,
        "height": 160
      }
    }
  }
}

DEMO_CASE_KEYS = list(DEMO_CASES.keys())
