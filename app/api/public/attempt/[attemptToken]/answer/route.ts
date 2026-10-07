import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptToken: string }> }
) {
  const { attemptToken } = await params;

  try {
    const attempt = await prisma.attempt.findUnique({
      where: { attemptToken },
      include: {
        quiz: {
          include: {
            settings: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Invalid attempt session.' }, { status: 404 });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: `This attempt has already been ${attempt.status.toLowerCase()}.` },
        { status: 400 }
      );
    }

    const now = new Date();
    // 15 seconds grace period for network latency
    const expiryWithGrace = new Date(new Date(attempt.expiresAt).getTime() + 15000);

    if (now > expiryWithGrace) {
      return NextResponse.json(
        { error: 'Quiz time has expired. Please submit your attempt.', isExpired: true },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { questionId, selectedOptionIds, textAnswer, fileAnswerUrl, timeSpentSeconds = 0 } = body;

    if (!questionId) {
      return NextResponse.json({ error: 'Question ID is required.' }, { status: 400 });
    }

    // Linear mode enforcement: student cannot alter previous questions once advanced past them
    if (attempt.quiz?.settings?.disablePreviousQuestion && attempt.questionOrder) {
      try {
        const orderArr: string[] = JSON.parse(attempt.questionOrder);
        const currentTargetIdx = orderArr.indexOf(questionId);
        if (currentTargetIdx !== -1) {
          const existingAnswers = await prisma.responseAnswer.findMany({
            where: { attemptId: attempt.id },
            select: { questionId: true },
          });
          const hasLaterAnswers = existingAnswers.some((ans) => {
            const answeredIdx = orderArr.indexOf(ans.questionId);
            return answeredIdx > currentTargetIdx;
          });
          if (hasLaterAnswers) {
            return NextResponse.json(
              { error: 'Cannot modify previous questions in linear examination mode.' },
              { status: 403 }
            );
          }
        }
      } catch (e) {
        console.warn('Linear mode order validation warning:', e);
      }
    }

    // Convert selectedOptionIds to string if array/object
    let formattedSelectedIds: string | null = null;
    if (selectedOptionIds !== undefined && selectedOptionIds !== null) {
      formattedSelectedIds =
        typeof selectedOptionIds === 'string'
          ? selectedOptionIds
          : JSON.stringify(selectedOptionIds);
    }

    const savedAnswer = await prisma.responseAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId: attempt.id,
          questionId,
        },
      },
      create: {
        attemptId: attempt.id,
        questionId,
        selectedOptionIds: formattedSelectedIds,
        textAnswer: textAnswer !== undefined ? String(textAnswer) : null,
        fileAnswerUrl: fileAnswerUrl || null,
        timeSpentSeconds: parseInt(timeSpentSeconds) || 0,
        answeredAt: now,
      },
      update: {
        selectedOptionIds: formattedSelectedIds,
        textAnswer: textAnswer !== undefined ? String(textAnswer) : null,
        fileAnswerUrl: fileAnswerUrl || null,
        timeSpentSeconds: parseInt(timeSpentSeconds) || 0,
        answeredAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      savedAt: savedAnswer.answeredAt,
      questionId,
    });
  } catch (error: any) {
    console.error('Save answer error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save answer.' }, { status: 500 });
  }
}
