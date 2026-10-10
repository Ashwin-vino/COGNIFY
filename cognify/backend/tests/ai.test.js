process.env.NODE_ENV = 'test';
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../app');
const config = require('../config/env');

let server;
const PORT = 3089;
const BASE_URL = `http://localhost:${PORT}/api`;
const TEST_TOKEN = 'dev-token-test-student-123';

before(async () => {
  await new Promise(resolve => {
    server = app.listen(PORT, resolve);
  });
});

after(() => {
  if (server) server.close();
});

describe('6. Gemini AI Grounded Chat & Generation', () => {
  let workspaceId = null;

  before(async () => {
    // Create workspace with syllabus
    const wsRes = await fetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify({
        name: 'Operating Systems & Concurrency',
        education_type: 'college',
      }),
    });
    const wsData = await wsRes.json();
    workspaceId = wsData.data.id;

    // Add syllabus unit
    await fetch(`${BASE_URL}/workspaces/${workspaceId}/syllabus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify({
        unit_number: 1,
        unit_title: 'Deadlocks and Concurrency',
        content_text: 'A Deadlock in operating systems occurs when 4 necessary Coffman conditions hold simultaneously: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. The Banker algorithm by Dijkstra is used for deadlock avoidance by verifying safe states using Available, Max, Allocation, and Need matrices.',
      }),
    });
  });

  test('POST /api/chat provides grounded response with citations', async () => {
    if (!config.geminiApiKey) {
      console.log('Skipping Gemini live test: No GEMINI_API_KEY');
      return;
    }

    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify({
        workspaceId,
        question: 'What are the 4 Coffman conditions for a deadlock?',
      }),
    });

    if (res.status === 429) {
      console.log('Gemini API rate limit reached (free tier quota). Skipping response validation.');
      return;
    }
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.answer.length > 20);
    assert.strictEqual(json.data.groundingStatus, 'grounded');
    assert.ok(json.data.sources.length >= 1);
  });

  test('POST /api/study/flashcards generates grounded flashcard deck', async () => {
    if (!config.geminiApiKey) return;

    const res = await fetch(`${BASE_URL}/study/flashcards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify({
        workspaceId,
        topic: 'Deadlock Avoidance and Bankers Algorithm',
        quantity: 3,
      }),
    });

    if (res.status === 429) {
      console.log('Gemini API rate limit reached (free tier quota). Skipping response validation.');
      return;
    }
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data.flashcards));
    assert.strictEqual(json.data.flashcards.length, 3);
    assert.ok(json.data.flashcards[0].front.length > 5);
    assert.ok(json.data.flashcards[0].back.length > 5);
  });

  test('POST /api/study/exam-answer generates structured 5-mark answer', async () => {
    if (!config.geminiApiKey) return;

    const res = await fetch(`${BASE_URL}/study/exam-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
      body: JSON.stringify({
        workspaceId,
        question: 'Explain the 4 Coffman conditions required for a deadlock to occur.',
        marks: 5,
      }),
    });

    if (res.status === 429) {
      console.log('Gemini API rate limit reached (free tier quota). Skipping response validation.');
      return;
    }
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.marks, 5);
    assert.ok(json.data.definitionOrIntro.length > 10);
    assert.ok(Array.isArray(json.data.sections));
    assert.ok(json.data.keywords.length >= 1);
  });
});
