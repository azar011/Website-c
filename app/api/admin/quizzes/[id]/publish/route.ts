import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Empty or non-JSON body allowed
  }
  const { accessMode, batchIds } = body;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        settings: true,
        batches: true,
        questions: {
          include: { options: true },
        },
      },
    });

    if (!quiz || (admin.role !== 'SUPER_ADMIN' && quiz.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Determine access mode (PUBLIC vs BATCHES)
    const effectiveRestrictToBatch =
      accessMode !== undefined
        ? accessMode === 'BATCHES'
        : (quiz.settings?.restrictToBatch ?? false);

    // Sync assigned batches only if explicitly passed when in BATCHES mode.
    // If publishing in PUBLIC mode, preserve existing assigned batches so historical batch reports and rosters remain intact.
    if (accessMode === 'BATCHES' && Array.isArray(batchIds)) {
      await prisma.quizBatch.deleteMany({ where: { quizId: id } });
      if (batchIds.length > 0) {
        await prisma.quizBatch.createMany({
          data: batchIds.map((bId: string) => ({
            quizId: id,
            batchId: bId,
          })),
        });
      }
    }

    const currentBatchCount =
      accessMode === 'BATCHES' && Array.isArray(batchIds)
        ? batchIds.length
        : await prisma.quizBatch.count({ where: { quizId: id } });

    // Publish Validation
    const errors: string[] = [];

    if (!quiz.title || quiz.title.trim().length === 0) {
      errors.push('Quiz title is missing.');
    }

    if (quiz.questions.length === 0) {
      errors.push('Quiz must contain at least one question before publishing.');
    }

    if (effectiveRestrictToBatch && currentBatchCount === 0) {
      errors.push(
        'You selected "Batches Only" access, but no student batches are assigned. Please select at least one batch or publish as a Public Quiz.'
      );
    }

    let questionsWithoutCorrectAnswer = 0;
    for (const q of quiz.questions) {
      if (['MCQ', 'MULTIPLE_SELECT', 'TRUE_FALSE'].includes(q.type)) {
        const hasCorrect = q.options.some((opt) => opt.isCorrect);
        if (!hasCorrect) {
          questionsWithoutCorrectAnswer++;
        }
      }
    }

    if (questionsWithoutCorrectAnswer > 0) {
      errors.push(
        `${questionsWithoutCorrectAnswer} question(s) are missing a marked correct answer.`
      );
    }

    if (quiz.durationMinutes <= 0) {
      errors.push('Quiz duration must be greater than 0 minutes.');
    }

    if (quiz.passingPercentage < 0 || quiz.passingPercentage > 100) {
      errors.push('Passing percentage must be between 0% and 100%.');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot publish quiz due to validation errors.',
          validationErrors: errors,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.quiz.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
      },
      include: { settings: true },
    });

    if (quiz.settings) {
      await prisma.quizSettings.update({
        where: { quizId: id },
        data: {
          acceptResponses: true,
          isLinkDisabled: false,
          restrictToBatch: effectiveRestrictToBatch,
          singleResponse: effectiveRestrictToBatch ? true : quiz.settings.singleResponse,
          requireRegisterNumber: effectiveRestrictToBatch ? true : quiz.settings.requireRegisterNumber,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: quiz.status === 'CLOSED' ? 'QUIZ_REPUBLISHED' : 'QUIZ_PUBLISHED',
        details: JSON.stringify({ quizId: id, title: updated.title, publicCode: updated.publicCode }),
      },
    });

    return NextResponse.json({
      success: true,
      quiz: updated,
      message: quiz.status === 'CLOSED' ? 'Quiz re-published successfully!' : 'Quiz published successfully!',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to publish quiz' }, { status: 500 });
  }
}
