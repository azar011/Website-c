import prisma from './db';

export interface QuizAnalyticsData {
  summary: {
    totalParticipants: number;
    completedAttempts: number;
    incompleteAttempts: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    medianScore: number;
    passPercentage: number;
    failPercentage: number;
    averageDurationMinutes: number;
    totalViolations: number;
  };
  scoreDistribution: Array<{
    range: string;
    count: number;
  }>;
  dailyResponses: Array<{
    date: string;
    count: number;
    avgScore: number;
  }>;
  questionStats: Array<{
    id: string;
    questionText: string;
    type: string;
    marks: number;
    difficulty: string;
    totalAttempts: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    accuracy: number;
    optionsBreakdown?: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
      selectedCount: number;
      percentage: number;
    }>;
  }>;
  departmentStats: Array<{
    department: string;
    participantCount: number;
    avgScore: number;
    passRate: number;
  }>;
  classStats: Array<{
    className: string;
    participantCount: number;
    avgScore: number;
    passRate: number;
  }>;
}

export async function getQuizAnalytics(quizId: string): Promise<QuizAnalyticsData | null> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: {
          options: true,
        },
        orderBy: { orderIndex: 'asc' },
      },
      attempts: {
        include: {
          answers: true,
          violations: true,
        },
      },
    },
  });

  if (!quiz) return null;

  const allAttempts = quiz.attempts;
  const completedAttempts = allAttempts.filter((a) => a.status === 'SUBMITTED');
  const incompleteAttempts = allAttempts.filter((a) => a.status !== 'SUBMITTED');

  // Summary stats
  const totalParticipants = allAttempts.length;
  const scores = completedAttempts.map((a) => a.totalScore);
  const averageScore = scores.length > 0 ? scores.reduce((acc, s) => acc + s, 0) / scores.length : 0;
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

  // Median score
  let medianScore = 0;
  if (scores.length > 0) {
    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianScore = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  const passedCount = completedAttempts.filter((a) => a.passed).length;
  const passPercentage = completedAttempts.length > 0 ? (passedCount / completedAttempts.length) * 100 : 0;
  const failPercentage = completedAttempts.length > 0 ? 100 - passPercentage : 0;

  // Durations
  const durations = completedAttempts
    .filter((a) => a.submittedAt && a.startedAt)
    .map((a) => (new Date(a.submittedAt!).getTime() - new Date(a.startedAt).getTime()) / 60000);
  const averageDurationMinutes =
    durations.length > 0 ? durations.reduce((acc, d) => acc + d, 0) / durations.length : 0;

  const totalViolations = allAttempts.reduce((acc, a) => acc + (a.violationCount || 0), 0);

  // Score distribution intervals (0-20, 21-40, 41-60, 61-80, 81-100)
  const distributionBuckets = [
    { range: '0-20%', min: 0, max: 20, count: 0 },
    { range: '21-40%', min: 21, max: 40, count: 0 },
    { range: '41-60%', min: 41, max: 60, count: 0 },
    { range: '61-80%', min: 61, max: 80, count: 0 },
    { range: '81-100%', min: 81, max: 100, count: 0 },
  ];

  for (const att of completedAttempts) {
    const pct = att.percentage || 0;
    for (const b of distributionBuckets) {
      if (pct >= b.min && pct <= b.max) {
        b.count++;
        break;
      }
    }
  }

  // Daily Responses Trend
  const dailyMap = new Map<string, { count: number; totalScore: number }>();
  for (const att of allAttempts) {
    const dateStr = new Date(att.startedAt).toISOString().split('T')[0];
    const curr = dailyMap.get(dateStr) || { count: 0, totalScore: 0 };
    curr.count++;
    curr.totalScore += att.totalScore || 0;
    dailyMap.set(dateStr, curr);
  }

  const dailyResponses = Array.from(dailyMap.entries())
    .map(([date, d]) => ({
      date,
      count: d.count,
      avgScore: d.count > 0 ? Math.round((d.totalScore / d.count) * 10) / 10 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Question level analytics
  const questionStats = quiz.questions.map((q) => {
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const optCounts = new Map<string, number>();
    q.options.forEach((opt) => optCounts.set(opt.id, 0));

    for (const att of completedAttempts) {
      const ans = att.answers.find((a) => a.questionId === q.id);
      if (!ans || (!ans.selectedOptionIds && !ans.textAnswer && !ans.fileAnswerUrl)) {
        unansweredCount++;
      } else if (ans.isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
      }

      // Count option choices
      if (ans?.selectedOptionIds) {
        try {
          const ids: string[] = JSON.parse(ans.selectedOptionIds);
          ids.forEach((id) => {
            optCounts.set(id, (optCounts.get(id) || 0) + 1);
          });
        } catch {
          // ignore
        }
      }
    }

    const totalAns = correctCount + wrongCount;
    const accuracy = totalAns > 0 ? Math.round((correctCount / totalAns) * 100) : 0;

    const optionsBreakdown = q.options.map((opt) => {
      const count = optCounts.get(opt.id) || 0;
      const pct = completedAttempts.length > 0 ? Math.round((count / completedAttempts.length) * 100) : 0;
      return {
        id: opt.id,
        text: opt.optionText,
        isCorrect: opt.isCorrect,
        selectedCount: count,
        percentage: pct,
      };
    });

    return {
      id: q.id,
      questionText: q.questionText,
      type: q.type,
      marks: q.marks,
      difficulty: q.difficulty,
      totalAttempts: completedAttempts.length,
      correctCount,
      wrongCount,
      unansweredCount,
      accuracy,
      optionsBreakdown: q.options.length > 0 ? optionsBreakdown : undefined,
    };
  });

  // Department Breakdown
  const deptMap = new Map<string, { total: number; totalScore: number; passed: number }>();
  for (const att of completedAttempts) {
    const dept = att.department?.trim() || 'General / Unspecified';
    const curr = deptMap.get(dept) || { total: 0, totalScore: 0, passed: 0 };
    curr.total++;
    curr.totalScore += att.totalScore || 0;
    if (att.passed) curr.passed++;
    deptMap.set(dept, curr);
  }

  const departmentStats = Array.from(deptMap.entries()).map(([department, d]) => ({
    department,
    participantCount: d.total,
    avgScore: d.total > 0 ? Math.round((d.totalScore / d.total) * 10) / 10 : 0,
    passRate: d.total > 0 ? Math.round((d.passed / d.total) * 100) : 0,
  }));

  // Class Breakdown
  const classMap = new Map<string, { total: number; totalScore: number; passed: number }>();
  for (const att of completedAttempts) {
    const cName = att.studentClass?.trim() || 'Unassigned';
    const curr = classMap.get(cName) || { total: 0, totalScore: 0, passed: 0 };
    curr.total++;
    curr.totalScore += att.totalScore || 0;
    if (att.passed) curr.passed++;
    classMap.set(cName, curr);
  }

  const classStats = Array.from(classMap.entries()).map(([className, d]) => ({
    className,
    participantCount: d.total,
    avgScore: d.total > 0 ? Math.round((d.totalScore / d.total) * 10) / 10 : 0,
    passRate: d.total > 0 ? Math.round((d.passed / d.total) * 100) : 0,
  }));

  return {
    summary: {
      totalParticipants,
      completedAttempts: completedAttempts.length,
      incompleteAttempts: incompleteAttempts.length,
      averageScore: Math.round(averageScore * 10) / 10,
      highestScore: Math.round(highestScore * 10) / 10,
      lowestScore: Math.round(lowestScore * 10) / 10,
      medianScore: Math.round(medianScore * 10) / 10,
      passPercentage: Math.round(passPercentage * 10) / 10,
      failPercentage: Math.round(failPercentage * 10) / 10,
      averageDurationMinutes: Math.round(averageDurationMinutes * 10) / 10,
      totalViolations,
    },
    scoreDistribution: distributionBuckets.map((b) => ({ range: b.range, count: b.count })),
    dailyResponses,
    questionStats,
    departmentStats,
    classStats,
  };
}
