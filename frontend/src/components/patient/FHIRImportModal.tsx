import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, User, CheckCircle2, AlertTriangle, 
  Activity, Pill, ShieldAlert, HeartPulse, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

// Retrieve absolute or relative backend URL
const getBaseUrl = () => {
  return ''; // Next.js dynamic routing base
};

interface FHIRPatientSearchResult {
  patient_id: string;
  name: string;
  dob: string;
  gender: string;
}

interface FHIRImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (mappedIntakeData: any) => void;
}

export default function FHIRImportModal({ isOpen, onClose, onImport }: FHIRImportModalProps) {
  const [activeTab, setActiveTab] = useState<'id' | 'search'>('id');
  
  // Tab 1 state: Import by ID
  const [patientId, setPatientId] = useState('');
  const [isFetchingId, setIsFetchingId] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Tab 2 state: Search by Name/DOB
  const [searchName, setSearchName] = useState('');
  const [searchDob, setSearchDob] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FHIRPatientSearchResult[]>([]);

  // Lookup helper
  const handleImportById = async (idToFetch: string) => {
    if (!idToFetch.trim()) {
      toast.warning('Please enter a valid Patient ID.');
      return;
    }

    setIsFetchingId(true);
    setPreviewData(null);

    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`${getBaseUrl()}/api/v1/fhir/patient/${idToFetch.trim()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Patient ID not found or server returned error.');
      }

      const data = await res.json();
      setPreviewData(data);
      toast.success(`Found chart for ${data.intake_data.patient_name}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to retrieve FHIR Patient. Try another ID.');
    } finally {
      setIsFetchingId(false);
    }
  };

  // Search helper
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim() && !searchDob) {
      toast.warning('Please enter a name or date of birth to search.');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const token = useAuthStore.getState().token;
      const queryParams = new URLSearchParams();
      if (searchName.trim()) queryParams.append('name', searchName.trim());
      if (searchDob) queryParams.append('dob', searchDob);

      const res = await fetch(`${getBaseUrl()}/api/v1/fhir/search?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to query FHIR patient search.');
      }

      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        toast.info('No patients found matching those credentials.');
      } else {
        toast.success(`Found ${data.length} matching patients.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to search patients.');
    } finally {
      setIsSearching(false);
    }
  };

  // Confirm import helper
  const handleConfirmUse = () => {
    if (!previewData) return;
    onImport(previewData.intake_data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content */}
      <div className="w-full max-w-lg rounded-2xl bg-[#111827] border border-border shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-text-primary">Import Patient from FHIR Server</h3>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <span className="text-xs text-text-secondary font-sans mt-0.5">Connected to HAPI FHIR R4 Public Server</span>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-surface-raised">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-border bg-[#1f2937]/35">
          <button 
            onClick={() => { setActiveTab('id'); setPreviewData(null); }}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'id' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            Import by Patient ID
          </button>
          <button 
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'search' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            Search by Name
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="p-6 overflow-y-auto flex-1 text-left">
          <AnimatePresence mode="wait">
            
            {/* Tab 1: ID Lookup */}
            {activeTab === 'id' && (
              <motion.div
                key="tab-id"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {!previewData ? (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary">FHIR Patient ID</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={patientId}
                          onChange={(e) => setPatientId(e.target.value)}
                          placeholder="e.g. 592837 or 89187145"
                          className="flex-1 px-3.5 py-2.5 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none transition-colors"
                        />
                        <button
                          onClick={() => handleImportById(patientId)}
                          disabled={isFetchingId}
                          className="px-5 py-2.5 rounded-xl bg-primary text-text-primary font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isFetchingId ? (
                            <>
                              <span className="h-4 w-4 border-2 border-text-primary/20 border-t-text-primary rounded-full animate-spin" />
                              <span>Fetching...</span>
                            </>
                          ) : (
                            <span>Import Patient</span>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#1f2937]/50 border border-border text-[11px] text-text-secondary leading-relaxed font-sans">
                      💡 <b>Sandbox Tip:</b> Try patient ID <b>89187145</b> (contains full vital histories and medicines) or search for <b>Smith</b> in the search tab to resolve live test credentials.
                    </div>
                  </div>
                ) : (
                  /* Preview Card */
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                        <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                          <CheckCircle2 className="h-4.5 w-4.5" />
                          Patient Found
                        </div>
                        <span className="text-[10px] font-mono text-text-muted">ID: {previewData.fhir_patient_id}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-text-muted">Full Name</span>
                          <p className="font-bold text-text-primary mt-0.5 text-sm">{previewData.intake_data.patient_name}</p>
                        </div>
                        <div>
                          <span className="text-text-muted">Age / Sex</span>
                          <p className="font-bold text-text-primary mt-0.5 capitalize">{previewData.intake_data.patient_age} y/o | {previewData.intake_data.patient_gender}</p>
                        </div>
                      </div>

                      <div className="h-px bg-border/50" />

                      <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Pill className="h-4 w-4 text-accent" />
                          <span>{previewData.intake_data.current_medications.length} Medications</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-amber-500" />
                          <span>{previewData.intake_data.allergies.length} Allergies</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-primary" />
                          <span>{previewData.intake_data.medical_history.length} Conditions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <HeartPulse className="h-4 w-4 text-rose-500" />
                          <span>{Object.keys(previewData.intake_data.vitals).length}/6 Vitals Populate</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 leading-normal flex gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                        <span><b>Important HIPAA intake requirement:</b> The chief complaint and active symptoms must be manually input by the clinician post-import.</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleConfirmUse}
                        className="flex-1 py-3 rounded-xl bg-primary text-text-primary hover:bg-primary/95 transition-all font-semibold text-sm shadow-[0_0_12px_rgba(13,148,136,0.2)] hover:scale-[1.01]"
                      >
                        Use This Patient
                      </button>
                      <button
                        onClick={() => setPreviewData(null)}
                        className="px-4 py-3 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors font-semibold text-sm"
                      >
                        Try Another ID
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Tab 2: Name Search */}
            {activeTab === 'search' && (
              <motion.div
                key="tab-search"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary">Patient Name</label>
                      <input
                        type="text"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        placeholder="e.g. Smith"
                        className="px-3.5 py-2 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-text-secondary">Date of Birth (Optional)</label>
                      <input
                        type="date"
                        value={searchDob}
                        onChange={(e) => setSearchDob(e.target.value)}
                        className="px-3.5 py-2 rounded-xl bg-background border border-border text-text-primary text-sm focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-text-primary font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isSearching ? (
                      <>
                        <span className="h-4 w-4 border-2 border-text-primary/20 border-t-text-primary rounded-full animate-spin" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        <span>Search Patient Registry</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Results list */}
                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-text-secondary block">Matching Patients ({searchResults.length})</span>
                    <div className="divide-y divide-border border border-border rounded-xl max-h-[220px] overflow-y-auto">
                      {searchResults.map((p) => (
                        <div key={p.patient_id} className="p-3.5 bg-surface-raised flex items-center justify-between hover:bg-surface transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs font-bold text-text-primary">{p.name}</span>
                              <span className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wide">DOB: {p.dob} | Gender: {p.gender}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => {
                              setPatientId(p.patient_id);
                              setActiveTab('id');
                              handleImportById(p.patient_id);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary hover:text-text-primary transition-all font-mono"
                          >
                            Import
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
