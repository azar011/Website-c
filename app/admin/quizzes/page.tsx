'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { QRCodeModal } from '@/components/admin/QRCodeModal';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  PlusCircle,
  Search,
  QrCode,
  Edit,
  Copy,
  Trash2,
  Eye,
  BarChart2,
  ExternalLink,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Share2,
  Clock,
  Loader2,
  Globe,
  GraduationCap,
  Users,
  AlertTriangle,
} from 'lucide-react';

export default function AllQuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // QR Modal state
  const [qrModalQuiz, setQrModalQuiz] = useState<any | null>(null);

  // Delete Dialog state
  const [deleteQuizTarget, setDeleteQuizTarget] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Publish Modal state
  const [publishModalQuiz, setPublishModalQuiz] = useState<any | null>(null);
  const [publishAccessMode, setPublishAccessMode] = useState<'PUBLIC' | 'BATCHES'>('PUBLIC');
  const [publishSelectedBatchIds, setPublishSelectedBatchIds] = useState<string[]>([]);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const { success, error } = useToast();

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/quizzes?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setQuizzes(data.quizzes || []);
      }
    } catch {
      error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [statusFilter, search]);

  const handleDuplicate = async (quizId: string) => {
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        success('Quiz duplicated successfully as Draft!');
        fetchQuizzes();
      } else {
        error(data.error || 'Failed to duplicate quiz');
      }
    } catch {
      error('Failed to duplicate quiz');
    }
  };

  const openPublishModal = async (quiz: any) => {
    setPublishModalQuiz(quiz);
    const isBatch = quiz.settings?.restrictToBatch ?? false;
    setPublishAccessMode(isBatch ? 'BATCHES' : 'PUBLIC');
    setPublishSelectedBatchIds(quiz.batches?.map((b: any) => b.batchId || b.batch?.id).filter(Boolean) || []);

    if (availableBatches.length === 0) {
      setLoadingBatches(true);
      try {
        const res = await fetch('/api/admin/batches');
        const data = await res.json();
        if (res.ok) {
          setAvailableBatches(data.batches || []);
        }
      } catch {
        // ignore
      } finally {
        setLoadingBatches(false);
      }
    }
  };

  const handleConfirmPublish = async () => {
    if (!publishModalQuiz) return;
    if (publishAccessMode === 'BATCHES' && publishSelectedBatchIds.length === 0) {
      error('Please select at least one batch, or switch to Public Quiz.');
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/quizzes/${publishModalQuiz.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessMode: publishAccessMode,
          batchIds: publishAccessMode === 'BATCHES' ? publishSelectedBatchIds : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        success(
          publishAccessMode === 'PUBLIC'
            ? 'Quiz published as Public Quiz! Anyone with the code can take it.'
            : 'Quiz published for assigned batches! Only enrolled students can take it.'
        );
        setPublishModalQuiz(null);
        fetchQuizzes();
      } else {
        if (data.validationErrors) {
          error(data.validationErrors.join(' • '));
        } else {
          error(data.error || 'Failed to publish quiz');
        }
      }
    } catch {
      error('Network error publishing quiz');
    } finally {
      setPublishing(false);
    }
  };

  const handlePublish = async (quizId: string) => {
    const target = quizzes.find((q) => q.id === quizId);
    if (target) {
      openPublishModal(target);
    }
  };

  const handleClose = async (quizId: string) => {
    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}/close`, { method: 'POST' });
      if (res.ok) {
        success('Quiz closed to new student responses.');
        fetchQuizzes();
      }
    } catch {
      error('Failed to close quiz');
    }
  };

  const handleDelete = async () => {
    if (!deleteQuizTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/quizzes/${deleteQuizTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        success('Quiz deleted successfully');
        setDeleteQuizTarget(null);
        fetchQuizzes();
      } else {
        const d = await res.json();
        error(d.error || 'Failed to delete quiz');
      }
    } catch {
      error('Failed to delete quiz');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title="Quizzes & Assessments"
        subtitle="Create, configure, publish, and monitor your assessments."
        actions={
          <Link
            href="/admin/quizzes/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6e38f7] hover:bg-[#7b46fa] text-white text-xs font-semibold shadow-md shadow-purple-900/40 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Quiz</span>
          </Link>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl overflow-x-auto">
            {['ALL', 'PUBLISHED', 'DRAFT', 'CLOSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === st
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'All Quizzes' : st}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by title, code, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
        </div>

        {/* Quizzes Table Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Quiz Details</th>
                  <th className="px-5 py-3.5">Public Code</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Questions</th>
                  <th className="px-5 py-3.5">Duration</th>
                  <th className="px-5 py-3.5">Submissions</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>Loading Quizzes...</span>
                      </div>
                    </td>
                  </tr>
                ) : quizzes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      No assessments found matching your filter.{' '}
                      <Link href="/admin/quizzes/new" className="text-indigo-600 font-semibold">
                        Create one now
                      </Link>
                    </td>
                  </tr>
                ) : (
                  quizzes.map((quiz) => (
                    <tr
                      key={quiz.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/quizzes/${quiz.id}/edit`}
                            className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {quiz.title}
                          </Link>
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          {quiz.subject || 'General'} {quiz.department ? `• ${quiz.department}` : ''}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                            {quiz.publicCode}
                          </span>
                          <button
                            onClick={() => setQrModalQuiz(quiz)}
                            title="View Share QR"
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              quiz.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : quiz.status === 'CLOSED'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {quiz.status}
                          </span>

                          {quiz.settings?.restrictToBatch ? (
                            <button
                              type="button"
                              onClick={() => openPublishModal(quiz)}
                              title="Click to view or edit batch access"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 hover:bg-purple-200 transition"
                            >
                              <GraduationCap className="w-3 h-3" />
                              <span>Batches ({quiz.batches?.length || 0})</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openPublishModal(quiz)}
                              title="Click to view or edit access mode"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-200 transition"
                            >
                              <Globe className="w-3 h-3" />
                              <span>Public</span>
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-600 dark:text-slate-300">
                        {quiz._count.questions}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-600 dark:text-slate-300">
                        {quiz.durationMinutes} mins
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-600 dark:text-slate-300">
                        {quiz._count.attempts}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Publish / Close / Re-publish toggle */}
                          {quiz.status === 'DRAFT' && (
                            <button
                              onClick={() => handlePublish(quiz.id)}
                              title="Publish Quiz"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {quiz.status === 'PUBLISHED' && (
                            <button
                              onClick={() => handleClose(quiz.id)}
                              title="Close Quiz (Stop accepting responses)"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {quiz.status === 'CLOSED' && (
                            <button
                              onClick={() => handlePublish(quiz.id)}
                              title="Re-publish Quiz (Re-open for student submissions)"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* Share & QR */}
                          <button
                            onClick={() => setQrModalQuiz(quiz)}
                            title="Share & QR Code"
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <Link
                            href={`/admin/quizzes/${quiz.id}/edit`}
                            title="Edit Quiz"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          {/* Preview */}
                          <Link
                            href={`/admin/quizzes/${quiz.id}/preview`}
                            title="Student Preview"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Responses */}
                          <Link
                            href={`/admin/quizzes/${quiz.id}/responses`}
                            title="View Responses"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </Link>

                          {/* Analytics */}
                          <Link
                            href={`/admin/quizzes/${quiz.id}/analytics`}
                            title="View Analytics"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </Link>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(quiz.id)}
                            title="Duplicate Quiz"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteQuizTarget(quiz)}
                            title="Delete Quiz"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModalQuiz && (
        <QRCodeModal
          isOpen={!!qrModalQuiz}
          onClose={() => setQrModalQuiz(null)}
          quizTitle={qrModalQuiz.title}
          publicCode={qrModalQuiz.publicCode}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteQuizTarget && (
        <ConfirmationDialog
          isOpen={!!deleteQuizTarget}
          onClose={() => setDeleteQuizTarget(null)}
          onConfirm={handleDelete}
          isLoading={actionLoading}
          isDangerous={true}
          title="Delete Quiz Assessment?"
          message={`Are you sure you want to permanently delete "${deleteQuizTarget.title}"? All questions, student responses, and analytics for this quiz will be removed.`}
          confirmText="Delete Quiz"
        />
      )}

      {/* Publish Access Mode Selection Modal */}
      {publishModalQuiz && (
        <Modal
          isOpen={!!publishModalQuiz}
          onClose={() => setPublishModalQuiz(null)}
          title={`Publish Assessment — ${publishModalQuiz.title}`}
          maxWidth="xl"
        >
          <div className="space-y-5">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose the access option for this assessment before making it live:
              </p>
            </div>

            {/* 2 ACCESS OPTIONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Public */}
              <div
                onClick={() => setPublishAccessMode('PUBLIC')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                  publishAccessMode === 'PUBLIC'
                    ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    publishAccessMode === 'PUBLIC'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Public Quiz
                    </h4>
                    {publishAccessMode === 'PUBLIC' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Anyone with the quiz link, code, or QR code can participate. No batch restriction.
                  </p>
                </div>
              </div>

              {/* Option 2: Batches Only */}
              <div
                onClick={() => setPublishAccessMode('BATCHES')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                  publishAccessMode === 'BATCHES'
                    ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    publishAccessMode === 'BATCHES'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Batches Only
                    </h4>
                    {publishAccessMode === 'BATCHES' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Only students enrolled in assigned batches can take the test with their Register / Roll Number.
                  </p>
                </div>
              </div>
            </div>

            {/* BATCH SELECTION IF BATCHES SELECTED */}
            {publishAccessMode === 'BATCHES' && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-white">
                    Select Permitted Student Batches:
                  </label>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                    {publishSelectedBatchIds.length} batch(es) selected
                  </span>
                </div>

                {loadingBatches ? (
                  <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span>Loading batches...</span>
                  </div>
                ) : availableBatches.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-200">
                    No student batches found. Please create a batch first in Batches Management, or publish as Public Quiz.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {availableBatches.map((b) => {
                      const isChecked = publishSelectedBatchIds.includes(b.id);
                      return (
                        <div
                          key={b.id}
                          onClick={() => {
                            setPublishSelectedBatchIds((prev) =>
                              isChecked ? prev.filter((id) => id !== b.id) : [...prev, b.id]
                            );
                          }}
                          className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center gap-2.5 text-xs ${
                            isChecked
                              ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-400 dark:border-purple-800'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {b.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {b._count?.students || b.students?.length || 0} Students
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPublishModalQuiz(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={publishing || (publishAccessMode === 'BATCHES' && publishSelectedBatchIds.length === 0)}
                onClick={handleConfirmPublish}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
              >
                {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                <span>
                  {publishAccessMode === 'PUBLIC'
                    ? 'Publish as Public Quiz'
                    : `Publish for ${publishSelectedBatchIds.length} Batch(es)`}
                </span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
