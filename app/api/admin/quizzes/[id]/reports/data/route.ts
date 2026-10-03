import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: quizId } = await params;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        settings: true,
        questions: {
          include: {
            options: true,
          },
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
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const totalMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        publicCode: quiz.publicCode,
        subject: quiz.subject,
        department: quiz.department,
        targetClass: quiz.targetClass,
        durationMinutes: quiz.durationMinutes,
        passingPercentage: quiz.passingPercentage,
        totalQuestions: quiz.questions.length,
        totalMarks,
        questions: quiz.questions.map((q, idx) => ({
          id: q.id,
          orderIndex: idx + 1,
          questionText: q.questionText,
          type: q.type,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
        })),
        attempts: quiz.attempts.map((att, idx) => {
          const start = new Date(att.startedAt);
          const end = att.submittedAt ? new Date(att.submittedAt) : null;
          const durationMin = end
            ? ((end.getTime() - start.getTime()) / 60000).toFixed(1)
            : 'Incomplete';

          // Map answers by questionId
          const questionScores: Record<string, number> = {};
          att.answers.forEach((ans) => {
            questionScores[ans.questionId] = ans.marksAwarded;
          });

          return {
            id: att.id,
            sno: idx + 1,
            studentName: att.studentName || 'N/A',
            registerNumber: att.registerNumber || 'N/A',
            email: att.email || 'N/A',
            studentClass: att.studentClass || 'N/A',
            department: att.department || 'N/A',
            status: att.status,
            totalScore: att.totalScore,
            maxMarks: totalMarks,
            percentage: att.percentage,
            passed: att.passed,
            result: att.passed ? 'PASS' : 'FAIL',
            totalCorrect: att.totalCorrect,
            totalWrong: att.totalWrong,
            totalUnanswered: att.totalUnanswered,
            totalNegativeMarks: att.totalNegativeMarks,
            violationCount: att.violationCount,
            cheatingFlag: att.violationCount > 0 ? `FLAGGED (${att.violationCount})` : 'CLEAN',
            startedAt: start.toLocaleString(),
            submittedAt: end ? end.toLocaleString() : 'N/A',
            duration: durationMin,
            questionScores,
          };
        }),
      },
    });
  } catch (error: any) {
    console.error('Report data fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch report data' }, { status: 500 });
  }
}
