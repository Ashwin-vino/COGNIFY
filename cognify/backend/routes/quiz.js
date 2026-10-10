const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// POST /api/quizzes/submit (Validate and score quiz on server)
router.post('/submit', async (req, res, next) => {
  try {
    const { workspaceId, subjectId = null, studySetId = null, questions = [], userAnswers = {} } = req.body;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspaceId is required.' },
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No questions provided for grading.' },
      });
    }

    let correctCount = 0;
    const evaluatedAnswers = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const selectedIndex = userAnswers[q.id !== undefined ? q.id : i];
      const isCorrect = selectedIndex !== undefined && Number(selectedIndex) === Number(q.correctIndex);

      if (isCorrect) {
        correctCount++;
      }

      evaluatedAnswers.push({
        questionId: q.id !== undefined ? q.id : i,
        question: q.question,
        options: q.options,
        userSelectedIndex: selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
        topic: q.topic || 'General',
      });

      // Track weak topic or mistake
      await db.recordTopicMistake(
        req.user.id,
        workspaceId,
        subjectId,
        q.topic || 'General',
        isCorrect,
        req.token
      );
    }

    const totalQuestions = questions.length;
    const percentage = parseFloat(((correctCount / totalQuestions) * 100).toFixed(2));

    // Save attempt to database
    const attemptRecord = await db.recordQuizAttempt(
      req.user.id,
      workspaceId,
      {
        subject_id: subjectId,
        study_set_id: studySetId,
        total_questions: totalQuestions,
        score: correctCount,
        percentage,
        answers_json: evaluatedAnswers,
      },
      req.token
    );

    res.json({
      success: true,
      data: {
        attemptId: attemptRecord.id,
        totalQuestions,
        score: correctCount,
        percentage,
        evaluatedAnswers,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/workspaces/:id/quiz-attempts
router.get('/workspaces/:id/quiz-attempts', async (req, res, next) => {
  try {
    const attempts = await db.getQuizAttempts(req.user.id, req.params.id, req.token);
    res.json({ success: true, data: attempts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
