import { NextResponse } from 'next/server';
import { clearAdminSessionCookie, getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST() {
  try {
    const admin = await getSessionAdmin();
    if (admin) {
      await prisma.auditLog.create({
        data: {
          adminId: admin.adminId,
          action: 'ADMIN_LOGOUT',
          details: JSON.stringify({ email: admin.email }),
        },
      });
    }
    await clearAdminSessionCookie();
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Logout failed' }, { status: 500 });
  }
}
