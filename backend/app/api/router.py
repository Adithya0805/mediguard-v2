from fastapi import APIRouter
from app.api.v1 import health, patient, report, auth, ehr, fhir_import, analytics, voice, symptoms

api_router = APIRouter()

# Include version 1 routers
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(patient.router, prefix="/patient", tags=["Patient Intake"])
api_router.include_router(report.router, prefix="/report", tags=["Clinical Report"])
api_router.include_router(auth.router, prefix="/auth", tags=["Clinician Authentication"])
api_router.include_router(ehr.router, prefix="/ehr", tags=["EHR Interoperability"])
api_router.include_router(fhir_import.router, prefix="/fhir", tags=["FHIR Patient Import"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Clinical Analytics"])

# Day 6 — Voice Intake & Smart Symptom Intelligence
api_router.include_router(voice.router, prefix="/voice", tags=["Voice Patient Intake"])
api_router.include_router(symptoms.router, prefix="/symptoms", tags=["Smart Symptom Intelligence"])


