'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Modal } from '@/components/ui/Modal';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useToast } from '@/components/ui/Toast';
import {
  GraduationCap,
  Plus,
  Users,
  Search,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Download,
  Upload,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building,
  Hash,
  UserCheck,
  Mail,
  Loader2,
  Sparkles,
  CheckSquare,
  Square,
  BarChart3,
  XCircle,
  Clock,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';

interface BatchStudent {
  id: string;
  name: string;
  registerNumber: string;
  email?: string | null;
  createdAt: string;
}

interface BatchQuiz {
  id: string;
  quiz: {
    id: string;
    title: string;
    publicCode: string;
    status: string;
    durationMinutes: number;
  };
}

interface StudentBatch {
  id: string;
  name: string;
  className?: string | null;
  department?: string | null;
  description?: string | null;
  createdAt: string;
  _count: {
    students: number;
    quizzes: number;
  };
  students?: BatchStudent[];
  quizzes?: BatchQuiz[];
}

export default function BatchesManagementPage() {
  const { success, error, warning } = useToast();

  const [batches, setBatches] = useState<StudentBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // All Admin Quizzes (for assigning to batches)
  const [allQuizzes, setAllQuizzes] = useState<any[]>([]);

  // Create Batch Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createClass, setCreateClass] = useState('');
  const [createDept, setCreateDept] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPasteText, setCreatePasteText] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit Batch Modal
  const [editBatchTarget, setEditBatchTarget] = useState<StudentBatch | null>(null);
  const [editName, setEditName] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [updating, setUpdating] = useState(false);

  // Delete Batch Confirmation
  const [deleteTarget, setDeleteTarget] = useState<StudentBatch | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Assign Quizzes Modal
  const [assignModalBatch, setAssignModalBatch] = useState<StudentBatch | null>(null);
  const [selectedQuizIds, setSelectedQuizIds] = useState<string[]>([]);
  const [restrictAccessCheck, setRestrictAccessCheck] = useState<boolean>(true);
  const [savingQuizzes, setSavingQuizzes] = useState(false);

  // Attendance & Roster Modal
  const [attendanceModalBatch, setAttendanceModalBatch] = useState<StudentBatch | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<'attendance' | 'roster'>('attendance');
  const [attendanceData, setAttendanceData] = useState<any | null>(null);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'ATTENDED' | 'NOT_ATTENDED'>('ALL');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Add Students inside Roster Tab
  const [showAddStudentsSection, setShowAddStudentsSection] = useState(false);
  const [singleReg, setSingleReg] = useState('');
  const [singleName, setSingleName] = useState('');
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [addingStudents, setAddingStudents] = useState(false);

  // Edit Single Student inside Roster
  const [editStudentTarget, setEditStudentTarget] = useState<BatchStudent | null>(null);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentReg, setEditStudentReg] = useState('');
  const [updatingStudent, setUpdatingStudent] = useState(false);

  // Delete Single Student Confirmation
  const [deleteStudentTarget, setDeleteStudentTarget] = useState<BatchStudent | null>(null);
  const [deletingStudent, setDeletingStudent] = useState(false);

  // Resume Attempt state from Attendance view
  const [resumeTargetAttempt, setResumeTargetAttempt] = useState<any | null>(null);
  const [resumeMinutes, setResumeMinutes] = useState(15);
  const [resumingAttempt, setResumingAttempt] = useState(false);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/batches');
      const data = await res.json();
      if (res.ok) {
        setBatches(data.batches || []);
      } else {
        error(data.error || 'Failed to load student batches');
      }
    } catch {
      error('Failed to load student batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/admin/quizzes');
      const data = await res.json();
      if (res.ok) {
        setAllQuizzes(data.quizzes || []);
      }
    } catch {
      // Quiet fail
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchQuizzes();
  }, []);

  // Parse bulk text (CSV / TSV / newlines: RegisterNo, Name, Email)
  const parseStudentText = (text: string) => {
    const lines = text.split('\n');
    const parsed: Array<{ registerNumber: string; name: string; email?: string }> = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.toLowerCase().startsWith('reg')) continue;

      let parts = line.split(/[,\t;]/).map((p) => p.trim());
      if (parts.length >= 2) {
        const reg = parts[0];
        const name = parts[1];
        const email = parts[2] || undefined;
        if (reg && name) {
          parsed.push({ registerNumber: reg, name, email });
        }
      }
    }
    return parsed;
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      warning('Please enter a batch name');
      return;
    }

    setCreating(true);
    try {
      const initialStudents = parseStudentText(createPasteText);
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          className: createClass.trim() || undefined,
          department: createDept.trim() || undefined,
          description: createDesc.trim() || undefined,
          students: initialStudents,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        success(`Batch "${data.batch.name}" created with ${initialStudents.length} students.`);
        setShowCreateModal(false);
        setCreateName('');
        setCreateClass('');
        setCreateDept('');
        setCreateDesc('');
        setCreatePasteText('');
        fetchBatches();
      } else {
        error(data.error || 'Failed to create batch');
      }
    } catch {
      error('Network error creating batch');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (b: StudentBatch) => {
    setEditBatchTarget(b);
    setEditName(b.name);
    setEditClass(b.className || '');
    setEditDept(b.department || '');
    setEditDesc(b.description || '');
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBatchTarget) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/batches/${editBatchTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          className: editClass.trim() || null,
          department: editDept.trim() || null,
          description: editDesc.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        success('Batch updated successfully');
        setEditBatchTarget(null);
        fetchBatches();
      } else {
        error(data.error || 'Failed to update batch');
      }
    } catch {
      error('Network error updating batch');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/batches/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        success(`Batch "${deleteTarget.name}" deleted.`);
        setDeleteTarget(null);
        fetchBatches();
      } else {
        const data = await res.json();
        error(data.error || 'Failed to delete batch');
      }
    } catch {
      error('Network error deleting batch');
    } finally {
      setDeleting(false);
    }
  };

  // Assign Quizzes Modal Handlers
  const handleOpenAssignModal = (b: StudentBatch) => {
    setAssignModalBatch(b);
    const currentlyAssignedIds = b.quizzes?.map((q) => q.quiz?.id || (q as any).quizId).filter(Boolean) || [];
    setSelectedQuizIds(currentlyAssignedIds);
    setRestrictAccessCheck(true);
  };

  const handleToggleQuizAssignment = (quizId: string) => {
    if (selectedQuizIds.includes(quizId)) {
      setSelectedQuizIds(selectedQuizIds.filter((id) => id !== quizId));
    } else {
      setSelectedQuizIds([...selectedQuizIds, quizId]);
    }
  };

  const handleSaveQuizAssignments = async () => {
    if (!assignModalBatch) return;

    setSavingQuizzes(true);
    try {
      const res = await fetch(`/api/admin/batches/${assignModalBatch.id}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizIds: selectedQuizIds,
          restrictAccess: restrictAccessCheck,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        success(`Successfully assigned ${selectedQuizIds.length} quiz(zes) to "${assignModalBatch.name}"!`);
        setAssignModalBatch(null);
        fetchBatches();
      } else {
        error(data.error || 'Failed to assign quizzes');
      }
    } catch {
      error('Network error assigning quizzes');
    } finally {
      setSavingQuizzes(false);
    }
  };

  // Open Attendance & Roster Modal
  const handleOpenAttendanceModal = (b: StudentBatch, tab: 'attendance' | 'roster' = 'attendance') => {
    setAttendanceModalBatch(b);
    setModalActiveTab(tab);
    setAttendanceFilter('ALL');
    setAttendanceSearch('');
    fetchBatchAttendance(b.id);
  };

  const fetchBatchAttendance = async (batchId: string, qId?: string) => {
    setLoadingAttendance(true);
    try {
      const url = `/api/admin/batches/${batchId}/attendance${qId ? `?quizId=${qId}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setAttendanceData(data);
        setSelectedQuizId(data.selectedQuizId || (data.quizzes?.[0]?.id ?? null));
      } else {
        error(data.error || 'Failed to load attendance');
      }
    } catch {
      error('Network error loading attendance data');
    } finally {
      setLoadingAttendance(false);
    }
  };

  // Add Students to Batch in Roster Tab
  const handleAddStudentsToBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceModalBatch) return;

    let studentsToSubmit: Array<{ registerNumber: string; name: string; email?: string }> = [];

    if (bulkPasteText.trim()) {
      studentsToSubmit = parseStudentText(bulkPasteText);
      if (studentsToSubmit.length === 0) {
        warning('No valid rows found in bulk paste. Use format: RegisterNo, StudentName');
        return;
      }
    } else if (singleReg.trim() && singleName.trim()) {
      studentsToSubmit = [
        {
          registerNumber: singleReg.trim(),
          name: singleName.trim(),
        },
      ];
    } else {
      warning('Please enter student details or paste bulk lines.');
      return;
    }

    setAddingStudents(true);
    try {
      const res = await fetch(`/api/admin/batches/${attendanceModalBatch.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentsToSubmit }),
      });

      const data = await res.json();
      if (res.ok) {
        success(`Added ${data.addedCount} students to batch! (${data.duplicateCount || 0} duplicates skipped)`);
        setSingleReg('');
        setSingleName('');
        setBulkPasteText('');
        setShowAddStudentsSection(false);
        fetchBatchAttendance(attendanceModalBatch.id, selectedQuizId || undefined);
        fetchBatches();
      } else {
        error(data.error || 'Failed to add students');
      }
    } catch {
      error('Network error adding students');
    } finally {
      setAddingStudents(false);
    }
  };

  // Student Edit / Delete inside Roster
  const handleOpenEditStudent = (s: BatchStudent) => {
    setEditStudentTarget(s);
    setEditStudentName(s.name);
    setEditStudentReg(s.registerNumber);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceModalBatch || !editStudentTarget) return;

    setUpdatingStudent(true);
    try {
      const res = await fetch(
        `/api/admin/batches/${attendanceModalBatch.id}/students/${editStudentTarget.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editStudentName.trim(),
            registerNumber: editStudentReg.trim(),
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        success('Student updated');
        setEditStudentTarget(null);
        fetchBatchAttendance(attendanceModalBatch.id, selectedQuizId || undefined);
      } else {
        error(data.error || 'Failed to update student');
      }
    } catch {
      error('Network error updating student');
    } finally {
      setUpdatingStudent(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!attendanceModalBatch || !deleteStudentTarget) return;

    setDeletingStudent(true);
    try {
      const res = await fetch(
        `/api/admin/batches/${attendanceModalBatch.id}/students/${deleteStudentTarget.id}`,
        {
          method: 'DELETE',
        }
      );

      if (res.ok) {
        success(`Removed ${deleteStudentTarget.name} from batch`);
        setDeleteStudentTarget(null);
        fetchBatchAttendance(attendanceModalBatch.id, selectedQuizId || undefined);
        fetchBatches();
      } else {
        const data = await res.json();
        error(data.error || 'Failed to remove student');
      }
    } catch {
      error('Network error removing student');
    } finally {
      setDeletingStudent(false);
    }
  };

  // Quick Resume Test for Student from Attendance Table
  const handleQuickResume = async () => {
    if (!resumeTargetAttempt) return;
    setResumingAttempt(true);
    try {
      const res = await fetch(`/api/admin/attempts/${resumeTargetAttempt.id}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraMinutes: resumeMinutes,
          resetViolations: true,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        success(`Test reopened successfully with +${resumeMinutes} mins.`);
        setResumeTargetAttempt(null);
        if (attendanceModalBatch) {
          fetchBatchAttendance(attendanceModalBatch.id, selectedQuizId || undefined);
        }
      } else {
        error(data.error || 'Failed to resume test');
      }
    } catch {
      error('Network error resuming test');
    } finally {
      setResumingAttempt(false);
    }
  };

  // Export Attendance CSV
  const handleExportAttendanceCSV = () => {
    if (!attendanceData || !attendanceData.studentsAttendance || attendanceData.studentsAttendance.length === 0) {
      warning('No attendance records to export.');
      return;
    }

    const currentQuiz = attendanceData.quizzes?.find((q: any) => q.id === selectedQuizId);
    const headers = ['Register Number', 'Student Name', 'Attendance Status', 'Score', 'Percentage', 'Result', 'Submitted At'];
    
    const rows = attendanceData.studentsAttendance.map((st: any) => [
      st.registerNumber,
      `"${(st.name || '').replace(/"/g, '""')}"`,
      st.attendanceStatus,
      st.attempt?.score ?? 'N/A',
      st.attempt?.percentage ? `${st.attempt.percentage}%` : 'N/A',
      st.attempt ? (st.attempt.passed ? 'PASS' : 'FAIL') : 'ABSENT',
      st.attempt?.submittedAt ? new Date(st.attempt.submittedAt).toLocaleString() : 'N/A',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${attendanceData.batch.name}_${currentQuiz?.publicCode || 'Quiz'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Attendance CSV downloaded successfully!');
  };

  // Filtered Batches
  const filteredBatches = batches.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.className && b.className.toLowerCase().includes(q)) ||
      (b.department && b.department.toLowerCase().includes(q))
    );
  });

  // Selected Quiz in Attendance View
  const selectedQuizObj = attendanceData?.quizzes?.find((q: any) => q.id === selectedQuizId);
  const quizStats = selectedQuizObj?.stats || {
    totalStudents: attendanceData?.batch?.totalStudents || 0,
    attendedCount: 0,
    notAttendedCount: attendanceData?.batch?.totalStudents || 0,
    inProgressCount: 0,
    turnoutRate: 0,
  };

  // Filtered Students in Attendance Table
  const filteredAttendanceStudents = (attendanceData?.studentsAttendance || []).filter((st: any) => {
    const q = attendanceSearch.toLowerCase();
    const matchesSearch =
      st.name.toLowerCase().includes(q) ||
      st.registerNumber.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (attendanceFilter === 'ATTENDED') {
      return st.attendanceStatus === 'ATTENDED';
    }
    if (attendanceFilter === 'NOT_ATTENDED') {
      return st.attendanceStatus === 'NOT_ATTENDED';
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Top Sticky Header */}
      <AdminHeader
        title="Student Batches & Attendance"
        subtitle="Manage student cohorts, assign quizzes directly to batches, and track live attendance and submissions."
        actions={
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6e38f7] hover:bg-[#7b46fa] text-white text-xs font-semibold shadow-md shadow-purple-900/40 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Batch</span>
          </button>
        }
      />

      {/* Main Body with Balanced Padding */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Search & Overview Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search batches by name, class, department..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="font-bold text-slate-800 dark:text-slate-200">{filteredBatches.length}</span>
            <span>Batches registered</span>
          </div>
        </div>

        {/* Batches Grid */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
            <div className="inline-flex items-center gap-2 text-indigo-600 font-semibold text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading Student Batches...</span>
            </div>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              {searchQuery ? 'No batches match your search' : 'No Student Batches Created Yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Create cohorts for your classes and departments to easily assign targeted quizzes and track live attendance.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Batch</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBatches.map((batch) => {
              const assignedCount = batch.quizzes?.length || batch._count.quizzes || 0;
              const studentCount = batch._count.students || 0;

              return (
                <div
                  key={batch.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800/80 transition flex flex-col justify-between"
                >
                  <div>
                    {/* Header Bar */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(batch)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Edit Batch Info"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(batch)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Delete Batch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1.5 line-clamp-1">
                      {batch.name}
                    </h3>

                    {(batch.className || batch.department) && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {batch.className && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                            <BookOpen className="w-3 h-3 text-indigo-500" />
                            <span>{batch.className}</span>
                          </span>
                        )}
                        {batch.department && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                            <Building className="w-3 h-3 text-cyan-500" />
                            <span>{batch.department}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {batch.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">
                        {batch.description}
                      </p>
                    )}

                    {/* Assigned Quizzes Preview Pills */}
                    <div className="mb-4 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                          <span>Assigned Quizzes ({assignedCount})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(batch)}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-[11px]"
                        >
                          + Assign Quiz
                        </button>
                      </div>

                      {assignedCount === 0 ? (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 text-center">
                          No quiz assigned yet. Click "+ Assign Quiz" above.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                          {batch.quizzes?.map((bq) => (
                            <span
                              key={bq.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-[10px] font-medium"
                            >
                              <span>{bq.quiz.title}</span>
                              <span className="font-mono text-[9px] opacity-70">({bq.quiz.publicCode})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1 font-semibold text-xs text-slate-700 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{studentCount} Students</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenAssignModal(batch)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] transition"
                        title="Assign or unassign quizzes"
                      >
                        Assign Quizzes
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAttendanceModal(batch, 'attendance')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] shadow-sm shadow-indigo-600/20 transition"
                      >
                        <BarChart3 className="w-3 h-3" />
                        <span>Attendance</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ASSIGN QUIZZES MODAL */}
      <Modal
        isOpen={!!assignModalBatch}
        onClose={() => setAssignModalBatch(null)}
        title={`Assign Quizzes to "${assignModalBatch?.name}"`}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Select the assessments you want to assign to this cohort. Students in <strong className="text-indigo-600">{assignModalBatch?.name}</strong> will be authorized to take these quizzes using their registered numbers.
          </p>

          {/* Restrict Access Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 cursor-pointer">
            <input
              type="checkbox"
              checked={restrictAccessCheck}
              onChange={(e) => setRestrictAccessCheck(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded mt-0.5"
            />
            <div>
              <div className="text-xs font-bold text-purple-950 dark:text-purple-200">
                Enforce Batch Restriction & Single Attempt
              </div>
              <div className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
                Automatically configures the selected quizzes so that only students enrolled in this batch can attend, and each student is limited to a single submission.
              </div>
            </div>
          </label>

          {/* Quizzes List */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {allQuizzes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No quizzes available. Please create a quiz first.
              </div>
            ) : (
              allQuizzes.map((q) => {
                const isChecked = selectedQuizIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => handleToggleQuizAssignment(q.id)}
                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                      isChecked
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by row click
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {q.title}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="font-mono font-semibold">Code: {q.publicCode}</span>
                          <span>•</span>
                          <span>{q.durationMinutes} mins</span>
                          <span>•</span>
                          <span className="uppercase font-bold text-indigo-600">{q.status}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isChecked
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isChecked ? 'Assigned' : 'Click to Assign'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {selectedQuizIds.length} quiz(zes) selected
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAssignModalBatch(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuizAssignments}
                disabled={savingQuizzes}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
              >
                {savingQuizzes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Save Assignments</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ATTENDANCE & ROSTER MODAL */}
      <Modal
        isOpen={!!attendanceModalBatch}
        onClose={() => {
          setAttendanceModalBatch(null);
          setAttendanceData(null);
        }}
        title={`Batch Overview — ${attendanceModalBatch?.name || 'Cohort'}`}
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Modal Header Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 pb-2 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalActiveTab('attendance')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  modalActiveTab === 'attendance'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Live Quiz Attendance</span>
              </button>

              <button
                type="button"
                onClick={() => setModalActiveTab('roster')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  modalActiveTab === 'roster'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Student Roster ({attendanceData?.batch?.totalStudents || attendanceModalBatch?._count.students || 0})</span>
              </button>
            </div>

            {modalActiveTab === 'attendance' && (
              <button
                type="button"
                onClick={handleExportAttendanceCSV}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
          </div>

          {loadingAttendance ? (
            <div className="py-16 text-center text-xs text-indigo-600">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <span>Loading Live Attendance Data...</span>
            </div>
          ) : modalActiveTab === 'attendance' ? (
            <div className="space-y-4">
              {/* Quiz Selector */}
              {attendanceData?.quizzes?.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    No Quizzes Assigned to this Batch Yet
                  </p>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Assign quizzes to this batch to see which students have attended and who hasn't.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (attendanceModalBatch) {
                        setAttendanceModalBatch(null);
                        handleOpenAssignModal(attendanceModalBatch);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Assign Quiz Now</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Select Quiz Pill Carousel */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                      Select Quiz:
                    </span>
                    {attendanceData?.quizzes?.map((qz: any) => (
                      <button
                        key={qz.id}
                        type="button"
                        onClick={() => {
                          setSelectedQuizId(qz.id);
                          if (attendanceModalBatch) {
                            fetchBatchAttendance(attendanceModalBatch.id, qz.id);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                          selectedQuizId === qz.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <span>{qz.title}</span>
                        <span className="font-mono text-[10px] opacity-80">({qz.publicCode})</span>
                      </button>
                    ))}
                  </div>

                  {/* 3 Prominent Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Total Enrolled */}
                    <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                          Total Enrolled
                        </div>
                        <div className="text-xl font-black text-indigo-950 dark:text-white">
                          {quizStats.totalStudents} Students
                        </div>
                      </div>
                    </div>

                    {/* Attended / Completed */}
                    <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          Attended Quiz
                        </div>
                        <div className="text-xl font-black text-emerald-950 dark:text-white flex items-center gap-2">
                          <span>{quizStats.attendedCount}</span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            ({quizStats.turnoutRate}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* NOT ATTENDED (ABSENT) */}
                    <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/70 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-600/30">
                        <XCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                          Not Attended Yet
                        </div>
                        <div className="text-xl font-black text-rose-700 dark:text-rose-300">
                          {quizStats.notAttendedCount} Students
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Search & Filter Pills */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setAttendanceFilter('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          attendanceFilter === 'ALL'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        All ({quizStats.totalStudents})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAttendanceFilter('ATTENDED')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          attendanceFilter === 'ATTENDED'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                        }`}
                      >
                        Attended ({quizStats.attendedCount})
                      </button>

                      <button
                        type="button"
                        onClick={() => setAttendanceFilter('NOT_ATTENDED')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          attendanceFilter === 'NOT_ATTENDED'
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                        }`}
                      >
                        Not Attended ({quizStats.notAttendedCount})
                      </button>
                    </div>

                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={attendanceSearch}
                        onChange={(e) => setAttendanceSearch(e.target.value)}
                        placeholder="Search student or register no..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                      />
                    </div>
                  </div>

                  {/* Attendance Roster Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 w-10 text-center">#</th>
                          <th className="px-3 py-2">Register No</th>
                          <th className="px-3 py-2">Student Name</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Score / Turnout</th>
                          <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredAttendanceStudents.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                              No students matching current filter.
                            </td>
                          </tr>
                        ) : (
                          filteredAttendanceStudents.map((st: any, idx: number) => {
                            const isAttended = st.attendanceStatus === 'ATTENDED';
                            const isInProgress = st.attendanceStatus === 'IN_PROGRESS';

                            return (
                              <tr
                                key={st.id}
                                className={`transition ${
                                  isAttended
                                    ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                                    : isInProgress
                                    ? 'hover:bg-amber-50/40 dark:hover:bg-amber-950/20'
                                    : 'hover:bg-rose-50/40 dark:hover:bg-rose-950/20 bg-rose-50/10'
                                }`}
                              >
                                <td className="px-3 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                                  {idx + 1}
                                </td>
                                <td className="px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                                  {st.registerNumber}
                                </td>
                                <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                                  <div>{st.name}</div>
                                </td>
                                <td className="px-3 py-2.5">
                                  {isAttended ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>ATTENDED</span>
                                    </span>
                                  ) : isInProgress ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse">
                                      <Clock className="w-3 h-3" />
                                      <span>IN PROGRESS</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                                      <XCircle className="w-3 h-3" />
                                      <span>NOT ATTENDED</span>
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white text-xs">
                                  {isAttended && st.attempt ? (
                                    <div>
                                      <span>
                                        {st.attempt.score} pts ({st.attempt.percentage}%)
                                      </span>
                                      <span
                                        className={`ml-1.5 text-[10px] font-extrabold uppercase ${
                                          st.attempt.passed ? 'text-emerald-600' : 'text-rose-600'
                                        }`}
                                      >
                                        [{st.attempt.passed ? 'PASS' : 'FAIL'}]
                                      </span>
                                    </div>
                                  ) : isInProgress ? (
                                    <span className="text-amber-500 font-medium text-[11px]">Active attempt</span>
                                  ) : (
                                    <span className="text-rose-500 font-medium text-[11px]">— Absent —</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  {isAttended && st.attempt ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setResumeTargetAttempt({
                                          id: st.attempt.id,
                                          studentName: st.name,
                                          registerNumber: st.registerNumber,
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold text-[10px] hover:bg-indigo-100 transition"
                                      title="Resume / Reopen test for student"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Resume Test</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">Pending Start</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* TAB 2: ROSTER VIEW */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs">
                <span className="font-bold text-slate-900 dark:text-white">
                  {attendanceData?.batch?.totalStudents || 0} Students Enrolled in this Cohort
                </span>

                <button
                  type="button"
                  onClick={() => setShowAddStudentsSection(!showAddStudentsSection)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddStudentsSection ? 'Hide Form' : 'Add / Bulk Import Students'}</span>
                </button>
              </div>

              {/* Add / Bulk Import Form */}
              {showAddStudentsSection && (
                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-300">
                    Add Students to Cohort
                  </h4>

                  <form onSubmit={handleAddStudentsToBatch} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Register / Roll Number
                        </label>
                        <input
                          type="text"
                          value={singleReg}
                          onChange={(e) => setSingleReg(e.target.value)}
                          placeholder="e.g. 7376221CS101"
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Student Full Name
                        </label>
                        <input
                          type="text"
                          value={singleName}
                          onChange={(e) => setSingleName(e.target.value)}
                          placeholder="e.g. Alice Cooper"
                          className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Or Bulk Paste List (CSV / TSV)
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Format: RegisterNo, Name
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={bulkPasteText}
                        onChange={(e) => setBulkPasteText(e.target.value)}
                        placeholder={`7376221CS101, Alice Cooper\n7376221CS102, Bob Dylan`}
                        className="w-full font-mono text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={addingStudents}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition disabled:opacity-50"
                      >
                        {addingStudents ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>Add Students</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Roster Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 w-10 text-center">#</th>
                      <th className="px-3 py-2">Register No</th>
                      <th className="px-3 py-2">Student Name</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(attendanceData?.studentsAttendance || []).map((st: any, idx: number) => (
                      <tr
                        key={st.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="px-3 py-2 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white">
                          {st.registerNumber}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">
                          {st.name}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditStudent(st)}
                              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Edit Student"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteStudentTarget(st)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Remove Student"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* QUICK RESUME MODAL FROM ATTENDANCE TABLE */}
      <Modal
        isOpen={!!resumeTargetAttempt}
        onClose={() => setResumeTargetAttempt(null)}
        title="Resume Test for Student"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Reopen assessment session for <strong className="text-slate-900 dark:text-white">{resumeTargetAttempt?.studentName}</strong> ({resumeTargetAttempt?.registerNumber}). The student can continue answering questions immediately.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Additional Time to Grant (Minutes)
            </label>
            <div className="flex items-center gap-2 mb-2">
              {[5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setResumeMinutes(mins)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    resumeMinutes === mins
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  +{mins}m
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={180}
              value={resumeMinutes}
              onChange={(e) => setResumeMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setResumeTargetAttempt(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleQuickResume}
              disabled={resumingAttempt}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition disabled:opacity-50"
            >
              {resumingAttempt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>Confirm & Resume</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* CREATE BATCH MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Student Batch"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateBatch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batch Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. III CSE - Section A (2024-2025)"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Class / Year
              </label>
              <input
                type="text"
                value={createClass}
                onChange={(e) => setCreateClass(e.target.value)}
                placeholder="e.g. 3rd Year B.E."
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <input
                type="text"
                value={createDept}
                onChange={(e) => setCreateDept(e.target.value)}
                placeholder="e.g. Computer Science and Engineering"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="e.g. Semester V Internal Assessment Cohort"
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Bulk Paste Students List (Optional)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                Format: RegisterNumber, StudentName
              </span>
            </div>
            <textarea
              rows={4}
              value={createPasteText}
              onChange={(e) => setCreatePasteText(e.target.value)}
              placeholder={`7376221CS101, Alice Cooper\n7376221CS102, Bob Dylan\n7376221CS103, Charlie Brown`}
              className="w-full font-mono px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Create Batch</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT BATCH MODAL */}
      <Modal
        isOpen={!!editBatchTarget}
        onClose={() => setEditBatchTarget(null)}
        title="Edit Batch Details"
      >
        <form onSubmit={handleUpdateBatch} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Batch Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Class / Year
              </label>
              <input
                type="text"
                value={editClass}
                onChange={(e) => setEditClass(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <input
                type="text"
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditBatchTarget(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition disabled:opacity-50"
            >
              {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE BATCH DIALOG */}
      <ConfirmationDialog
        isOpen={!!deleteTarget}
        title="Delete Student Batch?"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All enrolled student records in this batch will be removed. Quizzes assigned to this batch will remain safe.`}
        confirmText="Delete Batch"
        isDangerous={true}
        isLoading={deleting}
        onConfirm={handleDeleteBatch}
        onClose={() => setDeleteTarget(null)}
      />

      {/* EDIT STUDENT MODAL */}
      <Modal
        isOpen={!!editStudentTarget}
        onClose={() => setEditStudentTarget(null)}
        title="Edit Student Info"
      >
        <form onSubmit={handleUpdateStudent} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Register / Roll Number
            </label>
            <input
              type="text"
              required
              value={editStudentReg}
              onChange={(e) => setEditStudentReg(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Student Full Name
            </label>
            <input
              type="text"
              required
              value={editStudentName}
              onChange={(e) => setEditStudentName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditStudentTarget(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatingStudent}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition disabled:opacity-50"
            >
              {updatingStudent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Save Student</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE SINGLE STUDENT DIALOG */}
      <ConfirmationDialog
        isOpen={!!deleteStudentTarget}
        title="Remove Student from Batch?"
        message={`Are you sure you want to remove ${deleteStudentTarget?.name} (${deleteStudentTarget?.registerNumber}) from this batch?`}
        confirmText="Remove Student"
        isDangerous={true}
        isLoading={deletingStudent}
        onConfirm={handleDeleteStudent}
        onClose={() => setDeleteStudentTarget(null)}
      />
    </div>
  );
}
