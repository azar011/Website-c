import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        settings: true,
        questions: {
          include: {
            options: {
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
    });

    if (!quiz || (admin.role !== 'SUPER_ADMIN' && quiz.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json({ quiz });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const {
      title,
      description,
      instructions,
      subject,
      category,
      targetClass,
      department,
      durationMinutes,
      passingPercentage,
      startDate,
      endDate,
      status,
      randomizeQuestions,
      randomizeOptions,
      questionPoolSize,
      settings,
    } = body;

    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing || (admin.role !== 'SUPER_ADMIN' && existing.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Update Quiz
    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
        instructions: instructions !== undefined ? instructions?.trim() || null : undefined,
        subject: subject !== undefined ? subject?.trim() || null : undefined,
        category: category !== undefined ? category?.trim() || null : undefined,
        targetClass: targetClass !== undefined ? targetClass?.trim() || null : undefined,
        department: department !== undefined ? department?.trim() || null : undefined,
        durationMinutes: durationMinutes !== undefined ? parseInt(durationMinutes) : undefined,
        passingPercentage: passingPercentage !== undefined ? parseFloat(passingPercentage) : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        status: status !== undefined ? status : undefined,
        randomizeQuestions: randomizeQuestions !== undefined ? Boolean(randomizeQuestions) : undefined,
        randomizeOptions: randomizeOptions !== undefined ? Boolean(randomizeOptions) : undefined,
        questionPoolSize: questionPoolSize !== undefined ? (questionPoolSize ? parseInt(questionPoolSize) : null) : undefined,
      },
    });

    // Update Settings if provided
    if (settings) {
      await prisma.quizSettings.upsert({
        where: { quizId: id },
        create: {
          quizId: id,
          ...settings,
        },
        update: {
          ...settings,
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'QUIZ_UPDATED',
        details: JSON.stringify({ quizId: id, title: updatedQuiz.title }),
      },
    });

    const fullQuiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        settings: true,
        questions: {
          include: { options: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, quiz: fullQuiz });
  } catch (error: any) {
    console.error('Update quiz error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update quiz' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz || (admin.role !== 'SUPER_ADMIN' && quiz.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    await prisma.quiz.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'QUIZ_DELETED',
        details: JSON.stringify({ quizId: id, title: quiz.title }),
      },
    });

    return NextResponse.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete quiz' }, { status: 500 });
  }
}
