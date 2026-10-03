import * as XLSX from 'xlsx';
import prisma from './db';

export async function generateQuizExcelReport(quizId: string): Promise<Buffer> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      settings: true,
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

  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet
  const completed = quiz.attempts.filter((a) => a.status === 'SUBMITTED');
  const scores = completed.map((a) => a.totalScore);
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';
  const passedCount = completed.filter((a) => a.passed).length;
  const passRate = completed.length > 0 ? ((passedCount / completed.length) * 100).toFixed(1) + '%' : '0%';

  const summaryData = [
    ['Quiz Title', quiz.title],
    ['Subject', quiz.subject || 'N/A'],
    ['Department', quiz.department || 'N/A'],
    ['Target Class', quiz.targetClass || 'N/A'],
    ['Duration (mins)', quiz.durationMinutes],
    ['Passing Percentage', `${quiz.passingPercentage}%`],
    ['Public Code', quiz.publicCode],
    ['Total Questions', quiz.questions.length],
    ['Total Participants', quiz.attempts.length],
    ['Completed Submissions', completed.length],
    ['Average Score', avgScore],
    ['Pass Rate', passRate],
    ['Report Generated At', new Date().toISOString()],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Quiz Summary');

  // 2. Student Results Sheet
  const studentRows = quiz.attempts.map((att, idx) => {
    const start = new Date(att.startedAt);
    const end = att.submittedAt ? new Date(att.submittedAt) : null;
    const durationMin = end ? ((end.getTime() - start.getTime()) / 60000).toFixed(1) : 'Incomplete';

    return {
      'S.No': idx + 1,
      'Register No': att.registerNumber || 'N/A',
      'Student Name': att.studentName || 'N/A',
      'Score': att.totalScore,
      'Class': att.studentClass || 'N/A',
      'Department': att.department || 'N/A',
      'Percentage': `${att.percentage}%`,
      'Result': att.passed ? 'PASS' : 'FAIL',
      'Violations': att.violationCount,
    };
  });
  const studentSheet = XLSX.utils.json_to_sheet(studentRows);
  XLSX.utils.book_append_sheet(wb, studentSheet, 'Student Results');

  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return excelBuffer;
}

export async function generateQuizCsvReport(quizId: string): Promise<string> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      attempts: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!quiz) {
    throw new Error('Quiz not found');
  }

  const headers = [
    'S.No',
    'Register No',
    'Student Name',
    'Score',
    'Class',
    'Department',
    'Percentage',
    'Result',
    'Violations',
  ];

  const rows = quiz.attempts.map((att, idx) => [
    idx + 1,
    `"${(att.registerNumber || '').replace(/"/g, '""')}"`,
    `"${(att.studentName || '').replace(/"/g, '""')}"`,
    att.totalScore,
    `"${(att.studentClass || '').replace(/"/g, '""')}"`,
    `"${(att.department || '').replace(/"/g, '""')}"`,
    `"${att.percentage}%"`,
    `"${att.passed ? 'PASS' : 'FAIL'}"`,
    att.violationCount,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
