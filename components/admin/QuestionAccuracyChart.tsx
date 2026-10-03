'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';

interface QuestionAccuracyChartProps {
  data: Array<{
    id: string;
    questionText: string;
    accuracy: number;
    difficulty: string;
  }>;
}

export function QuestionAccuracyChart({ data }: QuestionAccuracyChartProps) {
  const chartData = data.map((q, idx) => ({
    name: `Q${idx + 1}`,
    fullText: q.questionText,
    accuracy: q.accuracy,
    difficulty: q.difficulty,
  }));

  if (chartData.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-xs text-slate-400">
        No question statistics available
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            unit="%"
            domain={[0, 100]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs max-w-xs">
                    <div className="font-bold text-indigo-400">{d.name}</div>
                    <div className="text-slate-300 mt-1 line-clamp-2">{d.fullText}</div>
                    <div className="mt-2 font-semibold flex items-center justify-between">
                      <span>Accuracy:</span>
                      <span className="text-emerald-400">{d.accuracy}%</span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.accuracy >= 70
                    ? '#10b981'
                    : entry.accuracy >= 40
                    ? '#f59e0b'
                    : '#ef4444'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
