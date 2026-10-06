import React from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { getSessionAdmin } from '@/lib/auth';
import { AdminLayoutClient } from './AdminLayoutClient';

export const metadata = {
  title: 'Admin Portal | XamPlus Platform',
  description: 'Online Assessment Management Platform for Teachers and Administrators',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getSessionAdmin();

  return (
    <ToastProvider>
      <AdminLayoutClient admin={admin}>{children}</AdminLayoutClient>
    </ToastProvider>
  );
}
