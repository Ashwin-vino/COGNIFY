const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { retrieveContext } = require('../services/retrieval');
const { generateGroundedAnswer } = require('../services/gemini');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// POST /api/chat
router.post('/', async (req, res, next) => {
  try {
    const { workspaceId, question, subjectId = null, conversationId = null, selectedSourceIds = null } = req.body;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'workspaceId is required.' },
      });
    }

    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Question cannot be empty.' },
      });
    }

    // Verify workspace ownership
    const workspace = await db.getWorkspaceById(req.user.id, workspaceId, req.token);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Workspace not found.' },
      });
    }

    // Retrieve active source evidence
    const { chunks, sources, groundingStatus } = await retrieveContext(
      req.user.id,
      workspaceId,
      question,
      { subjectId, topK: 7, selectedSourceIds },
      req.token
    );

    // Get or create chat conversation
    let conv = null;
    if (conversationId) {
      conv = { id: conversationId };
    } else {
      conv = await db.getOrCreateConversation(req.user.id, workspaceId, subjectId, req.token);
    }

    // Save user's question to message history
    await db.addChatMessage(
      req.user.id,
      conv.id,
      workspaceId,
      {
        role: 'user',
        content: question.trim(),
        sources_json: [],
        grounding_status: 'user',
      },
      req.token
    );

    // Call Gemini with retrieved evidence
    const { answer, model } = await generateGroundedAnswer({
      question: question.trim(),
      contextChunks: chunks,
      workspaceInfo: workspace,
    });

    // Save assistant's answer to message history
    const savedMsg = await db.addChatMessage(
      req.user.id,
      conv.id,
      workspaceId,
      {
        role: 'assistant',
        content: answer,
        sources_json: sources,
        grounding_status: groundingStatus,
      },
      req.token
    );

    res.json({
      success: true,
      data: {
        messageId: savedMsg.id,
        conversationId: conv.id,
        answer,
        groundingStatus,
        sources,
        model,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/workspaces/:id/chat/messages
router.get('/workspaces/:id/chat/messages', async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { conversationId } = req.query;

    const conv = conversationId
      ? { id: conversationId }
      : await db.getOrCreateConversation(req.user.id, workspaceId, null, req.token);

    const messages = await db.getChatMessages(req.user.id, conv.id, req.token);
    res.json({
      success: true,
      data: {
        conversationId: conv.id,
        messages,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
