import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { scoreAttempt } from '@/lib/scoring';

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
            questions: {
              include: { options: true },
            },
          },
        },
        answers: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return NextResponse.json({ status: attempt.status, message: 'Attempt is no longer active.' });
    }

    const body = await req.json();
    const { violationType, durationSeconds = 0, metadata } = body;

    const validTypes = [
      'TAB_SWITCH',
      'WINDOW_BLUR',
      'FULLSCREEN_EXIT',
      'COPY_ATTEMPT',
      'PASTE_ATTEMPT',
      'PRINT_ATTEMPT',
      'MULTIPLE_SESSION',
    ];

    const typeToLog = validTypes.includes(violationType) ? violationType : 'TAB_SWITCH';

    // Create Violation Record
    await prisma.violationLog.create({
      data: {
        attemptId: attempt.id,
        quizId: attempt.quizId,
        violationType: typeToLog,
        durationSeconds: parseInt(durationSeconds) || 0,
        metadata: typeof metadata === 'object' ? JSON.stringify(metadata) : metadata || null,
      },
    });

    const newViolationCount = attempt.violationCount + 1;
    const settings = attempt.quiz.settings;
    const maxViolations = settings?.maxViolations ?? 3;
    const violationAction = settings?.violationAction || 'AUTO_SUBMIT';

    if (settings?.enableAntiCheat && newViolationCount >= maxViolations) {
      if (violationAction === 'AUTO_SUBMIT') {
        // Auto-score and submit
        const scoring = scoreAttempt(
          attempt.quiz.questions,
          attempt.answers,
          attempt.quiz.passingPercentage
        );

        await prisma.attempt.update({
          where: { id: attempt.id },
          data: {
            violationCount: newViolationCount,
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

        return NextResponse.json({
          action: 'AUTO_SUBMIT',
          violationCount: newViolationCount,
          maxViolations,
          message: `Maximum security violations limit (${maxViolations}) exceeded. Your quiz has been auto-submitted.`,
        });
      } else if (violationAction === 'TERMINATE') {
        await prisma.attempt.update({
          where: { id: attempt.id },
          data: {
            violationCount: newViolationCount,
            status: 'TERMINATED',
            submittedAt: new Date(),
          },
        });

        return NextResponse.json({
          action: 'TERMINATE',
          violationCount: newViolationCount,
          maxViolations,
          message: `Quiz session terminated due to excessive security violations (${newViolationCount}/${maxViolations}).`,
        });
      }
    }

    // Default: update count and issue warning
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        violationCount: newViolationCount,
      },
    });

    return NextResponse.json({
      action: 'WARNING',
      violationCount: newViolationCount,
      maxViolations,
      message: `Security Warning: ${typeToLog.replace('_', ' ')} detected (${newViolationCount}/${maxViolations}).`,
    });
  } catch (error: any) {
    console.error('Violation record error:', error);
    return NextResponse.json({ error: error.message || 'Failed to log violation' }, { status: 500 });
  }
}
