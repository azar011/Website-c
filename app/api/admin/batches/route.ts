import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const where: any = {};
    if (admin.role !== 'SUPER_ADMIN') {
      where.adminId = admin.adminId;
    }

    const batches = await prisma.studentBatch.findMany({
      where,
      include: {
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ batches });
  } catch (error: any) {
    console.error('Fetch batches error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch batches' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, className, department, description, students } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Batch Name is required.' }, { status: 400 });
    }

    // Prepare students list if provided
    let studentsToCreate: Array<{ name: string; registerNumber: string; email?: string | null }> = [];
    if (Array.isArray(students) && students.length > 0) {
      const seenRegs = new Set<string>();
      for (const s of students) {
        const reg = s.registerNumber?.toString()?.trim();
        const sName = s.name?.toString()?.trim();
        if (reg && sName && !seenRegs.has(reg.toLowerCase())) {
          seenRegs.add(reg.toLowerCase());
          studentsToCreate.push({
            name: sName,
            registerNumber: reg,
            email: s.email?.toString()?.trim() || null,
          });
        }
      }
    }

    const batch = await prisma.studentBatch.create({
      data: {
        name: name.trim(),
        className: className?.trim() || null,
        department: department?.trim() || null,
        description: description?.trim() || null,
        adminId: admin.adminId,
        students: studentsToCreate.length > 0 ? {
          create: studentsToCreate,
        } : undefined,
      },
      include: {
        _count: {
          select: {
            students: true,
            quizzes: true,
          },
        },
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'BATCH_CREATED',
        details: JSON.stringify({ batchId: batch.id, name: batch.name, studentCount: studentsToCreate.length }),
      },
    });

    return NextResponse.json({ success: true, batch }, { status: 201 });
  } catch (error: any) {
    console.error('Create batch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create batch' }, { status: 500 });
  }
}

