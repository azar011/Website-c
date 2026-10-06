import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: quizId } = await params;
  const { searchParams } = new URL(req.url);

  const search = searchParams.get('search');
  const status = searchParams.get('status');
  const studentClass = searchParams.get('class');
  const department = searchParams.get('department');
  const minScore = searchParams.get('minScore');
  const maxScore = searchParams.get('maxScore');
  const hasViolations = searchParams.get('hasViolations');

  const whereClause: any = { quizId };

  if (status && status !== 'ALL') {
    whereClause.status = status;
  }

  if (studentClass && studentClass !== 'ALL') {
    whereClause.studentClass = studentClass;
  }

  if (department && department !== 'ALL') {
    whereClause.department = department;
  }

  if (minScore !== null && minScore !== undefined && minScore !== '') {
    whereClause.totalScore = { ...(whereClause.totalScore || {}), gte: parseFloat(minScore) };
  }

  if (maxScore !== null && maxScore !== undefined && maxScore !== '') {
    whereClause.totalScore = { ...(whereClause.totalScore || {}), lte: parseFloat(maxScore) };
  }

  if (hasViolations === 'true') {
    whereClause.violationCount = { gt: 0 };
  }

  if (search) {
    whereClause.OR = [
      { studentName: { contains: search } },
      { registerNumber: { contains: search } },
      { email: { contains: search } },
    ];
  }

  try {
    const [quiz, attempts, classes, departments] = await Promise.all([
      prisma.quiz.findUnique({
        where: { id: quizId },
        select: { id: true, title: true, publicCode: true, passingPercentage: true, adminId: true },
      }),
      prisma.attempt.findMany({
        where: whereClause,
        include: {
          _count: {
            select: { answers: true, violations: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.attempt.findMany({
        where: { quizId, studentClass: { not: null } },
        select: { studentClass: true },
        distinct: ['studentClass'],
      }),
      prisma.attempt.findMany({
        where: { quizId, department: { not: null } },
        select: { department: true },
        distinct: ['department'],
      }),
    ]);

    if (!quiz || (admin.role !== 'SUPER_ADMIN' && quiz.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    return NextResponse.json({
      quiz,
      attempts,
      filters: {
        classes: classes.map((c) => c.studentClass).filter(Boolean),
        departments: departments.map((d) => d.department).filter(Boolean),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
