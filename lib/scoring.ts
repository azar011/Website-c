import { Question, QuestionOption, ResponseAnswer } from '@prisma/client';

export interface QuestionWithOptions extends Question {
  options: QuestionOption[];
}

export interface EvaluationResult {
  isCorrect: boolean;
  marksAwarded: number;
  negativeMarksApplied: number;
}

export interface AttemptScoringSummary {
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  passed: boolean;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  totalNegativeMarks: number;
  answerResults: Array<{
    questionId: string;
    isCorrect: boolean;
    marksAwarded: number;
    negativeMarksApplied: number;
  }>;
}

/**
 * Evaluates a single question answer on the server side.
 */
export function evaluateQuestionAnswer(
  question: QuestionWithOptions,
  answer: Partial<ResponseAnswer> | undefined
): EvaluationResult {
  const marks = question.marks || 1.0;
  const negativeMarks = question.negativeMarks || 0.0;

  // Unanswered check
  const hasNoSelectedOptions = !answer?.selectedOptionIds || answer.selectedOptionIds.trim() === '' || answer.selectedOptionIds === '[]';
  const hasNoText = !answer?.textAnswer || answer.textAnswer.trim() === '';
  const hasNoFile = !answer?.fileAnswerUrl;

  if (hasNoSelectedOptions && hasNoText && hasNoFile) {
    return {
      isCorrect: false,
      marksAwarded: 0,
      negativeMarksApplied: 0,
    };
  }

  const questionType = question.type.toUpperCase();

  switch (questionType) {
    case 'MCQ':
    case 'TRUE_FALSE': {
      let selectedIds: string[] = [];
      try {
        selectedIds = JSON.parse(answer?.selectedOptionIds || '[]');
      } catch {
        if (answer?.selectedOptionIds) selectedIds = [answer.selectedOptionIds];
      }

      if (selectedIds.length === 0) {
        return { isCorrect: false, marksAwarded: 0, negativeMarksApplied: 0 };
      }

      const selectedId = selectedIds[0];
      const correctOption = question.options.find((opt) => opt.isCorrect);

      if (correctOption && correctOption.id === selectedId) {
        return { isCorrect: true, marksAwarded: marks, negativeMarksApplied: 0 };
      } else {
        return { isCorrect: false, marksAwarded: -negativeMarks, negativeMarksApplied: negativeMarks };
      }
    }

    case 'MULTIPLE_SELECT': {
      let selectedIds: string[] = [];
      try {
        selectedIds = JSON.parse(answer?.selectedOptionIds || '[]');
      } catch {
        if (answer?.selectedOptionIds) selectedIds = [answer.selectedOptionIds];
      }

      if (selectedIds.length === 0) {
        return { isCorrect: false, marksAwarded: 0, negativeMarksApplied: 0 };
      }

      const correctOptionIds = new Set(question.options.filter((opt) => opt.isCorrect).map((opt) => opt.id));
      const selectedSet = new Set(selectedIds);

      // Check if exact match
      const allCorrectSelected = [...correctOptionIds].every((id) => selectedSet.has(id));
      const noExtraSelected = [...selectedSet].every((id) => correctOptionIds.has(id));

      if (allCorrectSelected && noExtraSelected) {
        return { isCorrect: true, marksAwarded: marks, negativeMarksApplied: 0 };
      } else {
        return { isCorrect: false, marksAwarded: -negativeMarks, negativeMarksApplied: negativeMarks };
      }
    }

    case 'SHORT_ANSWER':
    case 'FILL_IN_BLANK': {
      const studentText = (answer?.textAnswer || '').trim();
      if (!studentText) {
        return { isCorrect: false, marksAwarded: 0, negativeMarksApplied: 0 };
      }

      const evalType = question.evaluationType || 'CASE_INSENSITIVE';
      const rawKeywords = (question.keywords || '').split(',').map((k) => k.trim()).filter(Boolean);

      let isMatch = false;

      if (rawKeywords.length === 0) {
        // If no keyword specified, default to true or manual
        isMatch = true;
      } else if (evalType === 'EXACT_MATCH') {
        isMatch = rawKeywords.some((kw) => kw === studentText);
      } else if (evalType === 'CASE_INSENSITIVE') {
        isMatch = rawKeywords.some((kw) => kw.toLowerCase() === studentText.toLowerCase());
      } else if (evalType === 'KEYWORD_MATCH') {
        const studentLower = studentText.toLowerCase();
        isMatch = rawKeywords.some((kw) => studentLower.includes(kw.toLowerCase()));
      } else {
        // MANUAL
        isMatch = false;
      }

      if (isMatch) {
        return { isCorrect: true, marksAwarded: marks, negativeMarksApplied: 0 };
      } else {
        return { isCorrect: false, marksAwarded: -negativeMarks, negativeMarksApplied: negativeMarks };
      }
    }

    case 'MATCHING': {
      // For matching questions, selectedOptionIds stores JSON map: { optionId: selectedTargetText }
      let userMatches: Record<string, string> = {};
      try {
        userMatches = JSON.parse(answer?.selectedOptionIds || '{}');
      } catch {
        userMatches = {};
      }

      if (Object.keys(userMatches).length === 0) {
        return { isCorrect: false, marksAwarded: 0, negativeMarksApplied: 0 };
      }

      let allMatched = true;
      for (const opt of question.options) {
        if (opt.matchTarget) {
          const userChosenTarget = userMatches[opt.id];
          if (userChosenTarget !== opt.matchTarget) {
            allMatched = false;
            break;
          }
        }
      }

      if (allMatched) {
        return { isCorrect: true, marksAwarded: marks, negativeMarksApplied: 0 };
      } else {
        return { isCorrect: false, marksAwarded: -negativeMarks, negativeMarksApplied: negativeMarks };
      }
    }

    case 'RATING':
    case 'LINEAR_SCALE': {
      // Any selected rating gets full marks
      if (answer?.textAnswer || (answer?.selectedOptionIds && answer.selectedOptionIds !== '[]')) {
        return { isCorrect: true, marksAwarded: marks, negativeMarksApplied: 0 };
      }
      return { isCorrect: false, marksAwarded: 0, negativeMarksApplied: 0 };
    }

    case 'LONG_ANSWER':
    case 'FILE_UPLOAD':
    default: {
      // Submitted descriptive text or file is recorded
      const hasContent = (answer?.textAnswer && answer.textAnswer.trim().length > 0) || !!answer?.fileAnswerUrl;
      return {
        isCorrect: hasContent,
        marksAwarded: hasContent ? marks : 0,
        negativeMarksApplied: 0,
      };
    }
  }
}

/**
 * Computes overall attempt scoring across all quiz questions.
 */
export function scoreAttempt(
  questions: QuestionWithOptions[],
  answers: ResponseAnswer[],
  passingPercentage: number = 40.0
): AttemptScoringSummary {
  let totalMarks = 0;
  let obtainedMarks = 0;
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalUnanswered = 0;
  let totalNegativeMarks = 0;

  const answerResults: AttemptScoringSummary['answerResults'] = [];
  const answerMap = new Map<string, ResponseAnswer>(answers.map((a) => [a.questionId, a]));

  for (const question of questions) {
    const qMarks = question.marks || 1.0;
    totalMarks += qMarks;

    const ans = answerMap.get(question.id);
    const hasAnswer =
      (ans?.selectedOptionIds && ans.selectedOptionIds.trim() !== '' && ans.selectedOptionIds !== '[]') ||
      (ans?.textAnswer && ans.textAnswer.trim() !== '') ||
      !!ans?.fileAnswerUrl;

    if (!hasAnswer) {
      totalUnanswered++;
      answerResults.push({
        questionId: question.id,
        isCorrect: false,
        marksAwarded: 0,
        negativeMarksApplied: 0,
      });
      continue;
    }

    const evalRes = evaluateQuestionAnswer(question, ans);
    obtainedMarks += evalRes.marksAwarded;

    if (evalRes.isCorrect) {
      totalCorrect++;
    } else {
      totalWrong++;
      totalNegativeMarks += evalRes.negativeMarksApplied;
    }

    answerResults.push({
      questionId: question.id,
      isCorrect: evalRes.isCorrect,
      marksAwarded: evalRes.marksAwarded,
      negativeMarksApplied: evalRes.negativeMarksApplied,
    });
  }

  // Ensure score doesn't drop below 0 if negative marks are heavy
  const finalObtainedMarks = Math.max(0, Math.round(obtainedMarks * 100) / 100);
  const percentage = totalMarks > 0 ? Math.round((finalObtainedMarks / totalMarks) * 1000) / 10 : 0;
  const passed = percentage >= passingPercentage;

  return {
    totalMarks: Math.round(totalMarks * 100) / 100,
    obtainedMarks: finalObtainedMarks,
    percentage,
    passed,
    totalCorrect,
    totalWrong,
    totalUnanswered,
    totalNegativeMarks: Math.round(totalNegativeMarks * 100) / 100,
    answerResults,
  };
}
