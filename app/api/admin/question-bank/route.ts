import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const subject = searchParams.get('subject');
  const difficulty = searchParams.get('difficulty');
  const type = searchParams.get('type');

  const andConditions: any[] = [{ isQuestionBank: true }];

  if (admin.role !== 'SUPER_ADMIN') {
    andConditions.push({
      OR: [
        { adminId: admin.adminId },
        { adminId: null },
      ],
    });
  }

  if (search) {
    andConditions.push({
      OR: [
        { questionText: { contains: search, mode: 'insensitive' } },
        { topic: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  if (subject && subject !== 'ALL') {
    andConditions.push({ subject });
  }

  if (difficulty && difficulty !== 'ALL') {
    andConditions.push({ difficulty });
  }

  if (type && type !== 'ALL') {
    andConditions.push({ type });
  }

  const whereClause: any = { AND: andConditions };

  try {
    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        options: {
          orderBy: { orderIndex: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also get list of distinct subjects for filters
    const subjects = await prisma.question.findMany({
      where: whereClause,
      select: { subject: true },
      distinct: ['subject'],
    });

    return NextResponse.json({
      questions,
      subjects: subjects.map((s) => s.subject).filter(Boolean),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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
      subject,
      topic,
      difficulty = 'MEDIUM',
      options = [],
    } = body;

    if (!questionText || !questionText.trim()) {
      return NextResponse.json({ error: 'Question text is required' }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        adminId: admin.adminId,
        questionText: questionText.trim(),
        description: description?.trim() || null,
        type,
        required: Boolean(required),
        marks: parseFloat(marks) || 1.0,
        negativeMarks: parseFloat(negativeMarks) || 0.0,
        evaluationType,
        keywords: keywords?.trim() || null,
        explanation: explanation?.trim() || null,
        subject: subject?.trim() || 'General',
        topic: topic?.trim() || null,
        difficulty,
        isQuestionBank: true,
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
        options: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'QUESTION_BANK_ADDED',
        details: JSON.stringify({ questionId: question.id, subject, topic }),
      },
    });

    return NextResponse.json({ success: true, question }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
