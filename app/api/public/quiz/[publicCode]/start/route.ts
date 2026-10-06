import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { generateAttemptToken, generateSessionId, shuffleArray, checkRateLimit } from '@/lib/security';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ publicCode: string }> }
) {
  const { publicCode } = await params;
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

  // Allow up to 1000 starts per minute per IP to support large batches of students on shared institutional/lab Wi-Fi networks
  const rateCheck = checkRateLimit(`start_${ip}`, 1000, 60000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Too many requests from this network. Please wait ${rateCheck.resetIn} seconds.` },
      { status: 429 }
    );
  }

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { publicCode: publicCode.toUpperCase().trim() },
      include: {
        settings: true,
        questions: {
          include: {
            options: {
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    if (quiz.status !== 'PUBLISHED') {
      return NextResponse.json(
        { error: 'This quiz is not currently published.' },
        { status: 403 }
      );
    }

    if (quiz.settings?.isLinkDisabled || quiz.settings?.acceptResponses === false) {
      return NextResponse.json(
        { error: 'This quiz is no longer accepting responses.' },
        { status: 403 }
      );
    }

    const now = new Date();
    if (quiz.startDate && now < new Date(quiz.startDate)) {
      return NextResponse.json({ error: 'This quiz has not started yet.' }, { status: 403 });
    }
    if (quiz.endDate && now > new Date(quiz.endDate)) {
      return NextResponse.json({ error: 'This quiz has ended.' }, { status: 403 });
    }

    const body = await req.json();
    const { studentName, registerNumber, email, studentClass, department } = body;

    const settings = quiz.settings;

    // Validate Required Student Identity Fields
    if (settings?.requireName && (!studentName || !studentName.trim())) {
      return NextResponse.json({ error: 'Full Name is required to start this quiz.' }, { status: 400 });
    }
    if (settings?.requireRegisterNumber && (!registerNumber || !registerNumber.trim())) {
      return NextResponse.json({ error: 'Register Number / Roll Number is required.' }, { status: 400 });
    }
    if (settings?.requireEmail && (!email || !email.trim())) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }
    if (settings?.requireClass && (!studentClass || !studentClass.trim())) {
      return NextResponse.json({ error: 'Class / Section is required.' }, { status: 400 });
    }
    if (settings?.requireDepartment && (!department || !department.trim())) {
      return NextResponse.json({ error: 'Department is required.' }, { status: 400 });
    }

    // Backend Response & Attempt Enforcement
    const idMethod = settings?.identificationMethod || 'REGISTER_NUMBER';
    const whereIdentifier: any = { quizId: quiz.id };

    if (idMethod === 'REGISTER_NUMBER' && registerNumber) {
      whereIdentifier.registerNumber = registerNumber.trim();
    } else if (idMethod === 'EMAIL' && email) {
      whereIdentifier.email = email.trim().toLowerCase();
    } else if (idMethod === 'NAME' && studentName) {
      whereIdentifier.studentName = studentName.trim();
    } else if (idMethod === 'NAME_AND_REGISTER_NUMBER' && studentName && registerNumber) {
      whereIdentifier.studentName = studentName.trim();
      whereIdentifier.registerNumber = registerNumber.trim();
    } else if (idMethod === 'EMAIL_AND_REGISTER_NUMBER' && email && registerNumber) {
      whereIdentifier.email = email.trim().toLowerCase();
      whereIdentifier.registerNumber = registerNumber.trim();
    } else if (registerNumber) {
      whereIdentifier.registerNumber = registerNumber.trim();
    }

    // Check existing attempts
    const existingAttempts = await prisma.attempt.findMany({
      where: whereIdentifier,
    });

    const completedAttempts = existingAttempts.filter((a) => a.status === 'SUBMITTED');

    // Single Response check
    if (settings?.singleResponse && completedAttempts.length > 0) {
      return NextResponse.json(
        {
          error: 'You have already submitted this quiz. Multiple submissions are not permitted for this assessment.',
        },
        { status: 403 }
      );
    }

    // Max Attempts check
    const maxAttempts = settings?.maxAttempts || 1;
    if (maxAttempts > 0 && completedAttempts.length >= maxAttempts) {
      return NextResponse.json(
        {
          error: `Maximum allowed attempts (${maxAttempts}) reached for this identification.`,
        },
        { status: 403 }
      );
    }

    // Check if there is an existing IN_PROGRESS attempt for this student
    let activeAttempt = existingAttempts.find(
      (a) => a.status === 'IN_PROGRESS' && new Date(a.expiresAt) > now
    );

    let attemptToken = activeAttempt ? activeAttempt.attemptToken : generateAttemptToken();
    let sessionId = generateSessionId();

    let orderedQuestions = [...quiz.questions];

    // Question Pool handling if pool size is set
    if (quiz.questionPoolSize && quiz.questionPoolSize < orderedQuestions.length) {
      orderedQuestions = shuffleArray(orderedQuestions).slice(0, quiz.questionPoolSize);
    }

    // Randomize Questions if enabled
    if (quiz.randomizeQuestions) {
      orderedQuestions = shuffleArray(orderedQuestions);
    }

    const questionOrder = orderedQuestions.map((q) => q.id);
    const optionOrderMapping: Record<string, string[]> = {};

    for (const q of orderedQuestions) {
      let opts = [...q.options];
      if (quiz.randomizeOptions && opts.length > 1 && q.type !== 'MATCHING') {
        opts = shuffleArray(opts);
      }
      optionOrderMapping[q.id] = opts.map((o) => o.id);
    }

    const durationMinutes = quiz.durationMinutes || 30;
    const startedAt = now;
    const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60000);

    if (!activeAttempt) {
      activeAttempt = await prisma.attempt.create({
        data: {
          quizId: quiz.id,
          studentName: studentName?.trim() || null,
          registerNumber: registerNumber?.trim() || null,
          email: email?.trim()?.toLowerCase() || null,
          studentClass: studentClass?.trim() || null,
          department: department?.trim() || null,
          sessionId,
          attemptToken,
          questionOrder: JSON.stringify(questionOrder),
          optionOrderMapping: JSON.stringify(optionOrderMapping),
          startedAt,
          expiresAt,
          status: 'IN_PROGRESS',
        },
      });
    }

    // Build SAFE questions array for the student (NEVER SEND isCorrect OR explanation)
    const safeQuestions = orderedQuestions.map((q, idx) => {
      const optionIds = optionOrderMapping[q.id] || q.options.map((o) => o.id);
      const sortedOptions = optionIds
        .map((id) => q.options.find((o) => o.id === id))
        .filter(Boolean)
        .map((opt) => ({
          id: opt!.id,
          optionText: opt!.optionText,
          matchTarget: opt!.matchTarget ? 'MATCH_PLACEHOLDER' : undefined, // hides answer key
        }));

      // For matching questions, collect available target options for dropdown/selection
      let matchingTargets: string[] = [];
      if (q.type === 'MATCHING') {
        matchingTargets = shuffleArray(
          q.options.map((o) => o.matchTarget).filter(Boolean) as string[]
        );
      }

      return {
        id: q.id,
        index: idx + 1,
        questionText: q.questionText,
        description: q.description,
        type: q.type,
        required: q.required,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        imageUrl: q.imageUrl,
        videoUrl: q.videoUrl,
        options: sortedOptions,
        matchingTargets: matchingTargets.length > 0 ? matchingTargets : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      attemptToken: activeAttempt.attemptToken,
      sessionId,
      startedAt: activeAttempt.startedAt,
      expiresAt: activeAttempt.expiresAt,
      durationMinutes,
      quizTitle: quiz.title,
      instructions: quiz.instructions,
      settings: {
        enableAntiCheat: settings?.enableAntiCheat ?? true,
        requireFullscreen: settings?.requireFullscreen ?? true,
        detectTabSwitch: settings?.detectTabSwitch ?? true,
        detectWindowBlur: settings?.detectWindowBlur ?? true,
        detectCopy: settings?.detectCopy ?? true,
        detectPaste: settings?.detectPaste ?? true,
        detectPrint: settings?.detectPrint ?? true,
        maxViolations: settings?.maxViolations ?? 3,
        violationAction: settings?.violationAction ?? 'AUTO_SUBMIT',
      },
      questions: safeQuestions,
    });
  } catch (error: any) {
    console.error('Start quiz attempt error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start quiz' }, { status: 500 });
  }
}
