'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useToast } from '@/components/ui/Toast';
import {
  Copy,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Lock,
  Globe,
  Loader2,
} from 'lucide-react';

export default function QuizSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [quiz, setQuiz] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  const { success, error } = useToast();

  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/quizzes/${id}`);
      const data = await res.json();
      if (res.ok) {
        setQuiz(data.quiz);
      }
    } catch {
      error('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const quizUrl = quiz ? `${origin}/quiz/${quiz.publicCode}` : '';

  useEffect(() => {
    if (quizUrl) {
      QRCode.toDataURL(quizUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#1e1b4b', light: '#ffffff' },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err));
    }
  }, [quizUrl]);

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

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `Quiz_QR_${quiz.publicCode}.png`;
    link.click();
    success('QR code downloaded!');
  };

  const handlePublish = async () => {
    try {
      const res = await fetch(`/api/admin/quizzes/${id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        success(data.message || 'Quiz published and live for students!');
        fetchQuiz();
      } else {
        error(data.error || 'Failed to publish quiz');
      }
    } catch {
      error('Failed to publish quiz');
    }
  };

  const handleClose = async () => {
    try {
      const res = await fetch(`/api/admin/quizzes/${id}/close`, { method: 'POST' });
      if (res.ok) {
        success('Quiz closed to new student responses.');
        fetchQuiz();
      }
    } catch {
      error('Failed to close quiz');
    }
  };

  const handleRegenerateLink = async () => {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/admin/quizzes/${id}/regenerate-link`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        success(`New public link generated: ${data.publicCode}`);
        setShowRegenerateDialog(false);
        fetchQuiz();
      } else {
        error(data.error || 'Failed to regenerate link');
      }
    } catch {
      error('Failed to regenerate link');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading || !quiz) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title={`Share Quiz: ${quiz.title}`}
        subtitle="Distribute this unique URL or QR code to participants."
        actions={
          <Link
            href={`/admin/quizzes/${id}/edit`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Editor</span>
          </Link>
        }
      />

      <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Status Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  quiz.status === 'PUBLISHED'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                }`}
              >
                {quiz.status}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {quiz.status === 'PUBLISHED'
                  ? 'Accepting student attempts'
                  : quiz.status === 'CLOSED'
                  ? 'Closed (Not accepting submissions)'
                  : 'Currently in Draft mode'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{quiz.title}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {quiz.status === 'PUBLISHED' ? (
              <button
                type="button"
                onClick={handleClose}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 text-xs font-semibold text-amber-700 dark:text-amber-400 transition"
                title="Stop accepting student submissions"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Close Quiz</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublish}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
                title="Open quiz for students to take"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{quiz.status === 'CLOSED' ? 'Re-publish Quiz' : 'Publish Quiz'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowRegenerateDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate Link</span>
            </button>
          </div>
        </div>

        {/* QR Code and Link Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR Box */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center text-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              QR Code for Assessment
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Students scan with mobile camera to open exam directly.
            </p>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-inner mb-6">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${quiz.title}`}
                  className="w-52 h-52 sm:w-60 sm:h-60"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center bg-slate-100 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              )}
            </div>

            <button
              onClick={handleDownloadQR}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow transition"
            >
              <Download className="w-4 h-4" />
              <span>Download High-Res QR (PNG)</span>
            </button>
          </div>

          {/* Direct Link Box */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Direct Public URL
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Share this link via Google Classroom, Email, LMS, or WhatsApp.
              </p>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 mb-3">
                <input
                  type="text"
                  readOnly
                  value={quizUrl}
                  className="flex-1 bg-transparent text-xs font-mono font-semibold text-slate-900 dark:text-white outline-none truncate"
                />
                <button
                  onClick={handleCopy}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <span>Public Code: <strong>{quiz.publicCode}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-500" />
                  <span>No student registration required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>Duration: {quiz.durationMinutes} Minutes</span>
                </div>
              </div>
            </div>

            <a
              href={quizUrl}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Public Quiz Link</span>
            </a>
          </div>
        </div>
      </div>

      {/* Regenerate Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showRegenerateDialog}
        onClose={() => setShowRegenerateDialog(false)}
        onConfirm={handleRegenerateLink}
        isLoading={regenerating}
        isDangerous={true}
        title="Regenerate Public Code?"
        message="This will invalidate the existing link and QR code. Students using the old link will no longer be able to access the quiz."
        confirmText="Regenerate New Code"
      />
    </div>
  );
}
