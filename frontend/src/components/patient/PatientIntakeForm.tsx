'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  patientIntakeSchema, 
  PatientIntakeFormValues 
} from '@/lib/validations';
import { createSession, generateReport, fetchEhrPatient } from '@/lib/api';
import SymptomTagInput from './SymptomTagInput';
import SmartSymptomInput from './SmartSymptomInput';
import VoiceRecorder from './VoiceRecorder';
import VitalsInput from './VitalsInput';
import FHIRImportModal from './FHIRImportModal';
import { CheckCircle2, Mic, PenLine, AlertTriangle } from 'lucide-react';
import { 
  User, 
  HeartPulse, 
  Stethoscope, 
  Pill, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle 
} from 'lucide-react';

type IntakeMode = 'manual' | 'voice' | 'fhir';

export default function PatientIntakeForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFhirModalOpen, setIsFhirModalOpen] = useState(false);
  const [isFhirImported, setIsFhirImported] = useState(false);
  const [intakeMode, setIntakeMode] = useState<IntakeMode>('manual');
  const [voiceIntakeComplete, setVoiceIntakeComplete] = useState(false);
  const [symptomRedFlags, setSymptomRedFlags] = useState<Array<{ combination: string[]; warning: string }>>([]);

  const handleFhirImport = (data: any) => {
    setIsFhirImported(true);
    setValue('patient_name', data.patient_name);
    setValue('age', data.patient_age);
    setValue('gender', data.patient_gender as any);
    setValue('chief_complaint', '');
    setValue('symptoms', []);
    setValue('medical_history', data.medical_history || []);
    setValue('allergies', data.allergies || []);
    setValue('current_medications', data.current_medications || []);
    setValue('vitals', {
      bp: data.vitals?.bp || '',
      heart_rate: data.vitals?.heart_rate,
      temperature: data.vitals?.temperature,
      spo2: data.vitals?.spo2,
      weight: data.vitals?.weight,
      height: data.vitals?.height
    });

    // Auto focus on chief_complaint
    setTimeout(() => {
      const el = document.getElementById('chief_complaint');
      if (el) {
        el.focus();
      }
    }, 150);
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger,
    setValue,
    formState: { errors }
  } = useForm<PatientIntakeFormValues>({
    resolver: zodResolver(patientIntakeSchema),
    defaultValues: {
      patient_name: '',
      age: undefined,
      gender: 'male',
      chief_complaint: '',
      symptoms: [],
      medical_history: [],
      allergies: [],
      current_medications: [],
      vitals: {
        bp: '',
        heart_rate: undefined,
        temperature: undefined,
        spo2: undefined,
        weight: undefined,
        height: undefined
      }
    }
  });

  const vitalsValues = watch('vitals') || {};
  const currentSymptoms = watch('symptoms') || [];
  const chiefComplaintVal = watch('chief_complaint') || '';

  const handleNextStep = async () => {
    let isValid = false;
    
    if (step === 1) {
      isValid = await trigger(['patient_name', 'age', 'gender', 'chief_complaint']);
    } else if (step === 2) {
      isValid = await trigger(['symptoms', 'medical_history', 'allergies']);
      if (currentSymptoms.length === 0) {
        toast.warning('At least one active symptom is required to initiate analysis.');
        return;
      }
    } else if (step === 3) {
      isValid = await trigger(['current_medications']);
    }

    if (isValid) {
      setStep((prev) => prev + 1);
    } else {
      toast.warning('Please review and complete all required fields.');
    }
  };

  const handleBackStep = () => {
    setStep((prev) => prev - 1);
  };

  const onSubmit = async (values: PatientIntakeFormValues) => {
    setIsSubmitting(true);
    
    // Clean up empty strings or NaN fields from vitals payload
    const cleanedVitals = { ...values.vitals };
    (Object.keys(cleanedVitals) as Array<keyof typeof cleanedVitals>).forEach((key) => {
      const val = cleanedVitals[key];
      if (val === '' || val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val))) {
        delete cleanedVitals[key];
      }
    });

    const sessionPayload = {
      ...values,
      vitals: cleanedVitals
    };

    try {
      // 1. Post to create patient session
      const sessionResponse = await createSession(sessionPayload);
      const sessionId = sessionResponse.session_id;

      // 2. Initiate graph execution (non-blocking on server, but awaited here to guarantee request delivery)
      try {
        await generateReport(sessionId);
      } catch (err) {
        console.error('Failed to trigger background analysis:', err);
      }

      // 3. Navigate immediately to case tracker
      toast.success('Patient Intake Registered! Launching Graph pipeline...');
      router.push(`/patient/${sessionId}`);

    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || 'Failed to submit patient intake data.');
      setIsSubmitting(false);
    }
  };

  const stepItems = [
    { num: 1, label: 'Demographics', icon: User },
    { num: 2, label: 'Symptoms', icon: Stethoscope },
    { num: 3, label: 'Medications', icon: Pill },
    { num: 4, label: 'Vitals', icon: HeartPulse }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto p-6 rounded-2xl bg-surface border border-border shadow-2xl">
      
      {/* 4-Step Progress Indicator */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/80">
        {stepItems.map((item) => {
          const StepIcon = item.icon;
          const isCompleted = item.num < step;
          const isActive = item.num === step;
          
          return (
            <div key={item.num} className="flex items-center gap-2 relative">
              <div className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all ${
                isCompleted 
                  ? 'bg-primary border-primary text-text-primary' 
                  : isActive 
                  ? 'bg-primary/10 border-primary text-primary shadow-[0_0_8px_var(--primary)]' 
                  : 'bg-background border-border text-text-muted'
              }`}>
                <StepIcon className="h-4 w-4" />
              </div>
              <span className={`text-xs font-semibold hidden sm:block ${
                isActive ? 'text-primary font-bold' : isCompleted ? 'text-text-primary' : 'text-text-muted'
              }`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Form Area */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-left"
            >
              {/* Mode Selector: Voice / Manual / FHIR */}
              <div className="p-4 rounded-xl bg-[#1f2937]/35 border border-border/80">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wide block mb-3">How to add patient information?</span>
                <div className="flex flex-wrap gap-2">
                  {([
                    { id: 'voice', label: '🎙️ Voice Intake', desc: 'Speak naturally' },
                    { id: 'manual', label: '✏️ Manual Entry', desc: 'Type fields manually' },
                    { id: 'fhir', label: '🏥 Import FHIR', desc: 'From FHIR server' },
                  ] as { id: IntakeMode; label: string; desc: string }[]).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setIntakeMode(mode.id);
                        if (mode.id === 'fhir') setIsFhirModalOpen(true);
                        if (mode.id !== 'voice') setVoiceIntakeComplete(false);
                      }}
                      className={`flex flex-col px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        intakeMode === mode.id
                          ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_8px_rgba(13,148,136,0.15)]'
                          : 'bg-background border-border text-text-muted hover:text-text-secondary'
                      }`}
                    >
                      <span>{mode.label}</span>
                      <span className="text-[9px] font-normal opacity-70">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Voice Recorder */}
              {intakeMode === 'voice' && !voiceIntakeComplete && (
                <VoiceRecorder
                  onParsed={(parsedData) => {
                    const pd = parsedData as Record<string, unknown>;
                    if (pd.patient_name) setValue('patient_name', pd.patient_name as string);
                    if (pd.patient_age && Number(pd.patient_age) > 0) setValue('age', Number(pd.patient_age));
                    if (pd.patient_gender) setValue('gender', pd.patient_gender as 'male' | 'female' | 'other');
                    if (pd.chief_complaint) setValue('chief_complaint', pd.chief_complaint as string);
                    if (Array.isArray(pd.symptoms) && pd.symptoms.length > 0) setValue('symptoms', pd.symptoms as string[]);
                    if (Array.isArray(pd.medical_history)) setValue('medical_history', pd.medical_history as string[]);
                    if (Array.isArray(pd.allergies)) setValue('allergies', pd.allergies as string[]);
                    if (Array.isArray(pd.current_medications)) setValue('current_medications', pd.current_medications as string[]);
                    const vitals = pd.vitals as Record<string, unknown>;
                    if (vitals) {
                      setValue('vitals', {
                        bp: (vitals.bp as string) || '',
                        heart_rate: vitals.heart_rate ? Number(vitals.heart_rate) : undefined,
                        temperature: vitals.temperature ? Number(vitals.temperature) : undefined,
                        spo2: vitals.spo2 ? Number(vitals.spo2) : undefined,
                        weight: vitals.weight ? Number(vitals.weight) : undefined,
                        height: vitals.height ? Number(vitals.height) : undefined,
                      });
                    }
                    setVoiceIntakeComplete(true);
                    setIntakeMode('manual'); // Switch to manual to review
                    setStep(2); // Skip to symptoms step
                  }}
                />
              )}

              {voiceIntakeComplete && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 leading-normal flex items-start gap-2.5 font-sans">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                  <span><b>✅ Voice intake complete.</b> Please review and add any missing information. Fields have been pre-filled from your voice description.</span>
                </div>
              )}

              {isFhirImported && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 leading-normal flex items-start gap-2.5 font-sans">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5 text-emerald-500" />
                  <span><b>Patient imported from FHIR server.</b> Please verify the pre-filled fields and enter the chief complaint and active symptoms below.</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <span>Patient Demographics</span>
                    {isFhirImported && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        FHIR Imported
                      </span>
                    )}
                  </h3>
                  <span className="text-xs text-text-secondary mt-0.5 font-sans">Enter patient identity and chief complaints.</span>
                </div>
                
                {/* Simulated EHR Sandbox Importer */}
                <div className="relative flex-shrink-0">
                  <select
                    onChange={async (e) => {
                      const patientId = e.target.value;
                      if (!patientId) return;
                      
                      const resolveEhr = async () => {
                        try {
                          const record = await fetchEhrPatient(patientId);
                          
                          // Programmatically fill all form fields
                          setValue('patient_name', record.patient_name);
                          setValue('age', record.age);
                          setValue('gender', record.gender as any);
                          setValue('chief_complaint', record.chief_complaint);
                          setValue('symptoms', record.symptoms);
                          setValue('medical_history', record.medical_history);
                          setValue('allergies', record.allergies);
                          setValue('current_medications', record.current_medications);
                          setValue('vitals', {
                            bp: record.vitals.bp || '',
                            heart_rate: record.vitals.heart_rate,
                            temperature: record.vitals.temperature,
                            spo2: record.vitals.spo2,
                            weight: record.vitals.weight,
                            height: record.vitals.height
                          });
                          
                          return record;
                        } catch (err: any) {
                          throw err;
                        }
                      };
                      
                      toast.promise(resolveEhr(), {
                        loading: 'Querying secure hospital Epic/Cerner EHR Sandbox...',
                        success: (data: any) => `Successfully imported ${data.patient_name}'s clinical chart!`,
                        error: (err: any) => err.message || 'Failed to query Epic/Cerner FHIR Sandbox.'
                      });
                      
                      // Reset select value to allow re-selection
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold focus:outline-none focus:border-primary transition-colors cursor-pointer hover:bg-primary/20 font-mono shadow-[0_0_8px_rgba(13,148,136,0.1)]"
                  >
                    <option value="" disabled className="bg-[#111827] text-text-secondary">⚡ Import Epic/Cerner Sandbox Chart</option>
                    <option value="PATIENT-ACS-9912" className="bg-[#111827] text-[#f1f5f9]">Jameson Parker (ACS Triage Chart)</option>
                    <option value="PATIENT-STROKE-4021" className="bg-[#111827] text-[#f1f5f9]">Eleanor Fitzgerald (Stroke Triage Chart)</option>
                  </select>
                </div>
              </div>

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Full Name (Required)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  {...register('patient_name')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors"
                />
                {errors.patient_name && (
                  <span className="text-[11px] text-danger font-semibold mt-1">{errors.patient_name.message}</span>
                )}
              </div>

              {/* Age & Gender Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Age */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Age (Years)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 45"
                    {...register('age', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors font-mono"
                  />
                  {errors.age && (
                    <span className="text-[11px] text-danger font-semibold mt-1">{errors.age.message}</span>
                  )}
                </div>

                {/* Gender */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Sex Mapped at Birth</label>
                  <select
                    required
                    {...register('gender')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Intersex</option>
                  </select>
                  {errors.gender && (
                    <span className="text-[11px] text-danger font-semibold mt-1">{errors.gender.message}</span>
                  )}
                </div>

              </div>

              {/* Chief Complaint */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Chief Complaint (Min 10 characters)</label>
                <textarea
                  id="chief_complaint"
                  required
                  rows={4}
                  placeholder="Describe patient's acute symptoms, pain vectors, timelines, and reasons for assessment..."
                  {...register('chief_complaint')}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-background text-text-primary text-sm focus:outline-none transition-colors leading-relaxed ${
                    isFhirImported && !chiefComplaintVal.trim()
                      ? 'border border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] focus:border-amber-500'
                      : 'border border-border focus:border-primary'
                  }`}
                />
                {errors.chief_complaint && (
                  <span className="text-[11px] text-danger font-semibold mt-1">{errors.chief_complaint.message}</span>
                )}
              </div>

            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-left"
            >
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-text-primary">Symptoms & History</h3>
                <span className="text-xs text-text-secondary mt-0.5">Input precise clinical symptoms, comorbidities, and allergy profiles.</span>
              </div>

              {/* Red flag warning from SmartSymptomInput */}
              {symptomRedFlags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-2.5"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-400">⚠️ Clinical alert detected. Please review before proceeding.</p>
                    {symptomRedFlags.map((f, i) => (
                      <p key={i} className="text-[11px] text-amber-300/70">{f.warning.replace(/⚠️\s*/g, '')}</p>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Smart Symptom Input — replaces SymptomTagInput for active symptoms */}
              <Controller
                name="symptoms"
                control={control}
                render={({ field }) => (
                  <SmartSymptomInput
                    tags={field.value || []}
                    onChange={(newTags) => {
                      field.onChange(newTags);
                    }}
                    label="Active Clinical Symptoms (Min 1 required)"
                    placeholder="Type symptom (e.g. chest pain) and press Enter..."
                    error={errors.symptoms?.message}
                    highlightAmber={(isFhirImported || voiceIntakeComplete) && currentSymptoms.length === 0}
                  />
                )}
              />

              {/* Medical History */}
              <Controller
                name="medical_history"
                control={control}
                render={({ field }) => (
                  <SymptomTagInput
                    tags={field.value || []}
                    onChange={field.onChange}
                    label="Comorbidities / Medical History"
                    placeholder="Type history item (e.g. diabetes) and press Enter..."
                  />
                )}
              />

              {/* Allergies */}
              <Controller
                name="allergies"
                control={control}
                render={({ field }) => (
                  <SymptomTagInput
                    tags={field.value || []}
                    onChange={field.onChange}
                    label="Allergy Profile"
                    placeholder="Type allergen (e.g. penicillin) and press Enter..."
                  />
                )}
              />

            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-left"
            >
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-text-primary">Current Medications</h3>
                <span className="text-xs text-text-secondary mt-0.5">Provide current drug listings to screen for collaborative interactions.</span>
              </div>

              {/* Medications Tag Input */}
              <Controller
                name="current_medications"
                control={control}
                render={({ field }) => (
                  <SymptomTagInput
                    tags={field.value || []}
                    onChange={field.onChange}
                    label="Active Medications Routines"
                    placeholder="metformin 500mg BD, aspirin 81mg OD..."
                  />
                )}
              />
              
              <div className="p-3.5 rounded-lg bg-surface-raised border border-border text-[11px] text-text-secondary leading-relaxed font-sans">
                💡 <b>Clinical Guidance:</b> Mapped items will be evaluated by the Drug Specialist agent checking contraindication thresholds. Include dose and frequencies when available.
              </div>

            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <VitalsInput
                register={register}
                vitalsValues={vitalsValues}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action controls */}
        <div className="flex justify-between items-center pt-6 border-t border-border/80">
          
          {/* Back button */}
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBackStep}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-all font-semibold text-sm"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {/* Next / Submit Button */}
          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-text-primary hover:bg-primary/95 transition-all font-semibold text-sm shadow-[0_0_10px_rgba(13,148,136,0.2)] hover:scale-[1.01]"
            >
              <span>Continue</span>
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-text-primary hover:bg-primary/95 transition-all font-semibold text-sm shadow-[0_0_12px_rgba(13,148,136,0.3)] disabled:opacity-50 hover:scale-[1.01]"
            >
              {isSubmitting ? (
                <span className="h-4 w-4 border-2 border-text-primary/20 border-t-text-primary rounded-full animate-spin" />
              ) : (
                <CheckCircle className="h-4.5 w-4.5" />
              )}
              <span>Initiate AI Clinical Analysis</span>
            </button>
          )}

        </div>

      </form>

      {/* FHIR Importer Modal Dialog */}
      <FHIRImportModal
        isOpen={isFhirModalOpen}
        onClose={() => setIsFhirModalOpen(false)}
        onImport={handleFhirImport}
      />
    </div>
  );
}
