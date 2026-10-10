import { getCurrentSession } from './supabase';

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const session = await getCurrentSession();
  const token = session?.access_token || '';

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await res.json().catch(() => ({
    success: false,
    error: { message: `Request failed with HTTP ${res.status}` },
  }));

  if (!res.ok || json.success === false) {
    const errorMsg = json.error?.message || `Error ${res.status}: ${res.statusText}`;
    const err = new Error(errorMsg);
    err.code = json.error?.code || 'API_ERROR';
    err.status = res.status;
    throw err;
  }

  return json.data;
}

export const api = {
  // Health
  getHealth: () => request('/health'),

  // Workspaces
  getWorkspaces: () => request('/workspaces'),
  createWorkspace: (data) =>
    request('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getWorkspaceById: (id) => request(`/workspaces/${id}`),
  updateWorkspace: (id, data) =>
    request(`/workspaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteWorkspace: (id) =>
    request(`/workspaces/${id}`, {
      method: 'DELETE',
    }),

  // Sources & Documents
  getDocuments: (workspaceId) => request(`/workspaces/${workspaceId}/documents`),
  uploadDocument: (workspaceId, formData) =>
    request(`/workspaces/${workspaceId}/documents`, {
      method: 'POST',
      body: formData,
    }),
  addUrlSource: (workspaceId, url) =>
    request(`/workspaces/${workspaceId}/sources/url`, {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
  getDocumentText: (id) => request(`/documents/${id}/text`),
  deleteDocument: (id) =>
    request(`/documents/${id}`, {
      method: 'DELETE',
    }),

  // Grounded Chat
  sendChatMessage: (data) =>
    request('/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getChatMessages: (workspaceId, conversationId = null) => {
    const query = conversationId ? `?conversationId=${conversationId}` : '';
    return request(`/workspaces/${workspaceId}/chat/messages${query}`);
  },

  // Study Tools
  generateMindMap: (data) =>
    request('/study/mindmap', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  generateFlashcards: (data) =>
    request('/study/flashcards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  generateQuestions: (data) =>
    request('/study/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  generateQuiz: (data) =>
    request('/study/quiz', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  generateSummary: (data) =>
    request('/study/summary', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  generateStudyGuide: (data) =>
    request('/study/guide', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  generateExamAnswer: (data) =>
    request('/study/exam-answer', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // SM-2 Spaced Repetition Flashcards
  reviewFlashcard: (cardId, data) =>
    request(`/study/flashcards/${cardId}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getWorkspaceFlashcards: (workspaceId) =>
    request(`/study/workspaces/${workspaceId}/flashcards`),
  getDueFlashcards: (workspaceId) =>
    request(`/study/workspaces/${workspaceId}/flashcards/due`),
  getRetentionMetrics: (workspaceId) =>
    request(`/study/workspaces/${workspaceId}/retention`),

  // Saved Study Sets
  getStudySets: (workspaceId, type = null) => {
    const query = type ? `?type=${type}` : '';
    return request(`/workspaces/${workspaceId}/study-sets${query}`);
  },
  saveStudySet: (workspaceId, data) =>
    request(`/workspaces/${workspaceId}/study-sets`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getStudySetById: (id) => request(`/study-sets/${id}`),
  deleteStudySet: (id) =>
    request(`/study-sets/${id}`, {
      method: 'DELETE',
    }),

  // Quizzes & Progress
  submitQuiz: (data) =>
    request('/quizzes/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getQuizAttempts: (workspaceId) => request(`/workspaces/${workspaceId}/quiz-attempts`),
  getProgress: (workspaceId) => request(`/workspaces/${workspaceId}/progress`),
  getWeakTopics: (workspaceId) => request(`/workspaces/${workspaceId}/weak-topics`),
};
