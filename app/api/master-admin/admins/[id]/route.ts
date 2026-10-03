import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin, hashPassword } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionAdmin();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Master Admin privileges required' }, { status: 403 });
  }

  const { id: targetAdminId } = await params;

  try {
    const admin = await prisma.admin.findUnique({
      where: { id: targetAdminId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        quizzes: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            publicCode: true,
            subject: true,
            category: true,
            department: true,
            targetClass: true,
            durationMinutes: true,
            passingPercentage: true,
            status: true,
            createdAt: true,
            _count: {
              select: {
                questions: true,
                attempts: true,
              },
            },
            attempts: {
              select: {
                id: true,
                totalScore: true,
                percentage: true,
                passed: true,
                violationCount: true,
                status: true,
              },
            },
          },
        },
        auditLogs: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            action: true,
            details: true,
            ipAddress: true,
            createdAt: true,
          },
        },
      },
    });

    if (!admin) {
      return NextResponse.json({ error: 'Administrator not found' }, { status: 404 });
    }

    // Aggregate statistics across quizzes conducted by this admin
    const totalQuizzes = admin.quizzes.length;
    let totalAttempts = 0;
    let totalPassed = 0;
    let totalScoreSum = 0;
    let attemptsCountForAvg = 0;
    let totalViolations = 0;

    const formattedQuizzes = admin.quizzes.map((q) => {
      const attemptsCount = q._count.attempts;
      totalAttempts += attemptsCount;

      const completed = q.attempts.filter((a) => a.status === 'SUBMITTED');
      const passedInQuiz = completed.filter((a) => a.passed).length;
      totalPassed += passedInQuiz;

      const violationsInQuiz = q.attempts.reduce((sum, a) => sum + a.violationCount, 0);
      totalViolations += violationsInQuiz;

      const quizAvgScore =
        completed.length > 0
          ? (completed.reduce((sum, a) => sum + a.totalScore, 0) / completed.length).toFixed(1)
          : '0';

      completed.forEach((a) => {
        totalScoreSum += a.totalScore;
        attemptsCountForAvg++;
      });

      return {
        id: q.id,
        title: q.title,
        publicCode: q.publicCode,
        subject: q.subject,
        department: q.department,
        targetClass: q.targetClass,
        durationMinutes: q.durationMinutes,
        passingPercentage: q.passingPercentage,
        status: q.status,
        createdAt: q.createdAt,
        totalQuestions: q._count.questions,
        totalAttempts: attemptsCount,
        completedSubmissions: completed.length,
        passedSubmissions: passedInQuiz,
        passRate: completed.length > 0 ? `${Math.round((passedInQuiz / completed.length) * 100)}%` : '0%',
        avgScore: quizAvgScore,
        violationsCount: violationsInQuiz,
      };
    });

    const overallPassRate =
      totalAttempts > 0 ? `${Math.round((totalPassed / totalAttempts) * 100)}%` : '0%';

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      },
      stats: {
        totalQuizzes,
        totalAttempts,
        totalPassed,
        overallPassRate,
        totalViolations,
      },
      quizzes: formattedQuizzes,
      auditLogs: admin.auditLogs,
    });
  } catch (error: any) {
    console.error('Fetch admin details error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch administrator details' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionAdmin();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Master Admin privileges required' }, { status: 403 });
  }

  const { id: targetAdminId } = await params;

  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    const existing = await prisma.admin.findUnique({
      where: { id: targetAdminId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Administrator not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    if (email && email.trim() && email.trim().toLowerCase() !== existing.email) {
      const cleanEmail = email.trim().toLowerCase();
      const duplicate = await prisma.admin.findUnique({
        where: { email: cleanEmail },
      });
      if (duplicate && duplicate.id !== targetAdminId) {
        return NextResponse.json({ error: 'Email is already in use by another admin' }, { status: 400 });
      }
      updateData.email = cleanEmail;
    }

    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
      }
      updateData.passwordHash = await hashPassword(password);
    }

    if (role && ['ADMIN', 'SUPER_ADMIN'].includes(role)) {
      updateData.role = role;
    }

    const updated = await prisma.admin.update({
      where: { id: targetAdminId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: session.adminId,
        action: 'ADMIN_UPDATED',
        details: JSON.stringify({
          targetAdminId,
          updatedFields: Object.keys(updateData).filter((k) => k !== 'passwordHash'),
          passwordChanged: !!password,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Administrator updated successfully',
      admin: updated,
    });
  } catch (error: any) {
    console.error('Update admin error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update administrator' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionAdmin();
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized: Master Admin privileges required' }, { status: 403 });
  }

  const { id: targetAdminId } = await params;

  try {
    const totalAdmins = await prisma.admin.count();
    if (totalAdmins <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only remaining administrator account' },
        { status: 400 }
      );
    }

    const targetAdmin = await prisma.admin.findUnique({
      where: { id: targetAdminId },
      include: {
        _count: {
          select: { quizzes: true },
        },
      },
    });

    if (!targetAdmin) {
      return NextResponse.json({ error: 'Administrator not found' }, { status: 404 });
    }

    // Delete the admin
    await prisma.admin.delete({
      where: { id: targetAdminId },
    });

    await prisma.auditLog.create({
      data: {
        adminId: session.adminId,
        action: 'ADMIN_DELETED',
        details: JSON.stringify({
          deletedAdminId: targetAdminId,
          deletedAdminEmail: targetAdmin.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Administrator ${targetAdmin.name} (${targetAdmin.email}) deleted successfully`,
    });
  } catch (error: any) {
    console.error('Delete admin error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete administrator' }, { status: 500 });
  }
}
