import { NextRequest, NextResponse } from 'next/server';
import { getSessionAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  const admin = await getSessionAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { questions, quizId, isQuestionBank = false, mode = 'preview' } = await req.json();

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'No question data provided' }, { status: 400 });
    }

    const validQuestions: any[] = [];
    const invalidQuestions: any[] = [];
    const errors: string[] = [];

    // Find current quiz or bank order index
    let currentOrderIndex = 0;
    if (quizId) {
      const last = await prisma.question.findFirst({
        where: { quizId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });
      if (last) currentOrderIndex = last.orderIndex + 1;
    }

    for (let i = 0; i < questions.length; i++) {
      const row = questions[i];
      const rowNum = i + 1;
      const qText = row.question || row.questionText || row.text;

      if (!qText || String(qText).trim() === '') {
        invalidQuestions.push(row);
        errors.push(`Row ${rowNum}: Question text is missing.`);
        continue;
      }

      const qType = (row.type || 'MCQ').toUpperCase();
      const marks = parseFloat(row.marks) || 1.0;
      const negativeMarks = parseFloat(row.negativeMarks) || 0.0;
      const difficulty = (row.difficulty || 'MEDIUM').toUpperCase();
      const subject = row.subject || 'General';
      const topic = row.topic || null;
      const explanation = row.explanation || null;

      // Extract options
      let parsedOptions: Array<{ optionText: string; isCorrect: boolean; orderIndex: number }> = [];

      if (Array.isArray(row.options)) {
        parsedOptions = row.options.map((opt: any, idx: number) => ({
          optionText: typeof opt === 'string' ? opt : opt.optionText || `Option ${idx + 1}`,
          isCorrect: Boolean(opt.isCorrect),
          orderIndex: idx,
        }));
      } else {
        // Standard CSV columns: option_a, option_b, option_c, option_d, correct_answer
        const optA = row.option_a || row.optionA || row.option1;
        const optB = row.option_b || row.optionB || row.option2;
        const optC = row.option_c || row.optionC || row.option3;
        const optD = row.option_d || row.optionD || row.option4;
        const correct = String(row.correct_answer || row.correctAnswer || row.answer || '').trim().toUpperCase();

        const opts = [optA, optB, optC, optD].filter(Boolean);
        if (opts.length > 0) {
          parsedOptions = opts.map((text, idx) => {
            const letter = String.fromCharCode(65 + idx); // 'A', 'B', 'C', 'D'
            const isCorrect =
              correct === letter ||
              correct === String(idx + 1) ||
              correct.toLowerCase() === String(text).toLowerCase();
            return {
              optionText: String(text).trim(),
              isCorrect,
              orderIndex: idx,
            };
          });
        }
      }

      if (['MCQ', 'MULTIPLE_SELECT', 'TRUE_FALSE'].includes(qType) && parsedOptions.length < 2) {
        // Fallback default options for True/False if not provided
        if (qType === 'TRUE_FALSE') {
          parsedOptions = [
            { optionText: 'True', isCorrect: row.correct_answer?.toLowerCase() === 'true', orderIndex: 0 },
            { optionText: 'False', isCorrect: row.correct_answer?.toLowerCase() === 'false', orderIndex: 1 },
          ];
        } else {
          invalidQuestions.push(row);
          errors.push(`Row ${rowNum}: Needs at least 2 options for ${qType}.`);
          continue;
        }
      }

      validQuestions.push({
        questionText: String(qText).trim(),
        description: row.description || null,
        type: qType,
        required: true,
        marks,
        negativeMarks,
        difficulty,
        subject,
        topic,
        explanation,
        options: parsedOptions,
      });
    }

    if (mode === 'preview') {
      return NextResponse.json({
        mode: 'preview',
        total: questions.length,
        validCount: validQuestions.length,
        invalidCount: invalidQuestions.length,
        errors,
        previewData: validQuestions.slice(0, 5),
      });
    }

    // Commit mode: save valid questions
    const createdQuestions = [];
    for (const vq of validQuestions) {
      const created = await prisma.question.create({
        data: {
          quizId: quizId || null,
          questionText: vq.questionText,
          description: vq.description,
          type: vq.type,
          required: vq.required,
          marks: vq.marks,
          negativeMarks: vq.negativeMarks,
          difficulty: vq.difficulty,
          subject: vq.subject,
          topic: vq.topic,
          explanation: vq.explanation,
          orderIndex: currentOrderIndex++,
          isQuestionBank: Boolean(isQuestionBank) || !quizId,
          options: {
            create: vq.options.map((opt: any) => ({
              optionText: opt.optionText,
              isCorrect: opt.isCorrect,
              orderIndex: opt.orderIndex,
            })),
          },
        },
        include: { options: true },
      });
      createdQuestions.push(created);
    }

    await prisma.auditLog.create({
      data: {
        adminId: admin.adminId,
        action: 'QUESTIONS_IMPORTED',
        details: JSON.stringify({ count: createdQuestions.length, quizId, isQuestionBank }),
      },
    });

    return NextResponse.json({
      success: true,
      mode: 'commit',
      importedCount: createdQuestions.length,
      invalidCount: invalidQuestions.length,
      errors,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 });
  }
}
