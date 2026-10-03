import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import { generateQuizExcelReport } from '@/lib/reports';
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

    const excelBuffer = await generateQuizExcelReport(id);

    const safeTitle = quiz.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeTitle}_Report_${quiz.publicCode}.xlsx`;

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'REPORT_DOWNLOADED',
        details: JSON.stringify({ quizId: id, type: 'EXCEL', filename }),
      },
    });

    return new NextResponse(excelBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Excel export error:', error);
    return NextResponse.json({ error: error.message || 'Export failed' }, { status: 500 });
  }
}
