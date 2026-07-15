import httpx
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.utils.logger import get_logger
from app.utils.exceptions import FHIRImportException

logger = get_logger("app.services.fhir_import_client")

FHIR_BASE_URL = "https://hapi.fhir.org/baseR4"


class FHIRImportClient:
    """Async client to query and map data from the public HAPI FHIR R4 server."""

    def __init__(self):
        self.client = httpx.AsyncClient(timeout=15.0)
        self.base_url = FHIR_BASE_URL

    async def get_patient(self, patient_id: str) -> Optional[dict]:
        """Fetches raw FHIR Patient resource by ID. Returns None if 404."""
        url = f"{self.base_url}/Patient/{patient_id}"
        try:
            logger.info("Fetching FHIR Patient", patient_id=patient_id, url=url)
            res = await self.client.get(url, headers={"Accept": "application/fhir+json"})
            if res.status_code == 404:
                logger.warning("FHIR Patient not found", patient_id=patient_id)
                return None
            res.raise_for_status()
            return res.json()
        except httpx.HTTPStatusError as e:
            logger.error("HTTP error fetching FHIR patient", patient_id=patient_id, status=res.status_code, error=str(e))
            raise FHIRImportException(f"FHIR server error: {res.status_code} when fetching Patient {patient_id}")
        except Exception as e:
            logger.error("Unexpected error fetching FHIR patient", patient_id=patient_id, error=str(e))
            raise FHIRImportException(f"Failed to query Patient {patient_id}: {str(e)}")

    async def get_patient_observations(self, patient_id: str) -> List[dict]:
        """Retrieves vital signs observations for a patient."""
        url = f"{self.base_url}/Observation"
        params = {
            "patient": patient_id,
            "category": "vital-signs",
            "_sort": "-date",
            "_count": "10"
        }
        try:
            logger.info("Fetching FHIR Patient Observations", patient_id=patient_id)
            res = await self.client.get(url, params=params, headers={"Accept": "application/fhir+json"})
            res.raise_for_status()
            bundle = res.json()
            entries = bundle.get("entry", [])
            return [e["resource"] for e in entries if "resource" in e]
        except Exception as e:
            logger.warning("Error fetching FHIR observations", patient_id=patient_id, error=str(e))
            return []

    async def get_patient_medications(self, patient_id: str) -> List[dict]:
        """Retrieves medication statements or requests for a patient."""
        # Try MedicationStatement first
        url = f"{self.base_url}/MedicationStatement"
        params = {
            "patient": patient_id,
            "_count": "20"
        }
        try:
            logger.info("Fetching FHIR Patient MedicationStatements", patient_id=patient_id)
            res = await self.client.get(url, params=params, headers={"Accept": "application/fhir+json"})
            res.raise_for_status()
            bundle = res.json()
            entries = bundle.get("entry", [])
            results = [e["resource"] for e in entries if "resource" in e]
            if results:
                return results
        except Exception as e:
            logger.warning("Error fetching FHIR MedicationStatements", patient_id=patient_id, error=str(e))

        # Fallback to MedicationRequest
        url = f"{self.base_url}/MedicationRequest"
        try:
            logger.info("Fetching FHIR Patient MedicationRequests (fallback)", patient_id=patient_id)
            res = await self.client.get(url, params=params, headers={"Accept": "application/fhir+json"})
            res.raise_for_status()
            bundle = res.json()
            entries = bundle.get("entry", [])
            return [e["resource"] for e in entries if "resource" in e]
        except Exception as e:
            logger.warning("Error fetching FHIR MedicationRequests fallback", patient_id=patient_id, error=str(e))
            return []

    async def get_patient_allergies(self, patient_id: str) -> List[dict]:
        """Retrieves allergies for a patient."""
        url = f"{self.base_url}/AllergyIntolerance"
        params = {
            "patient": patient_id
        }
        try:
            logger.info("Fetching FHIR Patient AllergyIntolerances", patient_id=patient_id)
            res = await self.client.get(url, params=params, headers={"Accept": "application/fhir+json"})
            res.raise_for_status()
            bundle = res.json()
            entries = bundle.get("entry", [])
            return [e["resource"] for e in entries if "resource" in e]
        except Exception as e:
            logger.warning("Error fetching FHIR AllergyIntolerances", patient_id=patient_id, error=str(e))
            return []

    async def get_patient_conditions(self, patient_id: str) -> List[dict]:
        """Retrieves active conditions for a patient."""
        url = f"{self.base_url}/Condition"
        params = {
            "patient": patient_id,
            "clinical-status": "active"
        }
        try:
            logger.info("Fetching FHIR Patient Conditions", patient_id=patient_id)
            res = await self.client.get(url, params=params, headers={"Accept": "application/fhir+json"})
            res.raise_for_status()
            bundle = res.json()
            entries = bundle.get("entry", [])
            return [e["resource"] for e in entries if "resource" in e]
        except Exception as e:
            logger.warning("Error fetching FHIR Conditions", patient_id=patient_id, error=str(e))
            return []

    async def get_full_patient_bundle(self, patient_id: str) -> dict:
        """Runs all 5 queries concurrently and bundles results together."""
        patient_res, observations, medications, allergies, conditions = await asyncio.gather(
            self.get_patient(patient_id),
            self.get_patient_observations(patient_id),
            self.get_patient_medications(patient_id),
            self.get_patient_allergies(patient_id),
            self.get_patient_conditions(patient_id),
            return_exceptions=True
        )

        if isinstance(patient_res, Exception):
            raise FHIRImportException(f"Failed to query Patient resource: {str(patient_res)}")
        if not patient_res:
            raise FHIRImportException(f"Patient {patient_id} does not exist on the public FHIR server.")

        # Clean exceptions for lists, replacing with empty lists
        obs_list = observations if not isinstance(observations, Exception) else []
        med_list = medications if not isinstance(medications, Exception) else []
        allergy_list = allergies if not isinstance(allergies, Exception) else []
        cond_list = conditions if not isinstance(conditions, Exception) else []

        return {
            "patient": patient_res,
            "observations": obs_list,
            "medications": med_list,
            "allergies": allergy_list,
            "conditions": cond_list,
            "source": "HAPI FHIR R4 Public Server",
            "patient_id": patient_id,
            "fetched_at": datetime.utcnow().isoformat() + "Z"
        }

    async def map_to_intake_format(self, fhir_bundle: dict) -> dict:
        """Converts raw FHIR bundle resources to MediGuard PatientInput format."""
        patient = fhir_bundle.get("patient", {})
        patient_id = fhir_bundle.get("patient_id")

        # 1. Map Demographics (Name)
        names = patient.get("name", [])
        given_name = ""
        family_name = ""
        if names:
            name_obj = names[0]
            givens = name_obj.get("given", [])
            if givens:
                given_name = givens[0]
            family_name = name_obj.get("family", "")
        patient_name = f"{given_name} {family_name}".strip()
        if not patient_name:
            patient_name = f"FHIR Patient {patient_id}"

        # 2. Map Age
        birth_date_str = patient.get("birthDate")
        patient_age = 0
        if birth_date_str:
            try:
                birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d")
                today = datetime.utcnow()
                patient_age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            except Exception:
                pass

        # 3. Map Gender
        gender_raw = str(patient.get("gender", "other")).lower().strip()
        patient_gender = gender_raw if gender_raw in ["male", "female"] else "other"

        # 4. Map Vitals from Observations
        vitals = {}
        for obs in fhir_bundle.get("observations", []):
            codings = obs.get("code", {}).get("coding", [])
            code = codings[0].get("code") if codings else None
            text = obs.get("code", {}).get("text", "").lower()

            # BP check
            if code == "85354-9" or "blood pressure" in text:
                bp_str = None
                components = obs.get("component", [])
                if components:
                    systolic = None
                    diastolic = None
                    for comp in components:
                        comp_codings = comp.get("code", {}).get("coding", [])
                        comp_code = comp_codings[0].get("code") if comp_codings else None
                        if comp_code == "8480-6":
                            systolic = comp.get("valueQuantity", {}).get("value")
                        elif comp_code == "8462-4":
                            diastolic = comp.get("valueQuantity", {}).get("value")
                    if systolic is not None and diastolic is not None:
                        bp_str = f"{int(systolic)}/{int(diastolic)}"
                if not bp_str:
                    bp_str = obs.get("valueString")
                if bp_str:
                    vitals["bp"] = bp_str

            # Heart Rate check
            elif code == "8867-4" or "heart rate" in text:
                val = obs.get("valueQuantity", {}).get("value")
                if val is not None:
                    vitals["heart_rate"] = int(val)

            # Temp check
            elif code == "8310-5" or "temperature" in text:
                val = obs.get("valueQuantity", {}).get("value")
                if val is not None:
                    vitals["temperature"] = round(float(val), 1)

            # SpO2 check
            elif code == "59408-5" or "oxygen saturation" in text:
                val = obs.get("valueQuantity", {}).get("value")
                if val is not None:
                    vitals["spo2"] = int(val)

            # Weight check
            elif code == "29463-7" or "body weight" in text or "weight" in text:
                val = obs.get("valueQuantity", {}).get("value")
                if val is not None:
                    vitals["weight"] = round(float(val), 1)

            # Height check
            elif code == "8302-2" or "body height" in text or "height" in text:
                val = obs.get("valueQuantity", {}).get("value")
                if val is not None:
                    vitals["height"] = round(float(val), 1)

        # 5. Map Medications
        current_medications = []
        for med in fhir_bundle.get("medications", []):
            med_text = None
            if "medicationCodeableConcept" in med:
                med_text = med["medicationCodeableConcept"].get("text")
                if not med_text and "coding" in med["medicationCodeableConcept"] and med["medicationCodeableConcept"]["coding"]:
                    med_text = med["medicationCodeableConcept"]["coding"][0].get("display")
            elif "medicationReference" in med:
                med_text = med["medicationReference"].get("display")
            
            # Additional fallback checks for raw properties
            if not med_text:
                # Try from request
                med_text = med.get("medicationReference", {}).get("display") or med.get("medicationCodeableConcept", {}).get("text")

            if med_text and med_text not in current_medications:
                current_medications.append(med_text)

        # 6. Map Allergies
        allergies = []
        for allergy in fhir_bundle.get("allergies", []):
            allergy_text = None
            code_obj = allergy.get("code", {})
            codings = code_obj.get("coding", [])
            if codings:
                allergy_text = codings[0].get("display")
            if not allergy_text:
                allergy_text = code_obj.get("text")
            if allergy_text and allergy_text not in allergies:
                allergies.append(allergy_text)

        # 7. Map Conditions
        medical_history = []
        for cond in fhir_bundle.get("conditions", []):
            cond_text = None
            code_obj = cond.get("code", {})
            codings = code_obj.get("coding", [])
            if codings:
                cond_text = codings[0].get("display")
            if not cond_text:
                cond_text = code_obj.get("text")
            if cond_text and cond_text not in medical_history:
                medical_history.append(cond_text)

        return {
            "patient_name": patient_name,
            "patient_age": patient_age,
            "patient_gender": patient_gender,
            "chief_complaint": "",  # clinician must add manually
            "symptoms": [],  # clinician must add manually
            "medical_history": medical_history,
            "current_medications": current_medications,
            "allergies": allergies,
            "vitals": vitals,
            "fhir_imported": True,
            "fhir_patient_id": patient_id,
            "fhir_source": "HAPI FHIR R4 Public Server"
        }

    async def search_patients(self, name: Optional[str] = None, dob: Optional[str] = None) -> List[dict]:
        """Searches patients by name and/or DOB on the FHIR server."""
        url = f"{self.base_url}/Patient"
        params = {"_count": "10"}
        if name:
            params["name"] = name
        if dob:
            params["birthdate"] = dob

        try:
            logger.info("Searching FHIR Patients", name=name, dob=dob)
            res = await self.client.get(url, params=params, headers={"Accept": "application/fhir+json"})
            res.raise_for_status()
            bundle = res.json()
            entries = bundle.get("entry", [])
            results = []
            for entry in entries:
                resource = entry.get("resource")
                if not resource:
                    continue
                patient_id = resource.get("id")
                
                # Extract patient name
                names = resource.get("name", [])
                full_name = ""
                if names:
                    name_obj = names[0]
                    givens = name_obj.get("given", [])
                    given_name = givens[0] if givens else ""
                    family_name = name_obj.get("family", "")
                    full_name = f"{given_name} {family_name}".strip()
                if not full_name:
                    full_name = f"Patient {patient_id}"

                results.append({
                    "patient_id": patient_id,
                    "name": full_name,
                    "dob": resource.get("birthDate", "N/A"),
                    "gender": resource.get("gender", "other")
                })
            return results
        except Exception as e:
            logger.error("Error searching FHIR patients", error=str(e))
            return []

    async def close(self):
        await self.client.aclose()


# Export standard singleton client instance
fhir_import_client = FHIRImportClient()
