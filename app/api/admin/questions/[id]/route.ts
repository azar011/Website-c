import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.question.findUnique({
      where: { id },
      include: { options: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      questionText,
      description,
      type,
      required,
      marks,
      negativeMarks,
      evaluationType,
      keywords,
      explanation,
      imageUrl,
      videoUrl,
      orderIndex,
      subject,
      topic,
      difficulty,
      isQuestionBank,
      options,
    } = body;

    // Update question base fields
    await prisma.question.update({
      where: { id },
      data: {
        questionText: questionText !== undefined ? questionText.trim() : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
        type: type !== undefined ? type : undefined,
        required: required !== undefined ? Boolean(required) : undefined,
        marks: marks !== undefined ? parseFloat(marks) : undefined,
        negativeMarks: negativeMarks !== undefined ? parseFloat(negativeMarks) : undefined,
        evaluationType: evaluationType !== undefined ? evaluationType : undefined,
        keywords: keywords !== undefined ? keywords?.trim() || null : undefined,
        explanation: explanation !== undefined ? explanation?.trim() || null : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl?.trim() || null : undefined,
        videoUrl: videoUrl !== undefined ? videoUrl?.trim() || null : undefined,
        orderIndex: orderIndex !== undefined ? parseInt(orderIndex) : undefined,
        subject: subject !== undefined ? subject?.trim() || null : undefined,
        topic: topic !== undefined ? topic?.trim() || null : undefined,
        difficulty: difficulty !== undefined ? difficulty : undefined,
        isQuestionBank: isQuestionBank !== undefined ? Boolean(isQuestionBank) : undefined,
      },
    });

    // Replace options if provided
    if (Array.isArray(options)) {
      await prisma.questionOption.deleteMany({ where: { questionId: id } });
      if (options.length > 0) {
        await prisma.questionOption.createMany({
          data: options.map((opt: any, idx: number) => ({
            questionId: id,
            optionText: opt.optionText?.trim() || `Option ${idx + 1}`,
            isCorrect: Boolean(opt.isCorrect),
            matchTarget: opt.matchTarget?.trim() || null,
            orderIndex: opt.orderIndex !== undefined ? opt.orderIndex : idx,
          })),
        });
      }
    }

    const updated = await prisma.question.findUnique({
      where: { id },
      include: {
        options: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return NextResponse.json({ success: true, question: updated });
  } catch (error: any) {
    console.error('Update question error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update question' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const question = await prisma.question.findUnique({ where: { id } });
    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    await prisma.question.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'QUESTION_DELETED',
        details: JSON.stringify({ questionId: id, quizId: question.quizId }),
      },
    });

    return NextResponse.json({ success: true, message: 'Question deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
