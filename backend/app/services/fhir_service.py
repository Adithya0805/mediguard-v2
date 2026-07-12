from datetime import datetime
from typing import Dict, Any, List, Tuple
from app.utils.logger import get_logger

logger = get_logger("app.services.fhir_service")


class FHIRBundleGenerator:
    """Production-grade HL7 FHIR R4 JSON document bundle generator."""

    def __init__(self):
        self.FHIR_VERSION = "4.0.1"
        self.FHIR_BASE_URL = "https://mediguard.ai/fhir"

    def generate_bundle(
        self,
        report_data: Dict[str, Any],
        patient_data: Dict[str, Any],
        session_id: str
    ) -> Dict[str, Any]:
        """Generates a fully compliant FHIR R4 document bundle."""
        logger.info("Starting FHIR R4 document bundle construction...", session_id=session_id)
        
        utc_now = datetime.utcnow().isoformat() + "Z"
        
        entries = []

        # 1. Composition resource (the document itself)
        composition = self._build_composition(session_id, patient_data, report_data)
        entries.append({
            "fullUrl": f"{self.FHIR_BASE_URL}/Composition/{session_id}",
            "resource": composition
        })

        # 2. Patient resource
        patient = self._build_patient(patient_data, session_id)
        entries.append({
            "fullUrl": f"{self.FHIR_BASE_URL}/Patient/{session_id}",
            "resource": patient
        })

        # 3. Condition resources (one per DDx entry)
        ddx_list = report_data.get("differential_diagnosis", [])
        for idx, ddx in enumerate(ddx_list):
            condition = self._build_condition(ddx, session_id, idx)
            entries.append({
                "fullUrl": f"{self.FHIR_BASE_URL}/Condition/{session_id}-condition-{idx}",
                "resource": condition
            })

        # 4. Observation resources (one per vital sign)
        vitals = patient_data.get("vitals", {})
        vital_idx = 0
        for vital_key, vital_val in vitals.items():
            if vital_val is not None:
                observation = self._build_observation(vital_key, vital_val, session_id, vital_idx)
                entries.append({
                    "fullUrl": f"{self.FHIR_BASE_URL}/Observation/{session_id}-obs-{vital_idx}",
                    "resource": observation
                })
                vital_idx += 1

        # 5. MedicationStatement resources (one per current medication)
        meds = patient_data.get("current_medications", [])
        for idx, med in enumerate(meds):
            med_stmt = self._build_medication_statement(med, session_id, idx)
            entries.append({
                "fullUrl": f"{self.FHIR_BASE_URL}/MedicationStatement/{session_id}-med-{idx}",
                "resource": med_stmt
            })

        # 6. DiagnosticReport resource (the overall report)
        report = self._build_diagnostic_report(report_data, session_id)
        entries.append({
            "fullUrl": f"{self.FHIR_BASE_URL}/DiagnosticReport/{session_id}-report",
            "resource": report
        })

        # 7. AllergyIntolerance resources (one per allergy)
        allergies = patient_data.get("allergies", [])
        for idx, allergy in enumerate(allergies):
            allergy_res = self._build_allergy(allergy, session_id, idx)
            entries.append({
                "fullUrl": f"{self.FHIR_BASE_URL}/AllergyIntolerance/{session_id}-allergy-{idx}",
                "resource": allergy_res
            })

        bundle = {
            "resourceType": "Bundle",
            "id": session_id,
            "type": "document",
            "timestamp": utc_now,
            "entry": entries,
            "fda_data_used": report_data.get("fda_data_used", False)
        }

        logger.info("FHIR R4 bundle compiled successfully.", session_id=session_id, resources_count=len(entries))
        return bundle

    def _build_composition(
        self,
        session_id: str,
        patient_data: Dict[str, Any],
        report_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Constructs FHIR Composition resource representing clinical report cataloging."""
        utc_now = datetime.utcnow().isoformat() + "Z"
        
        # Build document narrative and clinical section divisions
        sections = [
            {
                "title": "Executive Summary",
                "text": {
                    "status": "generated",
                    "div": f"<div xmlns=\"http://www.w3.org/1999/xhtml\">{report_data.get('executive_summary', '')}</div>"
                }
            },
            {
                "title": "Differential Diagnosis Summary",
                "text": {
                    "status": "generated",
                    "div": f"<div xmlns=\"http://www.w3.org/1999/xhtml\">{report_data.get('differential_summary', '')}</div>"
                }
            },
            {
                "title": "Disposition & Follow-up Directions",
                "text": {
                    "status": "generated",
                    "div": f"<div xmlns=\"http://www.w3.org/1999/xhtml\">{report_data.get('disposition_recommendation', '')}</div>"
                }
            }
        ]

        return {
            "resourceType": "Composition",
            "id": session_id,
            "status": "final",
            "type": {
                "coding": [{
                    "system": "http://loinc.org",
                    "code": "11488-4",
                    "display": "Consult note"
                }]
            },
            "subject": {"reference": f"Patient/{session_id}"},
            "date": utc_now,
            "author": [{"display": "MediGuard V2 Clinical AI"}],
            "title": "MediGuard V2 Clinical Decision Support Report",
            "confidentiality": "N",
            "section": sections
        }

    def _build_patient(self, patient_data: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        """Constructs FHIR Patient demographic profile."""
        name = patient_data.get("patient_name", "Unknown")
        gender_raw = str(patient_data.get("gender", "unknown")).lower().strip()
        
        # Map to FHIR gender standard: male | female | other | unknown
        gender = "unknown"
        if gender_raw in ["male", "m"]:
            gender = "male"
        elif gender_raw in ["female", "f"]:
            gender = "female"
        elif gender_raw in ["other", "o"]:
            gender = "other"

        return {
            "resourceType": "Patient",
            "id": session_id,
            "active": True,
            "name": [{
                "use": "official",
                "text": name
            }],
            "gender": gender,
            "extension": [{
                "url": "http://hl7.org/fhir/StructureDefinition/patient-age",
                "valueAge": {
                    "value": patient_data.get("age", 0),
                    "unit": "years",
                    "system": "http://unitsofmeasure.org",
                    "code": "a"
                }
            }]
        }

    def _build_condition(self, ddx_entry: Dict[str, Any], session_id: str, index: int) -> Dict[str, Any]:
        """Constructs FHIR Condition representing a differential diagnosis."""
        diagnosis = ddx_entry.get("diagnosis", "Unknown Diagnosis")
        icd10 = ddx_entry.get("icd10_code", ddx_entry.get("icd_10", "N/A"))
        reasoning = ddx_entry.get("clinical_reasoning", "")
        confidence = float(ddx_entry.get("confidence", 0.0))

        return {
            "resourceType": "Condition",
            "id": f"{session_id}-condition-{index}",
            "clinicalStatus": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    "code": "active"
                }]
            },
            "verificationStatus": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                    "code": "provisional"
                }]
            },
            "code": {
                "coding": [{
                    "system": "http://hl7.org/fhir/sid/icd-10",
                    "code": icd10,
                    "display": diagnosis
                }],
                "text": diagnosis
            },
            "subject": {
                "reference": f"Patient/{session_id}"
            },
            "note": [{"text": reasoning}] if reasoning else [],
            "extension": [{
                "url": "https://mediguard.ai/fhir/StructureDefinition/diagnosis-confidence",
                "valueDecimal": confidence
            }]
        }

    def _build_observation(
        self,
        vital_key: str,
        vital_value: Any,
        session_id: str,
        index: int
    ) -> Dict[str, Any]:
        """Constructs FHIR Observation representing vital sign recordings."""
        # LOINC code map
        loinc_map = {
            "bp": ("85354-9", "Blood pressure panel"),
            "heart_rate": ("8867-4", "Heart rate"),
            "temperature": ("8310-5", "Body temperature"),
            "spo2": ("59408-5", "Oxygen saturation"),
            "weight": ("29463-7", "Body weight"),
            "height": ("8302-2", "Body height")
        }

        loinc_code, loinc_display = loinc_map.get(
            vital_key, ("unknown", vital_key.replace('_', ' ').title())
        )

        return {
            "resourceType": "Observation",
            "id": f"{session_id}-obs-{index}",
            "status": "final",
            "category": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                    "code": "vital-signs",
                    "display": "Vital Signs"
                }]
            }],
            "code": {
                "coding": [{
                    "system": "http://loinc.org",
                    "code": loinc_code,
                    "display": loinc_display
                }],
                "text": vital_key.replace('_', ' ').title()
            },
            "subject": {
                "reference": f"Patient/{session_id}"
            },
            "valueString": str(vital_value)
        }

    def _build_medication_statement(
        self,
        medication: str,
        session_id: str,
        index: int
    ) -> Dict[str, Any]:
        """Constructs FHIR MedicationStatement representing current drug routine."""
        return {
            "resourceType": "MedicationStatement",
            "id": f"{session_id}-med-{index}",
            "status": "active",
            "medicationCodeableConcept": {
                "text": medication
            },
            "subject": {
                "reference": f"Patient/{session_id}"
            }
        }

    def _build_diagnostic_report(self, report_data: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        """Constructs FHIR DiagnosticReport wrapper summarizing workflow conclusion."""
        summary = report_data.get("executive_summary", "")
        primary_diag = report_data.get("primary_diagnosis", {})
        diag_name = primary_diag.get("diagnosis", "N/A")
        diag_code = primary_diag.get("icd10_code", primary_diag.get("icd_10", "N/A"))

        return {
            "resourceType": "DiagnosticReport",
            "id": f"{session_id}-report",
            "status": "final",
            "category": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
                    "code": "GE",
                    "display": "General Medicine"
                }],
                "text": "clinical note"
            }],
            "code": {
                "coding": [{
                    "system": "http://loinc.org",
                    "code": "11488-4",
                    "display": "Consult note"
                }]
            },
            "subject": {
                "reference": f"Patient/{session_id}"
            },
            "conclusion": summary,
            "conclusionCode": [{
                "coding": [{
                    "system": "http://hl7.org/fhir/sid/icd-10",
                    "code": diag_code,
                    "display": diag_name
                }]
            }]
        }

    def _build_allergy(self, allergy: str, session_id: str, index: int) -> Dict[str, Any]:
        """Constructs FHIR AllergyIntolerance warning profile."""
        return {
            "resourceType": "AllergyIntolerance",
            "id": f"{session_id}-allergy-{index}",
            "clinicalStatus": {
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                    "code": "active"
                }]
            },
            "code": {
                "text": allergy
            },
            "patient": {
                "reference": f"Patient/{session_id}"
            }
        }

    def validate_bundle(self, bundle: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validates that a compiled bundle adheres structurally to FHIR specifications."""
        issues = []
        
        # Validate top-level elements
        if not isinstance(bundle, dict):
            return False, ["Bundle must be a JSON object (Python dictionary)"]

        if bundle.get("resourceType") != "Bundle":
            issues.append("Missing or incorrect resourceType (expected 'Bundle')")
            
        if not bundle.get("id"):
            issues.append("Bundle is missing a unique 'id'")
            
        if bundle.get("type") != "document":
            issues.append("Bundle type must be 'document'")
            
        if not bundle.get("timestamp"):
            issues.append("Bundle is missing a 'timestamp'")

        # Validate entries
        entries = bundle.get("entry", [])
        if not isinstance(entries, list):
            issues.append("Bundle 'entry' must be a JSON array (Python list)")
            return False, issues

        if not entries:
            issues.append("Bundle 'entry' is empty; at least one resource must be included")
            
        for i, entry in enumerate(entries):
            if not isinstance(entry, dict):
                issues.append(f"Entry at index {i} is not a valid JSON object")
                continue
                
            res = entry.get("resource")
            if not res:
                issues.append(f"Entry at index {i} is missing 'resource' envelope")
                continue
                
            if not res.get("resourceType"):
                issues.append(f"Entry at index {i} resource is missing 'resourceType'")
                
            if not res.get("id"):
                issues.append(f"Entry at index {i} resource is missing 'id'")

        is_valid = len(issues) == 0
        if is_valid:
            logger.info("FHIR bundle structural schema validation: PASS")
        else:
            logger.warning("FHIR bundle structural schema validation failed.", issues=issues)
            
        return is_valid, issues
