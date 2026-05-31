'use client';

import React from 'react';
import PatientIntakeForm from '@/components/patient/PatientIntakeForm';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

export default function NewPatientPage() {
  return (
    <ErrorBoundary>
      <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto">
        
        {/* Page Header */}
        <div className="flex flex-col text-center sm:text-left gap-1">
          <h2 className="font-sans font-bold text-2xl tracking-tight text-text-primary">
            Patient Intake Assessment
          </h2>
          <p className="text-sm text-text-secondary">
            Register new patient demographics, symptoms, and medical profiles to launch collaborative AI graph workflows.
          </p>
        </div>

        {/* Intake Form Component */}
        <div className="w-full">
          <PatientIntakeForm />
        </div>

      </div>
    </ErrorBoundary>
  );
}
