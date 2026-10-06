'use client';

import React from 'react';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminHeader({ title, subtitle, actions }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-[#17062b] border-b border-purple-900/30 px-4 sm:px-6 py-4 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-sm text-white">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-[11px] sm:text-xs text-purple-200/70 mt-0.5 line-clamp-2">{subtitle}</p>}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
