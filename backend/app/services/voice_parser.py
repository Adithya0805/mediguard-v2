"""
MediGuard V2 — Clinical Voice NLP Parser
Day 6: AI-powered speech-to-structured-data extraction

Converts free-form clinical speech transcripts into structured
PatientInput data using Claude Haiku (fast, cost-efficient).
"""

from __future__ import annotations

import json
import time
import re
from typing import Any

from app.llm import get_fast_llm
from app.utils.logger import get_logger

logger = get_logger("app.services.voice_parser")

# Red flag symptom combination patterns
_RED_FLAG_PATTERNS: list[dict] = [
    {
        "keywords": ["chest pain", "radiation"],
        "flag": "[ALERT] RED FLAG DETECTED: Possible ACS/STEMI presentation (chest pain + radiation). Immediate ECG and cardiac workup recommended.",
    },
    {
        "keywords": ["chest pain", "diaphoresis"],
        "flag": "[ALERT] RED FLAG DETECTED: Possible ACS presentation (chest pain + diaphoresis). Immediate review recommended.",
    },
    {
        "keywords": ["severe headache", "visual"],
        "flag": "[ALERT] RED FLAG DETECTED: Possible stroke or hypertensive emergency (severe headache + visual changes). Immediate neurological review recommended.",
    },
    {
        "keywords": ["difficulty breathing", "spo2"],
        "flag": "[ALERT] RED FLAG DETECTED: Possible respiratory emergency (dyspnea + low SpO2). Immediate airway/O2 assessment required.",
    },
    {
        "keywords": ["dyspnea", "spo2"],
        "flag": "[ALERT] RED FLAG DETECTED: Possible respiratory emergency (dyspnea + low SpO2). Immediate airway/O2 assessment required.",
    },
    {
        "keywords": ["fever", "neck stiffness"],
        "flag": "[ALERT] RED FLAG DETECTED: Possible meningitis presentation (fever + neck stiffness). Urgent LP and IV antibiotics consideration required.",
    },
    {
        "keywords": ["fever", "stiff neck"],
        "flag": "[ALERT] RED FLAG DETECTED: Possible meningitis presentation (fever + stiff neck). Urgent LP and IV antibiotics consideration required.",
    },
    {
        "keywords": ["fever", "confusion"],
        "flag": "[ALERT] RED FLAG DETECTED: Possible meningitis / encephalitis (fever + confusion). Immediate neurological and infectious disease review required.",
    },
    {
        "keywords": ["fever", "rash"],
        "flag": "[ALERT] RED FLAG DETECTED: Possible meningococcal disease or serious systemic infection (fever + rash). Immediate clinical review recommended.",
    },
    {
        "keywords": ["unilateral weakness", "slurred speech"],
        "flag": "[ALERT] RED FLAG DETECTED: Possible stroke presentation (unilateral weakness + slurred speech). Activate stroke protocol immediately.",
    },
    {
        "keywords": ["weakness", "facial droop", "speech"],
        "flag": "[ALERT] RED FLAG DETECTED: Possible stroke (weakness + facial droop + speech difficulty). FAST assessment and CT urgently required.",
    },
    {
        "keywords": ["severe abdominal pain", "rigid"],
        "flag": "[ALERT] RED FLAG DETECTED: Possible acute abdomen (severe pain + rigidity). Immediate surgical consult recommended.",
    },
    {
        "keywords": ["rash", "petechiae"],
        "flag": "[ALERT] RED FLAG DETECTED: Possible meningococcal septicaemia (rash + petechiae). Immediate IV antibiotics and isolation required.",
    },
]

_SYSTEM_PROMPT = """You are a clinical data extraction AI working in a hospital intake system.
Your job is to extract structured patient information from free-form speech transcripts spoken by nurses and physicians during patient registration.

The speech may be informal, contain hesitations, use colloquial terms for medical conditions, or mix clinical and everyday language.

EXTRACTION RULES:
1. Extract ONLY information explicitly stated. Never infer or assume.
2. Convert informal terms to clinical equivalents:
   "sweating a lot" → "diaphoresis"
   "feels dizzy" → "dizziness / vertigo"
   "trouble breathing" → "dyspnea"
   "chest tightness" → "chest tightness / angina"
   "heart racing" → "palpitations / tachycardia"
   "stomach pain" → "abdominal pain"
   "throwing up" → "vomiting / emesis"
   "can't breathe" → "dyspnea"
   "passed out" → "syncope"
   "fits" → "seizure"
   "stiff neck" → "neck stiffness"
   "feeling sick" → "nausea"
3. Extract age as integer (years only)
4. Extract gender: male/female/other only
5. Chief complaint = the PRIMARY reason for visit in ONE clear sentence. Include duration if mentioned.
6. Symptoms = list of individual clinical symptoms as short clinical phrases
7. Medical history = past diagnoses, surgeries, chronic conditions
8. Medications = drug name + dose if mentioned e.g. "metformin 500mg" not just "metformin"
9. Allergies = substance only, not reaction
10. Vitals: extract if mentioned in speech:
   Blood pressure format: "120/80"
   Temperature: number in Celsius
   Heart rate: number as integer (bpm)
   SpO2: number as integer percentage
   Weight: number in kg
   Height: number in cm
11. Duration: if mentioned, include in chief_complaint e.g. "chest pain for 2 hours"
12. extraction_confidence: 0.0-1.0 — how complete the extracted data is
13. fields_extracted: list of field names that had data found
14. fields_missing: list of required fields still empty after extraction
15. parser_notes: any ambiguity or clinical flags noticed

Respond ONLY in valid JSON. No explanation text. If a field has no information use empty string "" or empty list []. Never use null."""


class ClinicalVoiceParser:
    """
    AI-powered clinical NLP parser.
    Converts free-form speech transcripts into structured PatientInput.
    """

    def __init__(self) -> None:
        self.llm = get_fast_llm()

    async def parse_transcript(self, transcript: str) -> dict[str, Any]:
        """
        Send transcript to Claude Haiku for structured extraction.
        Returns a fully validated parsed dict.
        """
        user_prompt = f"""Extract structured patient data from this clinical intake transcript:

"{transcript}"

Return this exact JSON structure:
{{
    "patient_name": "",
    "patient_age": 0,
    "patient_gender": "",
    "chief_complaint": "",
    "symptoms": [],
    "medical_history": [],
    "current_medications": [],
    "allergies": [],
    "vitals": {{
        "bp": "",
        "heart_rate": 0,
        "temperature": 0.0,
        "spo2": 0,
        "weight": 0,
        "height": 0
    }},
    "extraction_confidence": 0.0,
    "fields_extracted": [],
    "fields_missing": [],
    "parser_notes": ""
}}"""

        try:
            # Invoke Claude Haiku
            from langchain_core.messages import HumanMessage, SystemMessage
            messages = [
                SystemMessage(content=_SYSTEM_PROMPT),
                HumanMessage(content=user_prompt),
            ]
            response = await self.llm.ainvoke(messages)
            content = response.content if hasattr(response, "content") else response
            
            if isinstance(content, list):
                parts = []
                for part in content:
                    if isinstance(part, str):
                        parts.append(part)
                    elif isinstance(part, dict) and "text" in part:
                        parts.append(part["text"])
                    elif hasattr(part, "text"):
                        parts.append(part.text)
                    elif isinstance(part, dict) and part.get("type") == "text" and "text" in part:
                        parts.append(part["text"])
                raw = "".join(parts)
            elif isinstance(content, str):
                raw = content
            else:
                raw = str(content)
        except Exception as e:
            logger.error("LLM invocation failed in voice parser", error=str(e))
            return self._empty_result(f"LLM error: {str(e)}")

        # Parse JSON from response
        parsed = self._safe_parse_json(raw)
        if parsed is None:
            logger.warning("Failed to parse JSON from LLM voice response", raw_preview=raw[:200])
            return self._empty_result("JSON parse error from LLM response")

        # Sanitise and validate
        return self._sanitise(parsed)

    async def validate_and_enhance(self, parsed_data: dict, original_transcript: str) -> dict:
        """
        Post-parse enhancement:
        - Check for clinical red flags
        - Clean medication list
        - Update confidence notes
        """
        existing_notes = parsed_data.get("parser_notes", "")
        if isinstance(existing_notes, list):
            existing_notes = " | ".join(str(n) for n in existing_notes if n)
        elif not isinstance(existing_notes, str):
            existing_notes = str(existing_notes) if existing_notes else ""
        notes: list[str] = [existing_notes]
        red_flag_detected = False

        # Check red flags against symptoms + chief complaint text
        symptom_text = (
            " ".join(parsed_data.get("symptoms", []))
            + " "
            + parsed_data.get("chief_complaint", "")
            + " "
            + original_transcript
        ).lower()

        for pattern in _RED_FLAG_PATTERNS:
            if all(kw in symptom_text for kw in pattern["keywords"]):
                notes.append(pattern["flag"])
                red_flag_detected = True

        # Clean medications: deduplicate case-insensitively
        meds = parsed_data.get("current_medications", [])
        seen_meds: set[str] = set()
        clean_meds: list[str] = []
        for med in meds:
            key = med.strip().lower()
            if key not in seen_meds:
                seen_meds.add(key)
                clean_meds.append(med.strip())
        parsed_data["current_medications"] = clean_meds

        # Join notes safely
        merged_notes = " | ".join(str(n) for n in notes if n and str(n).strip())
        parsed_data["parser_notes"] = merged_notes
        parsed_data["red_flags_detected"] = red_flag_detected

        return parsed_data

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _safe_parse_json(self, raw: str) -> dict | None:
        """Extract and parse JSON from potentially wrapped LLM response."""
        # Strip markdown code fences if present
        text = raw.strip()
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to find JSON object in response
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except json.JSONDecodeError:
                    pass
        return None

    def _sanitise(self, data: dict) -> dict:
        """Validate and clean extracted data."""
        # Ensure required keys exist
        data.setdefault("patient_name", "")
        data.setdefault("patient_age", 0)
        data.setdefault("patient_gender", "")
        data.setdefault("chief_complaint", "")
        data.setdefault("symptoms", [])
        data.setdefault("medical_history", [])
        data.setdefault("current_medications", [])
        data.setdefault("allergies", [])
        data.setdefault("vitals", {})
        data.setdefault("extraction_confidence", 0.0)
        data.setdefault("fields_extracted", [])
        data.setdefault("fields_missing", [])
        data.setdefault("parser_notes", "")

        # Validate age
        try:
            age = int(data["patient_age"])
            data["patient_age"] = age if 0 < age <= 120 else 0
        except (TypeError, ValueError):
            data["patient_age"] = 0

        # Clean vitals — zero means not mentioned
        vitals = data.get("vitals", {})
        if not isinstance(vitals, dict):
            vitals = {}

        def _clean_vital(val: Any, is_float: bool = False) -> Any:
            try:
                v = float(val) if is_float else int(val)
                return v if v > 0 else None
            except (TypeError, ValueError):
                return val if isinstance(val, str) and val.strip() else None

        vitals["heart_rate"] = _clean_vital(vitals.get("heart_rate", 0))
        vitals["temperature"] = _clean_vital(vitals.get("temperature", 0), is_float=True)
        vitals["spo2"] = _clean_vital(vitals.get("spo2", 0))
        vitals["weight"] = _clean_vital(vitals.get("weight", 0))
        vitals["height"] = _clean_vital(vitals.get("height", 0))
        vitals["bp"] = vitals.get("bp", "") or ""
        data["vitals"] = vitals

        # Ensure lists are actually lists
        for list_field in ("symptoms", "medical_history", "current_medications", "allergies", "fields_extracted", "fields_missing"):
            if not isinstance(data.get(list_field), list):
                data[list_field] = []

        # Clamp confidence
        try:
            conf = float(data["extraction_confidence"])
            data["extraction_confidence"] = max(0.0, min(1.0, conf))
        except (TypeError, ValueError):
            data["extraction_confidence"] = 0.0

        # Ensure parser_notes is a string (LLM sometimes returns a list)
        notes_val = data.get("parser_notes", "")
        if isinstance(notes_val, list):
            data["parser_notes"] = " | ".join(str(n) for n in notes_val if n)
        elif not isinstance(notes_val, str):
            data["parser_notes"] = str(notes_val) if notes_val else ""

        return data

    def _empty_result(self, note: str) -> dict:
        return {
            "patient_name": "",
            "patient_age": 0,
            "patient_gender": "",
            "chief_complaint": "",
            "symptoms": [],
            "medical_history": [],
            "current_medications": [],
            "allergies": [],
            "vitals": {"bp": "", "heart_rate": None, "temperature": None, "spo2": None, "weight": None, "height": None},
            "extraction_confidence": 0.0,
            "fields_extracted": [],
            "fields_missing": ["patient_name", "patient_age", "chief_complaint", "symptoms"],
            "parser_notes": note,
            "red_flags_detected": False,
        }

    @staticmethod
    def merge_with_existing(parsed: dict, existing: dict) -> dict:
        """
        Merge parsed voice data into existing form data.
        Existing non-empty values WIN over parsed values.
        Parsed values fill any empty existing fields.
        """
        merged = dict(existing)

        for key, parsed_val in parsed.items():
            existing_val = existing.get(key)
            # Skip metadata fields
            if key in ("extraction_confidence", "fields_extracted", "fields_missing", "parser_notes", "red_flags_detected"):
                merged[key] = parsed_val
                continue

            if isinstance(existing_val, list):
                # Merge lists: existing + new unique items from parsed
                existing_set = {str(v).lower() for v in existing_val}
                additions = [v for v in (parsed_val or []) if str(v).lower() not in existing_set]
                merged[key] = list(existing_val) + additions
            elif isinstance(existing_val, dict):
                # Merge dicts: existing values win, parsed fills empty fields
                merged_dict = dict(parsed_val or {})
                for dk, dv in (existing_val or {}).items():
                    if dv is not None and dv != "" and dv != 0:
                        merged_dict[dk] = dv
                merged[key] = merged_dict
            else:
                # Scalar: existing wins if non-empty
                if existing_val is None or existing_val == "" or existing_val == 0:
                    merged[key] = parsed_val
                else:
                    merged[key] = existing_val

        return merged
