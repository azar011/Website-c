'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  Clock,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Loader2,
  Lock,
} from 'lucide-react';

export default function QuizPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [quiz, setQuiz] = useState<any>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/quizzes/${id}`)
      .then((res) => res.json())
      .then((data) => setQuiz(data.quiz))
      .catch((err) => console.error('Error:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const questions = quiz.questions || [];
  const currentQ = questions[currentIdx];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Preview Watermark Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-6 py-2.5 text-xs font-bold tracking-wide uppercase flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>ADMIN PREVIEW MODE — Student attempts are not recorded</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/quizzes/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 text-amber-400 hover:bg-slate-900 text-xs font-bold shadow transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Editor</span>
          </Link>
        </div>
      </div>

      {/* Top Exam Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">{quiz.title}</h1>
          <p className="text-xs text-slate-400">
            {quiz.subject || 'Assessment'} • {questions.length} Questions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-amber-400">
            <Clock className="w-4 h-4" />
            <span>{quiz.durationMinutes}:00 (Preview Timer)</span>
          </div>

          <Link
            href="/admin/quizzes"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <span>All Quizzes</span>
          </Link>
        </div>
      </header>

      {/* Quiz Interface */}
      <div className="flex-1 max-w-4xl mx-auto w-full p-6 flex flex-col justify-between">
        {questions.length === 0 ? (
          <div className="text-center py-20 text-slate-400 bg-slate-950 border border-slate-800 rounded-2xl p-8 space-y-4">
            <p className="text-sm">No questions added to this quiz yet.</p>
            <Link
              href={`/admin/quizzes/${id}/edit`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Quiz Editor</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Question Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {currentQ.marks} Marks
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-white mb-2 leading-relaxed">
                {currentQ.questionText}
              </h2>

              {currentQ.description && (
                <p className="text-xs text-slate-400 mb-6">{currentQ.description}</p>
              )}

              {/* Options */}
              <div className="space-y-3 mt-6">
                {currentQ.options?.map((opt: any, optIdx: number) => {
                  const isSelected = answers[currentQ.id] === opt.id;
                  return (
                    <div
                      key={opt.id || optIdx}
                      onClick={() => setAnswers({ ...answers, [currentQ.id]: opt.id })}
                      className={`p-4 rounded-xl border cursor-pointer transition flex items-center gap-3 ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-600 text-white font-bold'
                            : 'border-slate-600 text-slate-400'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </div>
                      <span className="text-sm">{opt.optionText}</span>
                      {opt.isCorrect && (
                        <span className="ml-auto text-[10px] font-bold bg-emerald-950/60 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">
                          Correct Answer Key
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Navigator */}
            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (quiz.settings?.disablePreviousQuestion) return;
                  setCurrentIdx((prev) => Math.max(0, prev - 1));
                }}
                disabled={currentIdx === 0 || quiz.settings?.disablePreviousQuestion}
                title={quiz.settings?.disablePreviousQuestion ? 'Previous button is disabled in Linear Exam mode' : 'Previous'}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition ${
                  quiz.settings?.disablePreviousQuestion
                    ? 'border-slate-800 bg-slate-950 text-slate-600 cursor-not-allowed opacity-50'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 disabled:opacity-30'
                }`}
              >
                {quiz.settings?.disablePreviousQuestion ? (
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                ) : (
                  <ArrowLeft className="w-4 h-4" />
                )}
                <span>{quiz.settings?.disablePreviousQuestion ? 'Previous (Locked)' : 'Previous'}</span>
              </button>

              <div className="flex items-center gap-1.5 overflow-x-auto max-w-sm px-2">
                {questions.map((_: any, idx: number) => {
                  const isPast = quiz.settings?.disablePreviousQuestion && idx < currentIdx;
                  const isCur = currentIdx === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (quiz.settings?.disablePreviousQuestion && idx !== currentIdx) return;
                        setCurrentIdx(idx);
                      }}
                      title={isPast ? `Question ${idx + 1} (Locked in linear mode)` : `Question ${idx + 1}`}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                        isCur
                          ? 'bg-indigo-600 text-white'
                          : isPast
                          ? 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed opacity-60'
                          : answers[questions[idx].id]
                          ? 'bg-slate-800 text-emerald-400 border border-emerald-800'
                          : 'bg-slate-950 text-slate-500 hover:text-slate-300 border border-slate-800'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {currentIdx === questions.length - 1 ? (
                <Link
                  href={`/admin/quizzes/${id}/edit`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition"
                >
                  <span>Finish Preview</span>
                  <CheckCircle className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                >
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
