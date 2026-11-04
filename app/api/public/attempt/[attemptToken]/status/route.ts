import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { shuffleArray } from '@/lib/security';

export async function GET(
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
      return NextResponse.json({ error: 'Attempt session not found' }, { status: 404 });
    }

    const quiz = attempt.quiz;
    const settings = quiz.settings;
    const now = new Date();

    // Check saved order
    let orderedQuestions = [...quiz.questions];
    if (attempt.questionOrder) {
      try {
        const savedOrder: string[] = JSON.parse(attempt.questionOrder);
        const map = new Map(quiz.questions.map((q) => [q.id, q]));
        const reconstructed = savedOrder.map((qid) => map.get(qid)).filter(Boolean) as typeof quiz.questions;
        if (reconstructed.length > 0) {
          orderedQuestions = reconstructed;
        }
      } catch {}
    }

    let optionOrderMapping: Record<string, string[]> = {};
    if (attempt.optionOrderMapping) {
      try {
        optionOrderMapping = JSON.parse(attempt.optionOrderMapping);
      } catch {}
    }

    // Build Safe Questions
    const safeQuestions = orderedQuestions.map((q, idx) => {
      const optionIds = optionOrderMapping[q.id] || q.options.map((o) => o.id);
      const sortedOptions = optionIds
        .map((id) => q.options.find((o) => o.id === id))
        .filter(Boolean)
        .map((opt) => ({
          id: opt!.id,
          optionText: opt!.optionText,
          matchTarget: opt!.matchTarget ? 'MATCH_PLACEHOLDER' : undefined,
        }));

      let matchingTargets: string[] = [];
      if (q.type === 'MATCHING') {
        matchingTargets = shuffleArray(
          q.options.map((o) => o.matchTarget).filter(Boolean) as string[]
        );
      }

      return {
        id: q.id,
        index: idx + 1,
        questionText: q.questionText,
        description: q.description,
        type: q.type,
        required: q.required,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        imageUrl: q.imageUrl,
        videoUrl: q.videoUrl,
        options: sortedOptions,
        matchingTargets: matchingTargets.length > 0 ? matchingTargets : undefined,
      };
    });

    // Saved Answers
    const savedAnswers: Record<string, any> = {};
    for (const ans of attempt.answers) {
      let opts: string[] = [];
      try {
        opts = JSON.parse(ans.selectedOptionIds || '[]');
      } catch {
        if (ans.selectedOptionIds) opts = [ans.selectedOptionIds];
      }
      savedAnswers[ans.questionId] = {
        selectedOptionIds: opts,
        textAnswer: ans.textAnswer || '',
      };
    }

    const expTime = new Date(attempt.expiresAt).getTime();
    const secondsRemaining = Math.max(0, Math.floor((expTime - now.getTime()) / 1000));

    return NextResponse.json({
      success: true,
      status: attempt.status,
      attemptToken: attempt.attemptToken,
      studentName: attempt.studentName,
      registerNumber: attempt.registerNumber,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      secondsRemaining,
      resumedAt: attempt.resumedAt,
      resumedCount: attempt.resumedCount,
      isResumed: (attempt.resumedCount || 0) > 0,
      quizTitle: quiz.title,
      instructions: quiz.instructions,
      savedAnswers,
      settings: {
        enableAntiCheat: settings?.enableAntiCheat ?? true,
        requireFullscreen: settings?.requireFullscreen ?? true,
        detectTabSwitch: settings?.detectTabSwitch ?? true,
        detectWindowBlur: settings?.detectWindowBlur ?? true,
        detectCopy: settings?.detectCopy ?? true,
        detectPaste: settings?.detectPaste ?? true,
        detectPrint: settings?.detectPrint ?? true,
        maxViolations: settings?.maxViolations ?? 3,
        violationAction: settings?.violationAction ?? 'AUTO_SUBMIT',
        disablePreviousQuestion: settings?.disablePreviousQuestion ?? false,
      },
      questions: safeQuestions,
    });
  } catch (error: any) {
    console.error('Fetch attempt status error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch status' }, { status: 500 });
  }
}

