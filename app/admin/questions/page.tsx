'use client';

import React, { useEffect, useState } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Modal } from '@/components/ui/Modal';
import { QuestionImportModal } from '@/components/quiz-builder/QuestionImportModal';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useToast } from '@/components/ui/Toast';
import {
  Database,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Upload,
  Layers,
  Sparkles,
  CheckCircle,
  Loader2,
} from 'lucide-react';

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Create/Edit modal
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { success, error } = useToast();

  const fetchBank = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedSubject !== 'ALL') params.set('subject', selectedSubject);
      if (selectedDifficulty !== 'ALL') params.set('difficulty', selectedDifficulty);
      if (selectedType !== 'ALL') params.set('type', selectedType);

      const res = await fetch(`/api/admin/question-bank?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions || []);
        if (data.subjects) setSubjects(data.subjects);
      }
    } catch {
      error('Failed to load Question Bank');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBank();
  }, [search, selectedSubject, selectedDifficulty, selectedType]);

  const handleOpenCreate = () => {
    setEditingQuestion({
      questionText: '',
      type: 'MCQ',
      subject: 'Computer Science',
      topic: '',
      difficulty: 'MEDIUM',
      marks: 1.0,
      negativeMarks: 0.0,
      explanation: '',
      options: [
        { optionText: 'Option 1', isCorrect: true, orderIndex: 0 },
        { optionText: 'Option 2', isCorrect: false, orderIndex: 1 },
        { optionText: 'Option 3', isCorrect: false, orderIndex: 2 },
        { optionText: 'Option 4', isCorrect: false, orderIndex: 3 },
      ],
    });
    setShowEditorModal(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion.questionText.trim()) {
      error('Question text is required');
      return;
    }

    try {
      if (editingQuestion.id) {
        // Update
        const res = await fetch(`/api/admin/questions/${editingQuestion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingQuestion),
        });
        if (res.ok) {
          success('Question updated successfully!');
          setShowEditorModal(false);
          fetchBank();
        }
      } else {
        // Create in bank
        const res = await fetch('/api/admin/question-bank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingQuestion),
        });
        if (res.ok) {
          success('Question added to Question Bank!');
          setShowEditorModal(false);
          fetchBank();
        }
      }
    } catch {
      error('Failed to save question');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/questions/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        success('Question removed from Question Bank');
        setDeleteTarget(null);
        fetchBank();
      } else {
        error('Failed to delete question');
      }
    } catch {
      error('Failed to delete question');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-16">
      <AdminHeader
        title="Question Bank Repository"
        subtitle="Create, organize, and reuse questions across all assessments."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
            >
              <Upload className="w-4 h-4 text-emerald-500" />
              <span>Bulk Import (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search question bank..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-10 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="text-xs px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 outline-none"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="text-xs px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 outline-none"
          >
            <option value="ALL">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 outline-none"
          >
            <option value="ALL">All Question Types</option>
            <option value="MCQ">Multiple Choice</option>
            <option value="MULTIPLE_SELECT">Multiple Select</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="LONG_ANSWER">Long Answer</option>
            <option value="MATCHING">Matching</option>
          </select>
        </div>

        {/* Questions Grid */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-20 flex items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
              <Database className="w-10 h-10 text-indigo-500 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No Questions in Bank
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Add reusable questions to easily import them into multiple exams.
              </p>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow"
              >
                + Create Question
              </button>
            </div>
          ) : (
            questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                      {q.subject || 'General'}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {q.type}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {q.difficulty}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {q.marks} Marks
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {q.questionText}
                  </h4>

                  {q.options?.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {q.options.map((opt: any, optIdx: number) => (
                        <div
                          key={opt.id || optIdx}
                          className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-2 ${
                            opt.isCorrect
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <span className="text-[10px] opacity-60">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span>{opt.optionText}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.explanation && (
                    <div className="text-[11px] text-amber-600 dark:text-amber-400">
                      <strong>Solution:</strong> {q.explanation}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuestion(q);
                      setShowEditorModal(true);
                    }}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Edit Question"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(q)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit/Create Question Modal */}
      {showEditorModal && editingQuestion && (
        <Modal
          isOpen={showEditorModal}
          onClose={() => setShowEditorModal(false)}
          title={editingQuestion.id ? 'Edit Question Bank Item' : 'New Question Bank Item'}
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveQuestion} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Question Text</label>
              <textarea
                rows={2}
                required
                value={editingQuestion.questionText}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, questionText: e.target.value })
                }
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={editingQuestion.subject || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, subject: e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Topic</label>
                <input
                  type="text"
                  value={editingQuestion.topic || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, topic: e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Difficulty</label>
                <select
                  value={editingQuestion.difficulty || 'MEDIUM'}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>

            {/* Options */}
            {['MCQ', 'MULTIPLE_SELECT', 'TRUE_FALSE'].includes(editingQuestion.type) && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Options (Check to mark correct):
                </label>
                {editingQuestion.options?.map((opt: any, optIdx: number) => (
                  <div key={optIdx} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={opt.isCorrect}
                      onChange={(e) => {
                        const opts = [...editingQuestion.options];
                        if (editingQuestion.type === 'MCQ') {
                          opts.forEach((o, i) => (o.isCorrect = i === optIdx));
                        } else {
                          opts[optIdx].isCorrect = e.target.checked;
                        }
                        setEditingQuestion({ ...editingQuestion, options: opts });
                      }}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <input
                      type="text"
                      value={opt.optionText}
                      onChange={(e) => {
                        const opts = [...editingQuestion.options];
                        opts[optIdx].optionText = e.target.value;
                        setEditingQuestion({ ...editingQuestion, options: opts });
                      }}
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Explanation / Solution
              </label>
              <textarea
                rows={2}
                value={editingQuestion.explanation || ''}
                onChange={(e) =>
                  setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                }
                className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditorModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow"
              >
                Save to Question Bank
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CSV Import Modal */}
      <QuestionImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => fetchBank()}
      />

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmationDialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isLoading={deleteLoading}
          isDangerous={true}
          title="Delete Question from Bank?"
          message="Are you sure you want to remove this question from the Question Bank repository?"
          confirmText="Delete Question"
        />
      )}
    </div>
  );
}
