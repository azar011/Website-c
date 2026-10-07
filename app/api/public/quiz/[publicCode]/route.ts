import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicCode: string }> }
) {
  const { publicCode } = await params;

  if (!publicCode) {
    return NextResponse.json({ error: 'Quiz code is required' }, { status: 400 });
  }

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { publicCode: publicCode.toUpperCase().trim() },
      include: {
        settings: true,
        questions: {
          select: {
            id: true,
            marks: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found. Please verify the quiz link or code.' }, { status: 404 });
    }

    // Check status & link disabled
    if (quiz.status === 'ARCHIVED') {
      return NextResponse.json({ error: 'This quiz is archived and no longer available.' }, { status: 410 });
    }

    if (quiz.settings?.isLinkDisabled) {
      return NextResponse.json({ error: 'This quiz link is currently disabled by the administrator.' }, { status: 403 });
    }

    const now = new Date();

    // Check Schedule
    if (quiz.startDate && now < new Date(quiz.startDate)) {
      return NextResponse.json(
        {
          error: 'This quiz has not started yet.',
          scheduleInfo: { startDate: quiz.startDate, endDate: quiz.endDate },
        },
        { status: 403 }
      );
    }

    if (quiz.endDate && now > new Date(quiz.endDate)) {
      return NextResponse.json(
        {
          error: 'This quiz has ended and is no longer accepting responses.',
          scheduleInfo: { startDate: quiz.startDate, endDate: quiz.endDate },
        },
        { status: 403 }
      );
    }

    if (quiz.status === 'CLOSED' || quiz.settings?.acceptResponses === false) {
      return NextResponse.json(
        { error: 'This quiz is no longer accepting responses.' },
        { status: 403 }
      );
    }

    if (quiz.status === 'DRAFT') {
      return NextResponse.json(
        { error: 'This quiz is currently in draft mode and not published yet.' },
        { status: 403 }
      );
    }

    const totalQuestions = quiz.questions.length;
    const totalMarks = quiz.questions.reduce((acc, q) => acc + q.marks, 0);

    // Return safe public metadata
    return NextResponse.json({
      publicQuiz: {
        title: quiz.title,
        description: quiz.description,
        instructions: quiz.instructions,
        subject: quiz.subject,
        department: quiz.department,
        targetClass: quiz.targetClass,
        durationMinutes: quiz.durationMinutes,
        passingPercentage: quiz.passingPercentage,
        totalQuestions,
        totalMarks: Math.round(totalMarks * 100) / 100,
        publicCode: quiz.publicCode,
        settings: {
          requireName: quiz.settings?.requireName ?? true,
          requireRegisterNumber: quiz.settings?.requireRegisterNumber ?? true,
          requireEmail: quiz.settings?.requireEmail ?? false,
          requireClass: quiz.settings?.requireClass ?? false,
          requireDepartment: quiz.settings?.requireDepartment ?? false,
          enableAntiCheat: quiz.settings?.enableAntiCheat ?? true,
          requireFullscreen: quiz.settings?.requireFullscreen ?? true,
          detectTabSwitch: quiz.settings?.detectTabSwitch ?? true,
          maxViolations: quiz.settings?.maxViolations ?? 3,
          disablePreviousQuestion: quiz.settings?.disablePreviousQuestion ?? false,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error loading quiz' }, { status: 500 });
  }
}
