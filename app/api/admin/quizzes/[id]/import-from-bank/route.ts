import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: quizId } = await params;

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || (admin.role !== 'SUPER_ADMIN' && quiz.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const { questionBankIds } = await req.json();
    if (!Array.isArray(questionBankIds) || questionBankIds.length === 0) {
      return NextResponse.json({ error: 'No question IDs provided' }, { status: 400 });
    }

    const bankWhere: any = {
      id: { in: questionBankIds },
      isQuestionBank: true,
    };
    if (admin.role !== 'SUPER_ADMIN') {
      bankWhere.OR = [
        { adminId: admin.adminId },
        { adminId: null },
      ];
    }

    const bankQuestions = await prisma.question.findMany({
      where: bankWhere,
      include: {
        options: true,
      },
    });

    // Get next order index
    const lastQuestion = await prisma.question.findFirst({
      where: { quizId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    let currentOrderIndex = lastQuestion ? lastQuestion.orderIndex + 1 : 0;

    const importedQuestions = [];

    for (const bq of bankQuestions) {
      const cloned = await prisma.question.create({
        data: {
          quizId,
          adminId: admin.adminId,
          questionText: bq.questionText,
          description: bq.description,
          type: bq.type,
          required: bq.required,
          marks: bq.marks,
          negativeMarks: bq.negativeMarks,
          evaluationType: bq.evaluationType,
          keywords: bq.keywords,
          explanation: bq.explanation,
          imageUrl: bq.imageUrl,
          videoUrl: bq.videoUrl,
          orderIndex: currentOrderIndex++,
          subject: bq.subject,
          topic: bq.topic,
          difficulty: bq.difficulty,
          isQuestionBank: false,
          options: {
            create: bq.options.map((opt) => ({
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              matchTarget: opt.matchTarget,
              orderIndex: opt.orderIndex,
            })),
          },
        },
        include: { options: true },
      });
      importedQuestions.push(cloned);
    }

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'IMPORTED_FROM_QUESTION_BANK',
        details: JSON.stringify({ quizId, count: importedQuestions.length }),
      },
    });

    return NextResponse.json({
      success: true,
      count: importedQuestions.length,
      questions: importedQuestions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
