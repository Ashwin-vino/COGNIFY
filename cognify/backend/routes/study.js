const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { retrieveContext } = require('../services/retrieval');
const {
  generateMindMap,
  generateFlashcards,
  generateQuestions,
  generateQuiz,
  generateSummary,
  generateExamAnswer,
  generateStudyGuide,
} = require('../services/studyGenerator');
const { calculateSM2, compute7DayRetention } = require('../services/sm2');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Helper to assemble relevant context text from workspace retrieval
async function getContextForStudyTool(userId, workspaceId, query, subjectId, selectedSourceIds, token) {
  const { chunks, sources, groundingStatus } = await retrieveContext(
    userId,
    workspaceId,
    query || 'overview concepts definitions key points',
    { subjectId, topK: 8, selectedSourceIds },
    token
  );

  const contextText = chunks.map(c => c.text).join('\n\n');
  return { contextText, sources, groundingStatus };
}

// POST /api/study/mindmap
router.post('/mindmap', async (req, res, next) => {
  try {
    const { workspaceId, topic, subjectId = null, selectedSourceIds = null } = req.body;
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspaceId is required.' },
      });
    }

    const workspace = await db.getWorkspaceById(req.user.id, workspaceId, req.token);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found.' },
      });
    }

    const { contextText, sources, groundingStatus } = await getContextForStudyTool(
      req.user.id,
      workspaceId,
      topic || workspace.name,
      subjectId,
      selectedSourceIds,
      req.token
    );

    const mindMapData = await generateMindMap({
      topic: topic || workspace.name,
      contextText,
      workspaceInfo: workspace,
    });

    res.json({
      success: true,
      data: {
        mindMap: mindMapData,
        sources,
        groundingStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/study/flashcards
router.post('/flashcards', async (req, res, next) => {
  try {
    const { workspaceId, topic, quantity = 10, difficulty = 'mixed', subjectId = null, selectedSourceIds = null } = req.body;
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspaceId is required.' },
      });
    }

    const validatedCount = Math.min(Math.max(parseInt(quantity, 10) || 10, 1), 50);

    const { contextText, sources, groundingStatus } = await getContextForStudyTool(
      req.user.id,
      workspaceId,
      topic || 'key concepts terms formulas',
      subjectId,
      selectedSourceIds,
      req.token
    );

    const deck = await generateFlashcards({
      topic: topic || 'Study Deck',
      quantity: validatedCount,
      difficulty,
      contextText,
    });

    // Save cards into SM-2 spaced repetition storage
    let savedCards = [];
    if (deck.flashcards && deck.flashcards.length > 0) {
      savedCards = await db.saveFlashcards(req.user.id, workspaceId, deck.flashcards, null, req.token);
    }

    res.json({
      success: true,
      data: {
        ...deck,
        flashcards: savedCards.length > 0 ? savedCards : deck.flashcards,
        sources,
        groundingStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/study/flashcards/:id/review (SM-2 Spaced Repetition Grading)
router.post('/flashcards/:id/review', async (req, res, next) => {
  try {
    const cardId = req.params.id;
    const { rating = 4, workspaceId } = req.body; // 0 = Again, 3 = Hard, 4 = Good, 5 = Easy

    let card = null;
    if (workspaceId) {
      const allCards = await db.getWorkspaceFlashcards(req.user.id, workspaceId, req.token);
      card = allCards.find(c => c.id === cardId);
    } else {
      card = await db.getFlashcardById(req.user.id, cardId, req.token);
    }

    if (!card) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Flashcard not found.' },
      });
    }

    // Run SM-2 calculation
    const sm2Result = calculateSM2({
      repetition: card.repetition || 0,
      interval: card.interval_days || 1,
      easeFactor: card.ease_factor || 2.5,
      rating: parseInt(rating, 10),
    });

    // Record review state
    const updatedCard = await db.recordFlashcardReview(req.user.id, cardId, rating, sm2Result, req.token);

    res.json({
      success: true,
      data: {
        cardId,
        card: updatedCard || card,
        sm2: sm2Result,
        ...sm2Result,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/study/workspaces/:id/flashcards
router.get('/workspaces/:id/flashcards', async (req, res, next) => {
  try {
    const cards = await db.getWorkspaceFlashcards(req.user.id, req.params.id, req.token);
    res.json({ success: true, data: cards });
  } catch (err) {
    next(err);
  }
});

// GET /api/study/workspaces/:id/flashcards/due
router.get('/workspaces/:id/flashcards/due', async (req, res, next) => {
  try {
    const cards = await db.getWorkspaceFlashcards(req.user.id, req.params.id, req.token);
    const now = new Date();
    const due = cards.filter(c => !c.next_review_date || new Date(c.next_review_date) <= now);
    res.json({ success: true, data: due });
  } catch (err) {
    next(err);
  }
});

// GET /api/study/workspaces/:id/retention (7-Day Spaced Repetition Analytics)
router.get('/workspaces/:id/retention', async (req, res, next) => {
  try {
    const [cards, logs] = await Promise.all([
      db.getWorkspaceFlashcards(req.user.id, req.params.id, req.token),
      db.getReviewLogs(req.user.id, req.token),
    ]);

    const metrics = compute7DayRetention(logs, cards);
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
});

// POST /api/study/questions
router.post('/questions', async (req, res, next) => {
  try {
    const { workspaceId, topic, quantity = 10, type = 'mixed', difficulty = 'mixed', marks = null, subjectId = null, selectedSourceIds = null } = req.body;
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspaceId is required.' },
      });
    }

    const validatedCount = Math.min(Math.max(parseInt(quantity, 10) || 10, 1), 50);

    const { contextText, sources, groundingStatus } = await getContextForStudyTool(
      req.user.id,
      workspaceId,
      topic || 'exam questions tests',
      subjectId,
      selectedSourceIds,
      req.token
    );

    const questionsData = await generateQuestions({
      topic: topic || 'Exam Practice',
      quantity: validatedCount,
      type,
      difficulty,
      marks,
      contextText,
    });

    res.json({
      success: true,
      data: {
        ...questionsData,
        sources,
        groundingStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/study/quiz
router.post('/quiz', async (req, res, next) => {
  try {
    const { workspaceId, topic, quantity = 5, difficulty = 'medium', subjectId = null, selectedSourceIds = null } = req.body;
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspaceId is required.' },
      });
    }

    const validatedCount = Math.min(Math.max(parseInt(quantity, 10) || 5, 1), 50);

    const { contextText, sources, groundingStatus } = await getContextForStudyTool(
      req.user.id,
      workspaceId,
      topic || 'revision test mcq',
      subjectId,
      selectedSourceIds,
      req.token
    );

    const quizData = await generateQuiz({
      topic: topic || 'Revision Quiz',
      quantity: validatedCount,
      difficulty,
      contextText,
    });

    res.json({
      success: true,
      data: {
        ...quizData,
        sources,
        groundingStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/study/summary
router.post('/summary', async (req, res, next) => {
  try {
    const { workspaceId, topic, length = 'medium', subjectId = null, selectedSourceIds = null } = req.body;
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspaceId is required.' },
      });
    }

    const { contextText, sources, groundingStatus } = await getContextForStudyTool(
      req.user.id,
      workspaceId,
      topic || 'summary main points definitions',
      subjectId,
      selectedSourceIds,
      req.token
    );

    const summaryData = await generateSummary({
      topic: topic || 'Course Overview',
      length,
      contextText,
    });

    res.json({
      success: true,
      data: {
        ...summaryData,
        sources,
        groundingStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/study/guide (Comprehensive Study Guide)
router.post('/guide', async (req, res, next) => {
  try {
    const { workspaceId, topic, subjectId = null, selectedSourceIds = null } = req.body;
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspaceId is required.' },
      });
    }

    const { contextText, sources, groundingStatus } = await getContextForStudyTool(
      req.user.id,
      workspaceId,
      topic || 'study guide key concepts definitions arguments',
      subjectId,
      selectedSourceIds,
      req.token
    );

    const guideData = await generateStudyGuide({
      topic: topic || 'Study Guide',
      contextText,
    });

    res.json({
      success: true,
      data: {
        guide: guideData,
        sources,
        groundingStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/study/exam-answer
router.post('/exam-answer', async (req, res, next) => {
  try {
    const { workspaceId, question, marks = 5, answerStyle = 'standard', subjectId = null, selectedSourceIds = null } = req.body;
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspaceId is required.' },
      });
    }

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Exam question cannot be empty.' },
      });
    }

    const { contextText, sources, groundingStatus } = await getContextForStudyTool(
      req.user.id,
      workspaceId,
      question,
      subjectId,
      selectedSourceIds,
      req.token
    );

    const answerData = await generateExamAnswer({
      question: question.trim(),
      marks: parseInt(marks, 10) || 5,
      answerStyle,
      contextText,
    });

    res.json({
      success: true,
      data: {
        ...answerData,
        sources,
        groundingStatus,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
