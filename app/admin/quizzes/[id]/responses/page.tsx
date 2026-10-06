'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useToast } from '@/components/ui/Toast';
import {
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Eye,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShieldAlert,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

export default function QuizResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [hasViolationsFilter, setHasViolationsFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  // Selected attempt detail modal
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Delete attempt target
  const [deleteAttemptTarget, setDeleteAttemptTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentUserRole, setCurrentRole] = useState<string>('');

  const { success, error } = useToast();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((authData) => {
        if (authData.admin?.role) setCurrentRole(authData.admin.role);
      })
      .catch(() => {});
  }, []);

  const fetchResponses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (classFilter !== 'ALL') params.set('class', classFilter);
      if (departmentFilter !== 'ALL') params.set('department', departmentFilter);
      if (hasViolationsFilter) params.set('hasViolations', 'true');

      const res = await fetch(`/api/admin/quizzes/${id}/responses?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setAttempts(json.attempts || []);
      }
    } catch {
      error('Failed to load responses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, [id, search, statusFilter, classFilter, departmentFilter, hasViolationsFilter]);

  const viewAttemptDetail = async (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/attempts/${attemptId}`);
      const json = await res.json();
      if (res.ok) {
        setAttemptDetail(json.attempt);
      } else {
        error(json.error || 'Failed to load attempt details');
      }
    } catch {
      error('Failed to load attempt details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteAttempt = async () => {
    if (!deleteAttemptTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/attempts/${deleteAttemptTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        success('Attempt deleted successfully');
        setDeleteAttemptTarget(null);
        if (selectedAttemptId === deleteAttemptTarget.id) {
          setSelectedAttemptId(null);
          setAttemptDetail(null);
        }
        fetchResponses();
      } else {
        error('Failed to delete attempt');
      }
    } catch {
      error('Failed to delete attempt');
    } finally {
      setDeleteLoading(false);
    }
  };

  const downloadExcel = () => {
    window.location.href = `/api/admin/quizzes/${id}/reports/excel`;
    success('Excel report download initiated');
  };

  const downloadCSV = () => {
    window.location.href = `/api/admin/quizzes/${id}/reports/csv`;
    success('CSV export initiated');
  };

  return (
    <div className="flex-1 flex flex-col">
      <AdminHeader
        title={`Student Responses: ${data?.quiz?.title || 'Quiz'}`}
        subtitle={`${attempts.length} total attempt records recorded.`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={currentUserRole === 'SUPER_ADMIN' ? '/admin/users' : `/admin/quizzes/${id}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition"
              title={currentUserRole === 'SUPER_ADMIN' ? 'Back to Master Admin Dashboard' : 'Back to Editor'}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{currentUserRole === 'SUPER_ADMIN' ? 'Master Admin' : 'Editor'}</span>
            </Link>

            <button
              type="button"
              onClick={downloadCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={downloadExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Excel (Multi-Sheet)</span>
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by student name, roll no, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-10 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted / Completed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="TERMINATED">Terminated</option>
          </select>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="text-xs px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 outline-none"
          >
            <option value="ALL">All Classes</option>
            {data?.filters?.classes?.map((c: string) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Violations Toggle */}
          <button
            type="button"
            onClick={() => setHasViolationsFilter(!hasViolationsFilter)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition ${
              hasViolationsFilter
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-300 dark:border-rose-900'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Violations Only</span>
          </button>
        </div>

        {/* Responses Table Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Student Details</th>
                  <th className="px-5 py-3.5">Register No</th>
                  <th className="px-5 py-3.5">Class / Dept</th>
                  <th className="px-5 py-3.5">Score</th>
                  <th className="px-5 py-3.5">Result</th>
                  <th className="px-5 py-3.5">Violations</th>
                  <th className="px-5 py-3.5">Submitted At</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>Loading Student Responses...</span>
                      </div>
                    </td>
                  </tr>
                ) : attempts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      No student responses recorded yet matching filters.
                    </td>
                  </tr>
                ) : (
                  attempts.map((att) => (
                    <tr
                      key={att.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-[10px]">
                            {(att.studentName || 'U').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div>{att.studentName || 'Anonymous Participant'}</div>
                            {att.email && (
                              <div className="text-[11px] text-slate-400 font-normal">
                                {att.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {att.registerNumber || '—'}
                      </td>

                      <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                        <div>{att.studentClass || '—'}</div>
                        <div className="text-[10px] text-slate-400">{att.department || ''}</div>
                      </td>

                      <td className="px-5 py-4 font-extrabold text-slate-900 dark:text-white">
                        {att.status === 'SUBMITTED' ? (
                          <span>
                            {att.totalScore} pts ({att.percentage}%)
                          </span>
                        ) : (
                          <span className="text-amber-500 font-medium">{att.status}</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {att.status === 'SUBMITTED' ? (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              att.passed
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                            }`}
                          >
                            {att.passed ? 'PASS' : 'FAIL'}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {att.violationCount > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md text-[11px]">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{att.violationCount} Violations</span>
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-[11px] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Clean
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-500 text-[11px]">
                        {att.submittedAt
                          ? new Date(att.submittedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            }) +
                            ', ' +
                            new Date(att.submittedAt).toLocaleDateString()
                          : 'In Progress'}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => viewAttemptDetail(att.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold text-[11px] hover:bg-indigo-100 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteAttemptTarget(att)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Attempt"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* DETAILED STUDENT ANSWER SHEET & VIOLATION MODAL */}
      <Modal
        isOpen={!!selectedAttemptId}
        onClose={() => {
          setSelectedAttemptId(null);
          setAttemptDetail(null);
        }}
        title="Student Response Sheet & Audit Trail"
        maxWidth="4xl"
      >
        {detailLoading || !attemptDetail ? (
          <div className="py-16 flex items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Student & Score Header */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Student Name</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {attemptDetail.studentName || 'Anonymous'}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {attemptDetail.registerNumber || 'No Roll No'}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Class & Dept</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {attemptDetail.studentClass || 'N/A'}
                </div>
                <div className="text-xs text-slate-500">{attemptDetail.department || 'N/A'}</div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Score & Result</div>
                <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                  {attemptDetail.totalScore} Marks ({attemptDetail.percentage}%)
                </div>
                <div
                  className={`text-xs font-bold uppercase ${
                    attemptDetail.passed ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {attemptDetail.passed ? 'PASSED' : 'FAILED'}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Violations</div>
                <div
                  className={`text-sm font-bold ${
                    attemptDetail.violationCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {attemptDetail.violationCount} Logged
                </div>
                <div className="text-xs text-slate-400">
                  Correct: {attemptDetail.totalCorrect} • Wrong: {attemptDetail.totalWrong}
                </div>
              </div>
            </div>

            {/* Security Violations Log if any */}
            {attemptDetail.violations?.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-2">
                <div className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Security & Anti-Cheating Event Timeline:</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {attemptDetail.violations.map((v: any) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 text-slate-700 dark:text-slate-300"
                    >
                      <span className="font-semibold text-rose-600">{v.violationType}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {new Date(v.timestamp).toLocaleTimeString()} ({v.durationSeconds}s)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Question by Question Response Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Question Responses:
              </h4>

              {attemptDetail.quiz.questions.map((q: any, idx: number) => {
                const ans = attemptDetail.answers.find((a: any) => a.questionId === q.id);
                const isCorrect = ans?.isCorrect;

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        <span className="text-indigo-600 mr-1.5">Q{idx + 1}.</span>
                        {q.questionText}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                          !ans
                            ? 'bg-slate-100 text-slate-500'
                            : isCorrect
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {!ans
                          ? 'Unanswered (0 pts)'
                          : isCorrect
                          ? `Correct (+${ans.marksAwarded} pts)`
                          : `Wrong (-${ans.negativeMarksApplied} pts)`}
                      </span>
                    </div>

                    {/* Student chosen answer vs correct */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl space-y-1.5 text-xs">
                      <div>
                        <span className="font-semibold text-slate-500">Student Response: </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {ans?.textAnswer ||
                            ans?.selectedOptionIds ||
                            (ans ? 'Selected choice' : 'None')}
                        </span>
                      </div>

                      {q.options?.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700">
                          <span className="font-semibold text-emerald-600">Correct Answer(s): </span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {q.options
                              .filter((o: any) => o.isCorrect)
                              .map((o: any) => o.optionText)
                              .join(' • ')}
                          </span>
                        </div>
                      )}

                      {q.explanation && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                          <strong>Solution:</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Attempt Dialog */}
      {deleteAttemptTarget && (
        <ConfirmationDialog
          isOpen={!!deleteAttemptTarget}
          onClose={() => setDeleteAttemptTarget(null)}
          onConfirm={handleDeleteAttempt}
          isLoading={deleteLoading}
          isDangerous={true}
          title="Delete Student Attempt?"
          message={`Are you sure you want to delete the response record for "${
            deleteAttemptTarget.studentName || 'Student'
          }"? This action cannot be undone.`}
          confirmText="Delete Attempt"
        />
      )}
    </div>
  );
}
