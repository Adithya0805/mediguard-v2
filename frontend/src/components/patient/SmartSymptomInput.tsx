'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, Stethoscope, AlertTriangle, Plus, Search } from 'lucide-react';
import { getSymptomSuggestions, SymptomSuggestions } from '@/lib/api';

interface SmartSymptomInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  highlightAmber?: boolean;
}

const URGENCY_STYLES: Record<string, { chip: string; badge: string }> = {
  critical: {
    chip: 'border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20',
    badge: 'bg-red-500/20 text-red-400',
  },
  high: {
    chip: 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
    badge: 'bg-amber-500/20 text-amber-400',
  },
  medium: {
    chip: 'border-yellow-500/30 bg-yellow-500/8 text-yellow-300 hover:bg-yellow-500/15',
    badge: 'bg-yellow-500/20 text-yellow-400',
  },
  low: {
    chip: 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300 hover:bg-emerald-500/15',
    badge: 'bg-emerald-500/20 text-emerald-400',
  },
};

const URGENCY_BAR: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-yellow-500',
  low: 'bg-emerald-500',
};

export default function SmartSymptomInput({
  tags,
  onChange,
  label,
  placeholder = 'Type symptom and press Enter...',
  error,
  highlightAmber = false,
}: SmartSymptomInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<SymptomSuggestions | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions whenever tags change or input changes
  const fetchSuggestions = useCallback(
    async (currentTags: string[], partialInput: string) => {
      if (currentTags.length === 0 && partialInput.length < 2) {
        setSuggestions(null);
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        const result = await getSymptomSuggestions(currentTags, partialInput);
        setSuggestions(result);
        setShowAutocomplete(partialInput.length >= 2 && result.autocomplete.length > 0);
      } catch (err) {
        console.error('Symptom suggestion error:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    []
  );

  // Debounced fetch on input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(tags, val);
      }, 300);
    },
    [tags, fetchSuggestions]
  );

  // Fetch related suggestions whenever tags change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(tags, inputValue);
    }, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags]);

  // Close autocomplete on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addTag = useCallback(
    (sym: string) => {
      const cleaned = sym.trim().toLowerCase();
      if (!cleaned || tags.map((t) => t.toLowerCase()).includes(cleaned)) return;
      onChange([...tags, cleaned]);
      setInputValue('');
      setShowAutocomplete(false);
      inputRef.current?.focus();
    },
    [tags, onChange]
  );

  const removeTag = useCallback(
    (index: number) => {
      const next = tags.filter((_, i) => i !== index);
      onChange(next);
    },
    [tags, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false);
      } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
        removeTag(tags.length - 1);
      }
    },
    [inputValue, addTag, removeTag, tags]
  );

  const urgencyHint = suggestions?.current_urgency_hint || 'low';
  const urgencyStyle = URGENCY_STYLES[urgencyHint] || URGENCY_STYLES.low;
  const hasRedFlags = (suggestions?.red_flags_detected?.length ?? 0) > 0;
  const hasRelated = (suggestions?.related_suggestions?.length ?? 0) > 0;
  const hasQuestions = (suggestions?.clinical_questions?.length ?? 0) > 0;

  return (
    <div className="space-y-3" ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-text-secondary">{label}</label>
      )}

      {/* Tag + Input Area */}
      <div
        className={`relative flex flex-wrap gap-2 min-h-[48px] p-3 rounded-xl border bg-background transition-colors ${
          highlightAmber
            ? 'border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.12)]'
            : error
            ? 'border-red-500/40'
            : 'border-border focus-within:border-primary'
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Existing tags */}
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(i); }}
              className="text-primary/60 hover:text-primary transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Text input */}
        <div className="flex-1 min-w-[160px] relative">
          <input
            ref={inputRef}
            id="smart-symptom-input"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions?.autocomplete?.length && inputValue.length >= 2) {
                setShowAutocomplete(true);
              }
            }}
            placeholder={tags.length === 0 ? placeholder : 'Add more...'}
            className="w-full bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted"
          />

          {/* Autocomplete dropdown */}
          <AnimatePresence>
            {showAutocomplete && suggestions && suggestions.autocomplete.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute top-full left-0 mt-1.5 z-50 w-64 bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
              >
                <div className="px-3 py-2 bg-background border-b border-border flex items-center gap-2">
                  <Search className="h-3 w-3 text-text-muted" />
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">
                    Autocomplete
                  </span>
                </div>
                {suggestions.autocomplete.map((item) => (
                  <button
                    key={item.symptom}
                    type="button"
                    onClick={() => addTag(item.symptom)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-left hover:bg-primary/8 transition-colors group"
                  >
                    <span className="text-primary">▸</span>
                    <span className="text-text-primary group-hover:text-primary transition-colors">
                      {item.display || item.symptom}
                    </span>
                    <span className="ml-auto text-[9px] text-text-muted bg-background px-1.5 py-0.5 rounded-md">
                      {item.match_type}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isLoadingSuggestions && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-3 w-3 rounded-full border border-primary border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-danger font-semibold">{error}</p>}

      {/* ── Related Symptoms Panel ─────────────────────────────────── */}
      <AnimatePresence>
        {hasRelated && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-surface border border-border overflow-hidden"
          >
            <div className="px-4 py-3 bg-background border-b border-border/60 flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">
                💡 Related Symptoms
              </span>
              <span className="ml-auto text-[10px] text-text-muted">
                Patients often also present with:
              </span>
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              {suggestions!.related_suggestions.map((s) => {
                const style = URGENCY_STYLES[s.urgency] || URGENCY_STYLES.low;
                return (
                  <button
                    key={s.symptom}
                    type="button"
                    onClick={() => addTag(s.symptom)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${style.chip}`}
                    title={s.reason}
                  >
                    <Plus className="h-3 w-3" />
                    {s.symptom}
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${style.badge}`}>
                      {s.urgency}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Clinical Questions Panel ───────────────────────────────── */}
      <AnimatePresence>
        {hasQuestions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-surface border border-border overflow-hidden"
          >
            <div className="px-4 py-3 bg-background border-b border-border/60 flex items-center gap-2">
              <Stethoscope className="h-3.5 w-3.5 text-text-secondary" />
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">
                🩺 Ask the Patient
              </span>
            </div>
            <ul className="p-4 space-y-2">
              {suggestions!.clinical_questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="text-text-muted mt-0.5">•</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Red Flag Panel ─────────────────────────────────────────── */}
      <AnimatePresence>
        {hasRedFlags && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl bg-amber-500/10 border border-amber-500/40 overflow-hidden"
          >
            <div className="px-4 py-3 bg-amber-500/5 border-b border-amber-500/20 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                ⚠️ Clinical Alert
              </span>
            </div>
            <div className="p-4 space-y-2.5">
              {suggestions!.red_flags_detected.map((flag, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs font-bold text-amber-300">
                    {flag.combination.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(' + ')} detected
                  </p>
                  <p className="text-[11px] text-amber-200/70 leading-relaxed">
                    {flag.warning.replace(/⚠️\s*/g, '').replace(/[A-Z\s]+:\s*/, '')}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Urgency Hint Bar ───────────────────────────────────────── */}
      {tags.length > 0 && suggestions && (
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-16 rounded-full ${URGENCY_BAR[urgencyHint] || URGENCY_BAR.low}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wide ${urgencyStyle.badge.replace(/bg-\S+/, '').trim()}`}>
            Current urgency: {urgencyHint.toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
