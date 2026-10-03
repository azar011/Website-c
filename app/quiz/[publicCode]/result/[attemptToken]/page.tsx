'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  Award,
  Sparkles,
  TrendingUp,
  HelpCircle,
  ArrowLeft,
  Loader2,
  Check,
  X,
  FileCheck,
} from 'lucide-react';

export default function StudentResultPage({
  params,
}: {
  params: Promise<{ publicCode: string; attemptToken: string }>;
}) {
  const { publicCode, attemptToken } = use(params);
  const [resultData, setResultData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Automatically exit fullscreen when student completes the quiz
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    fetch(`/api/public/attempt/${attemptToken}/result`)
      .then((res) => res.json())
      .then((data) => {
        if (data.result) {
          setResultData(data.result);
          if (data.result.passed) {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        } else {
          setErrorMsg(data.error || 'Unable to retrieve result.');
        }
      })
      .catch(() => setErrorMsg('Failed to load result.'))
      .finally(() => setLoading(false));
  }, [attemptToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs font-semibold text-slate-400">Loading Result Summary...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !resultData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Result Information</h2>
        <p className="text-sm text-slate-400 mb-6">{errorMsg || 'Your submission has been recorded.'}</p>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition"
        >
          Return to Portal
        </Link>
      </div>
    );
  }

  const settings = resultData.settings || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-indigo-500 selection:text-white">
      {/* Brand Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Sparkles className="w-4 h-4" />
        </div>
        <span className="text-sm font-bold text-white tracking-tight">QuizMaster Evaluation</span>
      </div>

      {/* Main Result Card */}
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Status Header */}
        <div className="text-center space-y-3 pb-6 border-b border-slate-800">
          <div
            className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-xl ${
              resultData.passed
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
            }`}
          >
            {resultData.passed ? (
              <CheckCircle2 className="w-9 h-9" />
            ) : (
              <FileCheck className="w-9 h-9" />
            )}
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">
            Assessment Submitted Successfully!
          </h1>
          <p className="text-xs text-slate-400">
            {resultData.quizTitle} • Participant: {resultData.studentName || 'Student'}
          </p>

          {/* PASS / FAIL Badge if enabled */}
          {settings.showPassFailOnSubmit && resultData.passed !== undefined && (
            <div className="pt-2">
              <span
                className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  resultData.passed
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 shadow-lg shadow-emerald-900/20'
                    : 'bg-rose-950/80 text-rose-400 border border-rose-700/60 shadow-lg shadow-rose-900/20'
                }`}
              >
                {resultData.passed ? 'PASSED ASSESSMENT' : 'NEEDS IMPROVEMENT'}
              </span>
            </div>
          )}
        </div>

        {/* Score & Percentage Metrics Grid (if enabled) */}
        {settings.showScoreOnSubmit && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Marks Obtained</div>
              <div className="text-xl font-black text-white mt-0.5">
                {resultData.totalScore}{' '}
                <span className="text-xs text-slate-500 font-normal">
                  / {resultData.totalPossibleMarks}
                </span>
              </div>
            </div>

            {settings.showPercentageOnSubmit && (
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Percentage</div>
                <div className="text-xl font-black text-indigo-400 mt-0.5">
                  {resultData.percentage}%
                </div>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Correct Answers</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">
                {resultData.totalCorrect}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Wrong Answers</div>
              <div className="text-xl font-black text-rose-400 mt-0.5">
                {resultData.totalWrong}
              </div>
            </div>
          </div>
        )}

        {/* QUESTION-BY-QUESTION REVIEW IF ENABLED BY ADMIN */}
        {settings.showAnswerReview && resultData.review && (
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Answer Review & Solutions:
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {resultData.review.map((item: any) => (
                <div
                  key={item.questionIndex}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-200">
                      Q{item.questionIndex}. {item.questionText}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                        item.isCorrect
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {item.isCorrect ? `Correct (+${item.marksAwarded} pts)` : 'Incorrect'}
                    </span>
                  </div>

                  <div className="text-slate-400">
                    Your Answer: <strong className="text-white">{item.studentAnswer}</strong>
                  </div>

                  {item.correctAnswer && (
                    <div className="text-emerald-400">
                      Correct Answer:{' '}
                      <strong>{item.correctAnswer.join(' • ')}</strong>
                    </div>
                  )}

                  {item.explanation && (
                    <div className="text-amber-400/90 pt-1 border-t border-slate-800/80">
                      Explanation: {item.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Return Button */}
        <div className="pt-4 border-t border-slate-800 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Student Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
