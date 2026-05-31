'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Clipboard, Check, Download, Database, Layers } from 'lucide-react';

interface FHIRViewerProps {
  fhirBundle: Record<string, unknown> | null;
  sessionId: string;
}

export default function FHIRViewer({ fhirBundle, sessionId }: FHIRViewerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeResourceTab, setActiveResourceTab] = useState<string>('full');

  if (!fhirBundle) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center text-text-muted gap-2 border border-dashed border-border rounded-xl">
        <Database className="h-10 w-10 text-border" />
        <span className="text-sm font-semibold">No FHIR bundle compiled</span>
        <p className="text-xs">FHIR schemas were either skipped or compilation encountered an issue.</p>
      </div>
    );
  }

  // Parse entries to group resources by type
  const entries = (fhirBundle.entry as Array<Record<string, unknown>>) || [];
  const resourcesGrouped: Record<string, Array<Record<string, unknown>>> = {};
  
  entries.forEach((entry) => {
    const res = entry.resource as Record<string, unknown> | undefined;
    if (res && typeof res.resourceType === 'string') {
      const type = res.resourceType;
      if (!resourcesGrouped[type]) {
        resourcesGrouped[type] = [];
      }
      resourcesGrouped[type].push(res);
    }
  });

  const resourceTypes = ['full', ...Object.keys(resourcesGrouped)];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Resource JSON copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fhirBundle, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href",     dataStr);
    downloadAnchor.setAttribute("download", `mediguard_fhir_${sessionId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('FHIR Bundle JSON downloaded successfully.');
  };

  const getFilteredJSON = () => {
    if (activeResourceTab === 'full') {
      return JSON.stringify(fhirBundle, null, 2);
    }
    const grouped = resourcesGrouped[activeResourceTab] || [];
    return JSON.stringify(grouped, null, 2);
  };

  return (
    <div className="flex flex-col gap-6 text-left w-full">
      
      {/* Action Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h3 className="font-sans font-bold text-base text-text-primary tracking-wide">
            HL7 FHIR R4 Clinical Schema
          </h3>
        </div>

        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-text-primary hover:bg-primary/95 transition-all text-xs font-semibold shadow-md"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download FHIR Bundle JSON</span>
        </button>

      </div>

      {/* Tab selectors for individual resource types */}
      <div className="flex flex-wrap gap-2">
        {resourceTypes.map((type) => (
          <button
            key={type}
            onClick={() => setActiveResourceTab(type)}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all uppercase ${
              activeResourceTab === type
                ? 'bg-primary border-primary text-text-primary shadow-[0_0_8px_rgba(13,148,136,0.25)]'
                : 'bg-surface border-border text-text-secondary hover:text-text-primary hover:bg-surface-raised'
            }`}
          >
            {type === 'full' ? 'Complete Bundle' : `${type} (${resourcesGrouped[type].length})`}
          </button>
        ))}
      </div>

      {/* JSON Viewer Box */}
      <div className="relative w-full rounded-2xl border border-border bg-[#050811] overflow-hidden">
        
        {/* Copy button overlay */}
        <button
          onClick={() => handleCopy(getFilteredJSON(), activeResourceTab)}
          className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary rounded-lg border border-border/80 bg-surface/85 transition-colors z-20"
          title="Copy JSON block"
        >
          {copiedId === activeResourceTab ? <Check className="h-4 w-4 text-success" /> : <Clipboard className="h-4 w-4" />}
        </button>

        {/* Scrollable code body */}
        <pre className="p-6 font-mono text-[11px] leading-relaxed text-emerald-400 overflow-auto max-h-[500px]">
          <code>{getFilteredJSON()}</code>
        </pre>

      </div>

      <div className="p-3.5 rounded-lg bg-surface border border-border/80 text-[10px] text-text-muted leading-relaxed font-mono">
        💡 <b>Interoperability Notice:</b> Mapped structures represent compliant FHIR R4.0.1 schemas utilizing official base URLs `https://mediguard.ai/fhir`. Direct integration hooks into Epic/Cerner sandbox interfaces are fully supported.
      </div>

    </div>
  );
}
