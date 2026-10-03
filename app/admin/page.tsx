'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatCard } from '@/components/admin/StatCard';
import { ScoreDistributionChart } from '@/components/admin/ScoreDistributionChart';
import { ResponsesTrendChart } from '@/components/admin/ResponsesTrendChart';
import {
  FileQuestion,
  CheckCircle2,
  Users,
  Award,
  TrendingUp,
  Clock,
  ExternalLink,
  PlusCircle,
  Eye,
  BarChart2,
  Loader2,
  ShieldCheck,
  UserPlus,
  ArrowRight,
  Layers,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [masterAdminData, setMasterAdminData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/dashboard').then((res) => res.json()),
      fetch('/api/auth/me').then((res) => res.json()),
    ])
      .then(([dashData, authData]) => {
        setDashboardData(dashData);
        if (authData.admin) {
          setCurrentAdmin(authData.admin);
          if (authData.admin.role === 'SUPER_ADMIN') {
            window.location.href = '/admin/users';
            return;
          }
        }
      })
      .catch((err) => console.error('Error fetching dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold text-slate-500">Loading Assessment Metrics...</p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = currentAdmin?.role === 'SUPER_ADMIN';

  const metrics = dashboardData?.metrics || {
    totalQuizzes: 0,
    publishedQuizzes: 0,
    draftQuizzes: 0,
    closedQuizzes: 0,
    totalParticipants: 0,
    totalResponses: 0,
    averageScore: 0,
    passPercentage: 0,
  };

  return (
    <div className="flex-1 flex flex-col pb-16">
      <AdminHeader
        title={isSuperAdmin ? 'Master Administrator Dashboard' : 'Assessment Overview'}
        subtitle={
          isSuperAdmin
            ? 'Full system oversight: manage administrator accounts, review platform audits, and inspect all conducted assessments.'
            : 'Live analytics, student participation, and active examination metrics.'
        }
        actions={
          <div className="flex items-center gap-2.5">
            {isSuperAdmin && (
              <Link
                href="/admin/users"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition"
              >
                <Users className="w-4 h-4" />
                <span>Admin User Management</span>
              </Link>
            )}
            <Link
              href="/admin/quizzes/new"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Quiz</span>
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* ========================================================================= */}
        {/* MASTER ADMIN PROMINENT CONTROL PANEL (VISIBLE ONLY TO SUPER_ADMIN)         */}
        {/* ========================================================================= */}
        {isSuperAdmin && (
          <div className="bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 rounded-3xl border border-purple-500/30 p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">Master Admin Control Center</h2>
                    <span className="text-[10px] uppercase font-extrabold text-purple-300 bg-purple-900/60 px-2.5 py-0.5 rounded-full border border-purple-500/40">
                      Super Admin
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Select any administrator below to inspect how many quizzes they have conducted and view student performance.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/admin/users"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Inspect All Admin Reports</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Administrators Quick Grid */}
            {masterAdminData?.admins && masterAdminData.admins.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-purple-200 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Platform Administrator Accounts & Conducted Quizzes Summary</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {masterAdminData.admins.map((adm: any) => (
                    <div
                      key={adm.id}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white text-xs flex items-center gap-1.5">
                            <span>{adm.name}</span>
                            {adm.isCurrentSession && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate">{adm.email}</div>
                        </div>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            adm.role === 'SUPER_ADMIN'
                              ? 'bg-purple-900/60 text-purple-300 border border-purple-500/30'
                              : 'bg-indigo-900/60 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {adm.role}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Quizzes Conducted</span>
                          <span className="font-black text-white font-mono">{adm.quizzesCount}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block">Submissions</span>
                          <span className="font-black text-purple-400 font-mono">{adm.attemptsCount}</span>
                        </div>
                        <Link
                          href="/admin/users"
                          className="px-2.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white text-[11px] font-bold transition flex items-center gap-1 border border-purple-500/30"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Assessments"
            value={metrics.totalQuizzes}
            subtitle={`${metrics.publishedQuizzes} Active / ${metrics.draftQuizzes} Drafts`}
            icon={FileQuestion}
            color="indigo"
          />

          <StatCard
            title="Total Participants"
            value={metrics.totalParticipants}
            subtitle={`${metrics.totalResponses} Completed Submissions`}
            icon={Users}
            color="blue"
          />

          <StatCard
            title="Average Score"
            value={`${metrics.averageScore} pts`}
            subtitle="Across all evaluations"
            icon={Award}
            color="amber"
          />

          <StatCard
            title="Pass Percentage"
            value={`${metrics.passPercentage}%`}
            subtitle="Students meeting threshold"
            icon={TrendingUp}
            color="emerald"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Submissions Trend */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Student Response Activity
                </h3>
                <p className="text-xs text-slate-500">Daily assessment attempts</p>
              </div>
            </div>
            <ResponsesTrendChart data={dashboardData?.dailyResponses || []} />
          </div>

          {/* Score Distribution */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Score Distribution
                </h3>
                <p className="text-xs text-slate-500">Student performance spectrum</p>
              </div>
            </div>
            <ScoreDistributionChart data={dashboardData?.scoreDistribution || []} />
          </div>
        </div>

        {/* Recent Quizzes Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Quizzes & Assessments
              </h3>
              <p className="text-xs text-slate-500">Quick access to recently updated quizzes</p>
            </div>
            <Link
              href="/admin/quizzes"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View All Quizzes →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Quiz Title</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Questions</th>
                  <th className="px-5 py-3">Attempts</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dashboardData?.recentQuizzes?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      No quizzes created yet.{' '}
                      <Link href="/admin/quizzes/new" className="text-indigo-600 font-semibold">
                        Create your first quiz
                      </Link>
                    </td>
                  </tr>
                ) : (
                  dashboardData?.recentQuizzes?.map((quiz: any) => (
                    <tr key={quiz.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                        <Link href={`/admin/quizzes/${quiz.id}/edit`} className="hover:text-indigo-600">
                          {quiz.title}
                        </Link>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {quiz.subject || 'General'} • {quiz.durationMinutes} mins
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {quiz.publicCode}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            quiz.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : quiz.status === 'CLOSED'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {quiz.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-medium">
                        {quiz._count.questions} questions
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-medium">
                        {quiz._count.attempts} submissions
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <Link
                          href={`/admin/quizzes/${quiz.id}/responses`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Responses</span>
                        </Link>
                        <Link
                          href={`/admin/quizzes/${quiz.id}/analytics`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>Analytics</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
