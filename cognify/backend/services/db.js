const { getSupabaseAdmin, getSupabaseUserClient, isConfigured: isSupabaseConfigured } = require('./supabase');
const crypto = require('crypto');

function generateUuid() {
  return crypto.randomUUID();
}

// In test environment, default to isolated in-memory store unless TEST_LIVE_SUPABASE is set
function isConfigured() {
  if (process.env.TEST_LIVE_SUPABASE === 'true') {
    return isSupabaseConfigured();
  }
  if (process.env.NODE_ENV === 'test') {
    return false;
  }
  return isSupabaseConfigured();
}

// In-memory fallback store when Supabase is not configured yet (e.g. initial setup / test suite)
const memoryStore = {
  workspaces: [],
  subjects: [],
  topics: [],
  syllabus_entries: [],
  documents: [],
  document_chunks: [],
  chat_conversations: [],
  chat_messages: [],
  study_sets: [],
  quiz_attempts: [],
  weak_topics: [],
  flashcards: [],
  review_logs: [],
};

const db = {
  // ---------------------------------------------------------------------------
  // Workspaces
  // ---------------------------------------------------------------------------
  async createWorkspace(userId, { name, education_type, institution_or_exam, course_or_class, academic_term }, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('workspaces')
        .insert([{
          user_id: userId,
          name,
          education_type: education_type || 'college',
          institution_or_exam: institution_or_exam || null,
          course_or_class: course_or_class || null,
          academic_term: academic_term || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const row = {
      id: generateUuid(),
      user_id: userId,
      name,
      education_type: education_type || 'college',
      institution_or_exam: institution_or_exam || null,
      course_or_class: course_or_class || null,
      academic_term: academic_term || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.workspaces.push(row);
    return row;
  },

  async getWorkspaces(userId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('workspaces')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    return memoryStore.workspaces
      .filter(w => w.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getWorkspaceById(userId, workspaceId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return memoryStore.workspaces.find(w => w.id === workspaceId && w.user_id === userId) || null;
  },

  async updateWorkspace(userId, workspaceId, updates, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('workspaces')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', workspaceId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const idx = memoryStore.workspaces.findIndex(w => w.id === workspaceId && w.user_id === userId);
    if (idx === -1) return null;
    memoryStore.workspaces[idx] = {
      ...memoryStore.workspaces[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return memoryStore.workspaces[idx];
  },

  async deleteWorkspace(userId, workspaceId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { error } = await client
        .from('workspaces')
        .delete()
        .eq('id', workspaceId)
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    }
    const beforeLen = memoryStore.workspaces.length;
    memoryStore.workspaces = memoryStore.workspaces.filter(w => !(w.id === workspaceId && w.user_id === userId));
    // Cascade delete related records in memory
    memoryStore.subjects = memoryStore.subjects.filter(s => s.workspace_id !== workspaceId);
    memoryStore.documents = memoryStore.documents.filter(d => d.workspace_id !== workspaceId);
    memoryStore.document_chunks = memoryStore.document_chunks.filter(c => c.workspace_id !== workspaceId);
    memoryStore.syllabus_entries = memoryStore.syllabus_entries.filter(s => s.workspace_id !== workspaceId);
    memoryStore.study_sets = memoryStore.study_sets.filter(s => s.workspace_id !== workspaceId);
    memoryStore.quiz_attempts = memoryStore.quiz_attempts.filter(q => q.workspace_id !== workspaceId);
    return memoryStore.workspaces.length < beforeLen;
  },

  // ---------------------------------------------------------------------------
  // Subjects
  // ---------------------------------------------------------------------------
  async createSubject(userId, workspaceId, { name, code, description }, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('subjects')
        .insert([{
          user_id: userId,
          workspace_id: workspaceId,
          name,
          code: code || null,
          description: description || null,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const row = {
      id: generateUuid(),
      user_id: userId,
      workspace_id: workspaceId,
      name,
      code: code || null,
      description: description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.subjects.push(row);
    return row;
  },

  async getSubjects(userId, workspaceId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('subjects')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .order('name');
      if (error) throw error;
      return data;
    }
    return memoryStore.subjects.filter(s => s.workspace_id === workspaceId && s.user_id === userId);
  },

  async getSubjectById(userId, subjectId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return memoryStore.subjects.find(s => s.id === subjectId && s.user_id === userId) || null;
  },

  async updateSubject(userId, subjectId, updates, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('subjects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', subjectId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const idx = memoryStore.subjects.findIndex(s => s.id === subjectId && s.user_id === userId);
    if (idx === -1) return null;
    memoryStore.subjects[idx] = {
      ...memoryStore.subjects[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return memoryStore.subjects[idx];
  },

  async deleteSubject(userId, subjectId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { error } = await client
        .from('subjects')
        .delete()
        .eq('id', subjectId)
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    }
    const beforeLen = memoryStore.subjects.length;
    memoryStore.subjects = memoryStore.subjects.filter(s => !(s.id === subjectId && s.user_id === userId));
    memoryStore.topics = memoryStore.topics.filter(t => t.subject_id !== subjectId);
    return memoryStore.subjects.length < beforeLen;
  },

  // ---------------------------------------------------------------------------
  // Topics
  // ---------------------------------------------------------------------------
  async createTopic(userId, subjectId, { name, description, parent_topic_id, sort_order }, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('topics')
        .insert([{
          user_id: userId,
          subject_id: subjectId,
          name,
          description: description || null,
          parent_topic_id: parent_topic_id || null,
          sort_order: sort_order || 0,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const row = {
      id: generateUuid(),
      user_id: userId,
      subject_id: subjectId,
      name,
      description: description || null,
      parent_topic_id: parent_topic_id || null,
      sort_order: sort_order || 0,
      created_at: new Date().toISOString(),
    };
    memoryStore.topics.push(row);
    return row;
  },

  async getTopics(userId, subjectId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('topics')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('user_id', userId)
        .order('sort_order');
      if (error) throw error;
      return data;
    }
    return memoryStore.topics.filter(t => t.subject_id === subjectId && t.user_id === userId);
  },

  // ---------------------------------------------------------------------------
  // Syllabus Entries
  // ---------------------------------------------------------------------------
  async saveSyllabusEntry(userId, workspaceId, { subject_id, unit_number, unit_title, content_text }, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('syllabus_entries')
        .insert([{
          user_id: userId,
          workspace_id: workspaceId,
          subject_id: subject_id || null,
          unit_number: unit_number || 1,
          unit_title: unit_title || null,
          content_text,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const row = {
      id: generateUuid(),
      user_id: userId,
      workspace_id: workspaceId,
      subject_id: subject_id || null,
      unit_number: unit_number || 1,
      unit_title: unit_title || null,
      content_text,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.syllabus_entries.push(row);
    return row;
  },

  async getSyllabusEntries(userId, workspaceId, subjectId = null, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      let query = client
        .from('syllabus_entries')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .order('unit_number');
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
    return memoryStore.syllabus_entries.filter(s => {
      if (s.workspace_id !== workspaceId || s.user_id !== userId) return false;
      if (subjectId && s.subject_id !== subjectId) return false;
      return true;
    });
  },

  // ---------------------------------------------------------------------------
  // Documents & Chunks
  // ---------------------------------------------------------------------------
  async createDocument(userId, workspaceId, docData, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('documents')
        .insert([{
          user_id: userId,
          workspace_id: workspaceId,
          subject_id: docData.subject_id || null,
          original_name: docData.original_name,
          stored_name: docData.stored_name,
          storage_path: docData.storage_path || null,
          category: docData.category || 'other',
          mime_type: docData.mime_type || null,
          size_bytes: docData.size_bytes || 0,
          status: docData.status || 'processing',
          page_count: docData.page_count || 0,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const row = {
      id: generateUuid(),
      user_id: userId,
      workspace_id: workspaceId,
      subject_id: docData.subject_id || null,
      original_name: docData.original_name,
      stored_name: docData.stored_name,
      storage_path: docData.storage_path || null,
      category: docData.category || 'other',
      mime_type: docData.mime_type || null,
      size_bytes: docData.size_bytes || 0,
      status: docData.status || 'processing',
      extraction_error: null,
      page_count: docData.page_count || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.documents.push(row);
    return row;
  },

  async updateDocument(userId, documentId, updates, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('documents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', documentId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const idx = memoryStore.documents.findIndex(d => d.id === documentId && d.user_id === userId);
    if (idx === -1) return null;
    memoryStore.documents[idx] = {
      ...memoryStore.documents[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return memoryStore.documents[idx];
  },

  async getDocuments(userId, workspaceId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('documents')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    return memoryStore.documents
      .filter(d => d.workspace_id === workspaceId && d.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getDocumentById(userId, documentId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return memoryStore.documents.find(d => d.id === documentId && d.user_id === userId) || null;
  },

  async deleteDocument(userId, documentId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { error } = await client
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    }
    const beforeLen = memoryStore.documents.length;
    memoryStore.documents = memoryStore.documents.filter(d => !(d.id === documentId && d.user_id === userId));
    memoryStore.document_chunks = memoryStore.document_chunks.filter(c => c.document_id !== documentId);
    return memoryStore.documents.length < beforeLen;
  },

  async createChunks(userId, chunks, token) {
    if (!chunks || chunks.length === 0) return [];
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const formatted = chunks.map(c => ({
        user_id: userId,
        document_id: c.document_id,
        workspace_id: c.workspace_id,
        subject_id: c.subject_id || null,
        chunk_index: c.chunk_index,
        text: c.text,
        page_number: c.page_number || null,
        section_label: c.section_label || null,
      }));
      const { data, error } = await client.from('document_chunks').insert(formatted).select();
      if (error) throw error;
      return data;
    }
    const inserted = chunks.map(c => ({
      id: generateUuid(),
      user_id: userId,
      document_id: c.document_id,
      workspace_id: c.workspace_id,
      subject_id: c.subject_id || null,
      chunk_index: c.chunk_index,
      text: c.text,
      page_number: c.page_number || null,
      section_label: c.section_label || null,
      created_at: new Date().toISOString(),
    }));
    memoryStore.document_chunks.push(...inserted);
    return inserted;
  },

  async getChunksForWorkspace(userId, workspaceId, subjectId = null, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      let query = client
        .from('document_chunks')
        .select('*, documents(original_name, category)')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data.map(c => ({
        ...c,
        document_name: c.documents?.original_name || 'Document',
        document_category: c.documents?.category || 'notes',
      }));
    }
    const docChunks = memoryStore.document_chunks
      .filter(c => {
        if (c.workspace_id !== workspaceId || c.user_id !== userId) return false;
        if (subjectId && c.subject_id !== subjectId) return false;
        return true;
      })
      .map(c => {
        const doc = memoryStore.documents.find(d => d.id === c.document_id);
        return {
          ...c,
          document_name: doc ? doc.original_name : 'Document',
          document_category: doc ? doc.category : 'notes',
        };
      });

    const syllabusChunks = (memoryStore.syllabus_entries || [])
      .filter(s => {
        if (s.workspace_id !== workspaceId || s.user_id !== userId) return false;
        if (subjectId && s.subject_id !== subjectId) return false;
        return true;
      })
      .map(s => ({
        id: s.id,
        user_id: s.user_id,
        document_id: s.id,
        workspace_id: s.workspace_id,
        subject_id: s.subject_id,
        chunk_index: 0,
        text: `[Unit ${s.unit_number}: ${s.unit_title || 'Syllabus'}]\n${s.content_text}`,
        document_name: s.unit_title ? `Syllabus: ${s.unit_title}` : 'Course Syllabus',
        document_category: 'syllabus',
        page_number: s.unit_number,
        section_label: s.unit_title || `Unit ${s.unit_number}`,
      }));

    return [...docChunks, ...syllabusChunks];
  },

  // ---------------------------------------------------------------------------
  // Chat Conversations & Messages
  // ---------------------------------------------------------------------------
  async getOrCreateConversation(userId, workspaceId, subjectId = null, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      let query = client
        .from('chat_conversations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data && data.length > 0) return data[0];

      // Create new conversation
      const { data: newConv, error: createErr } = await client
        .from('chat_conversations')
        .insert([{
          user_id: userId,
          workspace_id: workspaceId,
          subject_id: subjectId,
          title: 'Study Session',
        }])
        .select()
        .single();
      if (createErr) throw createErr;
      return newConv;
    }

    let conv = memoryStore.chat_conversations.find(c => {
      if (c.workspace_id !== workspaceId || c.user_id !== userId) return false;
      if (subjectId && c.subject_id !== subjectId) return false;
      return true;
    });
    if (!conv) {
      conv = {
        id: generateUuid(),
        user_id: userId,
        workspace_id: workspaceId,
        subject_id: subjectId,
        title: 'Study Session',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      memoryStore.chat_conversations.push(conv);
    }
    return conv;
  },

  async addChatMessage(userId, conversationId, workspaceId, { role, content, sources_json, grounding_status }, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('chat_messages')
        .insert([{
          user_id: userId,
          conversation_id: conversationId,
          workspace_id: workspaceId,
          role,
          content,
          sources_json: sources_json || [],
          grounding_status: grounding_status || 'grounded',
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const msg = {
      id: generateUuid(),
      user_id: userId,
      conversation_id: conversationId,
      workspace_id: workspaceId,
      role,
      content,
      sources_json: sources_json || [],
      grounding_status: grounding_status || 'grounded',
      created_at: new Date().toISOString(),
    };
    memoryStore.chat_messages.push(msg);
    return msg;
  },

  async getChatMessages(userId, conversationId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    }
    return memoryStore.chat_messages
      .filter(m => m.conversation_id === conversationId && m.user_id === userId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  // ---------------------------------------------------------------------------
  // Study Sets (Mind Maps, Flashcards, Summaries, Questions, Exam Answers)
  // ---------------------------------------------------------------------------
  async createStudySet(userId, workspaceId, { subject_id, type, title, content_json }, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('study_sets')
        .insert([{
          user_id: userId,
          workspace_id: workspaceId,
          subject_id: subject_id || null,
          type,
          title,
          content_json,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const row = {
      id: generateUuid(),
      user_id: userId,
      workspace_id: workspaceId,
      subject_id: subject_id || null,
      type,
      title,
      content_json,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryStore.study_sets.push(row);
    return row;
  },

  async getStudySets(userId, workspaceId, type = null, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      let query = client
        .from('study_sets')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (type) {
        query = query.eq('type', type);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
    return memoryStore.study_sets
      .filter(s => {
        if (s.workspace_id !== workspaceId || s.user_id !== userId) return false;
        if (type && s.type !== type) return false;
        return true;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async getStudySetById(userId, studySetId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('study_sets')
        .select('*')
        .eq('id', studySetId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    return memoryStore.study_sets.find(s => s.id === studySetId && s.user_id === userId) || null;
  },

  async deleteStudySet(userId, studySetId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { error } = await client
        .from('study_sets')
        .delete()
        .eq('id', studySetId)
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    }
    const beforeLen = memoryStore.study_sets.length;
    memoryStore.study_sets = memoryStore.study_sets.filter(s => !(s.id === studySetId && s.user_id === userId));
    return memoryStore.study_sets.length < beforeLen;
  },

  // ---------------------------------------------------------------------------
  // Quizzes & Weak Topics
  // ---------------------------------------------------------------------------
  async recordQuizAttempt(userId, workspaceId, { subject_id, study_set_id, total_questions, score, percentage, answers_json }, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('quiz_attempts')
        .insert([{
          user_id: userId,
          workspace_id: workspaceId,
          subject_id: subject_id || null,
          study_set_id: study_set_id || null,
          total_questions,
          score,
          percentage,
          answers_json,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const row = {
      id: generateUuid(),
      user_id: userId,
      workspace_id: workspaceId,
      subject_id: subject_id || null,
      study_set_id: study_set_id || null,
      total_questions,
      score,
      percentage,
      answers_json,
      created_at: new Date().toISOString(),
    };
    memoryStore.quiz_attempts.push(row);
    return row;
  },

  async getQuizAttempts(userId, workspaceId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('quiz_attempts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    return memoryStore.quiz_attempts
      .filter(q => q.workspace_id === workspaceId && q.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async recordTopicMistake(userId, workspaceId, subjectId, topicName, isCorrect, token) {
    if (!topicName) return;
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      // Check existing
      const { data: existing } = await client
        .from('weak_topics')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .eq('topic_name', topicName)
        .maybeSingle();

      if (existing) {
        await client
          .from('weak_topics')
          .update({
            incorrect_count: isCorrect ? existing.incorrect_count : existing.incorrect_count + 1,
            total_attempts: existing.total_attempts + 1,
            last_tested_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await client
          .from('weak_topics')
          .insert([{
            user_id: userId,
            workspace_id: workspaceId,
            subject_id: subjectId || null,
            topic_name: topicName,
            incorrect_count: isCorrect ? 0 : 1,
            total_attempts: 1,
          }]);
      }
      return;
    }

    const item = memoryStore.weak_topics.find(
      t => t.workspace_id === workspaceId && t.user_id === userId && t.topic_name === topicName
    );
    if (item) {
      if (!isCorrect) item.incorrect_count += 1;
      item.total_attempts += 1;
      item.last_tested_at = new Date().toISOString();
      item.updated_at = new Date().toISOString();
    } else {
      memoryStore.weak_topics.push({
        id: generateUuid(),
        user_id: userId,
        workspace_id: workspaceId,
        subject_id: subjectId || null,
        topic_name: topicName,
        incorrect_count: isCorrect ? 0 : 1,
        total_attempts: 1,
        last_tested_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  },

  async getWeakTopics(userId, workspaceId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('weak_topics')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .gt('incorrect_count', 0)
        .order('incorrect_count', { ascending: false });
      if (error) throw error;
      return data;
    }
    return memoryStore.weak_topics
      .filter(t => t.workspace_id === workspaceId && t.user_id === userId && t.incorrect_count > 0)
      .sort((a, b) => b.incorrect_count - a.incorrect_count);
  },

  // ---------------------------------------------------------------------------
  // SM-2 Flashcards & Spaced Repetition Persistence
  // ---------------------------------------------------------------------------
  async saveFlashcards(userId, workspaceId, cards, studySetId = null, token) {
    if (!cards || cards.length === 0) return [];
    const now = new Date().toISOString();

    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const rows = cards.map(c => ({
        user_id: userId,
        workspace_id: workspaceId,
        study_set_id: studySetId,
        front: c.front,
        back: c.back,
        topic: c.topic || 'General',
        difficulty: c.difficulty || 'medium',
        repetition: 0,
        interval_days: 1,
        ease_factor: 2.5,
        next_review_date: now,
        created_at: now,
      }));
      const { data, error } = await client.from('flashcards').insert(rows).select();
      if (!error && data) return data;
    }

    const created = cards.map(c => ({
      id: generateUuid(),
      user_id: userId,
      workspace_id: workspaceId,
      study_set_id: studySetId,
      front: c.front,
      back: c.back,
      topic: c.topic || 'General',
      difficulty: c.difficulty || 'medium',
      repetition: 0,
      interval_days: 1,
      ease_factor: 2.5,
      next_review_date: now,
      last_reviewed_at: null,
      created_at: now,
    }));
    memoryStore.flashcards.push(...created);
    return created;
  },

  async getWorkspaceFlashcards(userId, workspaceId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      let query = client
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }
      const { data, error } = await query;
      if (!error && data) return data;
    }
    if (workspaceId) {
      return memoryStore.flashcards.filter(c => c.workspace_id === workspaceId && c.user_id === userId);
    }
    return memoryStore.flashcards.filter(c => c.user_id === userId);
  },

  async getFlashcardById(userId, cardId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('flashcards')
        .select('*')
        .eq('id', cardId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!error && data) return data;
    }
    return memoryStore.flashcards.find(c => c.id === cardId && c.user_id === userId) || null;
  },

  async recordFlashcardReview(userId, cardId, rating, sm2Result, token) {
    const now = new Date().toISOString();
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      // Update card
      const { data: updatedCard } = await client
        .from('flashcards')
        .update({
          repetition: sm2Result.repetition,
          repetitions: sm2Result.repetition,
          interval_days: sm2Result.interval,
          ease_factor: sm2Result.easeFactor,
          next_review_date: sm2Result.nextReviewDate,
          next_review_at: sm2Result.nextReviewDate,
          last_reviewed_at: sm2Result.lastReviewedAt,
        })
        .eq('id', cardId)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      // Log review
      await client
        .from('review_logs')
        .insert([{
          user_id: userId,
          card_id: cardId,
          flashcard_id: cardId,
          rating,
          previous_interval_days: sm2Result.previousInterval || 1,
          next_interval_days: sm2Result.interval || 1,
          reviewed_at: now,
        }]);
      return updatedCard;
    }

    const card = memoryStore.flashcards.find(c => c.id === cardId && c.user_id === userId);
    if (card) {
      card.repetition = sm2Result.repetition;
      card.repetitions = sm2Result.repetition;
      card.interval_days = sm2Result.interval;
      card.interval = sm2Result.interval;
      card.ease_factor = sm2Result.easeFactor;
      card.next_review_date = sm2Result.nextReviewDate;
      card.next_review_at = sm2Result.nextReviewDate;
      card.last_reviewed_at = sm2Result.lastReviewedAt;
    }

    memoryStore.review_logs.push({
      id: generateUuid(),
      user_id: userId,
      card_id: cardId,
      flashcard_id: cardId,
      rating,
      previous_interval_days: sm2Result.previousInterval || 1,
      next_interval_days: sm2Result.interval || 1,
      reviewed_at: now,
    });
    return card;
  },

  async getReviewLogs(userId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('review_logs')
        .select('*')
        .eq('user_id', userId)
        .order('reviewed_at', { ascending: false });
      if (!error && data) return data;
    }
    return memoryStore.review_logs.filter(l => l.user_id === userId);
  },

  // ---------------------------------------------------------------------------
  // Flashcard Decks
  // ---------------------------------------------------------------------------
  async createFlashcardDeck(userId, workspaceId, { title }, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('flashcard_decks')
        .insert([{ user_id: userId, workspace_id: workspaceId, title }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const deck = {
      id: generateUuid(),
      user_id: userId,
      workspace_id: workspaceId,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (!memoryStore.flashcard_decks) memoryStore.flashcard_decks = [];
    memoryStore.flashcard_decks.push(deck);
    return deck;
  },

  async getFlashcardDecks(userId, workspaceId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('flashcard_decks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    if (!memoryStore.flashcard_decks) memoryStore.flashcard_decks = [];
    return memoryStore.flashcard_decks.filter(d => d.workspace_id === workspaceId && d.user_id === userId);
  },

  // ---------------------------------------------------------------------------
  // Quizzes & Attempts
  // ---------------------------------------------------------------------------
  async createQuiz(userId, workspaceId, { title, questions }, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('quizzes')
        .insert([{ user_id: userId, workspace_id: workspaceId, title, questions: questions || [] }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const quiz = {
      id: generateUuid(),
      user_id: userId,
      workspace_id: workspaceId,
      title,
      questions: questions || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (!memoryStore.quizzes) memoryStore.quizzes = [];
    memoryStore.quizzes.push(quiz);
    return quiz;
  },

  async getQuizzes(userId, workspaceId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('quizzes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    if (!memoryStore.quizzes) memoryStore.quizzes = [];
    return memoryStore.quizzes.filter(q => q.workspace_id === workspaceId && q.user_id === userId);
  },

  async getQuizById(userId, quizId, token) {
    if (isConfigured()) {
      const client = getSupabaseUserClient(token) || getSupabaseAdmin();
      const { data, error } = await client
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
    if (!memoryStore.quizzes) memoryStore.quizzes = [];
    return memoryStore.quizzes.find(q => q.id === quizId && q.user_id === userId) || null;
  },

  // ---------------------------------------------------------------------------
  // Sources (Direct alias to documents / sources table)
  // ---------------------------------------------------------------------------
  async getSources(userId, workspaceId, token) {
    return this.getDocuments(userId, workspaceId, token);
  },

  async getSourceById(userId, sourceId, token) {
    return this.getDocumentById(userId, sourceId, token);
  },
};

module.exports = db;
