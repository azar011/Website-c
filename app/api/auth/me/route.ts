import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin, hashPassword, verifyPassword, signAdminToken, setAdminSessionCookie } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ authenticated: false, admin: null }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, admin });
}

export async function PUT(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, currentPassword, newPassword } = body;

    const currentAdminRecord = await prisma.admin.findUnique({
      where: { id: admin.adminId },
    });

    if (!currentAdminRecord) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 });
    }

    const updateData: any = {};

    // 1. Update Name
    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    // 2. Update Email
    if (email && email.trim() && email.trim().toLowerCase() !== currentAdminRecord.email) {
      const cleanEmail = email.trim().toLowerCase();
      const existing = await prisma.admin.findUnique({
        where: { email: cleanEmail },
      });
      if (existing && existing.id !== admin.adminId) {
        return NextResponse.json({ error: 'This email address is already in use' }, { status: 400 });
      }
      updateData.email = cleanEmail;
    }

    // 3. Update Password if requested
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to set a new password' },
          { status: 400 }
        );
      }

      const isMatch = await verifyPassword(currentPassword, currentAdminRecord.passwordHash);
      if (!isMatch) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'New password must be at least 6 characters long' },
          { status: 400 }
        );
      }

      updateData.passwordHash = await hashPassword(newPassword);
    }

    const updatedAdmin = await prisma.admin.update({
      where: { id: admin.adminId },
      data: updateData,
    });

    // Re-sign session token with updated info
    const newToken = await signAdminToken({
      adminId: updatedAdmin.id,
      email: updatedAdmin.email,
      name: updatedAdmin.name,
      role: updatedAdmin.role,
    });
    await setAdminSessionCookie(newToken);

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: updatedAdmin.id,
        action: 'ADMIN_PROFILE_UPDATED',
        details: JSON.stringify({
          updatedFields: Object.keys(updateData).filter((k) => k !== 'passwordHash'),
          passwordChanged: !!newPassword,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Administrator details updated successfully',
      admin: {
        adminId: updatedAdmin.id,
        email: updatedAdmin.email,
        name: updatedAdmin.name,
        role: updatedAdmin.role,
      },
    });
  } catch (error: any) {
    console.error('Update admin profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
