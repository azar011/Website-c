import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const batch = await prisma.studentBatch.findUnique({ where: { id } });
    if (!batch || (admin.role !== 'SUPER_ADMIN' && batch.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const body = await req.json();
    const { quizIds = [], restrictAccess = true } = body;

    if (!Array.isArray(quizIds)) {
      return NextResponse.json({ error: 'quizIds must be an array' }, { status: 400 });
    }

    // Replace assignments for this batch
    await prisma.quizBatch.deleteMany({ where: { batchId: id } });

    if (quizIds.length > 0) {
      await prisma.quizBatch.createMany({
        data: quizIds.map((qId: string) => ({
          batchId: id,
          quizId: qId,
        })),
        skipDuplicates: true,
      });

      // If restrictAccess is enabled, also activate restrictToBatch on those quizzes
      if (restrictAccess) {
        await prisma.quizSettings.updateMany({
          where: { quizId: { in: quizIds } },
          data: {
            restrictToBatch: true,
            singleResponse: true,
          },
        });
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'BATCH_QUIZZES_ASSIGNED',
        details: JSON.stringify({
          batchId: id,
          batchName: batch.name,
          assignedQuizCount: quizIds.length,
          restrictAccess,
        }),
      },
    });

    // Return updated assigned quizzes
    const updatedQuizzes = await prisma.quizBatch.findMany({
      where: { batchId: id },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            publicCode: true,
            status: true,
            durationMinutes: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Assigned ${quizIds.length} quizzes to "${batch.name}"`,
      quizzes: updatedQuizzes,
    });
  } catch (error: any) {
    console.error('Assign quizzes to batch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to assign quizzes' }, { status: 500 });
  }
}

