import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: quizId } = await params;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { id: true, title: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Delete all attempts associated with this quiz (cascades to answers and violations)
    const { count } = await prisma.attempt.deleteMany({
      where: { quizId },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'QUIZ_ATTEMPTS_CLEARED',
        details: JSON.stringify({
          quizId,
          quizTitle: quiz.title,
          deletedCount: count,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${count} student submissions for "${quiz.title}".`,
      deletedCount: count,
    });
  } catch (error: any) {
    console.error('Clear quiz attempts error:', error);
    return NextResponse.json({ error: error.message || 'Failed to clear attempts' }, { status: 500 });
  }
}
