'use client';

import React, { useEffect, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { useToast } from '@/components/ui/Toast';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Search,
  Users,
  Loader2,
  Sliders,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ChevronRight,
  Layers,
  GraduationCap,
  Globe,
  Award,
  ShieldAlert,
  Edit3,
  Trash2,
  UserCheck,
  UserX,
  ListFilter,
} from 'lucide-react';

interface ColumnConfig {
  id: string;
  key: string;
  defaultLabel: string;
  customLabel: string;
  enabled: boolean;
}

export default function ReportsCenterPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [quizDetails, setQuizDetails] = useState<any | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingQuizData, setLoadingQuizData] = useState(false);
  const [searchQuiz, setSearchQuiz] = useState('');

  // Cohort / Access Segmentation State
  // Values: batchId | 'PUBLIC' | 'ALL'
  const [selectedCohortFilter, setSelectedCohortFilter] = useState<string>('ALL');
  const [batchViewMode, setBatchViewMode] = useState<'SUBMISSIONS_ONLY' | 'FULL_ROSTER'>('SUBMISSIONS_ONLY');

  // Table & Column Customizer States
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [rowSearch, setRowSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<'ALL' | 'PASS' | 'FAIL' | 'NOT_ATTENDED'>('ALL');
  const [flagFilter, setFlagFilter] = useState<'ALL' | 'FLAGGED'>('ALL');
  const [showColumnManager, setShowColumnManager] = useState(false);

  // Deletion States
  const [attemptToDelete, setAttemptToDelete] = useState<any | null>(null);
  const [deletingAttempt, setDeletingAttempt] = useState(false);
  const [quizToClearReports, setQuizToClearReports] = useState<any | null>(null);
  const [clearingReports, setClearingReports] = useState(false);

  const { success, error } = useToast();

  // 1. Fetch All Quizzes List on Mount
  const fetchQuizzesList = () => {
    setLoadingList(true);
    fetch('/api/admin/quizzes')
      .then((res) => res.json())
      .then((data) => {
        setQuizzes(data.quizzes || []);
      })
      .catch((err) => console.error('Error fetching quizzes:', err))
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    fetchQuizzesList();
  }, []);

  // 2. Fetch Full Report Data when a Quiz is Clicked
  useEffect(() => {
    if (!selectedQuizId) {
      setQuizDetails(null);
      return;
    }

    setLoadingQuizData(true);
    fetch(`/api/admin/quizzes/${selectedQuizId}/reports/data`)
      .then((res) => res.json())
      .then((data) => {
        if (data.quiz) {
          setQuizDetails(data.quiz);
          initializeColumns();

          // Set default cohort filter:
          // If quiz has assigned batches, default to first batch!
          // Else default to 'PUBLIC'
          if (data.quiz.assignedBatches && data.quiz.assignedBatches.length > 0) {
            setSelectedCohortFilter(data.quiz.assignedBatches[0].id);
          } else {
            setSelectedCohortFilter('PUBLIC');
          }
        } else {
          error(data.error || 'Failed to load report data');
        }
      })
      .catch(() => error('Failed to load quiz report details'))
      .finally(() => setLoadingQuizData(false));
  }, [selectedQuizId]);

  // 3. Initialize Columns
  const initializeColumns = () => {
    const standardCols: ColumnConfig[] = [
      { id: 'sno', key: 'sno', defaultLabel: 'S.No', customLabel: 'S.No', enabled: true },
      { id: 'registerNumber', key: 'registerNumber', defaultLabel: 'Register No', customLabel: 'Register No', enabled: true },
      { id: 'studentName', key: 'studentName', defaultLabel: 'Student Name', customLabel: 'Student Name', enabled: true },
      { id: 'batchName', key: 'batchName', defaultLabel: 'Batch / Cohort', customLabel: 'Cohort', enabled: true },
      { id: 'totalScore', key: 'totalScore', defaultLabel: 'Score', customLabel: 'Score', enabled: true },
      { id: 'studentClass', key: 'studentClass', defaultLabel: 'Class', customLabel: 'Class', enabled: true },
      { id: 'department', key: 'department', defaultLabel: 'Department', customLabel: 'Department', enabled: true },
      { id: 'percentage', key: 'percentage', defaultLabel: 'Percentage', customLabel: 'Percentage (%)', enabled: true },
      { id: 'result', key: 'result', defaultLabel: 'Result', customLabel: 'Result', enabled: true },
      { id: 'violationCount', key: 'violationCount', defaultLabel: 'Violations', customLabel: 'Violations', enabled: true },
    ];

    setColumns(standardCols);
  };

  // 4. Column Controls
  const toggleColumn = (id: string) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === id ? { ...col, enabled: !col.enabled } : col))
    );
  };

  const handleRenameColumn = (id: string, newLabel: string) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === id ? { ...col, customLabel: newLabel } : col))
    );
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;

    const newCols = [...columns];
    const [moved] = newCols.splice(index, 1);
    newCols.splice(targetIndex, 0, moved);
    setColumns(newCols);
  };

  const setAllColumns = (enabled: boolean) => {
    setColumns((prev) => prev.map((c) => ({ ...c, enabled })));
  };

  const resetToDefault = () => {
    initializeColumns();
    success('Reset columns to default layout');
  };

  // 5. Active Cohort & Filtered Attempts Calculation
  const enabledColumns = useMemo(() => columns.filter((c) => c.enabled), [columns]);

  const activeBatch = useMemo(() => {
    if (!quizDetails?.assignedBatches) return null;
    return quizDetails.assignedBatches.find((b: any) => b.id === selectedCohortFilter) || null;
  }, [quizDetails, selectedCohortFilter]);

  // Attempts categorized by Cohort
  const attemptsByCohort = useMemo(() => {
    if (!quizDetails?.attempts) return { batches: {}, public: [], all: [] };

    const batchMap: Record<string, any[]> = {};
    const publicAttempts: any[] = [];

    quizDetails.attempts.forEach((att: any) => {
      if (att.isPublic || att.batchId === 'PUBLIC') {
        publicAttempts.push(att);
      } else {
        if (!batchMap[att.batchId]) {
          batchMap[att.batchId] = [];
        }
        batchMap[att.batchId].push(att);
      }
    });

    return {
      batches: batchMap,
      public: publicAttempts,
      all: quizDetails.attempts,
    };
  }, [quizDetails]);

  // Base rows for current cohort tab
  const baseCohortRows = useMemo(() => {
    if (!quizDetails) return [];

    if (selectedCohortFilter === 'ALL') {
      return attemptsByCohort.all;
    }

    if (selectedCohortFilter === 'PUBLIC') {
      return attemptsByCohort.public;
    }

    // A specific batch is selected
    const bAttempts = attemptsByCohort.batches[selectedCohortFilter] || [];

    if (batchViewMode === 'FULL_ROSTER' && activeBatch) {
      // Build map of attended by registerNumber
      const attendedMap = new Map<string, any>();
      bAttempts.forEach((att: any) => {
        if (att.registerNumber) {
          attendedMap.set(att.registerNumber.trim().toLowerCase(), att);
        }
      });

      // Map through all enrolled students in the batch
      return activeBatch.students.map((st: any, idx: number) => {
        const att = attendedMap.get((st.registerNumber || '').trim().toLowerCase());
        if (att) return att;

        // Unattended synthetic record
        return {
          id: `unattended-${st.id}`,
          sno: idx + 1,
          studentName: st.name,
          registerNumber: st.registerNumber,
          email: st.email || 'N/A',
          studentClass: activeBatch.className || 'N/A',
          department: activeBatch.department || 'N/A',
          batchId: activeBatch.id,
          batchName: activeBatch.name,
          isPublic: false,
          status: 'NOT_ATTENDED',
          totalScore: 0,
          maxMarks: quizDetails.totalMarks,
          percentage: 0,
          passed: false,
          result: 'NOT ATTENDED',
          totalCorrect: 0,
          totalWrong: 0,
          totalUnanswered: quizDetails.totalQuestions,
          totalNegativeMarks: 0,
          violationCount: 0,
          cheatingFlag: 'CLEAN',
          startedAt: '—',
          submittedAt: '—',
          duration: '—',
          isUnattended: true,
        };
      });
    }

    return bAttempts;
  }, [quizDetails, selectedCohortFilter, batchViewMode, activeBatch, attemptsByCohort]);

  // Apply Search & Filters to current rows
  const filteredAttempts = useMemo(() => {
    return baseCohortRows.filter((att: any) => {
      // Search
      if (rowSearch) {
        const query = rowSearch.toLowerCase();
        const matches =
          (att.studentName || '').toLowerCase().includes(query) ||
          (att.registerNumber || '').toLowerCase().includes(query) ||
          (att.studentClass || '').toLowerCase().includes(query) ||
          (att.department || '').toLowerCase().includes(query);
        if (!matches) return false;
      }

      // Result filter
      if (resultFilter !== 'ALL') {
        if (resultFilter === 'NOT_ATTENDED') {
          if (att.status !== 'NOT_ATTENDED') return false;
        } else if (att.result !== resultFilter) {
          return false;
        }
      }

      // Flag filter
      if (flagFilter === 'FLAGGED' && (att.violationCount || 0) <= 0) return false;

      return true;
    });
  }, [baseCohortRows, rowSearch, resultFilter, flagFilter]);

  // Cohort Stats
  const cohortStats = useMemo(() => {
    if (!quizDetails) return null;

    if (activeBatch) {
      const bAttempts = attemptsByCohort.batches[activeBatch.id] || [];
      const completed = bAttempts.filter((a: any) => a.status === 'SUBMITTED');
      const scores = completed.map((a: any) => a.totalScore);
      const avgScore = scores.length > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : '0';
      const passedCount = completed.filter((a: any) => a.passed).length;
      const passRate = completed.length > 0 ? ((passedCount / completed.length) * 100).toFixed(1) : '0';
      const totalEnrolled = activeBatch.totalStudents || activeBatch.students?.length || 0;
      const attendedCount = completed.length;
      const unattendedCount = Math.max(0, totalEnrolled - attendedCount);

      return {
        title: `Batch Report: ${activeBatch.name}`,
        subtitle: `${activeBatch.className || 'Class N/A'} • ${activeBatch.department || 'Dept N/A'}`,
        isBatch: true,
        totalEnrolled,
        attendedCount,
        unattendedCount,
        avgScore,
        passRate,
        totalMarks: quizDetails.totalMarks,
      };
    }

    if (selectedCohortFilter === 'PUBLIC') {
      const pAttempts = attemptsByCohort.public;
      const completed = pAttempts.filter((a: any) => a.status === 'SUBMITTED');
      const scores = completed.map((a: any) => a.totalScore);
      const avgScore = scores.length > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : '0';
      const passedCount = completed.filter((a: any) => a.passed).length;
      const passRate = completed.length > 0 ? ((passedCount / completed.length) * 100).toFixed(1) : '0';

      return {
        title: 'Public Assessment Report',
        subtitle: 'Candidates who accessed via Public Quiz link',
        isBatch: false,
        totalEnrolled: pAttempts.length,
        attendedCount: completed.length,
        unattendedCount: 0,
        avgScore,
        passRate,
        totalMarks: quizDetails.totalMarks,
      };
    }

    // ALL Cohorts
    const allAttempts = attemptsByCohort.all;
    const completed = allAttempts.filter((a: any) => a.status === 'SUBMITTED');
    const scores = completed.map((a: any) => a.totalScore);
    const avgScore = scores.length > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : '0';
    const passedCount = completed.filter((a: any) => a.passed).length;
    const passRate = completed.length > 0 ? ((passedCount / completed.length) * 100).toFixed(1) : '0';

    return {
      title: 'Combined All Cohorts Report',
      subtitle: 'All batch submissions and public candidates merged',
      isBatch: false,
      totalEnrolled: allAttempts.length,
      attendedCount: completed.length,
      unattendedCount: 0,
      avgScore,
      passRate,
      totalMarks: quizDetails.totalMarks,
    };
  }, [quizDetails, activeBatch, selectedCohortFilter, attemptsByCohort]);

  // 6. Download Cohort-Separated Excel (.xlsx)
  const handleDownloadCustomExcel = () => {
    if (!quizDetails || enabledColumns.length === 0) {
      error('Please enable at least one column to export');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();
      const safeTitle = (quizDetails.title || 'Quiz').replace(/[^a-zA-Z0-9_-]/g, '_');

      // CASE A: Exporting a Specific Batch Report
      if (activeBatch) {
        const safeBatchName = (activeBatch.name || 'Batch').replace(/[^a-zA-Z0-9_-]/g, '_');
        const rows = filteredAttempts.map((att: any, rowIdx: number) => {
          const rowObj: Record<string, any> = {};
          enabledColumns.forEach((col) => {
            if (col.id === 'sno') {
              rowObj[col.customLabel || col.defaultLabel] = rowIdx + 1;
            } else if (col.id === 'percentage') {
              rowObj[col.customLabel || col.defaultLabel] = att.isUnattended ? '—' : `${att.percentage}%`;
            } else if (col.id === 'totalScore') {
              rowObj[col.customLabel || col.defaultLabel] = att.isUnattended ? '—' : att.totalScore;
            } else {
              rowObj[col.customLabel || col.defaultLabel] = att[col.key] ?? '—';
            }
          });
          return rowObj;
        });

        const studentSheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, studentSheet, `${activeBatch.name.slice(0, 28)} Results`);

        const summaryData = [
          ['Assessment Title', quizDetails.title],
          ['Assessment Code', quizDetails.publicCode],
          ['Report Type', `Batch Report — ${activeBatch.name}`],
          ['Batch Name', activeBatch.name],
          ['Target Class', activeBatch.className || quizDetails.targetClass || 'N/A'],
          ['Department', activeBatch.department || quizDetails.department || 'N/A'],
          ['Total Enrolled in Batch', cohortStats?.totalEnrolled || 0],
          ['Attended Submissions', cohortStats?.attendedCount || 0],
          ['Not Attended / Absent', cohortStats?.unattendedCount || 0],
          ['Average Score', `${cohortStats?.avgScore} / ${quizDetails.totalMarks}`],
          ['Pass Rate', `${cohortStats?.passRate}%`],
          ['Passing Percentage Req', `${quizDetails.passingPercentage}%`],
          ['Report Exported At', new Date().toLocaleString()],
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Batch Summary');

        const filename = `${safeTitle}_Batch_${safeBatchName}_Report_${quizDetails.publicCode}.xlsx`;
        XLSX.writeFile(wb, filename);
        success(`Downloaded Batch Report for "${activeBatch.name}"!`);
        return;
      }

      // CASE B: Exporting Public Submissions Report
      if (selectedCohortFilter === 'PUBLIC') {
        const rows = filteredAttempts.map((att: any, rowIdx: number) => {
          const rowObj: Record<string, any> = {};
          enabledColumns.forEach((col) => {
            if (col.id === 'sno') {
              rowObj[col.customLabel || col.defaultLabel] = rowIdx + 1;
            } else if (col.id === 'percentage') {
              rowObj[col.customLabel || col.defaultLabel] = `${att.percentage}%`;
            } else {
              rowObj[col.customLabel || col.defaultLabel] = att[col.key] ?? '—';
            }
          });
          return rowObj;
        });

        const studentSheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, studentSheet, 'Public Submissions');

        const summaryData = [
          ['Assessment Title', quizDetails.title],
          ['Public Code', quizDetails.publicCode],
          ['Report Type', 'Public Assessment Submissions Report'],
          ['Subject', quizDetails.subject || 'N/A'],
          ['Total Public Candidates', cohortStats?.totalEnrolled || 0],
          ['Average Score', `${cohortStats?.avgScore} / ${quizDetails.totalMarks}`],
          ['Pass Rate', `${cohortStats?.passRate}%`],
          ['Passing Percentage Req', `${quizDetails.passingPercentage}%`],
          ['Report Exported At', new Date().toLocaleString()],
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, summarySheet, 'Public Summary');

        const filename = `${safeTitle}_Public_Report_${quizDetails.publicCode}.xlsx`;
        XLSX.writeFile(wb, filename);
        success('Downloaded Public Assessment Report!');
        return;
      }

      // CASE C: Exporting ALL (Segregated sheets per batch + public sheet)
      if (quizDetails.assignedBatches && quizDetails.assignedBatches.length > 0) {
        quizDetails.assignedBatches.forEach((b: any) => {
          const bAttempts = attemptsByCohort.batches[b.id] || [];
          const bRows = bAttempts.map((att: any, idx: number) => {
            const rowObj: Record<string, any> = {};
            enabledColumns.forEach((col) => {
              if (col.id === 'sno') rowObj[col.customLabel || col.defaultLabel] = idx + 1;
              else if (col.id === 'percentage') rowObj[col.customLabel || col.defaultLabel] = `${att.percentage}%`;
              else rowObj[col.customLabel || col.defaultLabel] = att[col.key] ?? '—';
            });
            return rowObj;
          });
          const bSheet = XLSX.utils.json_to_sheet(bRows.length > 0 ? bRows : [{ Note: 'No submissions for this batch' }]);
          XLSX.utils.book_append_sheet(wb, bSheet, `${b.name.slice(0, 25)} Batch`);
        });
      }

      if (attemptsByCohort.public.length > 0 || !quizDetails.assignedBatches?.length) {
        const pubRows = attemptsByCohort.public.map((att: any, idx: number) => {
          const rowObj: Record<string, any> = {};
          enabledColumns.forEach((col) => {
            if (col.id === 'sno') rowObj[col.customLabel || col.defaultLabel] = idx + 1;
            else if (col.id === 'percentage') rowObj[col.customLabel || col.defaultLabel] = `${att.percentage}%`;
            else rowObj[col.customLabel || col.defaultLabel] = att[col.key] ?? '—';
          });
          return rowObj;
        });
        const pubSheet = XLSX.utils.json_to_sheet(pubRows.length > 0 ? pubRows : [{ Note: 'No public submissions' }]);
        XLSX.utils.book_append_sheet(wb, pubSheet, 'Public Submissions');
      }

      const summaryData = [
        ['Assessment Title', quizDetails.title],
        ['Public Code', quizDetails.publicCode],
        ['Report Type', 'All Cohorts Segregated Report'],
        ['Total Submissions', quizDetails.attempts.length],
        ['Average Score', `${cohortStats?.avgScore} / ${quizDetails.totalMarks}`],
        ['Pass Rate', `${cohortStats?.passRate}%`],
        ['Assigned Batches', quizDetails.assignedBatches?.map((b: any) => b.name).join(', ') || 'None'],
        ['Report Exported At', new Date().toLocaleString()],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Overview Summary');

      const filename = `${safeTitle}_All_Cohorts_Report_${quizDetails.publicCode}.xlsx`;
      XLSX.writeFile(wb, filename);
      success('Downloaded Segregated Multi-Sheet Report!');
    } catch (err) {
      console.error('Download error:', err);
      error('Failed to generate Excel download');
    }
  };

  // 7. Download Cohort-Separated CSV
  const handleDownloadCustomCsv = () => {
    if (!quizDetails || enabledColumns.length === 0) {
      error('Please enable at least one column to export');
      return;
    }

    try {
      const headers = enabledColumns.map((c) => `"${(c.customLabel || c.defaultLabel).replace(/"/g, '""')}"`);
      const rows = filteredAttempts.map((att: any, rowIdx: number) => {
        return enabledColumns.map((col) => {
          let val = '';
          if (col.id === 'sno') {
            val = String(rowIdx + 1);
          } else if (col.id === 'percentage') {
            val = att.isUnattended ? '—' : `${att.percentage}%`;
          } else if (col.id === 'totalScore') {
            val = att.isUnattended ? '—' : String(att.totalScore);
          } else {
            val = String(att[col.key] ?? '');
          }
          return `"${val.replace(/"/g, '""')}"`;
        }).join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const safeTitle = (quizDetails.title || 'Quiz').replace(/[^a-zA-Z0-9_-]/g, '_');

      let filename = `${safeTitle}_${quizDetails.publicCode}.csv`;
      if (activeBatch) {
        const safeBatchName = activeBatch.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        filename = `${safeTitle}_Batch_${safeBatchName}_${quizDetails.publicCode}.csv`;
      } else if (selectedCohortFilter === 'PUBLIC') {
        filename = `${safeTitle}_Public_${quizDetails.publicCode}.csv`;
      }

      link.download = filename;
      link.click();
      success('CSV report exported!');
    } catch {
      error('Failed to export CSV');
    }
  };

  // 8. Delete Individual Student Attempt Report
  const handleDeleteAttempt = async () => {
    if (!attemptToDelete) return;
    setDeletingAttempt(true);
    try {
      const res = await fetch(`/api/admin/attempts/${attemptToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        success(`Report for "${attemptToDelete.studentName || attemptToDelete.registerNumber || 'Student'}" deleted.`);
        if (quizDetails) {
          setQuizDetails((prev: any) => ({
            ...prev,
            attempts: prev.attempts.filter((a: any) => a.id !== attemptToDelete.id),
          }));
        }
        setAttemptToDelete(null);
        fetchQuizzesList();
      } else {
        error(data.error || 'Failed to delete report');
      }
    } catch {
      error('An error occurred deleting report');
    } finally {
      setDeletingAttempt(false);
    }
  };

  // 9. Clear All Reports / Submissions for a Quiz
  const handleClearQuizReports = async () => {
    if (!quizToClearReports) return;
    setClearingReports(true);
    try {
      const res = await fetch(`/api/admin/quizzes/${quizToClearReports.id}/attempts`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        success(data.message || 'All report submissions cleared successfully!');
        if (selectedQuizId === quizToClearReports.id && quizDetails) {
          setQuizDetails((prev: any) => ({
            ...prev,
            attempts: [],
          }));
        }
        setQuizToClearReports(null);
        fetchQuizzesList();
      } else {
        error(data.error || 'Failed to clear reports');
      }
    } catch {
      error('An error occurred clearing reports');
    } finally {
      setClearingReports(false);
    }
  };

  // Filter quizzes in the list view
  const filteredQuizList = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(searchQuiz.toLowerCase()) ||
      q.publicCode.toLowerCase().includes(searchQuiz.toLowerCase()) ||
      (q.subject && q.subject.toLowerCase().includes(searchQuiz.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col pb-16">
      <AdminHeader
        title={selectedQuizId && quizDetails ? `Report Studio: ${quizDetails.title}` : 'Assessment Reports Center'}
        subtitle={
          selectedQuizId && quizDetails
            ? `Segregated reports for student batches and public link. Preview live records, customize columns, and download Excel.`
            : 'Select an assessment below to access segregated reports for student batches and public link submissions.'
        }
        actions={
          selectedQuizId ? (
            <button
              onClick={() => setSelectedQuizId(null)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-purple-100 hover:text-white border border-white/15 text-xs font-bold transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Assessments</span>
            </button>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* VIEW 1: QUIZZES LIST (First screen shown when entering Report Center)    */}
        {/* ========================================================================= */}
        {!selectedQuizId ? (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search assessment by title, code, or subject..."
                  value={searchQuiz}
                  onChange={(e) => setSearchQuiz(e.target.value)}
                  className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Click any assessment to preview separate Batch & Public reports
              </div>
            </div>

            {/* Quizzes List Cards Grid */}
            {loadingList ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-xs font-semibold">Loading assessments list...</p>
              </div>
            ) : filteredQuizList.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-16 text-center text-slate-400 text-xs">
                No assessments found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredQuizList.map((quiz) => {
                  const hasBatches = quiz.batches && quiz.batches.length > 0;
                  const isBatchRestricted = quiz.settings?.restrictToBatch;

                  return (
                    <div
                      key={quiz.id}
                      onClick={() => setSelectedQuizId(quiz.id)}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-lg hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition cursor-pointer flex flex-col justify-between group"
                    >
                      <div>
                        {/* Top tags row */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                            {quiz.subject || 'Assessment'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-500 group-hover:text-emerald-600 transition">
                              {quiz.publicCode}
                            </span>
                            {(quiz._count?.attempts || 0) > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuizToClearReports(quiz);
                                }}
                                title="Clear all submissions for this quiz"
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition leading-snug">
                          {quiz.title}
                        </h3>

                        {/* Cohort & Access Type Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                          {hasBatches ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-semibold text-[10px] border border-purple-200 dark:border-purple-800">
                              <GraduationCap className="w-3 h-3 text-purple-600" />
                              <span>Batches: {quiz.batches.map((b: any) => b.batch?.name).filter(Boolean).join(', ')}</span>
                            </span>
                          ) : null}

                          {isBatchRestricted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-semibold text-[10px] border border-rose-200 dark:border-rose-800">
                              Cohort Only
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px] border border-emerald-200 dark:border-emerald-800">
                              <Globe className="w-3 h-3 text-emerald-600" />
                              <span>Public Link</span>
                            </span>
                          )}
                        </div>

                        {/* Stats Summary */}
                        <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            <span><strong>{quiz._count?.attempts || 0}</strong> Submissions</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            <span><strong>{quiz._count?.questions || 0}</strong> Questions</span>
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <FileSpreadsheet className="w-4 h-4" />
                          <span>View Reports & Export</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: DETAIL REPORT STUDIO FOR THE CLICKED QUIZ                        */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Top Back & Actions Navigation Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedQuizId(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                  title="Back to All Assessments"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                      Report Studio
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {quizDetails?.publicCode}
                    </span>
                    {quizDetails?.restrictToBatch ? (
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                        Batch-Restricted
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                        Public Link Active
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {quizDetails?.title}
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(quizDetails?.attempts?.length || 0) > 0 && (
                  <button
                    onClick={() => setQuizToClearReports(quizDetails)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold text-rose-600 dark:text-rose-400 transition shadow-sm"
                    title="Delete all submission reports for this assessment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Submissions</span>
                  </button>
                )}

                <button
                  onClick={() => setShowColumnManager(!showColumnManager)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                    showColumnManager
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{showColumnManager ? 'Hide Column Editor' : 'Customize Columns'}</span>
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">
                    {enabledColumns.length}/{columns.length}
                  </span>
                </button>

                <button
                  onClick={handleDownloadCustomExcel}
                  disabled={loadingQuizData || !quizDetails || enabledColumns.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                  title="Download report for the currently selected cohort or batch"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>
                    {activeBatch
                      ? `Export ${activeBatch.name} Excel`
                      : selectedCohortFilter === 'PUBLIC'
                      ? 'Export Public Excel'
                      : 'Export All Excel'}
                  </span>
                </button>

                <button
                  onClick={handleDownloadCustomCsv}
                  disabled={loadingQuizData || !quizDetails || enabledColumns.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Loading Inside Quiz */}
            {loadingQuizData ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <p className="text-xs font-semibold text-slate-400">Loading student records...</p>
              </div>
            ) : !quizDetails ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 text-xs">
                Data unavailable for this assessment.
              </div>
            ) : (
              <div className="space-y-6">
                {/* ========================================================================= */}
                {/* COHORT SEGREGATION TAB BAR: Batches vs Public vs All                      */}
                {/* ========================================================================= */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    <span className="text-xs font-bold text-slate-500 px-2 flex items-center gap-1 shrink-0">
                      <ListFilter className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Select Report:</span>
                    </span>

                    {/* Assigned Batches Tabs */}
                    {quizDetails.assignedBatches?.map((b: any) => {
                      const count = (attemptsByCohort.batches[b.id] || []).length;
                      const isSelected = selectedCohortFilter === b.id;

                      return (
                        <button
                          key={b.id}
                          onClick={() => {
                            setSelectedCohortFilter(b.id);
                          }}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                              : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800'
                          }`}
                        >
                          <GraduationCap className="w-4 h-4" />
                          <span>Batch: {b.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}

                    {/* Public Submissions Tab (Shown if quiz is not restricted or has public attempts) */}
                    {(!quizDetails.restrictToBatch || attemptsByCohort.public.length > 0) && (
                      <button
                        onClick={() => setSelectedCohortFilter('PUBLIC')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                          selectedCohortFilter === 'PUBLIC'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800'
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                        <span>Public Link Submissions</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                            selectedCohortFilter === 'PUBLIC'
                              ? 'bg-white/20 text-white'
                              : 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          }`}
                        >
                          {attemptsByCohort.public.length}
                        </span>
                      </button>
                    )}

                    {/* Combined / All Cohorts Tab */}
                    {((quizDetails.assignedBatches?.length || 0) > 1 ||
                      (quizDetails.assignedBatches?.length > 0 && attemptsByCohort.public.length > 0)) && (
                      <button
                        onClick={() => setSelectedCohortFilter('ALL')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                          selectedCohortFilter === 'ALL'
                            ? 'bg-slate-800 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        <span>All Cohorts (Combined)</span>
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                            selectedCohortFilter === 'ALL'
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {attemptsByCohort.all.length}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Batch View Toggle (Submissions vs Entire Roster) */}
                  {activeBatch && (
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end sm:self-auto">
                      <button
                        onClick={() => setBatchViewMode('SUBMISSIONS_ONLY')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          batchViewMode === 'SUBMISSIONS_ONLY'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Submissions Only ({(attemptsByCohort.batches[activeBatch.id] || []).length})
                      </button>
                      <button
                        onClick={() => setBatchViewMode('FULL_ROSTER')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          batchViewMode === 'FULL_ROSTER'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        Full Batch Roster ({activeBatch.totalStudents})
                      </button>
                    </div>
                  )}
                </div>

                {/* Cohort Stats Banner Card */}
                {cohortStats && (
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-0.5 rounded-full">
                            Active Report Focus
                          </span>
                          <span className="text-xs text-indigo-200">
                            {cohortStats.subtitle}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold mt-1 tracking-tight">
                          {cohortStats.title}
                        </h3>
                      </div>

                      {/* Stats Pills */}
                      <div className="flex flex-wrap items-center gap-3">
                        {cohortStats.isBatch && (
                          <div className="bg-white/10 px-3.5 py-2 rounded-xl text-center border border-white/10">
                            <div className="text-[10px] uppercase font-bold text-slate-300">Enrolled Roster</div>
                            <div className="text-base font-extrabold font-mono text-white">{cohortStats.totalEnrolled}</div>
                          </div>
                        )}
                        <div className="bg-white/10 px-3.5 py-2 rounded-xl text-center border border-white/10">
                          <div className="text-[10px] uppercase font-bold text-emerald-300">Attended / Submissions</div>
                          <div className="text-base font-extrabold font-mono text-emerald-400">{cohortStats.attendedCount}</div>
                        </div>
                        {cohortStats.isBatch && (
                          <div className="bg-white/10 px-3.5 py-2 rounded-xl text-center border border-white/10">
                            <div className="text-[10px] uppercase font-bold text-rose-300">Not Attended</div>
                            <div className="text-base font-extrabold font-mono text-rose-400">{cohortStats.unattendedCount}</div>
                          </div>
                        )}
                        <div className="bg-white/10 px-3.5 py-2 rounded-xl text-center border border-white/10">
                          <div className="text-[10px] uppercase font-bold text-purple-300">Average Score</div>
                          <div className="text-base font-extrabold font-mono text-purple-300">
                            {cohortStats.avgScore} <span className="text-xs font-normal text-slate-300">/ {cohortStats.totalMarks}</span>
                          </div>
                        </div>
                        <div className="bg-white/10 px-3.5 py-2 rounded-xl text-center border border-white/10">
                          <div className="text-[10px] uppercase font-bold text-indigo-300">Pass Rate</div>
                          <div className="text-base font-extrabold font-mono text-indigo-300">{cohortStats.passRate}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Column Customizer Panel */}
                {showColumnManager && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Excel & Table Columns Customizer
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">
                          (Toggle ON/OFF, click text to rename header, or use arrows to reorder)
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <button
                          onClick={() => setAllColumns(true)}
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setAllColumns(false)}
                          className="text-xs font-semibold text-rose-500 hover:underline"
                        >
                          Clear All
                        </button>
                        <button
                          onClick={resetToDefault}
                          className="text-xs font-semibold text-slate-500 hover:underline"
                        >
                          Reset Default
                        </button>
                      </div>
                    </div>

                    {/* Columns Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {columns.map((col, idx) => (
                        <div
                          key={col.id}
                          className={`p-3 rounded-xl border transition flex items-center gap-2.5 ${
                            col.enabled
                              ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800'
                              : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                          }`}
                        >
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleColumn(col.id)}
                            className={`w-4 h-4 rounded shrink-0 flex items-center justify-center transition ${
                              col.enabled
                                ? 'bg-indigo-600 text-white'
                                : 'border border-slate-400 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {col.enabled && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          {/* Custom Label Input */}
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={col.customLabel}
                              onChange={(e) => handleRenameColumn(col.id, e.target.value)}
                              placeholder={col.defaultLabel}
                              className="w-full text-xs font-bold bg-transparent border-b border-transparent focus:border-indigo-500 text-slate-900 dark:text-white outline-none truncate"
                            />
                            <span className="text-[10px] text-slate-400 block truncate">
                              Original: {col.defaultLabel}
                            </span>
                          </div>

                          {/* Reorder Buttons */}
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveColumn(idx, 'up')}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-20"
                              title="Move Earlier"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === columns.length - 1}
                              onClick={() => moveColumn(idx, 'down')}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 disabled:opacity-20"
                              title="Move Later"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Excel Spreadsheet View */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden flex flex-col">
                  {/* Excel Application Style Header */}
                  <div className="bg-emerald-800 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center font-bold text-white shadow text-xs">
                        XLS
                      </div>
                      <div>
                        <h3 className="text-xs font-bold tracking-wide flex items-center gap-2">
                          <span>{quizDetails.title}</span>
                          <span className="text-emerald-300 font-normal">•</span>
                          <span className="text-emerald-200">
                            {activeBatch ? `Batch: ${activeBatch.name}` : selectedCohortFilter === 'PUBLIC' ? 'Public Submissions' : 'All Cohorts'}
                          </span>
                        </h3>
                        <p className="text-[10px] text-emerald-200">
                          Showing {filteredAttempts.length} student records • {enabledColumns.length} active columns
                        </p>
                      </div>
                    </div>

                    {/* Filter Controls Inside Spreadsheet Bar */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Search */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-emerald-300 absolute left-2.5 top-2" />
                        <input
                          type="text"
                          placeholder="Search student or roll no..."
                          value={rowSearch}
                          onChange={(e) => setRowSearch(e.target.value)}
                          className="text-xs pl-8 pr-3 py-1.5 rounded-lg bg-emerald-900/80 border border-emerald-700 text-white placeholder:text-emerald-300/70 outline-none focus:ring-1 focus:ring-white w-44"
                        />
                      </div>

                      {/* Result Filter */}
                      <select
                        value={resultFilter}
                        onChange={(e: any) => setResultFilter(e.target.value)}
                        className="text-xs bg-emerald-900/80 border border-emerald-700 rounded-lg px-2.5 py-1.5 text-white outline-none"
                      >
                        <option value="ALL">All Results</option>
                        <option value="PASS">Pass Only</option>
                        <option value="FAIL">Fail Only</option>
                        {activeBatch && batchViewMode === 'FULL_ROSTER' && (
                          <option value="NOT_ATTENDED">Not Attended Only</option>
                        )}
                      </select>

                      {/* Violations Flag */}
                      <button
                        onClick={() => setFlagFilter(flagFilter === 'ALL' ? 'FLAGGED' : 'ALL')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                          flagFilter === 'FLAGGED'
                            ? 'bg-amber-400 text-slate-950 font-bold'
                            : 'bg-emerald-900/80 border border-emerald-700 text-emerald-100 hover:bg-emerald-700'
                        }`}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Violations Only</span>
                      </button>
                    </div>
                  </div>

                  {/* Main Spreadsheet Table */}
                  <div className="overflow-x-auto max-h-[550px] relative font-sans">
                    {enabledColumns.length === 0 ? (
                      <div className="py-20 text-center text-slate-400 text-xs">
                        No columns are enabled. Click <strong>Customize Columns</strong> above to select columns to display.
                      </div>
                    ) : filteredAttempts.length === 0 ? (
                      <div className="py-20 text-center text-slate-400 text-xs">
                        No student records match the active cohort filter.
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        {/* Excel Alphabet Row Headers (A, B, C...) */}
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-400 font-mono text-[10px] select-none border-b border-slate-200 dark:border-slate-700">
                            <th className="w-10 px-2 py-1 text-center border-r border-slate-200 dark:border-slate-700 bg-slate-200/60 dark:bg-slate-800">
                              #
                            </th>
                            {enabledColumns.map((_, i) => (
                              <th
                                key={i}
                                className="px-3 py-1 text-center font-bold uppercase border-r border-slate-200 dark:border-slate-700"
                              >
                                {String.fromCharCode(65 + (i % 26))}
                              </th>
                            ))}
                            <th className="w-14 px-2 py-1 text-center font-bold uppercase border-r border-slate-200 dark:border-slate-700">
                              ACT
                            </th>
                          </tr>

                          {/* Customized Column Headers Row */}
                          <tr className="bg-emerald-50/80 dark:bg-slate-800 text-emerald-950 dark:text-emerald-300 font-bold border-b-2 border-emerald-600 sticky top-0 z-10 shadow-sm">
                            <th className="w-10 px-2 py-2.5 text-center border-r border-slate-200 dark:border-slate-700 bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                              1
                            </th>
                            {enabledColumns.map((col) => (
                              <th
                                key={col.id}
                                className="px-4 py-2.5 whitespace-nowrap border-r border-emerald-100 dark:border-slate-700 text-xs tracking-tight"
                              >
                                <span>{col.customLabel || col.defaultLabel}</span>
                              </th>
                            ))}
                            <th className="w-14 px-2 py-2.5 text-center whitespace-nowrap border-r border-emerald-100 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-tight">
                              Action
                            </th>
                          </tr>
                        </thead>

                        {/* Data Rows */}
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {filteredAttempts.map((att: any, rowIdx: number) => {
                            const isUnattended = att.isUnattended;

                            return (
                              <tr
                                key={att.id}
                                className={`transition group ${
                                  isUnattended
                                    ? 'bg-slate-50/60 dark:bg-slate-800/30 opacity-75 hover:bg-slate-100/80'
                                    : 'hover:bg-indigo-50/40 dark:hover:bg-slate-800/60'
                                }`}
                              >
                                {/* Row Number */}
                                <td className="px-2 py-2 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 font-mono text-[11px] border-r border-slate-200 dark:border-slate-700 select-none">
                                  {rowIdx + 2}
                                </td>

                                {/* Dynamic Columns */}
                                {enabledColumns.map((col) => {
                                  let cellContent: React.ReactNode = '—';

                                  if (col.id === 'sno') {
                                    cellContent = <span className="font-mono text-slate-500">{rowIdx + 1}</span>;
                                  } else if (col.id === 'registerNumber') {
                                    cellContent = (
                                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                                        {att.registerNumber}
                                      </span>
                                    );
                                  } else if (col.id === 'studentName') {
                                    cellContent = (
                                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {att.studentName}
                                      </span>
                                    );
                                  } else if (col.id === 'batchName') {
                                    cellContent = (
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                          att.isPublic
                                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                                            : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                                        }`}
                                      >
                                        {att.batchName || (att.isPublic ? 'Public' : 'Batch')}
                                      </span>
                                    );
                                  } else if (col.id === 'totalScore') {
                                    cellContent = isUnattended ? (
                                      <span className="text-slate-400 font-mono">—</span>
                                    ) : (
                                      <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                                        {att.totalScore}
                                      </span>
                                    );
                                  } else if (col.id === 'studentClass') {
                                    cellContent = (
                                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                                        {att.studentClass || 'N/A'}
                                      </span>
                                    );
                                  } else if (col.id === 'department') {
                                    cellContent = (
                                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                                        {att.department || 'N/A'}
                                      </span>
                                    );
                                  } else if (col.id === 'percentage') {
                                    cellContent = isUnattended ? (
                                      <span className="text-slate-400 font-mono">—</span>
                                    ) : (
                                      <span className="font-bold font-mono">
                                        {att.percentage}%
                                      </span>
                                    );
                                  } else if (col.id === 'result') {
                                    if (isUnattended) {
                                      cellContent = (
                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                          NOT ATTENDED
                                        </span>
                                      );
                                    } else {
                                      cellContent = (
                                        <span
                                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            att.passed
                                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                                          }`}
                                        >
                                          {att.result}
                                        </span>
                                      );
                                    }
                                  } else if (col.id === 'violationCount') {
                                    cellContent = isUnattended ? (
                                      <span className="text-slate-400">—</span>
                                    ) : (
                                      <span
                                        className={`font-mono font-bold ${
                                          att.violationCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                                        }`}
                                      >
                                        {att.violationCount}
                                      </span>
                                    );
                                  } else {
                                    cellContent = String(att[col.key] ?? '—');
                                  }

                                  return (
                                    <td
                                      key={col.id}
                                      className="px-4 py-2.5 whitespace-nowrap border-r border-slate-100 dark:border-slate-800"
                                    >
                                      {cellContent}
                                    </td>
                                  );
                                })}

                                {/* Action: Delete Student Attempt Report (Disabled for synthetic unattended roster rows) */}
                                <td className="w-14 px-2 py-2 text-center whitespace-nowrap border-r border-slate-100 dark:border-slate-800">
                                  {!isUnattended ? (
                                    <button
                                      type="button"
                                      onClick={() => setAttemptToDelete(att)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                      title={`Delete report for ${att.studentName || att.registerNumber || 'Student'}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Bottom Spreadsheet Status Bar */}
                  <div className="bg-slate-100 dark:bg-slate-800/90 px-5 py-2.5 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
                    <div className="flex items-center gap-4">
                      <span>Excel 2026 Compatible</span>
                      <span>•</span>
                      <span>
                        Active View:{' '}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {activeBatch
                            ? `Batch (${activeBatch.name})`
                            : selectedCohortFilter === 'PUBLIC'
                            ? 'Public Submissions'
                            : 'All Cohorts'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>Total Displayed: <strong>{filteredAttempts.length}</strong></span>
                      <span>•</span>
                      <span>Visible Columns: <strong>{enabledColumns.length}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDownloadCustomExcel}
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>
                          {activeBatch
                            ? `Download ${activeBatch.name} Excel`
                            : selectedCohortFilter === 'PUBLIC'
                            ? 'Download Public Excel'
                            : 'Download All Cohorts Excel'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={!!attemptToDelete}
        onClose={() => setAttemptToDelete(null)}
        onConfirm={handleDeleteAttempt}
        isLoading={deletingAttempt}
        isDangerous={true}
        title="Delete Student Report"
        message={`Are you sure you want to delete the submission report for "${attemptToDelete?.studentName || attemptToDelete?.registerNumber || 'this student'}"? This will permanently remove their score, answer sheet, and violation records.`}
        confirmText="Delete Report"
      />

      <ConfirmationDialog
        isOpen={!!quizToClearReports}
        onClose={() => setQuizToClearReports(null)}
        onConfirm={handleClearQuizReports}
        isLoading={clearingReports}
        isDangerous={true}
        title="Clear All Submissions"
        message={`Are you sure you want to clear all student submissions for "${quizToClearReports?.title}"? All submitted scores, answer sheets, and violation logs will be permanently deleted.`}
        confirmText="Clear All Submissions"
      />
    </div>
  );
}
