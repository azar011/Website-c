'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowRight,
  User,
  Mail,
  GraduationCap,
  Building,
  Hash,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function StudentQuizStartPage({
  params,
}: {
  params: Promise<{ publicCode: string }>;
}) {
  const { publicCode } = use(params);
  const router = useRouter();

  const [quizData, setQuizData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  // Form identity fields
  const [studentName, setStudentName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [email, setEmail] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    fetch(`/api/public/quiz/${publicCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.publicQuiz) {
          setQuizData(data.publicQuiz);
        } else {
          setErrorMsg(data.error || 'Quiz is currently not available.');
        }
      })
      .catch(() => setErrorMsg('Failed to connect to assessment server.'))
      .finally(() => setLoading(false));
  }, [publicCode]);

  const handleStartQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStarting(true);

    // Enter fullscreen immediately on student click user-gesture
    if (quizData?.settings?.requireFullscreen && typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Browser prevented instant fullscreen request:', err);
      });
    }

    try {
      const res = await fetch(`/api/public/quiz/${publicCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName,
          registerNumber,
          email,
          studentClass,
          department,
        }),
      });

      const data = await res.json();
      if (res.ok && data.attemptToken) {
        // Save initial attempt payload to sessionStorage for fast resume
        sessionStorage.setItem(
          `attempt_${data.attemptToken}`,
          JSON.stringify(data)
        );
        router.push(`/quiz/${publicCode}/attempt/${data.attemptToken}`);
      } else {
        setErrorMsg(data.error || 'Failed to start quiz session.');
      }
    } catch {
      setErrorMsg('A network error occurred starting the assessment.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs font-semibold text-slate-400">Loading Assessment Details...</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !quizData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Assessment Unavailable</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">{errorMsg}</p>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition"
        >
          Return to Portal
        </Link>
      </div>
    );
  }

  const settings = quizData.settings || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Brand Header */}
      <div className="mb-6">
        <Logo size="sm" subtitle="Assessment" />
      </div>

      {/* Main Card */}
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Quiz Info Header */}
        <div className="pb-6 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              {quizData.subject || 'Examination'}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400">
              Code: {quizData.publicCode}
            </span>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">{quizData.title}</h1>
          {quizData.description && (
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{quizData.description}</p>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2.5 mt-4 pt-4 border-t border-slate-800/80 text-center">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Duration</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {quizData.durationMinutes} Mins
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Questions</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {quizData.totalQuestions}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Total Marks</div>
              <div className="text-sm font-bold text-indigo-400 mt-0.5">
                {quizData.totalMarks} pts
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {quizData.instructions && (
          <div className="my-5 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-1">
            <span className="font-bold text-amber-400 block text-[11px] uppercase tracking-wider">
              Instructions:
            </span>
            <p className="leading-relaxed">{quizData.instructions}</p>
          </div>
        )}

        {/* Anti-cheating banner if enabled */}
        {settings.enableAntiCheat && (
          <div className="mb-6 p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-300 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              <strong>Security Protocol:</strong> Fullscreen mode, tab-switch detection, and window
              focus tracking are active. Violations are logged and may trigger auto-submission.
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Student Identification Form */}
        <form onSubmit={handleStartQuiz} className="space-y-4">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Participant Identification:
          </div>

          {settings.requireName && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>
          )}

          {settings.requireRegisterNumber && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Register Number / Roll Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={registerNumber}
                  onChange={(e) => setRegisterNumber(e.target.value)}
                  placeholder="e.g. 23CS101"
                  className="w-full text-xs font-mono font-semibold pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>
          )}

          {settings.requireEmail && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@college.edu"
                  className="w-full text-xs pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {settings.requireClass && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Class / Batch <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    placeholder="e.g. 4th Sem A"
                    className="w-full text-xs pl-10 pr-3 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {settings.requireDepartment && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full text-xs pl-10 pr-3 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={starting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            {starting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Start Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
