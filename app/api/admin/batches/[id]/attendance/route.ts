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

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const quizIdParam = searchParams.get('quizId');

  try {
    const batch = await prisma.studentBatch.findUnique({
      where: { id },
      include: {
        students: {
          orderBy: { registerNumber: 'asc' },
        },
        quizzes: {
          include: {
            quiz: {
              select: {
                id: true,
                title: true,
                publicCode: true,
                status: true,
                durationMinutes: true,
                passingPercentage: true,
              },
            },
          },
        },
      },
    });

    if (!batch || (admin.role !== 'SUPER_ADMIN' && batch.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const assignedQuizzes = batch.quizzes.map((q) => q.quiz);
    const selectedQuizId = quizIdParam || (assignedQuizzes.length > 0 ? assignedQuizzes[0].id : null);

    // Collect all attempts for all assigned quizzes to generate summary stats
    const allQuizIds = assignedQuizzes.map((q) => q.id);
    const allAttempts = await prisma.attempt.findMany({
      where: {
        quizId: { in: allQuizIds },
      },
      select: {
        id: true,
        quizId: true,
        registerNumber: true,
        studentName: true,
        status: true,
        totalScore: true,
        percentage: true,
        passed: true,
        startedAt: true,
        submittedAt: true,
        violationCount: true,
      },
    });

    const totalStudentsInBatch = batch.students.length;

    // Build per-quiz statistics
    const quizzesWithStats = assignedQuizzes.map((quiz) => {
      const quizAttempts = allAttempts.filter((a) => a.quizId === quiz.id);

      // Match enrolled students with attempts
      let attended = 0;
      let inProgress = 0;

      for (const st of batch.students) {
        const studentReg = st.registerNumber.trim().toLowerCase();
        const match = quizAttempts.find(
          (a) => a.registerNumber && a.registerNumber.trim().toLowerCase() === studentReg
        );
        if (match) {
          if (match.status === 'SUBMITTED') {
            attended++;
          } else if (match.status === 'IN_PROGRESS') {
            inProgress++;
          } else {
            attended++;
          }
        }
      }

      const notAttended = Math.max(0, totalStudentsInBatch - attended - inProgress);
      const turnoutRate = totalStudentsInBatch > 0 ? Math.round((attended / totalStudentsInBatch) * 100) : 0;

      return {
        ...quiz,
        stats: {
          totalStudents: totalStudentsInBatch,
          attendedCount: attended,
          inProgressCount: inProgress,
          notAttendedCount: notAttended,
          turnoutRate,
        },
      };
    });

    // Detailed student attendance for the selected quiz
    let studentsAttendance: any[] = [];
    if (selectedQuizId) {
      const selectedAttempts = allAttempts.filter((a) => a.quizId === selectedQuizId);

      studentsAttendance = batch.students.map((st) => {
        const studentReg = st.registerNumber.trim().toLowerCase();
        const match = selectedAttempts.find(
          (a) => a.registerNumber && a.registerNumber.trim().toLowerCase() === studentReg
        );

        let attendanceStatus: 'ATTENDED' | 'IN_PROGRESS' | 'NOT_ATTENDED' = 'NOT_ATTENDED';
        if (match) {
          if (match.status === 'SUBMITTED') attendanceStatus = 'ATTENDED';
          else if (match.status === 'IN_PROGRESS') attendanceStatus = 'IN_PROGRESS';
          else attendanceStatus = 'ATTENDED';
        }

        return {
          id: st.id,
          registerNumber: st.registerNumber,
          name: st.name,
          email: st.email,
          attendanceStatus,
          attempt: match
            ? {
                id: match.id,
                status: match.status,
                score: match.totalScore,
                percentage: match.percentage,
                passed: match.passed,
                startedAt: match.startedAt,
                submittedAt: match.submittedAt,
                violationCount: match.violationCount,
              }
            : null,
        };
      });
    }

    return NextResponse.json({
      batch: {
        id: batch.id,
        name: batch.name,
        className: batch.className,
        department: batch.department,
        totalStudents: totalStudentsInBatch,
      },
      quizzes: quizzesWithStats,
      selectedQuizId,
      studentsAttendance,
    });
  } catch (error: any) {
    console.error('Fetch batch attendance error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch attendance' }, { status: 500 });
  }
}

