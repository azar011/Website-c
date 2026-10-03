import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ attemptId: string }> }) {
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
          include: {
            questions: {
              include: {
                options: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        answers: {
          include: {
            question: {
              include: { options: true },
            },
          },
        },
        violations: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    return NextResponse.json({ attempt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ attemptId: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { attemptId } = await params;

  try {
    const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    await prisma.attempt.delete({ where: { id: attemptId } });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'ATTEMPT_DELETED',
        details: JSON.stringify({
          attemptId,
          studentName: attempt.studentName,
          registerNumber: attempt.registerNumber,
          quizId: attempt.quizId,
        }),
      },
    });

    return NextResponse.json({ success: true, message: 'Attempt deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
