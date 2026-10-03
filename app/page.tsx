'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  BarChart3,
  QrCode,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [quizCode, setQuizCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleJoinQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = quizCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Please enter a valid quiz code.');
      return;
    }
    router.push(`/quiz/${cleanCode}`);
  };



  const sampleQuizzes = [
    { code: 'PY8F29K', title: 'Python Programming Assessment', duration: '20 mins', subject: 'Computer Science' },
    { code: 'WEB901X', title: 'Full-Stack Web Development', duration: '30 mins', subject: 'Web Technologies' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">QuizMaster</span>
              <span className="text-xs text-indigo-400 font-medium block">Assessment Engine</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Portal Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 sm:py-20 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5" />
          <span>Zero Student Login Required • Instant Assessment Links</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight max-w-4xl leading-tight">
          Next-Generation Online Quiz & Assessment Platform
        </h1>

        <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          Create, conduct, and analyze examinations with browser-level anti-cheating monitoring,
          instant server-side scoring, dynamic report generation, and Google Forms-like simplicity.
        </p>

        {/* Student Quick Join Box */}
        <div className="mt-10 w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleJoinQuiz} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Have a Quiz Code or Link?
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={quizCode}
                  onChange={(e) => {
                    setQuizCode(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="Enter Code (e.g. PY8F29K)"
                  className="w-full text-base font-mono font-bold tracking-wider uppercase px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
              {errorMsg && <p className="text-xs text-rose-400 mt-1.5">{errorMsg}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              <span>Join Quiz Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>

        {/* Feature Grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Anti-Cheating Monitoring</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fullscreen enforcement, tab-switch tracking, window focus loss detection, and
              configurable auto-submission limits.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Real-Time Auto Save</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every answer is continuously saved to the cloud. Restores state on refresh and
              enforces server-side timer calculations.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Reports & Analytics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant multi-sheet Excel workbooks, CSV exports, score distributions, and
              question accuracy rate visualizations.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        QuizMaster Assessment Management Platform • Designed for Vercel & Cloud MySQL
      </footer>
    </div>
  );
}
