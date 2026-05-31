'use client';

import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { VitalsData } from '@/types';
import { ShieldAlert, HeartPulse, Thermometer } from 'lucide-react';
import { PatientIntakeFormValues } from '@/lib/validations';

interface VitalsInputProps {
  register: UseFormRegister<PatientIntakeFormValues>;
  vitalsValues: VitalsData;
}

export default function VitalsInput({ register, vitalsValues }: VitalsInputProps) {
  const hr = Number(vitalsValues?.heart_rate);
  const spo2 = Number(vitalsValues?.spo2);
  const temp = Number(vitalsValues?.temperature);

  const showHrWarning = hr > 100;
  const showSpO2Warning = spo2 > 0 && spo2 < 95;
  const showTempWarning = temp > 38;

  return (
    <div className="flex flex-col gap-6 text-left w-full">
      <div className="flex flex-col">
        <h3 className="text-base font-bold text-text-primary">Vital Signs (Optional)</h3>
        <span className="text-xs text-text-secondary mt-0.5">Input baseline clinical measurements. Active alerts will show automatically.</span>
      </div>

      {/* Real-Time Clinical Warning Alerts */}
      {(showHrWarning || showSpO2Warning || showTempWarning) && (
        <div className="flex flex-col gap-2 p-4 rounded-xl bg-surface-raised border border-border">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wide text-warning">
            <ShieldAlert className="h-4.5 w-4.5" />
            <span>Active Triage Indicators Detected</span>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            {showHrWarning && (
              <div className="text-xs text-warning flex items-center gap-1.5 font-sans">
                <HeartPulse className="h-3.5 w-3.5 animate-pulse text-warning" />
                <span><b>Tachycardia Alert:</b> Heart rate is {hr} bpm. Exceeds standard diagnostic limit of 100 bpm.</span>
              </div>
            )}
            {showSpO2Warning && (
              <div className="text-xs text-danger flex items-center gap-1.5 font-sans">
                <HeartPulse className="h-3.5 w-3.5 animate-pulse text-danger" />
                <span><b>Hypoxia Alert:</b> Oxygen saturation is {spo2}%. Depressed below critical threshold of 95%.</span>
              </div>
            )}
            {showTempWarning && (
              <div className="text-xs text-warning flex items-center gap-1.5 font-sans">
                <Thermometer className="h-3.5 w-3.5 text-warning" />
                <span><b>Hyperthermia Alert:</b> Body temperature is {temp}°C. Fever marker detected.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inputs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        
        {/* BP */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Blood Pressure</label>
          <input
            type="text"
            placeholder="120/80 mmHg"
            {...register('vitals.bp')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        {/* HR */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Heart Rate (bpm)</label>
          <input
            type="number"
            placeholder="e.g. 72"
            {...register('vitals.heart_rate', { valueAsNumber: true })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors font-mono"
          />
        </div>

        {/* Temp */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Temperature (°C)</label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g. 37.0"
            {...register('vitals.temperature', { valueAsNumber: true })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors font-mono"
          />
        </div>

        {/* SpO2 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Oxygen Saturation (%)</label>
          <input
            type="number"
            placeholder="e.g. 98"
            {...register('vitals.spo2', { valueAsNumber: true })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors font-mono"
          />
        </div>

        {/* Weight */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Weight (kg)</label>
          <input
            type="number"
            placeholder="e.g. 70"
            {...register('vitals.weight', { valueAsNumber: true })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors font-mono"
          />
        </div>

        {/* Height */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">Height (cm)</label>
          <input
            type="number"
            placeholder="e.g. 175"
            {...register('vitals.height', { valueAsNumber: true })}
            className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors font-mono"
          />
        </div>

      </div>

    </div>
  );
}
