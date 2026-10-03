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
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      questionText,
      description,
      type = 'MCQ',
      required = true,
      marks = 1.0,
      negativeMarks = 0.0,
      evaluationType = 'CASE_INSENSITIVE',
      keywords,
      explanation,
      imageUrl,
      videoUrl,
      subject,
      topic,
      difficulty = 'MEDIUM',
      options = [],
    } = body;

    if (!questionText || !questionText.trim()) {
      return NextResponse.json({ error: 'Question text is required' }, { status: 400 });
    }

    // Get current max orderIndex
    const lastQuestion = await prisma.question.findFirst({
      where: { quizId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const nextOrderIndex = lastQuestion ? lastQuestion.orderIndex + 1 : 0;

    const question = await prisma.question.create({
      data: {
        quizId,
        questionText: questionText.trim(),
        description: description?.trim() || null,
        type,
        required: Boolean(required),
        marks: parseFloat(marks) || 1.0,
        negativeMarks: parseFloat(negativeMarks) || 0.0,
        evaluationType: evaluationType || 'CASE_INSENSITIVE',
        keywords: keywords?.trim() || null,
        explanation: explanation?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
        orderIndex: nextOrderIndex,
        subject: subject?.trim() || quiz.subject || null,
        topic: topic?.trim() || null,
        difficulty: difficulty || 'MEDIUM',
        isQuestionBank: false,
        options: {
          create: options.map((opt: any, idx: number) => ({
            optionText: opt.optionText?.trim() || `Option ${idx + 1}`,
            isCorrect: Boolean(opt.isCorrect),
            matchTarget: opt.matchTarget?.trim() || null,
            orderIndex: idx,
          })),
        },
      },
      include: {
        options: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'QUESTION_ADDED',
        details: JSON.stringify({ quizId, questionId: question.id, type }),
      },
    });

    return NextResponse.json({ success: true, question }, { status: 201 });
  } catch (error: any) {
    console.error('Create question error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create question' }, { status: 500 });
  }
}
