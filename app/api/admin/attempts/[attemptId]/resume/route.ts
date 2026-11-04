import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { attemptId } = await params;

  try {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            adminId: true,
            durationMinutes: true,
          },
        },
      },
    });

    if (!attempt || (admin.role !== 'SUPER_ADMIN' && attempt.quiz.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Attempt not found or unauthorized' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const extraMinutes = Math.max(1, parseInt(body.extraMinutes) || attempt.quiz.durationMinutes || 15);
    const resetViolations = Boolean(body.resetViolations);

    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + extraMinutes * 60 * 1000);

    const updated = await prisma.attempt.update({
      where: { id: attemptId },
      data: {
        status: 'IN_PROGRESS',
        submittedAt: null,
        expiresAt: newExpiresAt,
        resumedAt: now,
        resumedCount: { increment: 1 },
        violationCount: resetViolations ? 0 : attempt.violationCount,
      },
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'ATTEMPT_RESUMED',
        details: JSON.stringify({
          attemptId,
          quizId: attempt.quizId,
          quizTitle: attempt.quiz.title,
          studentName: attempt.studentName,
          registerNumber: attempt.registerNumber,
          extraMinutes,
          newExpiresAt,
          resetViolations,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Test successfully resumed for ${attempt.studentName || 'student'} with +${extraMinutes} minutes.`,
      attempt: updated,
    });
  } catch (error: any) {
    console.error('Resume attempt error:', error);
    return NextResponse.json({ error: error.message || 'Failed to resume attempt' }, { status: 500 });
  }
}

