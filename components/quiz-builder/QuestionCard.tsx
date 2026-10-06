'use client';

import React, { useState } from 'react';
import {
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Plus,
  CheckCircle2,
  Circle,
  CheckSquare,
  Square,
  HelpCircle,
  Sparkles,
  Image as ImageIcon,
  MoreVertical,
} from 'lucide-react';

export interface QuestionOptionData {
  id?: string;
  optionText: string;
  isCorrect: boolean;
  matchTarget?: string | null;
  orderIndex?: number;
}

export interface QuestionData {
  id?: string;
  questionText: string;
  description?: string | null;
  type: string;
  required: boolean;
  marks: number;
  negativeMarks: number;
  evaluationType?: string;
  keywords?: string | null;
  explanation?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  subject?: string | null;
  topic?: string | null;
  difficulty?: string;
  orderIndex: number;
  options: QuestionOptionData[];
}

interface QuestionCardProps {
  question: QuestionData;
  index: number;
  totalQuestions: number;
  onChange: (updated: QuestionData) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function QuestionCard({
  question,
  index,
  totalQuestions,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: QuestionCardProps) {
  const [showExplanation, setShowExplanation] = useState(!!question.explanation);
  const [showDescription, setShowDescription] = useState(!!question.description);

  const questionTypes = [
    { value: 'MCQ', label: 'Multiple Choice (Single)' },
    { value: 'MULTIPLE_SELECT', label: 'Multiple Select (Checkboxes)' },
    { value: 'TRUE_FALSE', label: 'True / False' },
    { value: 'SHORT_ANSWER', label: 'Short Answer' },
    { value: 'LONG_ANSWER', label: 'Descriptive / Long Answer' },
    { value: 'FILL_IN_BLANK', label: 'Fill in the Blank' },
    { value: 'MATCHING', label: 'Matching Pairs' },
    { value: 'RATING', label: 'Rating (1 - 5)' },
    { value: 'LINEAR_SCALE', label: 'Linear Scale (1 - 10)' },
    { value: 'FILE_UPLOAD', label: 'File Upload' },
  ];

  const handleTypeChange = (newType: string) => {
    let newOptions = [...question.options];
    if (newType === 'TRUE_FALSE' && newOptions.length !== 2) {
      newOptions = [
        { optionText: 'True', isCorrect: true, orderIndex: 0 },
        { optionText: 'False', isCorrect: false, orderIndex: 1 },
      ];
    } else if (['MCQ', 'MULTIPLE_SELECT'].includes(newType) && newOptions.length === 0) {
      newOptions = [
        { optionText: '', isCorrect: true, orderIndex: 0 },
        { optionText: '', isCorrect: false, orderIndex: 1 },
      ];
    } else if (newType === 'MATCHING' && newOptions.length === 0) {
      newOptions = [
        { optionText: '', matchTarget: '', isCorrect: true, orderIndex: 0 },
        { optionText: '', matchTarget: '', isCorrect: true, orderIndex: 1 },
      ];
    }
    onChange({ ...question, type: newType, options: newOptions });
  };

  const handleOptionTextChange = (optIdx: number, text: string) => {
    const opts = [...question.options];
    opts[optIdx] = { ...opts[optIdx], optionText: text };
    onChange({ ...question, options: opts });
  };

  const handleMatchTargetChange = (optIdx: number, matchTarget: string) => {
    const opts = [...question.options];
    opts[optIdx] = { ...opts[optIdx], matchTarget };
    onChange({ ...question, options: opts });
  };

  const handleOptionCorrectToggle = (optIdx: number) => {
    let opts = [...question.options];
    if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
      opts = opts.map((opt, idx) => ({
        ...opt,
        isCorrect: idx === optIdx,
      }));
    } else {
      opts[optIdx] = { ...opts[optIdx], isCorrect: !opts[optIdx].isCorrect };
    }
    onChange({ ...question, options: opts });
  };

  const handleAddOption = () => {
    const nextIdx = question.options.length;
    const newOpt: QuestionOptionData = {
      optionText: '',
      isCorrect: false,
      orderIndex: nextIdx,
      matchTarget: question.type === 'MATCHING' ? '' : null,
    };
    onChange({ ...question, options: [...question.options, newOpt] });
  };

  const handleRemoveOption = (optIdx: number) => {
    if (question.options.length <= 2 && ['MCQ', 'MULTIPLE_SELECT', 'TRUE_FALSE'].includes(question.type)) {
      return;
    }
    const opts = question.options.filter((_, idx) => idx !== optIdx);
    onChange({ ...question, options: opts });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition p-5 sm:p-6 mb-5">
      {/* Top Bar: Question Number, Type Selector, Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Question
          </span>
        </div>

        {/* Question Type Selector */}
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <select
            value={question.type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {questionTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reorder and Action Tools */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move Up"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalQuestions - 1}
            title="Move Down"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicate Question"
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete Question"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Question Input */}
      <div className="mt-4 space-y-3">
        <textarea
          rows={2}
          value={question.questionText}
          onChange={(e) => onChange({ ...question, questionText: e.target.value })}
          placeholder="Enter question text here..."
          className="w-full text-base font-medium px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition resize-y"
        />

        {/* Optional Description / Subtitle */}
        {showDescription && (
          <input
            type="text"
            value={question.description || ''}
            onChange={(e) => onChange({ ...question, description: e.target.value })}
            placeholder="Additional instructions or question description (optional)..."
            className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500"
          />
        )}
      </div>

      {/* Question Type Specific Options Editor */}
      <div className="mt-4">
        {/* MCQ / MULTIPLE SELECT / TRUE_FALSE */}
        {['MCQ', 'MULTIPLE_SELECT', 'TRUE_FALSE'].includes(question.type) && (
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Options (Click the circle/box to mark correct answer)</span>
              {question.type === 'MCQ' && (
                <span className="text-[11px] text-indigo-500">Single correct choice</span>
              )}
              {question.type === 'MULTIPLE_SELECT' && (
                <span className="text-[11px] text-indigo-500">Multiple correct choices allowed</span>
              )}
            </div>

            {question.options.map((opt, optIdx) => (
              <div key={optIdx} className="flex items-center gap-2 group">
                <button
                  type="button"
                  onClick={() => handleOptionCorrectToggle(optIdx)}
                  className={`shrink-0 p-1.5 rounded-lg transition ${
                    opt.isCorrect
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                      : 'text-slate-300 dark:text-slate-600 hover:text-slate-400'
                  }`}
                  title={opt.isCorrect ? 'Correct Answer' : 'Click to mark correct'}
                >
                  {question.type === 'MULTIPLE_SELECT' ? (
                    opt.isCorrect ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />
                  ) : opt.isCorrect ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <input
                  type="text"
                  value={opt.optionText}
                  onChange={(e) => handleOptionTextChange(optIdx, e.target.value)}
                  placeholder={`Option ${optIdx + 1}`}
                  className={`flex-1 text-sm px-3 py-2 rounded-xl border outline-none transition ${
                    opt.isCorrect
                      ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 text-slate-900 dark:text-white font-medium'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                  }`}
                />

                {question.type !== 'TRUE_FALSE' && question.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(optIdx)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {question.type !== 'TRUE_FALSE' && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Option</span>
              </button>
            )}
          </div>
        )}

        {/* SHORT ANSWER / FILL IN THE BLANK */}
        {['SHORT_ANSWER', 'FILL_IN_BLANK'].includes(question.type) && (
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Answer Evaluation & Keywords:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Evaluation Method</label>
                <select
                  value={question.evaluationType || 'CASE_INSENSITIVE'}
                  onChange={(e) => onChange({ ...question, evaluationType: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white mt-1 outline-none"
                >
                  <option value="CASE_INSENSITIVE">Case Insensitive Match</option>
                  <option value="EXACT_MATCH">Exact Match (Case Sensitive)</option>
                  <option value="KEYWORD_MATCH">Keyword Contains</option>
                  <option value="MANUAL">Manual Review</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Accepted Answers / Keywords (comma separated)
                </label>
                <input
                  type="text"
                  value={question.keywords || ''}
                  onChange={(e) => onChange({ ...question, keywords: e.target.value })}
                  placeholder="e.g. Python, python3, CPython"
                  className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 mt-1 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* MATCHING PAIRS */}
        {question.type === 'MATCHING' && (
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Matching Pairs (Left Item ➔ Correct Right Target)</span>
            </div>

            {question.options.map((opt, optIdx) => (
              <div key={optIdx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt.optionText}
                  onChange={(e) => handleOptionTextChange(optIdx, e.target.value)}
                  placeholder={`Left Item ${optIdx + 1}`}
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <span className="text-slate-400 font-bold">➔</span>
                <input
                  type="text"
                  value={opt.matchTarget || ''}
                  onChange={(e) => handleMatchTargetChange(optIdx, e.target.value)}
                  placeholder={`Match Target ${optIdx + 1}`}
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                {question.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(optIdx)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddOption}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Pair</span>
            </button>
          </div>
        )}

        {/* RATING / SCALE */}
        {['RATING', 'LINEAR_SCALE'].includes(question.type) && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-500">
            Student will select a score on a {question.type === 'RATING' ? '1 to 5 star rating' : '1 to 10 linear scale'}.
          </div>
        )}

        {/* LONG ANSWER / FILE UPLOAD */}
        {['LONG_ANSWER', 'FILE_UPLOAD'].includes(question.type) && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-500">
            {question.type === 'LONG_ANSWER'
              ? 'Descriptive long-form answer area. Admin can manually review and assign marks.'
              : 'Allows student to submit PDF/DOCX/Images.'}
          </div>
        )}
      </div>

      {/* Explanation Box if toggled */}
      {showExplanation && (
        <div className="mt-4 p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
          <label className="text-xs font-semibold text-amber-900 dark:text-amber-400 flex items-center gap-1 mb-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Answer Explanation / Solution (shown to students if enabled in result settings)</span>
          </label>
          <textarea
            rows={2}
            value={question.explanation || ''}
            onChange={(e) => onChange({ ...question, explanation: e.target.value })}
            placeholder="Explain why this answer is correct..."
            className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-slate-800 dark:text-slate-200 outline-none"
          />
        </div>
      )}

      {/* Bottom Settings Bar: Marks, Negative Marks, Required Toggle, Add Explanation/Description */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Marks:</label>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={question.marks}
              onChange={(e) => onChange({ ...question, marks: parseFloat(e.target.value) || 1 })}
              className="w-16 text-xs font-bold text-center px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Negative Marks:
            </label>
            <input
              type="number"
              min="0"
              step="0.25"
              value={question.negativeMarks}
              onChange={(e) => onChange({ ...question, negativeMarks: parseFloat(e.target.value) || 0 })}
              className="w-16 text-xs font-bold text-center px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Difficulty:
            </label>
            <select
              value={question.difficulty || 'MEDIUM'}
              onChange={(e) => onChange({ ...question, difficulty: e.target.value })}
              className="text-xs font-medium px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowDescription(!showDescription)}
            className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition ${
              showDescription
                ? 'border-indigo-300 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {showDescription ? 'Hide Description' : '+ Add Description'}
          </button>

          <button
            type="button"
            onClick={() => setShowExplanation(!showExplanation)}
            className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition ${
              showExplanation
                ? 'border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/40'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {showExplanation ? 'Hide Explanation' : '+ Explanation'}
          </button>

          {/* Required toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) => onChange({ ...question, required: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
            />
            <span>Required</span>
          </label>
        </div>
      </div>
    </div>
  );
}
