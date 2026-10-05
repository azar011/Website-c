import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial database...');

  // 1. Create Master Admin
  const masterAdminEmail = 'azar.admin@gmail.com';
  const masterPassHash = await bcrypt.hash('Azar@123', 10);
  const masterAdmin = await prisma.admin.upsert({
    where: { email: masterAdminEmail },
    update: { passwordHash: masterPassHash, role: 'SUPER_ADMIN', name: 'Azar (Master Admin)' },
    create: {
      email: masterAdminEmail,
      passwordHash: masterPassHash,
      name: 'Azar (Master Admin)',
      role: 'SUPER_ADMIN',
    },
  });
  console.log(`Created/Updated Master Admin: ${masterAdmin.email}`);

  // 1a. Create Azar Admin
  const azarEmail = 'azar@mail.com';
  const azarPassHash = await bcrypt.hash('Azar@123', 10);
  await prisma.admin.upsert({
    where: { email: azarEmail },
    update: { passwordHash: azarPassHash, role: 'ADMIN', name: 'Azarudeen B' },
    create: {
      email: azarEmail,
      passwordHash: azarPassHash,
      name: 'Azarudeen B',
      role: 'ADMIN',
    },
  });
  console.log(`Created/Updated Admin: ${azarEmail}`);

  // 1b. Create Standard Admin
  const adminEmail = 'admin@quizplatform.com';
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  });

  let admin;
  const passwordHash = await bcrypt.hash('AdminPassword@123', 10);

  if (!existingAdmin) {
    admin = await prisma.admin.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: 'Dr. Sarah Connor (Admin)',
        role: 'ADMIN',
      },
    });
    console.log(`Created admin: ${admin.email}`);
  } else {
    admin = existingAdmin;
    console.log(`Admin already exists: ${admin.email}`);
  }

  // 2. Create Python Programming Assessment Quiz
  const pythonQuizCode = 'PY8F29K';
  const existingPyQuiz = await prisma.quiz.findUnique({
    where: { publicCode: pythonQuizCode },
  });

  if (!existingPyQuiz) {
    const pyQuiz = await prisma.quiz.create({
      data: {
        title: 'Python Programming Assessment',
        description: 'Comprehensive core Python, data structures, OOP, and algorithm concepts evaluation.',
        instructions: 'Read each question carefully. Fullscreen mode is enforced. Switching tabs or exiting fullscreen will log a security violation. Answers are auto-saved in real time.',
        subject: 'Computer Science',
        category: 'Programming',
        targetClass: 'Semester 4 / Batch A',
        department: 'Information Technology',
        durationMinutes: 20,
        passingPercentage: 50.0,
        status: 'PUBLISHED',
        publicCode: pythonQuizCode,
        randomizeQuestions: false,
        randomizeOptions: true,
        adminId: admin.id,
        settings: {
          create: {
            acceptResponses: true,
            singleResponse: false,
            identificationMethod: 'REGISTER_NUMBER',
            maxAttempts: 2,
            requireName: true,
            requireRegisterNumber: true,
            requireEmail: true,
            requireClass: true,
            requireDepartment: true,
            enableAntiCheat: true,
            requireFullscreen: true,
            detectTabSwitch: true,
            detectWindowBlur: true,
            detectCopy: true,
            detectPaste: true,
            detectPrint: true,
            maxViolations: 3,
            violationAction: 'AUTO_SUBMIT',
            showScoreOnSubmit: true,
            showPercentageOnSubmit: true,
            showPassFailOnSubmit: true,
            showCorrectAnswers: true,
            showWrongAnswers: true,
            showExplanation: true,
            showAnswerReview: true,
          },
        },
      },
    });

    console.log(`Created quiz: ${pyQuiz.title} (Code: ${pyQuiz.publicCode})`);

    // Add Questions to Python Quiz
    // Q1: MCQ
    const q1 = await prisma.question.create({
      data: {
        quizId: pyQuiz.id,
        questionText: 'What is the primary output of `print(type([]))` in Python 3?',
        description: 'Standard built-in type evaluation.',
        type: 'MCQ',
        required: true,
        marks: 2.0,
        negativeMarks: 0.5,
        explanation: 'In Python, square brackets `[]` define a list, so `type([])` returns `<class \'list\'>`.',
        orderIndex: 0,
        subject: 'Python',
        topic: 'Data Types',
        difficulty: 'EASY',
        options: {
          create: [
            { optionText: "<class 'list'>", isCorrect: true, orderIndex: 0 },
            { optionText: "<class 'array'>", isCorrect: false, orderIndex: 1 },
            { optionText: "<class 'tuple'>", isCorrect: false, orderIndex: 2 },
            { optionText: "<class 'dict'>", isCorrect: false, orderIndex: 3 },
          ],
        },
      },
    });

    // Q2: Multiple Select
    const q2 = await prisma.question.create({
      data: {
        quizId: pyQuiz.id,
        questionText: 'Which of the following data structures in Python are IMMUTABLE?',
        description: 'Select all correct options.',
        type: 'MULTIPLE_SELECT',
        required: true,
        marks: 3.0,
        negativeMarks: 0.5,
        explanation: 'Tuples, strings (str), and frozensets are immutable in Python. Lists and Dictionaries are mutable.',
        orderIndex: 1,
        subject: 'Python',
        topic: 'Immutability',
        difficulty: 'MEDIUM',
        options: {
          create: [
            { optionText: 'Tuple', isCorrect: true, orderIndex: 0 },
            { optionText: 'String (str)', isCorrect: true, orderIndex: 1 },
            { optionText: 'List', isCorrect: false, orderIndex: 2 },
            { optionText: 'Dictionary', isCorrect: false, orderIndex: 3 },
            { optionText: 'FrozenSet', isCorrect: true, orderIndex: 4 },
          ],
        },
      },
    });

    // Q3: True / False
    const q3 = await prisma.question.create({
      data: {
        quizId: pyQuiz.id,
        questionText: 'In Python, functions are first-class citizens, meaning they can be passed as arguments to other functions.',
        type: 'TRUE_FALSE',
        required: true,
        marks: 1.0,
        negativeMarks: 0.0,
        explanation: 'True. Functions in Python can be assigned to variables, passed into functions, and returned from functions.',
        orderIndex: 2,
        subject: 'Python',
        topic: 'Functions',
        difficulty: 'EASY',
        options: {
          create: [
            { optionText: 'True', isCorrect: true, orderIndex: 0 },
            { optionText: 'False', isCorrect: false, orderIndex: 1 },
          ],
        },
      },
    });

    // Q4: Short Answer / Fill in blank
    const q4 = await prisma.question.create({
      data: {
        quizId: pyQuiz.id,
        questionText: 'Python was conceived and initially developed by which Dutch programmer in late 1989?',
        description: 'Provide the full or common name.',
        type: 'SHORT_ANSWER',
        required: true,
        marks: 2.0,
        negativeMarks: 0.0,
        evaluationType: 'KEYWORD_MATCH',
        keywords: 'Guido van Rossum, Guido van rossum, Guido Van Rossum, van rossum, Guido',
        explanation: 'Guido van Rossum created Python and served as its Benevolent Dictator For Life (BDFL) until 2018.',
        orderIndex: 3,
        subject: 'Python',
        topic: 'History',
        difficulty: 'EASY',
      },
    });

    // Q5: Matching
    const q5 = await prisma.question.create({
      data: {
        quizId: pyQuiz.id,
        questionText: 'Match each Python keyword/module with its primary purpose:',
        type: 'MATCHING',
        required: true,
        marks: 4.0,
        negativeMarks: 0.0,
        explanation: '`yield` creates generators, `asyncio` manages asynchronous event loops, `pickle` provides object serialization, `pytest` is a test runner.',
        orderIndex: 4,
        subject: 'Python',
        topic: 'Standard Library',
        difficulty: 'HARD',
        options: {
          create: [
            { optionText: 'yield', matchTarget: 'Generator function return', isCorrect: true, orderIndex: 0 },
            { optionText: 'asyncio', matchTarget: 'Asynchronous event loop', isCorrect: true, orderIndex: 1 },
            { optionText: 'pickle', matchTarget: 'Object serialization', isCorrect: true, orderIndex: 2 },
            { optionText: 'pytest', matchTarget: 'Testing framework', isCorrect: true, orderIndex: 3 },
          ],
        },
      },
    });

    // Create realistic sample attempts for Python quiz so admin can immediately see analytics & reports
    const attemptsData = [
      {
        studentName: 'Alex Mercer',
        registerNumber: '23CS101',
        email: 'alex.mercer@college.edu',
        studentClass: '4th Sem CS-A',
        department: 'Computer Science',
        score: 11.0,
        percentage: 91.6,
        passed: true,
        totalCorrect: 4,
        totalWrong: 0,
        totalUnanswered: 0,
        totalNegativeMarks: 0.0,
        violations: 0,
      },
      {
        studentName: 'Priya Sharma',
        registerNumber: '23CS102',
        email: 'priya.sharma@college.edu',
        studentClass: '4th Sem CS-A',
        department: 'Computer Science',
        score: 9.5,
        percentage: 79.1,
        passed: true,
        totalCorrect: 3,
        totalWrong: 1,
        totalUnanswered: 0,
        totalNegativeMarks: 0.5,
        violations: 1,
      },
      {
        studentName: 'David Zhang',
        registerNumber: '23IT204',
        email: 'david.zhang@college.edu',
        studentClass: '4th Sem IT-B',
        department: 'Information Technology',
        score: 4.0,
        percentage: 33.3,
        passed: false,
        totalCorrect: 2,
        totalWrong: 2,
        totalUnanswered: 1,
        totalNegativeMarks: 1.0,
        violations: 2,
      },
      {
        studentName: 'Kavita Menon',
        registerNumber: '23CS115',
        email: 'kavita.m@college.edu',
        studentClass: '4th Sem CS-A',
        department: 'Computer Science',
        score: 12.0,
        percentage: 100.0,
        passed: true,
        totalCorrect: 5,
        totalWrong: 0,
        totalUnanswered: 0,
        totalNegativeMarks: 0.0,
        violations: 0,
      },
    ];

    for (const [idx, att] of attemptsData.entries()) {
      const started = new Date(Date.now() - (idx + 1) * 3600000);
      const submitted = new Date(started.getTime() + (12 + idx * 2) * 60000);
      
      const createdAttempt = await prisma.attempt.create({
        data: {
          quizId: pyQuiz.id,
          studentName: att.studentName,
          registerNumber: att.registerNumber,
          email: att.email,
          studentClass: att.studentClass,
          department: att.department,
          sessionId: `sess_${Math.random().toString(36).substring(2, 10)}`,
          attemptToken: `tok_${Math.random().toString(36).substring(2, 14)}`,
          startedAt: started,
          expiresAt: new Date(started.getTime() + 20 * 60000),
          submittedAt: submitted,
          status: 'SUBMITTED',
          totalScore: att.score,
          percentage: att.percentage,
          passed: att.passed,
          totalCorrect: att.totalCorrect,
          totalWrong: att.totalWrong,
          totalUnanswered: att.totalUnanswered,
          totalNegativeMarks: att.totalNegativeMarks,
          violationCount: att.violations,
        },
      });

      if (att.violations > 0) {
        await prisma.violationLog.create({
          data: {
            attemptId: createdAttempt.id,
            quizId: pyQuiz.id,
            violationType: 'TAB_SWITCH',
            durationSeconds: 4,
            metadata: JSON.stringify({ reason: 'Student switched browser tab to search engine' }),
            timestamp: new Date(started.getTime() + 5 * 60000),
          },
        });
      }
    }
  }

  // 3. Create Web Development Quiz
  const webQuizCode = 'WEB901X';
  const existingWebQuiz = await prisma.quiz.findUnique({
    where: { publicCode: webQuizCode },
  });

  if (!existingWebQuiz) {
    const webQuiz = await prisma.quiz.create({
      data: {
        title: 'Full-Stack Web Development Mastery',
        description: 'Modern JavaScript (ES6+), React 19, Next.js App Router, CSS Grid/Flexbox, and REST APIs.',
        instructions: 'Answer all questions. Strict anti-cheat monitoring active.',
        subject: 'Web Technologies',
        category: 'Software Engineering',
        targetClass: 'Final Year CSE',
        department: 'Computer Science & Engineering',
        durationMinutes: 30,
        passingPercentage: 60.0,
        status: 'PUBLISHED',
        publicCode: webQuizCode,
        adminId: admin.id,
        settings: {
          create: {
            acceptResponses: true,
            singleResponse: true,
            identificationMethod: 'REGISTER_NUMBER',
            maxAttempts: 1,
            requireName: true,
            requireRegisterNumber: true,
            requireEmail: true,
            enableAntiCheat: true,
            requireFullscreen: true,
            detectTabSwitch: true,
            detectCopy: true,
            maxViolations: 3,
            violationAction: 'AUTO_SUBMIT',
            showScoreOnSubmit: true,
            showPercentageOnSubmit: true,
            showPassFailOnSubmit: true,
          },
        },
      },
    });

    await prisma.question.create({
      data: {
        quizId: webQuiz.id,
        questionText: 'Which HTTP method is idempotent and used to replace an entire resource at a URI?',
        type: 'MCQ',
        required: true,
        marks: 2.0,
        negativeMarks: 0.0,
        explanation: 'PUT is idempotent and replaces the entire target resource with the request payload.',
        orderIndex: 0,
        subject: 'Web',
        topic: 'HTTP Protocols',
        difficulty: 'EASY',
        options: {
          create: [
            { optionText: 'PUT', isCorrect: true, orderIndex: 0 },
            { optionText: 'POST', isCorrect: false, orderIndex: 1 },
            { optionText: 'PATCH', isCorrect: false, orderIndex: 2 },
            { optionText: 'CONNECT', isCorrect: false, orderIndex: 3 },
          ],
        },
      },
    });
  }

  // 4. Create Question Bank items
  const qbCount = await prisma.question.count({ where: { isQuestionBank: true } });
  if (qbCount === 0) {
    await prisma.question.create({
      data: {
        questionText: 'What is the time complexity of searching for an element in a balanced Binary Search Tree (BST)?',
        description: 'Standard Big-O notation.',
        type: 'MCQ',
        required: true,
        marks: 2.0,
        negativeMarks: 0.5,
        explanation: 'A balanced BST has height O(log N), so lookup requires O(log N) comparisons.',
        orderIndex: 0,
        subject: 'Data Structures',
        topic: 'Trees',
        difficulty: 'MEDIUM',
        isQuestionBank: true,
        options: {
          create: [
            { optionText: 'O(log N)', isCorrect: true, orderIndex: 0 },
            { optionText: 'O(N)', isCorrect: false, orderIndex: 1 },
            { optionText: 'O(1)', isCorrect: false, orderIndex: 2 },
            { optionText: 'O(N log N)', isCorrect: false, orderIndex: 3 },
          ],
        },
      },
    });

    await prisma.question.create({
      data: {
        questionText: 'Explain the ACID properties of relational database management systems.',
        type: 'LONG_ANSWER',
        required: true,
        marks: 5.0,
        negativeMarks: 0.0,
        explanation: 'Atomicity, Consistency, Isolation, and Durability guarantee database transaction reliability.',
        orderIndex: 1,
        subject: 'Database Systems',
        topic: 'Transactions',
        difficulty: 'HARD',
        isQuestionBank: true,
      },
    });
  }

  // 5. Create Audit Log
  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: 'SYSTEM_INITIALIZED',
      details: JSON.stringify({ message: 'Quiz platform seeded successfully with demo assessment and sample attempts' }),
      ipAddress: '127.0.0.1',
    },
  });

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
