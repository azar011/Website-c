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
        batches: {
          include: {
            batch: {
              include: {
                students: true,
              },
            },
          },
        },
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

    let verifiedStudentName = studentName?.trim() || null;
    let verifiedClass = studentClass?.trim() || null;
    let verifiedDepartment = department?.trim() || null;
    let verifiedEmail = email?.trim()?.toLowerCase() || null;

    // 1. Batch Restriction Verification (Extra Option)
    if (settings?.restrictToBatch) {
      if (!registerNumber || !registerNumber.trim()) {
        return NextResponse.json(
          { error: 'Register Number / Roll Number is required for this batch-assigned quiz.' },
          { status: 400 }
        );
      }

      const assignedBatches = quiz.batches || [];
      if (assignedBatches.length === 0) {
        return NextResponse.json(
          {
            error: 'This quiz is set to batch-restricted, but no student batches have been assigned yet. Please contact your instructor.',
          },
          { status: 403 }
        );
      }

      // Check all students in assigned batches
      const enrolledStudents = assignedBatches.flatMap((b) =>
        b.batch.students.map((s) => ({
          ...s,
          batchClassName: b.batch.className,
          batchDept: b.batch.department,
          batchName: b.batch.name,
        }))
      );

      const matchedStudent = enrolledStudents.find(
        (s) => s.registerNumber.trim().toLowerCase() === registerNumber.trim().toLowerCase()
      );

      if (!matchedStudent) {
        return NextResponse.json(
          {
            error: `Access Denied: Register number "${registerNumber.trim()}" is not registered in the assigned student batch for this assessment. Only enrolled students can take this quiz.`,
            isBatchRestricted: true,
          },
          { status: 403 }
        );
      }

      // Auto-fill student name and class/department from batch record if not provided
      if (!verifiedStudentName) verifiedStudentName = matchedStudent.name;
      if (!verifiedClass) verifiedClass = matchedStudent.batchClassName || null;
      if (!verifiedDepartment) verifiedDepartment = matchedStudent.batchDept || null;
      if (!verifiedEmail && matchedStudent.email) verifiedEmail = matchedStudent.email;
    }

    // Validate Required Student Identity Fields
    if (settings?.requireName && (!verifiedStudentName || !verifiedStudentName.trim())) {
      return NextResponse.json({ error: 'Full Name is required to start this quiz.' }, { status: 400 });
    }
    if (settings?.requireRegisterNumber && (!registerNumber || !registerNumber.trim())) {
      return NextResponse.json({ error: 'Register Number / Roll Number is required.' }, { status: 400 });
    }
    if (settings?.requireEmail && (!verifiedEmail || !verifiedEmail.trim())) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }
    if (settings?.requireClass && (!verifiedClass || !verifiedClass.trim())) {
      return NextResponse.json({ error: 'Class / Section is required.' }, { status: 400 });
    }
    if (settings?.requireDepartment && (!verifiedDepartment || !verifiedDepartment.trim())) {
      return NextResponse.json({ error: 'Department is required.' }, { status: 400 });
    }

    // Backend Response & Attempt Enforcement
    const idMethod = settings?.identificationMethod || 'REGISTER_NUMBER';
    const whereIdentifier: any = { quizId: quiz.id };

    if (idMethod === 'REGISTER_NUMBER' && registerNumber) {
      whereIdentifier.registerNumber = registerNumber.trim();
    } else if (idMethod === 'EMAIL' && verifiedEmail) {
      whereIdentifier.email = verifiedEmail.trim().toLowerCase();
    } else if (idMethod === 'NAME' && verifiedStudentName) {
      whereIdentifier.studentName = verifiedStudentName.trim();
    } else if (idMethod === 'NAME_AND_REGISTER_NUMBER' && verifiedStudentName && registerNumber) {
      whereIdentifier.studentName = verifiedStudentName.trim();
      whereIdentifier.registerNumber = registerNumber.trim();
    } else if (idMethod === 'EMAIL_AND_REGISTER_NUMBER' && verifiedEmail && registerNumber) {
      whereIdentifier.email = verifiedEmail.trim().toLowerCase();
      whereIdentifier.registerNumber = registerNumber.trim();
    } else if (registerNumber) {
      whereIdentifier.registerNumber = registerNumber.trim();
    }

    // Check existing attempts
    const existingAttempts = await prisma.attempt.findMany({
      where: whereIdentifier,
      orderBy: { createdAt: 'desc' },
    });

    const completedAttempts = existingAttempts.filter((a) => a.status === 'SUBMITTED');

    // 2. Single Attempt Check (Enforced when restrictToBatch is active OR singleResponse is enabled)
    const isSingleAttemptEnforced = settings?.singleResponse || settings?.restrictToBatch;
    if (isSingleAttemptEnforced && completedAttempts.length > 0) {
      return NextResponse.json(
        {
          error:
            'You have already submitted this test. One student can attend the test only once. If you submitted prematurely or need to continue, please request your instructor/admin to resume your test.',
          alreadySubmitted: true,
          canBeResumed: settings?.allowResumeByAdmin ?? true,
        },
        { status: 403 }
      );
    }

    // Max Attempts check (if not strictly single-attempt)
    const maxAttempts = settings?.maxAttempts || 1;
    if (!isSingleAttemptEnforced && maxAttempts > 0 && completedAttempts.length >= maxAttempts) {
      return NextResponse.json(
        {
          error: `Maximum allowed attempts (${maxAttempts}) reached for this identification.`,
        },
        { status: 403 }
      );
    }

    // 3. Check if there is an existing IN_PROGRESS attempt for this student (or one resumed by the admin!)
    let activeAttempt = existingAttempts.find(
      (a) => a.status === 'IN_PROGRESS' && new Date(a.expiresAt) > now
    );

    let attemptToken = activeAttempt ? activeAttempt.attemptToken : generateAttemptToken();
    let sessionId = generateSessionId();

    let orderedQuestions = [...quiz.questions];

    // Preserve saved question order if active/resumed attempt
    if (activeAttempt && activeAttempt.questionOrder) {
      try {
        const savedOrder: string[] = JSON.parse(activeAttempt.questionOrder);
        const map = new Map(quiz.questions.map((q) => [q.id, q]));
        const reconstructed = savedOrder.map((qid) => map.get(qid)).filter(Boolean) as typeof quiz.questions;
        if (reconstructed.length > 0) {
          orderedQuestions = reconstructed;
        }
      } catch {}
    } else {
      // Question Pool handling if pool size is set
      if (quiz.questionPoolSize && quiz.questionPoolSize < orderedQuestions.length) {
        orderedQuestions = shuffleArray(orderedQuestions).slice(0, quiz.questionPoolSize);
      }
      // Randomize Questions if enabled
      if (quiz.randomizeQuestions) {
        orderedQuestions = shuffleArray(orderedQuestions);
      }
    }

    const questionOrder = orderedQuestions.map((q) => q.id);
    let optionOrderMapping: Record<string, string[]> = {};

    if (activeAttempt && activeAttempt.optionOrderMapping) {
      try {
        optionOrderMapping = JSON.parse(activeAttempt.optionOrderMapping);
      } catch {}
    } else {
      for (const q of orderedQuestions) {
        let opts = [...q.options];
        if (quiz.randomizeOptions && opts.length > 1 && q.type !== 'MATCHING') {
          opts = shuffleArray(opts);
        }
        optionOrderMapping[q.id] = opts.map((o) => o.id);
      }
    }

    const durationMinutes = quiz.durationMinutes || 30;
    const startedAt = now;
    const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60000);

    if (!activeAttempt) {
      activeAttempt = await prisma.attempt.create({
        data: {
          quizId: quiz.id,
          studentName: verifiedStudentName,
          registerNumber: registerNumber?.trim() || null,
          email: verifiedEmail,
          studentClass: verifiedClass,
          department: verifiedDepartment,
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

    // 4. Retrieve any saved answers if attempt is resumed or already started
    const savedAnswers: Record<string, any> = {};
    if (activeAttempt) {
      const priorAnswers = await prisma.responseAnswer.findMany({
        where: { attemptId: activeAttempt.id },
      });
      for (const ans of priorAnswers) {
        let opts: string[] = [];
        try {
          opts = JSON.parse(ans.selectedOptionIds || '[]');
        } catch {
          if (ans.selectedOptionIds) opts = [ans.selectedOptionIds];
        }
        savedAnswers[ans.questionId] = {
          selectedOptionIds: opts,
          textAnswer: ans.textAnswer || '',
        };
      }
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
      isResumed: (activeAttempt.resumedCount || 0) > 0,
      savedAnswers,
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
        disablePreviousQuestion: settings?.disablePreviousQuestion ?? false,
      },
      questions: safeQuestions,
    });
  } catch (error: any) {
    console.error('Start quiz attempt error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start quiz' }, { status: 500 });
  }
}
