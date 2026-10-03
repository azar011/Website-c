import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { scoreAttempt } from '@/lib/scoring';
import { checkRateLimit } from '@/lib/security';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attemptToken: string }> }
) {
  const { attemptToken } = await params;
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

  const rate = checkRateLimit(`submit_${ip}`, 20, 60000);
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 });
  }

  try {
    const attempt = await prisma.attempt.findUnique({
      where: { attemptToken },
      include: {
        quiz: {
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
          },
        },
        answers: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
    }

    if (attempt.status === 'SUBMITTED') {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        message: 'This quiz attempt was already submitted.',
        attemptId: attempt.id,
      });
    }

    if (attempt.status === 'TERMINATED') {
      return NextResponse.json(
        { error: 'This attempt was terminated due to policy violations.' },
        { status: 403 }
      );
    }

    // Run Server-Side Scoring Engine
    const scoring = scoreAttempt(
      attempt.quiz.questions,
      attempt.answers,
      attempt.quiz.passingPercentage
    );

    // Save evaluated answer scores
    await prisma.$transaction(
      scoring.answerResults.map((ar) =>
        prisma.responseAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId: attempt.id,
              questionId: ar.questionId,
            },
          },
          create: {
            attemptId: attempt.id,
            questionId: ar.questionId,
            isCorrect: ar.isCorrect,
            marksAwarded: ar.marksAwarded,
            negativeMarksApplied: ar.negativeMarksApplied,
          },
          update: {
            isCorrect: ar.isCorrect,
            marksAwarded: ar.marksAwarded,
            negativeMarksApplied: ar.negativeMarksApplied,
          },
        })
      )
    );

    // Mark attempt SUBMITTED
    const updatedAttempt = await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        totalScore: scoring.obtainedMarks,
        percentage: scoring.percentage,
        passed: scoring.passed,
        totalCorrect: scoring.totalCorrect,
        totalWrong: scoring.totalWrong,
        totalUnanswered: scoring.totalUnanswered,
        totalNegativeMarks: scoring.totalNegativeMarks,
      },
    });

    const settings = attempt.quiz.settings;

    // Filter results based on admin configured settings
    const resultPayload: any = {
      success: true,
      submittedAt: updatedAttempt.submittedAt,
      quizTitle: attempt.quiz.title,
    };

    if (settings?.showScoreOnSubmit) {
      resultPayload.score = updatedAttempt.totalScore;
      resultPayload.totalMarks = scoring.totalMarks;
      resultPayload.totalCorrect = updatedAttempt.totalCorrect;
      resultPayload.totalWrong = updatedAttempt.totalWrong;
      resultPayload.totalUnanswered = updatedAttempt.totalUnanswered;
    }

    if (settings?.showPercentageOnSubmit) {
      resultPayload.percentage = updatedAttempt.percentage;
    }

    if (settings?.showPassFailOnSubmit) {
      resultPayload.passed = updatedAttempt.passed;
      resultPayload.passingPercentage = attempt.quiz.passingPercentage;
    }

    return NextResponse.json({
      success: true,
      result: resultPayload,
    });
  } catch (error: any) {
    console.error('Submit attempt error:', error);
    return NextResponse.json({ error: error.message || 'Submission failed' }, { status: 500 });
  }
}
