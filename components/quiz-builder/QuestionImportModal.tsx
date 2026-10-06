'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface QuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId?: string;
  onImportSuccess: (importedCount: number) => void;
}

export function QuestionImportModal({
  isOpen,
  onClose,
  quizId,
  onImportSuccess,
}: QuestionImportModalProps) {
  const [activeTab, setActiveTab] = useState<'csv' | 'json'>('csv');
  const [csvText, setCsvText] = useState<string>(
    `question,type,option_a,option_b,option_c,option_d,correct_answer,marks,difficulty\nWhat is 2+2?,MCQ,2,3,4,5,C,1,EASY\nWhich is a JavaScript framework?,MCQ,Django,React,Laravel,Spring,B,1,MEDIUM\nHTML is a programming language.,TRUE_FALSE,True,False,,,False,1,EASY`
  );
  const [jsonText, setJsonText] = useState<string>(
    JSON.stringify(
      [
        {
          questionText: 'What is the speed of light in vacuum?',
          type: 'MCQ',
          marks: 2,
          difficulty: 'MEDIUM',
          options: [
            { optionText: '300,000 km/s', isCorrect: true },
            { optionText: '150,000 km/s', isCorrect: false },
            { optionText: '3,000 km/s', isCorrect: false },
          ],
        },
      ],
      null,
      2
    )
  );

  const [previewResult, setPreviewResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const parseCsvToJson = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    const result = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',').map((v) => v.trim());
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] !== undefined ? values[idx] : '';
      });
      result.push(row);
    }
    return result;
  };

  const handleValidate = async () => {
    setLoading(true);
    setPreviewResult(null);
    try {
      let questionsData = [];
      if (activeTab === 'csv') {
        questionsData = parseCsvToJson(csvText);
      } else {
        questionsData = JSON.parse(jsonText);
      }

      if (questionsData.length === 0) {
        error('No valid rows found to parse.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questionsData,
          quizId,
          mode: 'preview',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPreviewResult(data);
      } else {
        error(data.error || 'Validation failed');
      }
    } catch (err: any) {
      error(`Parsing error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCommitImport = async () => {
    setLoading(true);
    try {
      let questionsData = [];
      if (activeTab === 'csv') {
        questionsData = parseCsvToJson(csvText);
      } else {
        questionsData = JSON.parse(jsonText);
      }

      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: questionsData,
          quizId,
          isQuestionBank: !quizId,
          mode: 'commit',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        success(`Successfully imported ${data.importedCount} questions!`);
        onImportSuccess(data.importedCount);
        onClose();
      } else {
        error(data.error || 'Import failed');
      }
    } catch (err: any) {
      error(`Import error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Questions (CSV / JSON)"
      description="Import questions with instant format validation and duplicate check."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('csv');
              setPreviewResult(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'csv'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            CSV Format
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('json');
              setPreviewResult(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'json'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            JSON Format
          </button>
        </div>

        {/* Input Area */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            {activeTab === 'csv'
              ? 'Paste CSV text (Format: question, type, option_a, option_b, option_c, option_d, correct_answer, marks, difficulty)'
              : 'Paste JSON Array of Question Objects'}
          </label>
          <textarea
            rows={7}
            value={activeTab === 'csv' ? csvText : jsonText}
            onChange={(e) =>
              activeTab === 'csv' ? setCsvText(e.target.value) : setJsonText(e.target.value)
            }
            className="w-full font-mono text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Validation Preview Banner */}
        {previewResult && (
          <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{previewResult.validCount} Valid Questions</span>
              </div>
              {previewResult.invalidCount > 0 && (
                <div className="flex items-center gap-2 text-rose-600 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>{previewResult.invalidCount} Invalid Rows</span>
                </div>
              )}
            </div>

            {previewResult.errors?.length > 0 && (
              <div className="text-[11px] text-rose-600 max-h-20 overflow-y-auto space-y-0.5">
                {previewResult.errors.map((err: string, idx: number) => (
                  <div key={idx}>• {err}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleValidate}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Validate First</span>
          </button>
          <button
            type="button"
            onClick={handleCommitImport}
            disabled={loading || (previewResult && previewResult.validCount === 0)}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow transition disabled:opacity-50 flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Confirm & Import</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
