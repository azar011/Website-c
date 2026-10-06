import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { questionIds } = await req.json();

    if (!Array.isArray(questionIds)) {
      return NextResponse.json({ error: 'questionIds must be an array' }, { status: 400 });
    }

    if (admin.role !== 'SUPER_ADMIN') {
      const forbiddenQuestions = await prisma.question.findMany({
        where: {
          id: { in: questionIds },
          OR: [
            { quiz: { adminId: { not: admin.adminId } } },
            { quizId: null, adminId: { not: admin.adminId } },
          ],
        },
        select: { id: true },
      });
      if (forbiddenQuestions.length > 0) {
        return NextResponse.json({ error: 'Unauthorized to modify these questions' }, { status: 403 });
      }
    }

    // Update orderIndex in transaction
    await prisma.$transaction(
      questionIds.map((id: string, index: number) =>
        prisma.question.update({
          where: { id },
          data: { orderIndex: index },
        })
      )
    );

    return NextResponse.json({ success: true, message: 'Questions reordered successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
