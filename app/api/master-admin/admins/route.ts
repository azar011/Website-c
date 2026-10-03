import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin, hashPassword } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  const session = await getSessionAdmin();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Master Admin privileges required' }, { status: 403 });
  }

  try {
    const [admins, auditLogs, totalQuizzes, totalAttempts] = await Promise.all([
      prisma.admin.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              quizzes: true,
            },
          },
          quizzes: {
            select: {
              _count: {
                select: {
                  attempts: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.auditLog.findMany({
        take: 30,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.quiz.count(),
      prisma.attempt.count(),
    ]);

    const formattedAdmins = admins.map((a) => {
      const attemptsCount = a.quizzes.reduce((sum, q) => sum + (q._count.attempts || 0), 0);
      return {
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        quizzesCount: a._count.quizzes,
        attemptsCount,
        isCurrentSession: a.id === session.adminId,
      };
    });

    return NextResponse.json({
      success: true,
      currentAdmin: session,
      stats: {
        totalAdmins: admins.length,
        totalQuizzes,
        totalAttempts,
      },
      admins: formattedAdmins,
      auditLogs,
    });
  } catch (error: any) {
    console.error('Master admin fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch admin users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionAdmin();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Master Admin privileges required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Administrator Name is required' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Administrator Email is required' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = await prisma.admin.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json({ error: 'An administrator with this email already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const newAdmin = await prisma.admin.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        adminId: session.adminId,
        action: 'ADMIN_CREATED',
        details: JSON.stringify({
          createdAdminId: newAdmin.id,
          createdAdminEmail: newAdmin.email,
          createdAdminRole: newAdmin.role,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'New administrator created successfully',
      admin: newAdmin,
    });
  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create admin' }, { status: 500 });
  }
}
