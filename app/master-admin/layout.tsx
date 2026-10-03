import React from 'react';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata = {
  title: 'Master Admin Portal',
  description: 'Manage administrator accounts, roles, and administrative audit trails.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MasterAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
