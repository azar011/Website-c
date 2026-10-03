import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';
import { generatePublicCode } from '@/lib/security';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const original = await prisma.quiz.findUnique({
      where: { id },
      include: {
        settings: true,
        questions: {
          include: { options: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!original) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Unique public code
    let publicCode = generatePublicCode();
    let isUnique = false;
    while (!isUnique) {
      const existing = await prisma.quiz.findUnique({ where: { publicCode } });
      if (!existing) isUnique = true;
      else publicCode = generatePublicCode();
    }

    // Duplicate Quiz and its Settings
    const duplicatedQuiz = await prisma.quiz.create({
      data: {
        title: `${original.title} (Copy)`,
        description: original.description,
        instructions: original.instructions,
        subject: original.subject,
        category: original.category,
        targetClass: original.targetClass,
        department: original.department,
        durationMinutes: original.durationMinutes,
        passingPercentage: original.passingPercentage,
        status: 'DRAFT',
        publicCode,
        randomizeQuestions: original.randomizeQuestions,
        randomizeOptions: original.randomizeOptions,
        questionPoolSize: original.questionPoolSize,
        adminId: admin.adminId,
        settings: original.settings
          ? {
              create: {
                acceptResponses: original.settings.acceptResponses,
                singleResponse: original.settings.singleResponse,
                identificationMethod: original.settings.identificationMethod,
                maxAttempts: original.settings.maxAttempts,
                requireName: original.settings.requireName,
                requireRegisterNumber: original.settings.requireRegisterNumber,
                requireEmail: original.settings.requireEmail,
                requireClass: original.settings.requireClass,
                requireDepartment: original.settings.requireDepartment,
                enableAntiCheat: original.settings.enableAntiCheat,
                requireFullscreen: original.settings.requireFullscreen,
                detectTabSwitch: original.settings.detectTabSwitch,
                detectWindowBlur: original.settings.detectWindowBlur,
                detectCopy: original.settings.detectCopy,
                detectPaste: original.settings.detectPaste,
                detectPrint: original.settings.detectPrint,
                maxViolations: original.settings.maxViolations,
                violationAction: original.settings.violationAction,
                showScoreOnSubmit: original.settings.showScoreOnSubmit,
                showPercentageOnSubmit: original.settings.showPercentageOnSubmit,
                showPassFailOnSubmit: original.settings.showPassFailOnSubmit,
                showCorrectAnswers: original.settings.showCorrectAnswers,
                showWrongAnswers: original.settings.showWrongAnswers,
                showExplanation: original.settings.showExplanation,
                showAnswerReview: original.settings.showAnswerReview,
              },
            }
          : undefined,
      },
    });

    // Duplicate Questions & Options
    for (const q of original.questions) {
      await prisma.question.create({
        data: {
          quizId: duplicatedQuiz.id,
          questionText: q.questionText,
          description: q.description,
          type: q.type,
          required: q.required,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          evaluationType: q.evaluationType,
          keywords: q.keywords,
          explanation: q.explanation,
          imageUrl: q.imageUrl,
          videoUrl: q.videoUrl,
          orderIndex: q.orderIndex,
          subject: q.subject,
          topic: q.topic,
          difficulty: q.difficulty,
          options: {
            create: q.options.map((opt) => ({
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              matchTarget: opt.matchTarget,
              orderIndex: opt.orderIndex,
            })),
          },
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'QUIZ_DUPLICATED',
        details: JSON.stringify({ originalId: id, newId: duplicatedQuiz.id }),
      },
    });

    return NextResponse.json({ success: true, quiz: duplicatedQuiz });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to duplicate quiz' }, { status: 500 });
  }
}
