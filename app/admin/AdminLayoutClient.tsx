'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ArrowLeft, ShieldCheck, LogOut } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  admin: {
    adminId: string;
    email: string;
    name: string;
    role: string;
  } | null;
}

export function AdminLayoutClient({ children, admin }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { success, error } = useToast();
  const isLoginPage = pathname === '/admin/login' || pathname === '/login';

  const [currentRole, setCurrentRole] = useState(admin?.role || '');
  const [adminEmail, setAdminEmail] = useState(admin?.email || '');
  const [adminName, setAdminName] = useState(admin?.name || '');

  const verifySession = useCallback(async () => {
    if (isLoginPage) return;

    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (!data.authenticated || !data.admin) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('admin_session_auth');
          window.location.replace('/admin/login');
        }
        return;
      }

      setCurrentRole(data.admin.role || 'ADMIN');
      setAdminEmail(data.admin.email || '');
      setAdminName(data.admin.name || '');

      // Strict role navigation guards
      if (data.admin.role === 'SUPER_ADMIN' && pathname === '/admin') {
        window.location.replace('/admin/users');
      } else if (data.admin.role === 'ADMIN' && pathname.startsWith('/admin/users')) {
        window.location.replace('/admin');
      }
    } catch {
      // Network error
    }
  }, [isLoginPage, pathname]);

  useEffect(() => {
    verifySession();

    // Security on browser back/forward buttons and page cache restores
    const handlePageShow = (e: PageTransitionEvent) => {
      verifySession();
    };

    const handlePopState = () => {
      verifySession();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [verifySession]);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('admin_session_auth');
      }
      if (res.ok) {
        success('Logged out successfully');
        window.location.replace('/admin/login');
      } else {
        window.location.replace('/admin/login');
      }
    } catch {
      window.location.replace('/admin/login');
    }
  };

  // On Login page: Do NOT render sidebar or any admin chrome
  if (isLoginPage) {
    return <>{children}</>;
  }

  const isMasterAdmin = currentRole === 'SUPER_ADMIN' || admin?.role === 'SUPER_ADMIN';

  // For Master Admin: NO SIDEBAR
  if (isMasterAdmin) {
    const isMainMasterPage = pathname === '/admin/users';

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* If Master Admin navigates to any subpage (like quiz responses), provide persistent top bar with Back to Master Admin Dashboard */}
        {!isMainMasterPage && (
          <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/users"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-md shadow-purple-600/30"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Back to Master Admin Dashboard</span>
              </Link>
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                <span>•</span>
                <span className="text-purple-300 font-semibold">Master Admin Inspection Mode</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-slate-400 font-mono">
                {adminEmail || 'azar.admin@gmail.com'}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-white px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-600 transition border border-rose-500/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </header>
        )}

        <main className="flex-1 w-full overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  // For Standard User Admin: Regular layout with sidebar
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <AdminSidebar
        adminEmail={adminEmail || ''}
        adminName={adminName || 'Administrator'}
        adminRole={currentRole || 'ADMIN'}
      />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
