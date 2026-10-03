import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';
import { generatePublicCode } from '@/lib/security';

export async function GET(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');

  const whereClause: any = {};
  if (status && status !== 'ALL') {
    whereClause.status = status;
  }
  if (search) {
    whereClause.OR = [
      { title: { contains: search } },
      { subject: { contains: search } },
      { publicCode: { contains: search } },
    ];
  }

  try {
    const quizzes = await prisma.quiz.findMany({
      where: whereClause,
      include: {
        settings: true,
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ quizzes });
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
      title,
      description,
      instructions,
      subject,
      category,
      targetClass,
      department,
      durationMinutes,
      passingPercentage,
      startDate,
      endDate,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Quiz title is required' }, { status: 400 });
    }

    // Ensure unique publicCode
    let publicCode = generatePublicCode();
    let isUnique = false;
    while (!isUnique) {
      const existing = await prisma.quiz.findUnique({ where: { publicCode } });
      if (!existing) isUnique = true;
      else publicCode = generatePublicCode();
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        instructions: instructions?.trim() || null,
        subject: subject?.trim() || null,
        category: category?.trim() || null,
        targetClass: targetClass?.trim() || null,
        department: department?.trim() || null,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : 30,
        passingPercentage: passingPercentage ? parseFloat(passingPercentage) : 40.0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'DRAFT',
        publicCode,
        adminId: admin.adminId,
        settings: {
          create: {
            acceptResponses: true,
            singleResponse: false,
            identificationMethod: 'REGISTER_NUMBER',
            maxAttempts: 1,
            requireName: true,
            requireRegisterNumber: true,
            requireEmail: false,
            requireClass: false,
            requireDepartment: false,
            enableAntiCheat: true,
            requireFullscreen: true,
            detectTabSwitch: true,
            detectWindowBlur: true,
            detectCopy: true,
            detectPaste: true,
            detectPrint: true,
            maxViolations: 3,
            violationAction: 'AUTO_SUBMIT',
            showScoreOnSubmit: true,
            showPercentageOnSubmit: true,
            showPassFailOnSubmit: true,
            showCorrectAnswers: false,
            showWrongAnswers: true,
            showExplanation: false,
            showAnswerReview: false,
          },
        },
      },
      include: {
        settings: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'QUIZ_CREATED',
        details: JSON.stringify({ quizId: quiz.id, title: quiz.title, publicCode }),
      },
    });

    return NextResponse.json({ success: true, quiz }, { status: 201 });
  } catch (error: any) {
    console.error('Create quiz error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create quiz' }, { status: 500 });
  }
}
