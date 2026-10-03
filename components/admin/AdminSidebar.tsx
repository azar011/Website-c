'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileQuestion,
  Database,
  BarChart3,
  FileSpreadsheet,
  Settings,
  LogOut,
  Sparkles,
  PlusCircle,
  ExternalLink,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface AdminSidebarProps {
  adminEmail?: string;
  adminName?: string;
  adminRole?: string;
}

export function AdminSidebar({
  adminEmail: initialEmail = '',
  adminName: initialName = '',
  adminRole: initialRole = '',
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { success, error } = useToast();

  const [adminEmail, setAdminEmail] = React.useState(initialEmail);
  const [adminName, setAdminName] = React.useState(initialName || 'Administrator');
  const [adminRole, setAdminRole] = React.useState(initialRole || '');

  React.useEffect(() => {
    if (initialEmail) setAdminEmail(initialEmail);
    if (initialName) setAdminName(initialName);
    if (initialRole) setAdminRole(initialRole);

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.admin) {
          setAdminEmail(data.admin.email || '');
          setAdminName(data.admin.name || 'Administrator');
          setAdminRole(data.admin.role || 'ADMIN');
        }
      })
      .catch(() => {});
  }, [initialEmail, initialName, initialRole]);

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        success('Logged out successfully');
        router.push('/admin/login');
        router.refresh();
      } else {
        error('Failed to logout');
      }
    } catch {
      error('An error occurred during logout');
    }
  };

  const isSuperAdmin = adminRole === 'SUPER_ADMIN';

  const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
    { label: 'Quizzes', href: '/admin/quizzes', icon: FileQuestion },
    { label: 'Question Bank', href: '/admin/questions', icon: Database },
    { label: 'Reports Center', href: '/admin/reports', icon: FileSpreadsheet },
    ...(isSuperAdmin
      ? [{ label: 'Admin Management', href: '/admin/users', icon: Users }]
      : []),
    { label: 'Settings & Audit', href: '/admin/settings', icon: Settings },
  ];

  const isActive = (href: string, exact: boolean = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 h-screen sticky top-0 select-none">
      {/* Brand */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="text-base font-bold text-white tracking-tight leading-tight">QuizMaster</div>
          <div className="text-xs text-indigo-400 font-medium">Assessment Engine</div>
        </div>
      </div>

      {/* Quick Action */}
      <div className="px-4 py-4">
        <Link
          href="/admin/quizzes/new"
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md shadow-indigo-600/20 transition group"
        >
          <PlusCircle className="w-4 h-4 transition group-hover:rotate-90 duration-300" />
          <span>Create New Quiz</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Main Menu
        </div>
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-indigo-600/20 text-indigo-400 font-semibold border-l-4 border-indigo-500 pl-2.5'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Student Portal
        </div>
        <Link
          href="/"
          className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
        >
          <div className="flex items-center gap-3">
            <ExternalLink className="w-5 h-5 text-slate-400" />
            <span>Public Portal</span>
          </div>
          <span className="text-[10px] uppercase font-bold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
            Live
          </span>
        </Link>
      </div>

      {/* Admin User Card & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
            {adminName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{adminName}</div>
            <div className="text-xs text-slate-400 truncate">{adminEmail}</div>
            <div className="mt-1">
              {isSuperAdmin ? (
                <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider text-purple-300 bg-purple-950/70 border border-purple-500/40 px-2 py-0.5 rounded-md shadow-sm">
                  Master Admin
                </span>
              ) : (
                <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider text-indigo-300 bg-indigo-950/70 border border-indigo-500/40 px-2 py-0.5 rounded-md shadow-sm">
                  User Admin
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-600/20 transition border border-rose-500/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
