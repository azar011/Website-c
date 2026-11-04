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
        batches: {
          include: {
            batch: {
              include: {
                students: {
                  select: {
                    id: true,
                    name: true,
                    registerNumber: true,
                    email: true,
                  },
                  orderBy: { registerNumber: 'asc' },
                },
              },
            },
          },
        },
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

    if (!quiz || (admin.role !== 'SUPER_ADMIN' && quiz.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const totalMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);

    // Also fetch all batches owned by this quiz's admin to detect any batches whose students attended
    // (even if the quiz was switched to Public mode)
    const allAdminBatches = await prisma.studentBatch.findMany({
      where: { adminId: quiz.adminId },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            registerNumber: true,
            email: true,
          },
          orderBy: { registerNumber: 'asc' },
        },
      },
    });

    // Collect all batches relevant to this quiz:
    // 1) Explicitly assigned via QuizBatch
    const relevantBatchesMap = new Map<string, any>();
    (quiz.batches || []).forEach((qb) => {
      relevantBatchesMap.set(qb.batch.id, qb.batch);
    });

    // 2) Any admin batch where at least one student took this quiz
    const attemptRegs = new Set(
      quiz.attempts.map((a) => (a.registerNumber || '').trim().toLowerCase()).filter(Boolean)
    );

    for (const b of allAdminBatches) {
      if (!relevantBatchesMap.has(b.id)) {
        const hasStudentAttended = b.students.some((st) =>
          attemptRegs.has((st.registerNumber || '').trim().toLowerCase())
        );
        if (hasStudentAttended) {
          relevantBatchesMap.set(b.id, b);
          // Self-heal QuizBatch relation so it stays linked
          try {
            await prisma.quizBatch.upsert({
              where: {
                quizId_batchId: {
                  quizId: quiz.id,
                  batchId: b.id,
                },
              },
              create: {
                quizId: quiz.id,
                batchId: b.id,
              },
              update: {},
            });
          } catch {}
        }
      }
    }

    // Build lookup map for batch students: registerNumber (lowercase) -> batch details
    const registerToBatchMap = new Map<
      string,
      { id: string; name: string; className: string | null; department: string | null }
    >();

    const assignedBatches = Array.from(relevantBatchesMap.values()).map((b) => {
      (b.students || []).forEach((st: any) => {
        if (st.registerNumber) {
          registerToBatchMap.set(st.registerNumber.trim().toLowerCase(), {
            id: b.id,
            name: b.name,
            className: b.className,
            department: b.department,
          });
        }
      });

      return {
        id: b.id,
        name: b.name,
        className: b.className,
        department: b.department,
        totalStudents: b.students?.length || 0,
        students: (b.students || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          registerNumber: s.registerNumber,
          email: s.email,
        })),
      };
    });

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
        restrictToBatch: quiz.settings?.restrictToBatch ?? false,
        totalQuestions: quiz.questions.length,
        totalMarks,
        assignedBatches,
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

          // Match attempt to batch
          const regKey = (att.registerNumber || '').trim().toLowerCase();
          const matchedBatch = regKey ? registerToBatchMap.get(regKey) : null;
          const batchId = matchedBatch ? matchedBatch.id : 'PUBLIC';
          const batchName = matchedBatch ? matchedBatch.name : 'Public Link';

          return {
            id: att.id,
            sno: idx + 1,
            studentName: att.studentName || 'N/A',
            registerNumber: att.registerNumber || 'N/A',
            email: att.email || 'N/A',
            studentClass: att.studentClass || matchedBatch?.className || 'N/A',
            department: att.department || matchedBatch?.department || 'N/A',
            batchId,
            batchName,
            isPublic: !matchedBatch,
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
