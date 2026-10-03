import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const updated = await prisma.quiz.update({
      where: { id },
      data: {
        status: 'CLOSED',
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'QUIZ_CLOSED',
        details: JSON.stringify({ quizId: id, title: updated.title }),
      },
    });

    return NextResponse.json({ success: true, quiz: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
