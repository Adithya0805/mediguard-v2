import { z } from 'zod';

export const vitalsSchema = z.object({
  bp: z.string().optional(),
  heart_rate: z.number().or(z.nan()).optional().nullable(),
  temperature: z.number().or(z.nan()).optional().nullable(),
  spo2: z.number().or(z.nan()).optional().nullable(),
  weight: z.number().or(z.nan()).optional().nullable(),
  height: z.number().or(z.nan()).optional().nullable()
});

export const patientIntakeSchema = z.object({
  patient_name: z.string().min(1, 'Patient name is required.'),
  age: z.number({ invalid_type_error: 'Age is required and must be a number.' }).min(0, 'Age cannot be negative.').max(120, 'Age cannot exceed 120.'),
  gender: z.enum(['male', 'female', 'other'], { errorMap: () => ({ message: 'Gender selection is required.' }) }),
  chief_complaint: z.string().min(10, 'Chief complaint must carry at least 10 characters.'),
  symptoms: z.array(z.string()).min(1, 'At least one symptom is required.'),
  medical_history: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  current_medications: z.array(z.string()).default([]),
  vitals: vitalsSchema.default({})
});

export type PatientIntakeFormValues = z.infer<typeof patientIntakeSchema>;
