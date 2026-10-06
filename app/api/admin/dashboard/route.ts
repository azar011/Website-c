import { NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const isSuperAdmin = admin.role === 'SUPER_ADMIN';
    const quizWhere: any = isSuperAdmin ? {} : { adminId: admin.adminId };
    const attemptWhere: any = isSuperAdmin ? {} : { quiz: { adminId: admin.adminId } };

    const [
      totalQuizzes,
      publishedQuizzes,
      draftQuizzes,
      closedQuizzes,
      allAttempts,
      recentQuizzes,
    ] = await Promise.all([
      prisma.quiz.count({ where: quizWhere }),
      prisma.quiz.count({ where: { ...quizWhere, status: 'PUBLISHED' } }),
      prisma.quiz.count({ where: { ...quizWhere, status: 'DRAFT' } }),
      prisma.quiz.count({ where: { ...quizWhere, status: 'CLOSED' } }),
      prisma.attempt.findMany({
        where: attemptWhere,
        select: {
          id: true,
          status: true,
          totalScore: true,
          percentage: true,
          passed: true,
          startedAt: true,
          submittedAt: true,
        },
      }),
      prisma.quiz.findMany({
        where: quizWhere,
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: { questions: true, attempts: true },
          },
        },
      }),
    ]);

    const completedAttempts = allAttempts.filter((a) => a.status === 'SUBMITTED');
    const totalParticipants = allAttempts.length;
    const totalResponses = completedAttempts.length;

    const scores = completedAttempts.map((a) => a.totalScore);
    const averageScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 0;

    const passedCount = completedAttempts.filter((a) => a.passed).length;
    const passPercentage =
      completedAttempts.length > 0
        ? Math.round((passedCount / completedAttempts.length) * 1000) / 10
        : 0;

    // Score distribution buckets
    const distributionBuckets = [
      { range: '0-20%', count: 0 },
      { range: '21-40%', count: 0 },
      { range: '41-60%', count: 0 },
      { range: '61-80%', count: 0 },
      { range: '81-100%', count: 0 },
    ];

    for (const att of completedAttempts) {
      const pct = att.percentage || 0;
      if (pct <= 20) distributionBuckets[0].count++;
      else if (pct <= 40) distributionBuckets[1].count++;
      else if (pct <= 60) distributionBuckets[2].count++;
      else if (pct <= 80) distributionBuckets[3].count++;
      else distributionBuckets[4].count++;
    }

    // Daily responses trend for last 7-14 days
    const dailyMap = new Map<string, number>();
    for (const att of allAttempts) {
      const dateStr = new Date(att.startedAt).toISOString().split('T')[0];
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + 1);
    }

    const dailyResponses = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      metrics: {
        totalQuizzes,
        publishedQuizzes,
        draftQuizzes,
        closedQuizzes,
        totalParticipants,
        totalResponses,
        averageScore,
        passPercentage,
      },
      scoreDistribution: distributionBuckets,
      dailyResponses,
      recentQuizzes,
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
