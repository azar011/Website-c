'use client';

import React from 'react';
import {
  Clock,
  ShieldAlert,
  UserCheck,
  Eye,
  Shuffle,
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface QuizSettingsTabsProps {
  quiz: any;
  settings: any;
  onQuizChange: (updated: any) => void;
  onSettingsChange: (updated: any) => void;
}

export function QuizSettingsTabs({
  quiz,
  settings,
  onQuizChange,
  onSettingsChange,
}: QuizSettingsTabsProps) {
  const [activeTab, setActiveTab] = React.useState<
    'general' | 'responses' | 'anticheat' | 'results'
  >('general');

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'general'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>General & Schedule</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('responses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'responses'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Response & Identity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('anticheat')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'anticheat'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Anti-Cheating & Monitoring</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'results'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Result & Review</span>
        </button>
      </div>

      <div className="p-6">
        {/* TAB 1: General & Schedule */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Course
                </label>
                <input
                  type="text"
                  value={quiz.subject || ''}
                  onChange={(e) => onQuizChange({ ...quiz, subject: e.target.value })}
                  placeholder="e.g. Computer Science / Python"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={quiz.department || ''}
                  onChange={(e) => onQuizChange({ ...quiz, department: e.target.value })}
                  placeholder="e.g. Information Technology"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Class / Batch
                </label>
                <input
                  type="text"
                  value={quiz.targetClass || ''}
                  onChange={(e) => onQuizChange({ ...quiz, targetClass: e.target.value })}
                  placeholder="e.g. 4th Sem CSE-A"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category / Assessment Type
                </label>
                <input
                  type="text"
                  value={quiz.category || ''}
                  onChange={(e) => onQuizChange({ ...quiz, category: e.target.value })}
                  placeholder="e.g. Mid-Term / Weekly Quiz"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={quiz.durationMinutes || 30}
                  onChange={(e) =>
                    onQuizChange({ ...quiz, durationMinutes: parseInt(e.target.value) || 30 })
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Server-side enforced countdown timer.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Passing Percentage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={quiz.passingPercentage || 40}
                  onChange={(e) =>
                    onQuizChange({ ...quiz, passingPercentage: parseFloat(e.target.value) || 40 })
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 dark:text-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Minimum percentage needed to pass the assessment.
                </p>
              </div>
            </div>

            {/* Randomization & Pool */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Shuffle className="w-4 h-4 text-indigo-500" />
                <span>Question & Option Randomization</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={quiz.randomizeQuestions || false}
                    onChange={(e) =>
                      onQuizChange({ ...quiz, randomizeQuestions: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Shuffle Questions for each student</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={quiz.randomizeOptions || false}
                    onChange={(e) => onQuizChange({ ...quiz, randomizeOptions: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Shuffle Answer Options (A, B, C, D)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Response & Identification */}
        {activeTab === 'responses' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
              <div className="text-xs font-bold text-indigo-950 dark:text-indigo-300 mb-1">
                Student No-Login Architecture
              </div>
              <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80">
                Students do not register or login. Instead, you choose the identification method
                and required fields below. Single-response and attempt limits are enforced on the
                backend using these identifiers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Response Identification Method
                </label>
                <select
                  value={settings.identificationMethod || 'REGISTER_NUMBER'}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, identificationMethod: e.target.value })
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="REGISTER_NUMBER">Register Number / Roll Number</option>
                  <option value="EMAIL">Email Address</option>
                  <option value="NAME">Full Name</option>
                  <option value="NAME_AND_REGISTER_NUMBER">Name + Register Number</option>
                  <option value="EMAIL_AND_REGISTER_NUMBER">Email + Register Number</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Maximum Attempts Allowed
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxAttempts || 1}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      maxAttempts: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none font-bold"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={settings.singleResponse || false}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, singleResponse: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>Enforce Single Response (Block repeat submissions by same student identifier)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={settings.acceptResponses ?? true}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, acceptResponses: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>Accept Responses (Disable to temporarily freeze submissions)</span>
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-3">
                Required Student Identity Fields on Start Screen:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireName ?? true}
                    onChange={(e) =>
                      onSettingsChange({ ...settings, requireName: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Student Name</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireRegisterNumber ?? true}
                    onChange={(e) =>
                      onSettingsChange({ ...settings, requireRegisterNumber: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Register / Roll No</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireEmail ?? false}
                    onChange={(e) =>
                      onSettingsChange({ ...settings, requireEmail: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Email Address</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireClass ?? false}
                    onChange={(e) =>
                      onSettingsChange({ ...settings, requireClass: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Class / Section</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireDepartment ?? false}
                    onChange={(e) =>
                      onSettingsChange({ ...settings, requireDepartment: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Department</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Anti-Cheating */}
        {activeTab === 'anticheat' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                <strong>Anti-Cheating Policy:</strong> Standard browsers cannot guarantee 100%
                cheating prevention across external physical devices. This platform provides
                browser-level monitoring, fullscreen enforcement, tab-switch detection, and automatic
                violation logging with configurable submission thresholds.
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableAntiCheat ?? true}
                onChange={(e) =>
                  onSettingsChange({ ...settings, enableAntiCheat: e.target.checked })
                }
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span>Enable Browser-Level Anti-Cheating Monitoring</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Violation Trigger Action
                </label>
                <select
                  value={settings.violationAction || 'AUTO_SUBMIT'}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, violationAction: e.target.value })
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none"
                >
                  <option value="AUTO_SUBMIT">Auto-Submit Attempt on Max Violations</option>
                  <option value="TERMINATE">Terminate Attempt (Zero Marks)</option>
                  <option value="WARNING">Issue Warnings Only (Log to Admin)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Maximum Violations Allowed
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxViolations || 3}
                  onChange={(e) =>
                    onSettingsChange({
                      ...settings,
                      maxViolations: parseInt(e.target.value) || 3,
                    })
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none font-bold"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-900 dark:text-white mb-3">
                Active Detection & Monitoring Triggers:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireFullscreen ?? true}
                    onChange={(e) =>
                      onSettingsChange({ ...settings, requireFullscreen: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Enforce Fullscreen Mode</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.detectTabSwitch ?? true}
                    onChange={(e) =>
                      onSettingsChange({ ...settings, detectTabSwitch: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Detect Tab Switching / Minimizing</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.detectWindowBlur ?? true}
                    onChange={(e) =>
                      onSettingsChange({ ...settings, detectWindowBlur: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Detect Window Focus Loss</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.detectCopy ?? true}
                    onChange={(e) =>
                      onSettingsChange({ ...settings, detectCopy: e.target.checked })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Block & Detect Copy / Paste / Context Menu</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Result & Review */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-900 dark:text-white mb-2">
              Student Post-Submission Display Controls:
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showScoreOnSubmit ?? true}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, showScoreOnSubmit: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>Display Marks & Score immediately after submit</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showPercentageOnSubmit ?? true}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, showPercentageOnSubmit: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>Display Calculated Percentage</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showPassFailOnSubmit ?? true}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, showPassFailOnSubmit: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>Display PASS / FAIL Status badge</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showAnswerReview ?? false}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, showAnswerReview: e.target.checked })
                  }
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span>Allow Question-by-Question Answer Review</span>
              </label>

              {settings.showAnswerReview && (
                <div className="ml-6 space-y-2 pt-2 border-l-2 border-indigo-200 pl-4">
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showCorrectAnswers ?? false}
                      onChange={(e) =>
                        onSettingsChange({ ...settings, showCorrectAnswers: e.target.checked })
                      }
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span>Reveal Correct Answers Key</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showExplanation ?? false}
                      onChange={(e) =>
                        onSettingsChange({ ...settings, showExplanation: e.target.checked })
                      }
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span>Show Explanations and Solutions</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
