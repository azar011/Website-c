'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatCard } from '@/components/admin/StatCard';
import { ScoreDistributionChart } from '@/components/admin/ScoreDistributionChart';
import { QuestionAccuracyChart } from '@/components/admin/QuestionAccuracyChart';
import { ResponsesTrendChart } from '@/components/admin/ResponsesTrendChart';
import { useToast } from '@/components/ui/Toast';
import {
  Users,
  Award,
  TrendingUp,
  Clock,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  BarChart3,
  Loader2,
} from 'lucide-react';

export default function QuizAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { error, success } = useToast();

  useEffect(() => {
    fetch(`/api/admin/quizzes/${id}/analytics`)
      .then((res) => res.json())
      .then((data) => {
        if (data.analytics) setAnalytics(data.analytics);
        else error(data.error || 'Failed to load analytics');
      })
      .catch((err) => console.error('Analytics error:', err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-semibold text-slate-500">Calculating Analytics Data...</p>
        </div>
      </div>
    );
  }

  const summary = analytics?.summary || {};

  return (
    <div className="flex-1 flex flex-col pb-16">
      <AdminHeader
        title="Assessment Analytics & Insights"
        subtitle="Real-time statistical breakdowns, score metrics, and question-level performance."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/quizzes/${id}/responses`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
            >
              <Users className="w-4 h-4" />
              <span>Responses</span>
            </Link>

            <a
              href={`/api/admin/quizzes/${id}/reports/excel`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel Report</span>
            </a>
          </div>
        }
      />

      <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Participants"
            value={summary.totalParticipants || 0}
            subtitle={`${summary.completedAttempts || 0} Submissions`}
            icon={Users}
            color="indigo"
          />

          <StatCard
            title="Average Score"
            value={`${summary.averageScore || 0} pts`}
            subtitle={`Highest: ${summary.highestScore || 0} • Lowest: ${summary.lowestScore || 0}`}
            icon={Award}
            color="amber"
          />

          <StatCard
            title="Pass Rate"
            value={`${summary.passPercentage || 0}%`}
            subtitle={`Fail: ${summary.failPercentage || 0}%`}
            icon={TrendingUp}
            color="emerald"
          />

          <StatCard
            title="Avg Completion Time"
            value={`${summary.averageDurationMinutes || 0} min`}
            subtitle={`${summary.totalViolations || 0} Total Violations`}
            icon={Clock}
            color="violet"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Distribution */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Score Distribution (Buckets)
            </h3>
            <p className="text-xs text-slate-500 mb-4">Participant count per percentile</p>
            <ScoreDistributionChart data={analytics?.scoreDistribution || []} />
          </div>

          {/* Question Accuracy */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              Question Accuracy Rate (%)
            </h3>
            <p className="text-xs text-slate-500 mb-4">Percentage of correct answers per question</p>
            <QuestionAccuracyChart data={analytics?.questionStats || []} />
          </div>
        </div>

        {/* Question-by-Question Deep Dive */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Question Performance Breakdown & Option Analytics
          </h3>

          <div className="space-y-4">
            {analytics?.questionStats?.map((q: any, idx: number) => (
              <div
                key={q.id}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    <span className="text-indigo-600 mr-2">Q{idx + 1}.</span>
                    {q.questionText}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {q.type}
                    </span>
                    <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                      {q.accuracy}% Accuracy
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Correct: <strong>{q.correctCount}</strong></span>
                  <span>Wrong: <strong>{q.wrongCount}</strong></span>
                  <span>Unanswered: <strong>{q.unansweredCount}</strong></span>
                  <span>Marks: <strong>{q.marks}</strong></span>
                </div>

                {/* Option Choice Breakdown for MCQs */}
                {q.optionsBreakdown && q.optionsBreakdown.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400">
                      Option Distribution:
                    </div>
                    <div className="space-y-1.5">
                      {q.optionsBreakdown.map((opt: any) => (
                        <div key={opt.id} className="flex items-center gap-2 text-xs">
                          <span
                            className={`w-36 truncate font-medium ${
                              opt.isCorrect ? 'text-emerald-600 font-bold' : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {opt.text} {opt.isCorrect && '✓'}
                          </span>
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${opt.isCorrect ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                              style={{ width: `${opt.percentage}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 w-12 text-right">
                            {opt.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Department & Class Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Department Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Department Performance
            </h3>
            {analytics?.departmentStats?.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No departmental data recorded
              </div>
            ) : (
              <div className="space-y-3">
                {analytics?.departmentStats?.map((dept: any) => (
                  <div
                    key={dept.department}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {dept.department}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {dept.participantCount} Students
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-indigo-600 dark:text-indigo-400">
                        {dept.avgScore} pts avg
                      </div>
                      <div className="text-emerald-600 font-semibold text-[11px]">
                        {dept.passRate}% Pass
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Class Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Class / Section Performance
            </h3>
            {analytics?.classStats?.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No class data recorded
              </div>
            ) : (
              <div className="space-y-3">
                {analytics?.classStats?.map((cls: any) => (
                  <div
                    key={cls.className}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {cls.className}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {cls.participantCount} Students
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-indigo-600 dark:text-indigo-400">
                        {cls.avgScore} pts avg
                      </div>
                      <div className="text-emerald-600 font-semibold text-[11px]">
                        {cls.passRate}% Pass
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
