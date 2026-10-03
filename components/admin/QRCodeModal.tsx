'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Modal } from '@/components/ui/Modal';
import { Copy, Check, Download, ExternalLink, QrCode } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizTitle: string;
  publicCode: string;
}

export function QRCodeModal({ isOpen, onClose, quizTitle, publicCode }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const { success } = useToast();

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const quizUrl = `${origin}/quiz/${publicCode}`;

  useEffect(() => {
    if (isOpen && publicCode) {
      QRCode.toDataURL(quizUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation error:', err));
    }
  }, [isOpen, publicCode, quizUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(quizUrl);
      setCopied(true);
      success('Quiz link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `Quiz_QR_${publicCode}.png`;
    link.click();
    success('QR Code image downloaded!');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Quiz Link & QR Code"
      description="Students can scan this QR code or click the public link to join without an account."
      maxWidth="md"
    >
      <div className="flex flex-col items-center text-center">
        {/* Quiz Title Banner */}
        <div className="w-full bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 mb-5">
          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
            Quiz Title
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{quizTitle}</div>
          <div className="inline-block mt-1 bg-indigo-600 text-white font-mono text-xs px-2.5 py-0.5 rounded-full">
            Code: {publicCode}
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700 mb-5">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR code for ${quizTitle}`} className="w-48 h-48 sm:w-56 sm:h-56" />
          ) : (
            <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-slate-100 text-slate-400">
              <QrCode className="w-12 h-12 animate-pulse" />
            </div>
          )}
        </div>

        {/* Link Copy Box */}
        <div className="w-full flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-5 text-left">
          <input
            type="text"
            readOnly
            value={quizUrl}
            className="flex-1 bg-transparent text-xs font-mono text-slate-800 dark:text-slate-200 px-2 py-1 outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG</span>
          </button>
          <a
            href={quizUrl}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Link</span>
          </a>
        </div>
      </div>
    </Modal>
  );
}
