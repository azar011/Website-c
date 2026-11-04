import * as XLSX from 'xlsx';
import prisma from './db';

export interface ReportOptions {
  batchId?: string;
  segment?: 'public' | 'batch' | 'all';
}

export async function generateQuizExcelReport(
  quizId: string,
  options?: ReportOptions
): Promise<{ buffer: Buffer; filename: string }> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      settings: true,
      batches: {
        include: {
          batch: {
            include: {
              students: true,
            },
          },
        },
      },
      questions: {
        include: { options: true },
        orderBy: { orderIndex: 'asc' },
      },
      attempts: {
        include: {
          answers: true,
          violations: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  const safeTitle = (quiz.title || 'Quiz').replace(/[^a-zA-Z0-9_-]/g, '_');
  const wb = XLSX.utils.book_new();

  // Fetch all admin batches to recognize batches even if quiz access was switched to Public
  const allAdminBatches = await prisma.studentBatch.findMany({
    where: { adminId: quiz.adminId },
    include: { students: true },
  });

  // Combine directly assigned batches + any admin batch with student attempts
  const attemptRegs = new Set(
    quiz.attempts.map((a) => (a.registerNumber || '').trim().toLowerCase()).filter(Boolean)
  );
  const relevantBatchesMap = new Map<string, any>();
  quiz.batches.forEach((qb) => relevantBatchesMap.set(qb.batch.id, qb.batch));
  allAdminBatches.forEach((b) => {
    if (!relevantBatchesMap.has(b.id)) {
      const hasAttempt = b.students.some((s) =>
        attemptRegs.has((s.registerNumber || '').trim().toLowerCase())
      );
      if (hasAttempt) relevantBatchesMap.set(b.id, b);
    }
  });

  const relevantBatches = Array.from(relevantBatchesMap.values());

  // Build registration map for batch lookup
  const regToBatch = new Map<string, any>();
  relevantBatches.forEach((b) => {
    b.students.forEach((st: any) => {
      if (st.registerNumber) {
        regToBatch.set(st.registerNumber.trim().toLowerCase(), b);
      }
    });
  });

  // Attach batch to each attempt
  const attemptsWithBatch = quiz.attempts.map((att) => {
    const reg = (att.registerNumber || '').trim().toLowerCase();
    const batch = reg ? regToBatch.get(reg) : null;
    return {
      ...att,
      batchId: batch ? batch.id : 'PUBLIC',
      batchName: batch ? batch.name : 'Public Link',
      isPublic: !batch,
    };
  });

  // SCENARIO 1: Specific Batch requested
  if (options?.batchId && options.batchId !== 'PUBLIC' && options.batchId !== 'ALL') {
    const targetBatch = relevantBatches.find((b) => b.id === options.batchId);
    const batchName = targetBatch?.name || 'Batch';
    const safeBatch = batchName.replace(/[^a-zA-Z0-9_-]/g, '_');

    const batchAttempts = attemptsWithBatch.filter((a) => a.batchId === options.batchId);
    const completed = batchAttempts.filter((a) => a.status === 'SUBMITTED');
    const scores = completed.map((a) => a.totalScore);
    const avgScore =
      scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';
    const passedCount = completed.filter((a) => a.passed).length;
    const passRate =
      completed.length > 0 ? ((passedCount / completed.length) * 100).toFixed(1) + '%' : '0%';

    const enrolledCount = targetBatch?.students?.length || 0;
    const attendedCount = completed.length;
    const notAttendedCount = Math.max(0, enrolledCount - attendedCount);

    // 1. Batch Summary Sheet
    const summaryData = [
      ['Assessment Title', quiz.title],
      ['Public Code', quiz.publicCode],
      ['Report Type', `Batch Report — ${batchName}`],
      ['Batch Name', batchName],
      ['Target Class', targetBatch?.className || quiz.targetClass || 'N/A'],
      ['Department', targetBatch?.department || quiz.department || 'N/A'],
      ['Duration (mins)', quiz.durationMinutes],
      ['Passing Percentage', `${quiz.passingPercentage}%`],
      ['Total Enrolled in Batch', enrolledCount],
      ['Attended Submissions', attendedCount],
      ['Not Attended / Absent', notAttendedCount],
      ['Average Score', avgScore],
      ['Pass Rate', passRate],
      ['Generated At', new Date().toLocaleString()],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Batch Summary');

    // 2. Student Results Sheet for this batch only
    const studentRows = batchAttempts.map((att, idx) => ({
      'S.No': idx + 1,
      'Register No': att.registerNumber || 'N/A',
      'Student Name': att.studentName || 'N/A',
      'Score': att.totalScore,
      'Class': att.studentClass || targetBatch?.className || 'N/A',
      'Department': att.department || targetBatch?.department || 'N/A',
      'Batch / Cohort': batchName,
      'Percentage': `${att.percentage}%`,
      'Result': att.passed ? 'PASS' : 'FAIL',
      'Violations': att.violationCount,
      'Submitted At': att.submittedAt ? new Date(att.submittedAt).toLocaleString() : 'Incomplete',
    }));
    const studentSheet = XLSX.utils.json_to_sheet(studentRows);
    XLSX.utils.book_append_sheet(wb, studentSheet, `${batchName.slice(0, 28)} Results`);

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return {
      buffer: excelBuffer,
      filename: `${safeTitle}_Batch_${safeBatch}_Report_${quiz.publicCode}.xlsx`,
    };
  }

  // SCENARIO 2: Public Submissions Report requested
  if (options?.segment === 'public' || options?.batchId === 'PUBLIC') {
    const publicAttempts = attemptsWithBatch.filter((a) => a.isPublic);
    const completed = publicAttempts.filter((a) => a.status === 'SUBMITTED');
    const scores = completed.map((a) => a.totalScore);
    const avgScore =
      scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';
    const passedCount = completed.filter((a) => a.passed).length;
    const passRate =
      completed.length > 0 ? ((passedCount / completed.length) * 100).toFixed(1) + '%' : '0%';

    // 1. Public Summary Sheet
    const summaryData = [
      ['Assessment Title', quiz.title],
      ['Public Code', quiz.publicCode],
      ['Report Type', 'Public Assessment Report'],
      ['Subject', quiz.subject || 'N/A'],
      ['Duration (mins)', quiz.durationMinutes],
      ['Passing Percentage', `${quiz.passingPercentage}%`],
      ['Total Public Candidates', publicAttempts.length],
      ['Completed Submissions', completed.length],
      ['Average Score', avgScore],
      ['Pass Rate', passRate],
      ['Generated At', new Date().toLocaleString()],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Public Summary');

    // 2. Public Results Sheet
    const studentRows = publicAttempts.map((att, idx) => ({
      'S.No': idx + 1,
      'Register No': att.registerNumber || 'N/A',
      'Student Name': att.studentName || 'N/A',
      'Score': att.totalScore,
      'Class': att.studentClass || 'N/A',
      'Department': att.department || 'N/A',
      'Access Type': 'Public Link',
      'Percentage': `${att.percentage}%`,
      'Result': att.passed ? 'PASS' : 'FAIL',
      'Violations': att.violationCount,
      'Submitted At': att.submittedAt ? new Date(att.submittedAt).toLocaleString() : 'Incomplete',
    }));
    const studentSheet = XLSX.utils.json_to_sheet(studentRows);
    XLSX.utils.book_append_sheet(wb, studentSheet, 'Public Submissions');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return {
      buffer: excelBuffer,
      filename: `${safeTitle}_Public_Report_${quiz.publicCode}.xlsx`,
    };
  }

  // SCENARIO 3: All Reports / Default Workbook (Segregated per Cohort into separate sheets)
  const completed = attemptsWithBatch.filter((a) => a.status === 'SUBMITTED');
  const scores = completed.map((a) => a.totalScore);
  const avgScore =
    scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';
  const passedCount = completed.filter((a) => a.passed).length;
  const passRate =
    completed.length > 0 ? ((passedCount / completed.length) * 100).toFixed(1) + '%' : '0%';

  const summaryData = [
    ['Quiz Title', quiz.title],
    ['Subject', quiz.subject || 'N/A'],
    ['Department', quiz.department || 'N/A'],
    ['Target Class', quiz.targetClass || 'N/A'],
    ['Duration (mins)', quiz.durationMinutes],
    ['Passing Percentage', `${quiz.passingPercentage}%`],
    ['Public Code', quiz.publicCode],
    ['Total Questions', quiz.questions.length],
    ['Total Submissions', attemptsWithBatch.length],
    ['Completed Submissions', completed.length],
    ['Average Score', avgScore],
    ['Pass Rate', passRate],
    ['Assigned Batches', relevantBatches.map((b) => b.name).join(', ') || 'None (Public)'],
    ['Report Generated At', new Date().toLocaleString()],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Overview Summary');

  // If there are batches, generate dedicated sheets for EACH batch!
  if (relevantBatches.length > 0) {
    relevantBatches.forEach((b) => {
      const bAttempts = attemptsWithBatch.filter((a) => a.batchId === b.id);
      const bRows = bAttempts.map((att, idx) => ({
        'S.No': idx + 1,
        'Register No': att.registerNumber || 'N/A',
        'Student Name': att.studentName || 'N/A',
        'Score': att.totalScore,
        'Class': att.studentClass || b.className || 'N/A',
        'Department': att.department || b.department || 'N/A',
        'Batch': b.name,
        'Percentage': `${att.percentage}%`,
        'Result': att.passed ? 'PASS' : 'FAIL',
        'Violations': att.violationCount,
      }));
      const bSheet = XLSX.utils.json_to_sheet(bRows.length > 0 ? bRows : [{ Note: 'No submissions yet for this batch' }]);
      const sheetTitle = `${b.name.slice(0, 25)} Batch`;
      XLSX.utils.book_append_sheet(wb, bSheet, sheetTitle);
    });
  }

  // If there are public attempts, create a separate Public sheet
  const publicAttempts = attemptsWithBatch.filter((a) => a.isPublic);
  if (publicAttempts.length > 0 || relevantBatches.length === 0) {
    const pubRows = publicAttempts.map((att, idx) => ({
      'S.No': idx + 1,
      'Register No': att.registerNumber || 'N/A',
      'Student Name': att.studentName || 'N/A',
      'Score': att.totalScore,
      'Class': att.studentClass || 'N/A',
      'Department': att.department || 'N/A',
      'Percentage': `${att.percentage}%`,
      'Result': att.passed ? 'PASS' : 'FAIL',
      'Violations': att.violationCount,
    }));
    const pubSheet = XLSX.utils.json_to_sheet(pubRows.length > 0 ? pubRows : [{ Note: 'No public submissions' }]);
    XLSX.utils.book_append_sheet(wb, pubSheet, 'Public Submissions');
  }

  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return {
    buffer: excelBuffer,
    filename: `${safeTitle}_Report_${quiz.publicCode}.xlsx`,
  };
}

export async function generateQuizCsvReport(
  quizId: string,
  options?: ReportOptions
): Promise<{ content: string; filename: string }> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      batches: {
        include: {
          batch: {
            include: { students: true },
          },
        },
      },
      attempts: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  const safeTitle = (quiz.title || 'Quiz').replace(/[^a-zA-Z0-9_-]/g, '_');

  // Fetch all admin batches to recognize batches even if quiz access was switched to Public
  const allAdminBatches = await prisma.studentBatch.findMany({
    where: { adminId: quiz.adminId },
    include: { students: true },
  });

  const attemptRegs = new Set(
    quiz.attempts.map((a) => (a.registerNumber || '').trim().toLowerCase()).filter(Boolean)
  );
  const relevantBatchesMap = new Map<string, any>();
  quiz.batches.forEach((qb) => relevantBatchesMap.set(qb.batch.id, qb.batch));
  allAdminBatches.forEach((b) => {
    if (!relevantBatchesMap.has(b.id)) {
      const hasAttempt = b.students.some((s) =>
        attemptRegs.has((s.registerNumber || '').trim().toLowerCase())
      );
      if (hasAttempt) relevantBatchesMap.set(b.id, b);
    }
  });

  const relevantBatches = Array.from(relevantBatchesMap.values());

  // Registration lookup
  const regToBatch = new Map<string, any>();
  relevantBatches.forEach((b) => {
    b.students.forEach((st: any) => {
      if (st.registerNumber) {
        regToBatch.set(st.registerNumber.trim().toLowerCase(), b);
      }
    });
  });

  let filteredAttempts = quiz.attempts.map((att) => {
    const reg = (att.registerNumber || '').trim().toLowerCase();
    const batch = reg ? regToBatch.get(reg) : null;
    return {
      ...att,
      batchId: batch ? batch.id : 'PUBLIC',
      batchName: batch ? batch.name : 'Public Link',
      isPublic: !batch,
    };
  });

  let filename = `${safeTitle}_Responses_${quiz.publicCode}.csv`;

  if (options?.batchId && options.batchId !== 'PUBLIC' && options.batchId !== 'ALL') {
    const targetBatch = relevantBatches.find((b) => b.id === options.batchId);
    const batchName = targetBatch?.name || 'Batch';
    const safeBatch = batchName.replace(/[^a-zA-Z0-9_-]/g, '_');
    filteredAttempts = filteredAttempts.filter((a) => a.batchId === options.batchId);
    filename = `${safeTitle}_Batch_${safeBatch}_${quiz.publicCode}.csv`;
  } else if (options?.segment === 'public' || options?.batchId === 'PUBLIC') {
    filteredAttempts = filteredAttempts.filter((a) => a.isPublic);
    filename = `${safeTitle}_Public_${quiz.publicCode}.csv`;
  }

  const headers = [
    'S.No',
    'Register No',
    'Student Name',
    'Cohort / Batch',
    'Score',
    'Class',
    'Department',
    'Percentage',
    'Result',
    'Violations',
  ];

  const rows = filteredAttempts.map((att, idx) => [
    idx + 1,
    `"${(att.registerNumber || '').replace(/"/g, '""')}"`,
    `"${(att.studentName || '').replace(/"/g, '""')}"`,
    `"${(att.batchName || 'Public Link').replace(/"/g, '""')}"`,
    att.totalScore,
    `"${(att.studentClass || '').replace(/"/g, '""')}"`,
    `"${(att.department || '').replace(/"/g, '""')}"`,
    `"${att.percentage}%"`,
    `"${att.passed ? 'PASS' : 'FAIL'}"`,
    att.violationCount,
  ]);

  return {
    content: [headers.join(','), ...rows.map((r) => r.join(','))].join('\n'),
    filename,
  };
}
