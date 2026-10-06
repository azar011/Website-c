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
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

import { Logo } from '@/components/ui/Logo';

interface AdminSidebarProps {
  adminEmail?: string;
  adminName?: string;
  adminRole?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({
  adminEmail: initialEmail = '',
  adminName: initialName = '',
  adminRole: initialRole = '',
  isOpen = false,
  onClose,
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

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const sidebarContent = (
    <div className="w-64 bg-[#17062b] text-purple-100/80 flex flex-col shrink-0 h-full select-none">
      {/* Brand & Mobile Close */}
      <div className="p-5 sm:p-6 border-b border-purple-900/30 flex items-center justify-between">
        <Link href="/admin" className="hover:opacity-90 transition">
          <Logo size="md" subtitle="Assessment Engine" />
        </Link>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-purple-300/60 hover:text-white hover:bg-purple-900/40 transition"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Action */}
      <div className="px-4 py-3 sm:py-4">
        <Link
          href="/admin/quizzes/new"
          onClick={handleNavClick}
          className="w-full flex items-center justify-center gap-2 bg-[#6e38f7] hover:bg-[#7b46fa] text-white px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-md shadow-purple-900/40 transition group"
        >
          <PlusCircle className="w-4 h-4 transition group-hover:rotate-90 duration-300" />
          <span>Create New Quiz</span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-purple-400/60 uppercase tracking-wider">
          Main Menu
        </div>
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-purple-600/25 text-purple-200 font-semibold border-l-4 border-purple-500 pl-2.5'
                  : 'text-purple-200/60 hover:text-white hover:bg-purple-900/30'
              }`}
            >
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${active ? 'text-purple-400' : 'text-purple-300/50'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-3 sm:pt-4 px-3 py-1.5 text-[11px] font-semibold text-purple-400/60 uppercase tracking-wider">
          Student Portal
        </div>
        <Link
          href="/"
          onClick={handleNavClick}
          className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-purple-200/60 hover:text-white hover:bg-purple-900/30 transition"
        >
          <div className="flex items-center gap-3">
            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300/50" />
            <span>Public Portal</span>
          </div>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold bg-purple-950/80 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded">
            Live
          </span>
        </Link>
      </div>

      {/* Admin User Card & Logout */}
      <div className="p-3.5 sm:p-4 border-t border-purple-900/30 bg-[#120422]/70">
        <div className="flex items-center gap-2.5 sm:gap-3 mb-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-purple-950 border border-purple-700/50 flex items-center justify-center font-bold text-purple-200 text-xs shadow-inner">
            {adminName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm font-semibold text-white truncate">{adminName}</div>
            <div className="text-[11px] text-purple-300/60 truncate">{adminEmail}</div>
            <div className="mt-0.5">
              {isSuperAdmin ? (
                <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider text-purple-300 bg-purple-950/90 border border-purple-500/40 px-1.5 py-0.2 rounded-md shadow-sm">
                  Master Admin
                </span>
              ) : (
                <span className="inline-block text-[9px] font-extrabold uppercase tracking-wider text-purple-300 bg-purple-950/90 border border-purple-500/40 px-1.5 py-0.2 rounded-md shadow-sm">
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
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col bg-[#17062b] border-r border-purple-900/30 h-screen sticky top-0 shrink-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#0c0217]/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          {/* Drawer Body */}
          <div className="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl border-r border-purple-900/30 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
