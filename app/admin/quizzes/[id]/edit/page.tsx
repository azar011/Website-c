'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { QuestionCard, QuestionData } from '@/components/quiz-builder/QuestionCard';
import { QuizSettingsTabs } from '@/components/quiz-builder/QuizSettingsTabs';
import { QuestionBankModal } from '@/components/quiz-builder/QuestionBankModal';
import { QuestionImportModal } from '@/components/quiz-builder/QuestionImportModal';
import { QRCodeModal } from '@/components/admin/QRCodeModal';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useToast } from '@/components/ui/Toast';
import {
  Plus,
  Save,
  CheckCircle,
  Eye,
  Share2,
  Database,
  Upload,
  ArrowLeft,
  Sparkles,
  Layers,
  Settings,
  HelpCircle,
  Loader2,
  XCircle,
} from 'lucide-react';

export default function QuizEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { success, error, warning } = useToast();

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [activeBuilderTab, setActiveBuilderTab] = useState<'questions' | 'settings'>('questions');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [showBankModal, setShowBankModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Publish validation dialog
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);

  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/quizzes/${id}`);
      const data = await res.json();
      if (res.ok) {
        setQuiz(data.quiz);
        setQuestions(data.quiz.questions || []);
        setSettings(data.quiz.settings || {});
      } else {
        error(data.error || 'Failed to load quiz');
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

  const handleAddQuestion = () => {
    const newQ: QuestionData = {
      questionText: '',
      type: 'MCQ',
      required: true,
      marks: 1.0,
      negativeMarks: 0.0,
      orderIndex: questions.length,
      difficulty: 'MEDIUM',
      options: [
        { optionText: '', isCorrect: true, orderIndex: 0 },
        { optionText: '', isCorrect: false, orderIndex: 1 },
        { optionText: '', isCorrect: false, orderIndex: 2 },
        { optionText: '', isCorrect: false, orderIndex: 3 },
      ],
    };
    setQuestions([...questions, newQ]);
  };

  const handleQuestionChange = (index: number, updated: QuestionData) => {
    const qList = [...questions];
    qList[index] = updated;
    setQuestions(qList);
  };

  const handleDeleteQuestion = (index: number) => {
    const qList = questions.filter((_, idx) => idx !== index);
    setQuestions(qList);
  };

  const handleDuplicateQuestion = (index: number) => {
    const target = questions[index];
    const duplicated: QuestionData = {
      ...target,
      id: undefined,
      questionText: `${target.questionText} (Copy)`,
      orderIndex: questions.length,
      options: target.options.map((opt) => ({
        ...opt,
        id: undefined,
      })),
    };
    setQuestions([...questions, duplicated]);
    success('Question duplicated');
  };

  const handleMoveQuestion = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= questions.length) return;
    const qList = [...questions];
    const [moved] = qList.splice(fromIdx, 1);
    qList.splice(toIdx, 0, moved);
    setQuestions(qList);
  };

  const handleImportBankQuestions = (bankQuestions: any[]) => {
    const newItems: QuestionData[] = bankQuestions.map((bq, idx) => ({
      questionText: bq.questionText,
      description: bq.description,
      type: bq.type,
      required: bq.required,
      marks: bq.marks,
      negativeMarks: bq.negativeMarks,
      evaluationType: bq.evaluationType,
      keywords: bq.keywords,
      explanation: bq.explanation,
      imageUrl: bq.imageUrl,
      subject: bq.subject,
      topic: bq.topic,
      difficulty: bq.difficulty,
      orderIndex: questions.length + idx,
      options: bq.options.map((o: any) => ({
        optionText: o.optionText,
        isCorrect: o.isCorrect,
        matchTarget: o.matchTarget,
        orderIndex: o.orderIndex,
      })),
    }));

    setQuestions([...questions, ...newItems]);
  };

  const handleSaveAll = async (showNotification = true) => {
    setSaving(true);
    try {
      // 1. Update Quiz metadata and settings
      const quizRes = await fetch(`/api/admin/quizzes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quiz.title,
          description: quiz.description,
          instructions: quiz.instructions,
          subject: quiz.subject,
          category: quiz.category,
          targetClass: quiz.targetClass,
          department: quiz.department,
          durationMinutes: quiz.durationMinutes,
          passingPercentage: quiz.passingPercentage,
          startDate: quiz.startDate,
          endDate: quiz.endDate,
          randomizeQuestions: quiz.randomizeQuestions,
          randomizeOptions: quiz.randomizeOptions,
          questionPoolSize: quiz.questionPoolSize,
          settings,
        }),
      });

      if (!quizRes.ok) {
        throw new Error('Failed to update quiz settings');
      }

      // 2. Save / Sync questions
      // Delete existing questions on server and recreate with new order
      for (const [idx, q] of questions.entries()) {
        if (q.id) {
          // Update existing
          await fetch(`/api/admin/questions/${q.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...q,
              orderIndex: idx,
            }),
          });
        } else {
          // Create new
          const createRes = await fetch(`/api/admin/quizzes/${id}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...q,
              orderIndex: idx,
            }),
          });
          const createData = await createRes.json();
          if (createData.question) {
            q.id = createData.question.id;
          }
        }
      }

      if (showNotification) {
        success('Assessment changes saved successfully!');
      }
      fetchQuiz();
    } catch (err: any) {
      error(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    await handleSaveAll(false);
    try {
      const res = await fetch(`/api/admin/quizzes/${id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        success(data.message || 'Quiz published successfully! It is now live for students.');
        fetchQuiz();
      } else {
        if (data.validationErrors) {
          setValidationErrors(data.validationErrors);
        } else {
          error(data.error || 'Failed to publish quiz');
        }
      }
    } catch {
      error('Failed to publish quiz');
    }
  };

  const handleClose = async () => {
    try {
      const res = await fetch(`/api/admin/quizzes/${id}/close`, { method: 'POST' });
      if (res.ok) {
        success('Quiz closed to student responses.');
        fetchQuiz();
      }
    } catch {
      error('Failed to close quiz');
    }
  };

  if (loading || !quiz) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold text-slate-500">Loading Quiz Builder...</p>
        </div>
      </div>
    );
  }

  const totalMarks = questions.reduce((acc, q) => acc + (parseFloat(String(q.marks)) || 0), 0);

  return (
    <div className="flex-1 flex flex-col pb-20">
      {/* Top Header */}
      <AdminHeader
        title={quiz.title}
        subtitle={`${quiz.subject || 'Assessment'} • Code: ${quiz.publicCode} • Status: ${quiz.status}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/quizzes"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Back to Quizzes"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <Link
              href={`/admin/quizzes/${id}/preview`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
            >
              <Eye className="w-4 h-4" />
              <span>Student Preview</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Share & QR</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveAll(true)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow transition disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save</span>
            </button>

            {quiz.status === 'PUBLISHED' ? (
              <button
                type="button"
                onClick={handleClose}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow transition"
                title="Close quiz (Stop accepting student submissions)"
              >
                <XCircle className="w-4 h-4" />
                <span>Close Quiz</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublish}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition"
                title={quiz.status === 'CLOSED' ? 'Re-publish assessment to open student responses' : 'Publish assessment'}
              >
                <CheckCircle className="w-4 h-4" />
                <span>{quiz.status === 'CLOSED' ? 'Re-publish Quiz' : 'Publish'}</span>
              </button>
            )}
          </div>
        }
      />

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Title & Stats Summary Banner */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full pb-1"
            />
            <input
              type="text"
              value={quiz.description || ''}
              onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
              placeholder="Add assessment description..."
              className="text-xs text-slate-500 dark:text-slate-400 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full mt-1 pb-1"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Questions</div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                {questions.length}
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Marks</div>
              <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                {Math.round(totalMarks * 100) / 100}
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Duration</div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                {quiz.durationMinutes}m
              </div>
            </div>
          </div>
        </div>

        {/* Builder View Switcher (Questions Builder / Settings) */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveBuilderTab('questions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeBuilderTab === 'questions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Question Builder ({questions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveBuilderTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeBuilderTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Quiz & Security Settings</span>
          </button>
        </div>

        {/* VIEW 1: QUESTIONS BUILDER */}
        {activeBuilderTab === 'questions' && (
          <div className="space-y-4">
            {/* Action Tools Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/80 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Questions List
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBankModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                >
                  <Database className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Question Bank</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Import CSV / JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {/* Questions List */}
            {questions.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No Questions Added Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                  Start building your quiz by creating questions, importing from the question bank,
                  or uploading a CSV sheet.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition"
                  >
                    + Add First Question
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBankModal(true)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Import from Bank
                  </button>
                </div>
              </div>
            ) : (
              questions.map((q, idx) => (
                <QuestionCard
                  key={q.id || `temp-${idx}`}
                  question={q}
                  index={idx}
                  totalQuestions={questions.length}
                  onChange={(updated) => handleQuestionChange(idx, updated)}
                  onDelete={() => handleDeleteQuestion(idx)}
                  onDuplicate={() => handleDuplicateQuestion(idx)}
                  onMoveUp={() => handleMoveQuestion(idx, idx - 1)}
                  onMoveDown={() => handleMoveQuestion(idx, idx + 1)}
                />
              ))
            )}

            {/* Bottom Add Question Button */}
            {questions.length > 0 && (
              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-3.5 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-xs transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Question</span>
              </button>
            )}
          </div>
        )}

        {/* VIEW 2: QUIZ & SECURITY SETTINGS */}
        {activeBuilderTab === 'settings' && (
          <QuizSettingsTabs
            quiz={quiz}
            settings={settings}
            onQuizChange={(updated) => setQuiz(updated)}
            onSettingsChange={(updated) => setSettings(updated)}
          />
        )}
      </div>

      {/* Question Bank Modal */}
      <QuestionBankModal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        onImport={handleImportBankQuestions}
      />

      {/* CSV / JSON Import Modal */}
      <QuestionImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        quizId={id}
        onImportSuccess={() => fetchQuiz()}
      />

      {/* QR Code & Share Modal */}
      <QRCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        quizTitle={quiz.title}
        publicCode={quiz.publicCode}
      />

      {/* Publish Validation Errors Dialog */}
      {validationErrors && (
        <ConfirmationDialog
          isOpen={!!validationErrors}
          onClose={() => setValidationErrors(null)}
          onConfirm={() => setValidationErrors(null)}
          title="Cannot Publish Quiz"
          message={validationErrors.join(' • ')}
          confirmText="Fix Issues"
          cancelText="Dismiss"
          isDangerous={true}
        />
      )}
    </div>
  );
}
