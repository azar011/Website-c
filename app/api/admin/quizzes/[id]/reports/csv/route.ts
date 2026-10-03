import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import { generateQuizCsvReport } from '@/lib/reports';
import prisma from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: { title: true, publicCode: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const csvContent = await generateQuizCsvReport(id);
    const safeTitle = quiz.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeTitle}_Responses_${quiz.publicCode}.csv`;

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'REPORT_DOWNLOADED',
        details: JSON.stringify({ quizId: id, type: 'CSV', filename }),
      },
    });

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
