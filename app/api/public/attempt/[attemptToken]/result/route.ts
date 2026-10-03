import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

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
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    const settings = attempt.quiz.settings;
    const totalPossibleMarks = attempt.quiz.questions.reduce((acc, q) => acc + q.marks, 0);

    const resultData: any = {
      quizTitle: attempt.quiz.title,
      studentName: attempt.studentName,
      registerNumber: attempt.registerNumber,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      settings: {
        showScoreOnSubmit: settings?.showScoreOnSubmit ?? true,
        showPercentageOnSubmit: settings?.showPercentageOnSubmit ?? true,
        showPassFailOnSubmit: settings?.showPassFailOnSubmit ?? true,
        showAnswerReview: settings?.showAnswerReview ?? false,
      },
    };

    if (settings?.showScoreOnSubmit) {
      resultData.totalScore = attempt.totalScore;
      resultData.totalPossibleMarks = Math.round(totalPossibleMarks * 100) / 100;
      resultData.totalCorrect = attempt.totalCorrect;
      resultData.totalWrong = attempt.totalWrong;
      resultData.totalUnanswered = attempt.totalUnanswered;
      resultData.totalNegativeMarks = attempt.totalNegativeMarks;
    }

    if (settings?.showPercentageOnSubmit) {
      resultData.percentage = attempt.percentage;
    }

    if (settings?.showPassFailOnSubmit) {
      resultData.passed = attempt.passed;
      resultData.passingPercentage = attempt.quiz.passingPercentage;
    }

    // Answer Review if enabled by admin
    if (settings?.showAnswerReview) {
      const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

      resultData.review = attempt.quiz.questions.map((q, idx) => {
        const studentAns = answerMap.get(q.id);

        let correctOptions = undefined;
        let explanation = undefined;

        if (settings.showCorrectAnswers) {
          correctOptions = q.options.filter((o) => o.isCorrect).map((o) => o.optionText);
        }

        if (settings.showExplanation) {
          explanation = q.explanation;
        }

        return {
          questionIndex: idx + 1,
          questionText: q.questionText,
          type: q.type,
          marks: q.marks,
          marksAwarded: studentAns?.marksAwarded ?? 0,
          isCorrect: studentAns?.isCorrect ?? false,
          studentAnswer: studentAns?.textAnswer || studentAns?.selectedOptionIds || '(No response)',
          correctAnswer: correctOptions,
          explanation,
        };
      });
    }

    return NextResponse.json({ result: resultData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
