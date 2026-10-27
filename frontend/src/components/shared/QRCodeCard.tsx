'use client';

import React, { useState } from 'react';
import { QrCode, Copy, Check, ExternalLink, Download, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeCardProps {
  url: string;
  title?: string;
  subtitle?: string;
}

export default function QRCodeCard({ 
  url, 
  title = "Scan for Mobile Discharge Pass", 
  subtitle = "Scan with any smartphone camera to open this patient's care plan on mobile" 
}: QRCodeCardProps) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=svg&data=${encodeURIComponent(url)}`;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Mobile discharge link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center p-6 rounded-2xl bg-surface border border-border shadow-xl text-center max-w-sm mx-auto">
      
      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-3 font-mono">
        <Smartphone className="h-3.5 w-3.5" />
        <span>PATIENT MOBILE HANDOVER</span>
      </div>

      <h3 className="font-bold text-base text-text-primary tracking-tight mb-1">{title}</h3>
      <p className="text-xs text-text-secondary leading-relaxed mb-5 max-w-xs">{subtitle}</p>

      {/* QR Code Container */}
      <div className="p-4 rounded-2xl bg-white border-2 border-primary/30 shadow-[0_0_20px_rgba(13,148,136,0.15)] flex items-center justify-center mb-5 relative group">
        {!imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrImageUrl}
            alt="Mobile Discharge QR Code"
            width={200}
            height={200}
            onError={() => setImgError(true)}
            className="w-48 h-48 object-contain rounded-lg"
          />
        ) : (
          <div className="w-48 h-48 flex flex-col items-center justify-center bg-slate-100 rounded-lg text-slate-800 p-4">
            <QrCode className="h-16 w-16 text-primary mb-2" />
            <span className="text-[11px] font-bold">QR Server Offline</span>
            <span className="text-[10px] text-slate-500">Use direct link below</span>
          </div>
        )}
      </div>

      {/* URL Link pill */}
      <div className="w-full flex items-center gap-2 p-2 rounded-xl bg-background border border-border mb-4 text-xs font-mono">
        <span className="truncate flex-1 text-left text-text-muted px-2">{url}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="p-1.5 rounded-lg bg-surface border border-border hover:bg-surface-raised text-text-secondary hover:text-text-primary transition-colors shrink-0"
          title="Copy link"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors shrink-0"
          title="Open in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Action buttons */}
      <div className="w-full grid grid-cols-2 gap-2 text-xs">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-text-primary hover:bg-surface-raised font-semibold transition-all"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Link'}</span>
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 font-semibold transition-all shadow-[0_0_10px_rgba(13,148,136,0.25)]"
        >
          <Smartphone className="h-3.5 w-3.5" />
          <span>Open Mobile</span>
        </a>
      </div>
    </div>
  );
}
