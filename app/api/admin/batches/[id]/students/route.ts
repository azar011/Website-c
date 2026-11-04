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
    const batch = await prisma.studentBatch.findUnique({
      where: { id },
      include: { students: { select: { registerNumber: true } } },
    });

    if (!batch || (admin.role !== 'SUPER_ADMIN' && batch.adminId !== admin.adminId)) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const body = await req.json();
    const studentsInput = Array.isArray(body.students) ? body.students : [body];

    const existingRegs = new Set(batch.students.map((s) => s.registerNumber.toLowerCase().trim()));
    const toInsert: Array<{ batchId: string; name: string; registerNumber: string; email?: string | null }> = [];
    let duplicates = 0;

    for (const item of studentsInput) {
      const reg = item.registerNumber?.toString()?.trim();
      const sName = item.name?.toString()?.trim();
      if (!reg || !sName) continue;

      if (existingRegs.has(reg.toLowerCase())) {
        duplicates++;
        continue;
      }

      existingRegs.add(reg.toLowerCase());
      toInsert.push({
        batchId: id,
        name: sName,
        registerNumber: reg,
        email: item.email?.toString()?.trim() || null,
      });
    }

    if (toInsert.length > 0) {
      await prisma.batchStudent.createMany({
        data: toInsert,
        skipDuplicates: true,
      });
    }

    const allStudents = await prisma.batchStudent.findMany({
      where: { batchId: id },
      orderBy: { registerNumber: 'asc' },
    });

    return NextResponse.json({
      success: true,
      addedCount: toInsert.length,
      duplicateCount: duplicates,
      students: allStudents,
    });
  } catch (error: any) {
    console.error('Add students error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add students' }, { status: 500 });
  }
}

