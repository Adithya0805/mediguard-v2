'use client';

import React, { useState, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface SymptomTagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  highlightAmber?: boolean;
}

export default function SymptomTagInput({
  tags,
  onChange,
  placeholder = 'Type item and press Enter or comma...',
  label,
  error,
  highlightAmber
}: SymptomTagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim().replace(/,$/, '');
    if (trimmed && !tags.includes(trimmed)) {
      const updated = [...tags, trimmed];
      onChange(updated);
      setInputValue('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    const updated = tags.filter((_, idx) => idx !== indexToRemove);
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-2 w-full text-left">
      {label && (
        <label className="text-xs font-semibold text-text-secondary tracking-wide uppercase">
          {label}
        </label>
      )}

      {/* Input container box with chips inside */}
      <div className={`min-h-12 w-full flex flex-wrap gap-2 p-2 rounded-xl bg-background transition-colors ${
        highlightAmber
          ? 'border border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.15)] focus-within:border-amber-500'
          : 'border border-border focus-within:border-primary'
      }`}>

        
        {/* Render chips */}
        {tags.map((tag, idx) => (
          <span 
            key={idx} 
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-xs font-semibold text-text-primary"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="p-0.5 rounded-full hover:bg-primary/25 text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {/* Text Input */}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-text-primary text-sm focus:outline-none py-1 px-2 border-0 focus:ring-0 focus:ring-offset-0"
        />

      </div>

      {error && (
        <span className="text-[11px] text-danger font-semibold mt-1">
          {error}
        </span>
      )}

    </div>
  );
}
