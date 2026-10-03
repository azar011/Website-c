'use client';

import React, { useEffect, useState, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import {
  Clock,
  ShieldAlert,
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  Maximize,
  Check,
  Circle,
  Square,
  CheckSquare,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function StudentLiveQuizPage({
  params,
}: {
  params: Promise<{ publicCode: string; attemptToken: string }>;
}) {
  const { publicCode, attemptToken } = use(params);
  const router = useRouter();

  const [quizData, setQuizData] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Student Answers state: { questionId: { selectedOptionIds, textAnswer } }
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

  // Timer & Server Expiry
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [serverExpiresAt, setServerExpiresAt] = useState<Date | null>(null);

  // Auto-save visual feedback
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Anti-cheating & Violations
  const [violationCount, setViolationCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [violationModal, setViolationModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: string;
    count: number;
    max: number;
  } | null>(null);

  // Submit confirmation modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);

  // 1. Initial Load & Session Retrieval
  useEffect(() => {
    const cachedData = sessionStorage.getItem(`attempt_${attemptToken}`);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setQuizData(parsed);
        setQuestions(parsed.questions || []);
        if (parsed.expiresAt) {
          const expDate = new Date(parsed.expiresAt);
          setServerExpiresAt(expDate);
          const diff = Math.max(0, Math.floor((expDate.getTime() - Date.now()) / 1000));
          setSecondsRemaining(diff);
        }
        setLoading(false);
      } catch {
        // Fallback
      }
    } else {
      // If refreshed without session storage, restart attempt safely
      router.push(`/quiz/${publicCode}`);
    }
  }, [attemptToken, publicCode, router]);

  // Helper to exit fullscreen safely
  const exitFullscreenSafely = useCallback(() => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // 2. Submit Handler
  const handleSubmitAttempt = useCallback(
    async (isAutoSubmit = false) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setSubmitting(true);

      // Exit fullscreen immediately as the quiz is completed
      exitFullscreenSafely();

      try {
        const res = await fetch(`/api/public/attempt/${attemptToken}/submit`, {
          method: 'POST',
        });
        const data = await res.json();
        exitFullscreenSafely();
        if (res.ok) {
          // Clear session storage and route to result
          sessionStorage.removeItem(`attempt_${attemptToken}`);
          router.push(`/quiz/${publicCode}/result/${attemptToken}`);
        } else {
          router.push(`/quiz/${publicCode}/result/${attemptToken}`);
        }
      } catch {
        exitFullscreenSafely();
        router.push(`/quiz/${publicCode}/result/${attemptToken}`);
      } finally {
        setSubmitting(false);
      }
    },
    [attemptToken, publicCode, router, exitFullscreenSafely]
  );

  // 3. Server-backed Timer Countdown
  useEffect(() => {
    if (secondsRemaining === null || serverExpiresAt === null) return;

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((serverExpiresAt.getTime() - now) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleSubmitAttempt(true);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [serverExpiresAt, secondsRemaining, handleSubmitAttempt]);

  // 4. Auto-save Answer helper
  const saveAnswerToServer = async (qId: string, answerPayload: any) => {
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/public/attempt/${attemptToken}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: qId,
          ...answerPayload,
        }),
      });

      if (res.ok) {
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        const err = await res.json();
        if (err.isExpired) {
          handleSubmitAttempt(true);
        } else {
          setSaveStatus('error');
        }
      }
    } catch {
      setSaveStatus('error');
    }
  };

  // 5. Anti-Cheating Violation Logger & Handler
  const recordViolation = useCallback(
    async (violationType: string, metadata: any = {}) => {
      if (isSubmittingRef.current || !quizData?.settings?.enableAntiCheat) return;

      try {
        const res = await fetch(`/api/public/attempt/${attemptToken}/violation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            violationType,
            metadata,
          }),
        });

        const data = await res.json();
        if (data.action === 'AUTO_SUBMIT') {
          setViolationModal({
            show: true,
            title: 'Quiz Auto-Submitted',
            message: data.message || 'Maximum violations exceeded. Quiz has been auto-submitted.',
            type: violationType,
            count: data.violationCount,
            max: data.maxViolations,
          });
          setTimeout(() => {
            handleSubmitAttempt(true);
          }, 3500);
        } else if (data.action === 'TERMINATE') {
          setViolationModal({
            show: true,
            title: 'Attempt Terminated',
            message: data.message || 'Quiz session terminated due to security violations.',
            type: violationType,
            count: data.violationCount,
            max: data.maxViolations,
          });
          setTimeout(() => {
            router.push(`/quiz/${publicCode}`);
          }, 4000);
        } else if (data.action === 'WARNING') {
          setViolationCount(data.violationCount);
          setViolationModal({
            show: true,
            title: 'Security Violation Detected',
            message: data.message,
            type: violationType,
            count: data.violationCount,
            max: data.maxViolations,
          });
        }
      } catch (err) {
        console.error('Violation record error:', err);
      }
    },
    [attemptToken, handleSubmitAttempt, publicCode, quizData?.settings?.enableAntiCheat, router]
  );

  // 6. Anti-Cheating Browser Listeners
  useEffect(() => {
    const settings = quizData?.settings;
    if (!settings?.enableAntiCheat) return;

    // A. Tab Switch / Visibility change
    const handleVisibilityChange = () => {
      if (document.hidden && settings.detectTabSwitch) {
        recordViolation('TAB_SWITCH', { reason: 'Student switched away from quiz tab' });
      }
    };

    // B. Window Focus Loss / Blur
    const handleWindowBlur = () => {
      if (settings.detectWindowBlur) {
        recordViolation('WINDOW_BLUR', { reason: 'Student clicked outside browser window' });
      }
    };

    // C. Copy / Paste / Context Menu Prevention
    const handleCopy = (e: ClipboardEvent) => {
      if (settings.detectCopy) {
        e.preventDefault();
        recordViolation('COPY_ATTEMPT', { reason: 'Copy attempted' });
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (settings.detectPaste) {
        e.preventDefault();
        recordViolation('PASTE_ATTEMPT', { reason: 'Paste attempted' });
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (settings.detectCopy) {
        e.preventDefault();
      }
    };

    // D. Fullscreen Exit Detection & State Tracking
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active && settings.requireFullscreen && !isSubmittingRef.current) {
        recordViolation('FULLSCREEN_EXIT', { reason: 'Student exited fullscreen mode' });
      }
    };

    // Check initial state
    if (settings.requireFullscreen) {
      setIsFullscreen(!!document.fullscreenElement);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [quizData?.settings, recordViolation]);

  // Request Fullscreen helper
  const requestFullscreen = () => {
    if (typeof document !== 'undefined' && document.documentElement.requestFullscreen) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => {
          console.warn('Fullscreen request failed:', err);
        });
    }
  };

  // Answer selection handlers
  const handleSelectMCQ = (qId: string, optionId: string) => {
    const updated = { ...answers, [qId]: { selectedOptionIds: JSON.stringify([optionId]) } };
    setAnswers(updated);
    saveAnswerToServer(qId, { selectedOptionIds: JSON.stringify([optionId]) });
  };

  const handleToggleMultiSelect = (qId: string, optionId: string) => {
    let currentIds: string[] = [];
    try {
      currentIds = JSON.parse(answers[qId]?.selectedOptionIds || '[]');
    } catch {
      currentIds = [];
    }

    if (currentIds.includes(optionId)) {
      currentIds = currentIds.filter((id) => id !== optionId);
    } else {
      currentIds = [...currentIds, optionId];
    }

    const updated = { ...answers, [qId]: { selectedOptionIds: JSON.stringify(currentIds) } };
    setAnswers(updated);
    saveAnswerToServer(qId, { selectedOptionIds: JSON.stringify(currentIds) });
  };

  const handleTextAnswerChange = (qId: string, text: string) => {
    const updated = { ...answers, [qId]: { textAnswer: text } };
    setAnswers(updated);
    saveAnswerToServer(qId, { textAnswer: text });
  };

  const handleMatchingChange = (qId: string, optionId: string, chosenTarget: string) => {
    let currentMatches: Record<string, string> = {};
    try {
      currentMatches = JSON.parse(answers[qId]?.selectedOptionIds || '{}');
    } catch {
      currentMatches = {};
    }

    currentMatches[optionId] = chosenTarget;
    const updated = { ...answers, [qId]: { selectedOptionIds: JSON.stringify(currentMatches) } };
    setAnswers(updated);
    saveAnswerToServer(qId, { selectedOptionIds: JSON.stringify(currentMatches) });
  };

  const toggleMarkForReview = (qId: string) => {
    const next = new Set(markedForReview);
    if (next.has(qId)) next.delete(qId);
    else next.add(qId);
    setMarkedForReview(next);
  };

  if (loading || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs font-semibold text-slate-400">Loading Question Session...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const qId = currentQ.id;
  const isMarked = markedForReview.has(qId);

  // Status stats for submit dialog
  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    return (
      (a?.selectedOptionIds && a.selectedOptionIds !== '[]' && a.selectedOptionIds !== '{}') ||
      (a?.textAnswer && a.textAnswer.trim().length > 0)
    );
  }).length;
  const unansweredCount = questions.length - answeredCount;
  const markedCount = markedForReview.size;

  // Format Timer
  const formatTimer = (secs: number | null) => {
    if (secs === null) return '00:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = secondsRemaining !== null && secondsRemaining <= 120;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* TOP BAR */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3.5 sticky top-0 z-40 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
              {quizData?.quizTitle || 'Assessment'}
            </h1>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Question {currentIdx + 1} of {questions.length} • {currentQ.marks} Marks
          </div>
        </div>

        {/* Center/Right: Timer & Auto-Save status & Fullscreen Button */}
        <div className="flex items-center gap-3">
          {/* Auto-save visual indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Saved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <span className="text-rose-400">Retrying save...</span>
            )}
          </div>

          {/* Fullscreen Button if needed */}
          {quizData?.settings?.requireFullscreen && (
            <button
              onClick={requestFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs"
              title="Enter Fullscreen"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-xs sm:text-sm transition ${
              isLowTime
                ? 'bg-rose-950/60 border-rose-600 text-rose-400 animate-pulse'
                : 'bg-slate-950 border-slate-800 text-amber-400'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>
        </div>
      </header>

      {/* MAIN EXAM BODY */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT / CENTER: QUESTION VIEWER (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Header: Question Badge & Mark for Review */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Question {currentIdx + 1}
              </span>

              <button
                type="button"
                onClick={() => toggleMarkForReview(qId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  isMarked
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{isMarked ? 'Marked for Review' : 'Mark for Review'}</span>
              </button>
            </div>

            {/* Question Text */}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                {currentQ.questionText}
              </h2>
              {currentQ.description && (
                <p className="text-xs text-slate-400 mt-2">{currentQ.description}</p>
              )}
            </div>

            {/* QUESTION OPTIONS RENDERER */}
            <div className="pt-2">
              {/* 1. MCQ (Single Choice) */}
              {currentQ.type === 'MCQ' && (
                <div className="space-y-3">
                  {currentQ.options?.map((opt: any, optIdx: number) => {
                    let selectedId = '';
                    try {
                      selectedId = JSON.parse(answers[qId]?.selectedOptionIds || '[]')[0] || '';
                    } catch {
                      // ignore
                    }
                    const isSelected = selectedId === opt.id;

                    return (
                      <div
                        key={opt.id || optIdx}
                        onClick={() => handleSelectMCQ(qId, opt.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition flex items-center gap-3.5 ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-600 text-white'
                              : 'border-slate-700 text-slate-400'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </div>
                        <span className="text-sm leading-relaxed">{opt.optionText}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. MULTIPLE SELECT (Checkboxes) */}
              {currentQ.type === 'MULTIPLE_SELECT' && (
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold text-indigo-400 mb-2">
                    Select all that apply:
                  </div>
                  {currentQ.options?.map((opt: any, optIdx: number) => {
                    let selectedIds: string[] = [];
                    try {
                      selectedIds = JSON.parse(answers[qId]?.selectedOptionIds || '[]');
                    } catch {
                      selectedIds = [];
                    }
                    const isSelected = selectedIds.includes(opt.id);

                    return (
                      <div
                        key={opt.id || optIdx}
                        onClick={() => handleToggleMultiSelect(qId, opt.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition flex items-center gap-3.5 ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-700 bg-slate-950'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-sm">{opt.optionText}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 3. TRUE / FALSE */}
              {currentQ.type === 'TRUE_FALSE' && (
                <div className="grid grid-cols-2 gap-3">
                  {currentQ.options?.map((opt: any) => {
                    let selectedId = '';
                    try {
                      selectedId = JSON.parse(answers[qId]?.selectedOptionIds || '[]')[0] || '';
                    } catch {
                      // ignore
                    }
                    const isSelected = selectedId === opt.id;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectMCQ(qId, opt.id)}
                        className={`p-5 rounded-2xl border text-center cursor-pointer font-bold text-sm transition ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        {opt.optionText}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 4. SHORT ANSWER / FILL IN THE BLANK */}
              {['SHORT_ANSWER', 'FILL_IN_BLANK'].includes(currentQ.type) && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400">Your Answer:</label>
                  <input
                    type="text"
                    value={answers[qId]?.textAnswer || ''}
                    onChange={(e) => handleTextAnswerChange(qId, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full text-sm font-medium px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* 5. MATCHING PAIRS */}
              {currentQ.type === 'MATCHING' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 mb-2">
                    Select the matching target for each item:
                  </div>
                  {currentQ.options?.map((opt: any) => {
                    let userMatches: Record<string, string> = {};
                    try {
                      userMatches = JSON.parse(answers[qId]?.selectedOptionIds || '{}');
                    } catch {
                      userMatches = {};
                    }
                    const currentMatch = userMatches[opt.id] || '';

                    return (
                      <div
                        key={opt.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800"
                      >
                        <span className="text-xs font-bold text-slate-200">{opt.optionText}</span>
                        <select
                          value={currentMatch}
                          onChange={(e) => handleMatchingChange(qId, opt.id, e.target.value)}
                          className="text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Select Matching Target --</option>
                          {currentQ.matchingTargets?.map((target: string) => (
                            <option key={target} value={target}>
                              {target}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 6. LONG ANSWER */}
              {currentQ.type === 'LONG_ANSWER' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400">Descriptive Response:</label>
                  <textarea
                    rows={6}
                    value={answers[qId]?.textAnswer || ''}
                    onChange={(e) => handleTextAnswerChange(qId, e.target.value)}
                    placeholder="Write detailed explanation..."
                    className="w-full text-xs font-medium p-4 rounded-2xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* PREVIOUS / NEXT / SUBMIT ACTION BAR */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx((prev) => prev + 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition"
              >
                <Send className="w-4 h-4" />
                <span>Submit Assessment</span>
              </button>
            )}
          </div>
        </div>

        {/* RIGHT: QUESTION NAVIGATOR PALETTE */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Question Navigator
            </h3>
            <span className="text-[11px] text-slate-400">{questions.length} total</span>
          </div>

          {/* Grid Palette */}
          <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
            {questions.map((q, idx) => {
              const a = answers[q.id];
              const isAns =
                (a?.selectedOptionIds &&
                  a.selectedOptionIds !== '[]' &&
                  a.selectedOptionIds !== '{}') ||
                (a?.textAnswer && a.textAnswer.trim().length > 0);
              const isRev = markedForReview.has(q.id);
              const isCur = currentIdx === idx;

              return (
                <button
                  key={q.id || idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-9 rounded-xl font-bold text-xs transition relative flex items-center justify-center ${
                    isCur
                      ? 'border-2 border-indigo-400 bg-indigo-600 text-white shadow'
                      : isRev
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : isAns
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                      : 'bg-slate-950 text-slate-500 border border-slate-800 hover:text-white'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500"></span>
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500"></span>
              <span>Review ({markedCount})</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700"></span>
              <span>Unanswered ({unansweredCount})</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="w-3 h-3 rounded-full border-2 border-indigo-400 bg-indigo-600"></span>
              <span>Current</span>
            </div>
          </div>

          {/* Finish & Submit Button */}
          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="w-full mt-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Quiz</span>
          </button>
        </div>
      </main>

      {/* CONFIRM SUBMISSION MODAL */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Confirm Submission"
        maxWidth="md"
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-300">
            Are you sure you want to finalize and submit your assessment? Once submitted, answers
            cannot be altered.
          </p>

          <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Answered</div>
              <div className="text-base font-extrabold text-emerald-400">{answeredCount}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Unanswered</div>
              <div className="text-base font-extrabold text-rose-400">{unansweredCount}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">For Review</div>
              <div className="text-base font-extrabold text-amber-400">{markedCount}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowSubmitModal(false)}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
            >
              Back to Exam
            </button>
            <button
              type="button"
              onClick={() => handleSubmitAttempt(false)}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Yes, Submit Now</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* SECURITY VIOLATION WARNING MODAL */}
      {violationModal && (
        <Modal
          isOpen={violationModal.show}
          onClose={() => setViolationModal(null)}
          title={violationModal.title}
          maxWidth="md"
        >
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{violationModal.message}</p>

            <div className="p-3 bg-slate-950 rounded-xl border border-rose-900/40 text-xs font-mono text-rose-400">
              Violations: {violationModal.count} / {violationModal.max} allowed
            </div>

            <button
              type="button"
              onClick={() => {
                setViolationModal(null);
                requestFullscreen();
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow"
            >
              Acknowledge & Return to Quiz
            </button>
          </div>
        </Modal>
      )}

      {/* MANDATORY FULLSCREEN GATE OVERLAY FOR STUDENTS */}
      {quizData?.settings?.requireFullscreen && !isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-lg">
              <Maximize className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Fullscreen Exam Mode Required</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                To maintain assessment integrity, this quiz must be conducted in full screen mode.
              </p>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-amber-400 text-left space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Anti-Cheating Policy Active</span>
              </div>
              <p className="text-slate-400 text-[10px]">
                Exiting fullscreen mode will log a security violation. Exceeding allowed violations will auto-submit your attempt.
              </p>
            </div>

            <button
              type="button"
              onClick={requestFullscreen}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              <Maximize className="w-4 h-4" />
              <span>Enter Fullscreen & Begin Exam</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
