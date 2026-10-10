process.env.NODE_ENV = 'test';
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../app');
const config = require('../config/env');
const db = require('../services/db');
const { verifyToken, createSignedUrl } = require('../services/supabase');

describe('Supabase Database, Security, and Storage Suite', () => {

  describe('1. Client Configuration & URL Normalization', () => {
    test('Normalizes Supabase URL by stripping /rest/v1 and trailing slashes', () => {
      const inputs = [
        'https://example-project.supabase.co/rest/v1/',
        'https://example-project.supabase.co/rest/v1',
        'https://example-project.supabase.co///',
        'https://example-project.supabase.co',
      ];
      for (const input of inputs) {
        const normalized = config.normalizeSupabaseUrl(input);
        assert.equal(normalized, 'https://example-project.supabase.co');
      }
    });

    test('Diagnostics helper never leaks secret keys or Gemini keys', () => {
      const diag = config.getDiagnostics();
      assert.equal(typeof diag.geminiConfigured, 'boolean');
      assert.equal(typeof diag.supabaseConfigured, 'boolean');
      assert.equal(typeof diag.serviceRoleConfigured, 'boolean');
      assert.equal(diag.maxFileSizeMb, 25);

      // Verify no secret key attributes exist on diagnostics
      assert.equal(diag.supabaseSecretKey, undefined);
      assert.equal(diag.supabaseServiceRoleKey, undefined);
      assert.equal(diag.geminiApiKey, undefined);
    });
  });

  describe('2. Authentication & Production Security', () => {
    test('Unauthenticated request to protected endpoint is rejected with 401', async () => {
      const res = await request(app).get('/api/workspaces');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    test('Empty Bearer token is rejected with 401', async () => {
      const res = await request(app)
        .get('/api/workspaces')
        .set('Authorization', 'Bearer ');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('Demo dev-token bypass is strictly rejected in production environment', async () => {
      const origNodeEnv = process.env.NODE_ENV;
      const origConfigEnv = config.nodeEnv;
      try {
        process.env.NODE_ENV = 'production';
        config.nodeEnv = 'production';

        const { user, error } = await verifyToken('dev-token-attacker-bypass');
        assert.equal(user, null);
        assert.ok(error);
        assert.match(error.message, /disabled in production/i);
      } finally {
        process.env.NODE_ENV = origNodeEnv;
        config.nodeEnv = origConfigEnv;
      }
    });
  });

  describe('3. Multi-Tenant Isolation (User A vs User B)', () => {
    const userAToken = 'dev-token-user-alice';
    const userBToken = 'dev-token-user-bob';

    test('User B cannot view or modify User A workspaces', async () => {
      // User A creates a private notebook
      const createRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: "Alice's Private Quantum Physics Workspace" });

      assert.equal(createRes.status, 201);
      const aliceWorkspaceId = createRes.body.data.id;
      assert.ok(aliceWorkspaceId);

      // User B lists workspaces -> must NOT include Alice's workspace
      const bobListRes = await request(app)
        .get('/api/workspaces')
        .set('Authorization', `Bearer ${userBToken}`);

      assert.equal(bobListRes.status, 200);
      const bobWorkspaces = bobListRes.body.data || [];
      assert.equal(bobWorkspaces.some(w => w.id === aliceWorkspaceId), false);

      // User B directly attempts to fetch Alice's workspace by ID -> 404 NOT_FOUND
      const bobAccessRes = await request(app)
        .get(`/api/workspaces/${aliceWorkspaceId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      assert.equal(bobAccessRes.status, 404);

      // User B attempts to patch Alice's workspace -> 404 NOT_FOUND
      const bobPatchRes = await request(app)
        .patch(`/api/workspaces/${aliceWorkspaceId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Hacked by Bob' });

      assert.equal(bobPatchRes.status, 404);
    });

    test('User B cannot view or upload documents to User A workspace', async () => {
      // User A creates workspace
      const createRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: "Alice's Biology Workspace" });
      const workspaceId = createRes.body.data.id;

      // User B tries to upload document to Alice's workspace -> 404
      const uploadRes = await request(app)
        .post(`/api/workspaces/${workspaceId}/documents`)
        .set('Authorization', `Bearer ${userBToken}`)
        .attach('file', Buffer.from('Bob malicious upload'), 'bob.txt');

      assert.equal(uploadRes.status, 404);
    });
  });

  describe('4. Storage Security & 25 MB Limit', () => {
    const userToken = 'dev-token-storage-tester';

    test('Rejects uploads exceeding 25 MB with HTTP 413 and clear message', async () => {
      const wsRes = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Storage Limit Workspace' });
      const wsId = wsRes.body.data.id;

      // 26 MB buffer (exceeds 25 MB)
      const oversizedBuffer = Buffer.alloc(26 * 1024 * 1024);

      const res = await request(app)
        .post(`/api/workspaces/${wsId}/documents`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', oversizedBuffer, 'oversized.pdf');

      assert.equal(res.status, 413);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'FILE_TOO_LARGE');
      assert.match(res.body.error.message, /25 MB limit/);
    });

    test('Signed URL generation verifies document ownership', async () => {
      const aliceToken = 'dev-token-alice-storage';
      const bobToken = 'dev-token-bob-storage';

      // Alice creates workspace and document
      const ws = await request(app)
        .post('/api/workspaces')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ name: 'Alice Private Storage' });
      const wsId = ws.body.data.id;

      const uploadRes = await request(app)
        .post(`/api/workspaces/${wsId}/documents`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .attach('file', Buffer.from('Secret thesis notes'), 'thesis.txt');
      assert.equal(uploadRes.status, 201);
      const docId = uploadRes.body.data.document.id;

      // Alice requests signed URL -> 200
      const aliceSignedRes = await request(app)
        .get(`/api/documents/${docId}/signed-url`)
        .set('Authorization', `Bearer ${aliceToken}`);
      assert.equal(aliceSignedRes.status, 200);
      assert.ok(aliceSignedRes.body.data);

      // Bob attempts to request signed URL for Alice's document -> 404
      const bobSignedRes = await request(app)
        .get(`/api/documents/${docId}/signed-url`)
        .set('Authorization', `Bearer ${bobToken}`);
      assert.equal(bobSignedRes.status, 404);
    });
  });

  describe('5. Spaced Repetition (SM-2) Persistence', () => {
    test('Persists flashcard review progress across ratings', async () => {
      const token = 'dev-token-sm2-user';
      const userId = 'sm2-user';

      // Save a card directly
      const savedCards = await db.saveFlashcards(
        userId,
        'workspace-sm2-test',
        [{ front: 'What is photosynthesis?', back: 'Conversion of light into chemical energy.' }],
        null,
        token
      );
      assert.equal(savedCards.length, 1);
      const card = savedCards[0];

      // Record first review with rating 4 (Good)
      const sm2Update = {
        repetition: 1,
        interval: 1,
        previousInterval: 0,
        easeFactor: 2.5,
        nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
        lastReviewedAt: new Date().toISOString(),
      };

      const updated = await db.recordFlashcardReview(userId, card.id, 4, sm2Update, token);
      assert.equal(updated.repetition, 1);
      assert.equal(updated.interval_days, 1);

      // Verify review logs recorded review event
      const logs = await db.getReviewLogs(userId, token);
      assert.ok(logs.length >= 1);
      assert.equal(logs[0].card_id, card.id);
      assert.equal(logs[0].rating, 4);
    });
  });

  describe('6. Flashcard Decks & Quizzes Persistence', () => {
    test('Creates and retrieves flashcard decks and quizzes for user', async () => {
      const token = 'dev-token-decks-quizzes';
      const userId = 'decks-quizzes-user';
      const workspaceId = 'ws-deck-quiz-1';

      // Create deck
      const deck = await db.createFlashcardDeck(userId, workspaceId, { title: 'Cell Biology Deck' }, token);
      assert.ok(deck.id);
      assert.equal(deck.title, 'Cell Biology Deck');

      const decks = await db.getFlashcardDecks(userId, workspaceId, token);
      assert.ok(decks.some(d => d.id === deck.id));

      // Create quiz
      const quiz = await db.createQuiz(
        userId,
        workspaceId,
        {
          title: 'Cell Biology Quiz',
          questions: [{ question: 'What is mitochondria?', options: ['Powerhouse', 'Vacuole'], answer: 0 }],
        },
        token
      );
      assert.ok(quiz.id);
      assert.equal(quiz.title, 'Cell Biology Quiz');

      const quizzes = await db.getQuizzes(userId, workspaceId, token);
      assert.ok(quizzes.some(q => q.id === quiz.id));
    });
  });

});
