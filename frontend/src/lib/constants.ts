export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'MediGuard V2';

export const CLINICAL_ROLES = [
  { value: 'physician', label: 'Attending Physician' },
  { value: 'resident', label: 'Resident Physician' },
  { value: 'pharmacist', label: 'Clinical Pharmacist' },
  { value: 'nurse', label: 'Clinical Nurse' }
];

export const VITAL_THRESHOLDS = {
  heartRate: { min: 60, max: 100 },
  spo2: { min: 95 },
  temperature: { max: 38 }
};
