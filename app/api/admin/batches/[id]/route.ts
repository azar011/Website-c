import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const batch = await prisma.studentBatch.findUnique({
      where: { id },
      include: {
        students: {
          orderBy: { registerNumber: 'asc' },
        },
        quizzes: {
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
        },
        _count: {
          select: {
            students: true,
            quizzes: true,
          },
        },
      },
    });

    if (!batch || (admin.role !== 'SUPER_ADMIN' && batch.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json({ batch });
  } catch (error: any) {
    console.error('Fetch batch details error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch batch' }, { status: 500 });
  }
}

export async function PUT(
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
    const { name, className, department, description } = body;

    const updated = await prisma.studentBatch.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        className: className !== undefined ? className?.trim() || null : undefined,
        department: department !== undefined ? department?.trim() || null : undefined,
        description: description !== undefined ? description?.trim() || null : undefined,
      },
    });

    return NextResponse.json({ success: true, batch: updated });
  } catch (error: any) {
    console.error('Update batch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update batch' }, { status: 500 });
  }
}

export async function DELETE(
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

    await prisma.studentBatch.delete({ where: { id } });

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'BATCH_DELETED',
        details: JSON.stringify({ batchId: id, name: batch.name }),
      },
    });

    return NextResponse.json({ success: true, message: 'Batch deleted successfully' });
  } catch (error: any) {
    console.error('Delete batch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete batch' }, { status: 500 });
  }
}

