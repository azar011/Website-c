import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, studentId } = await params;

  try {
    const student = await prisma.batchStudent.findUnique({
      where: { id: studentId },
      include: { batch: { select: { adminId: true } } },
    });

    if (!student || student.batchId !== id || (admin.role !== 'SUPER_ADMIN' && student.batch.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Student not found in batch' }, { status: 404 });
    }

    const body = await req.json();
    const { name, registerNumber, email } = body;

    const updated = await prisma.batchStudent.update({
      where: { id: studentId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        registerNumber: registerNumber !== undefined ? registerNumber.trim() : undefined,
        email: email !== undefined ? (email ? email.trim() : null) : undefined,
      },
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error: any) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, studentId } = await params;

  try {
    const student = await prisma.batchStudent.findUnique({
      where: { id: studentId },
      include: { batch: { select: { adminId: true } } },
    });

    if (!student || student.batchId !== id || (admin.role !== 'SUPER_ADMIN' && student.batch.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Student not found in batch' }, { status: 404 });
    }

    await prisma.batchStudent.delete({ where: { id: studentId } });

    return NextResponse.json({ success: true, message: 'Student removed from batch' });
  } catch (error: any) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove student' }, { status: 500 });
  }
}

