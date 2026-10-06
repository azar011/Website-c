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
    const quiz = await prisma.quiz.findUnique({ where: { id } });
    if (!quiz || (admin.role !== 'SUPER_ADMIN' && quiz.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    let publicCode = generatePublicCode();
    let isUnique = false;
    while (!isUnique) {
      const existing = await prisma.quiz.findUnique({ where: { publicCode } });
      if (!existing) isUnique = true;
      else publicCode = generatePublicCode();
    }

    const updated = await prisma.quiz.update({
      where: { id },
      data: { publicCode },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'QUIZ_LINK_REGENERATED',
        details: JSON.stringify({ quizId: id, oldCode: quiz.publicCode, newCode: publicCode }),
      },
    });

    return NextResponse.json({ success: true, publicCode, quiz: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
