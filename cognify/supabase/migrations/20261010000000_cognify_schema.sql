-- ==============================================================================
-- COGNIFY DATABASE SCHEMA MIGRATION
-- Source-grounded AI learning workspace schema with Row Level Security (RLS),
-- Supabase Storage configuration, SM-2 spaced repetition, and indexing.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table
-- Linked directly to Supabase auth.users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically create or update a profile on user signup (e.g. Google Sign-In)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    derived_name TEXT;
BEGIN
    derived_name := COALESCE(
        new.raw_user_meta_data->>'display_name',
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );

    INSERT INTO public.profiles (id, email, full_name, display_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        derived_name,
        derived_name,
        COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. Workspaces Table (AI Study Notebooks)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    education_type TEXT NOT NULL DEFAULT 'general',
    course_or_class TEXT,
    institution_or_exam TEXT,
    academic_term TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. Sources Table (Study Documents, Web URLs, Images)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'file', -- 'file', 'url', 'image', 'text'
    file_path TEXT,
    source_url TEXT,
    mime_type TEXT,
    file_size BIGINT DEFAULT 0,
    processing_status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'ready', 'failed'
    extracted_text TEXT,
    page_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. Documents Table (Underlying document storage entity)
-- Synchronized with sources for maximum backwards and forwards compatibility
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.sources(id) ON DELETE CASCADE,
    subject_id UUID,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    storage_path TEXT,
    category TEXT NOT NULL DEFAULT 'other',
    mime_type TEXT,
    size_bytes BIGINT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'processing',
    extraction_error TEXT,
    page_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync triggers between documents and sources
CREATE OR REPLACE FUNCTION public.sync_document_to_sources()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.sources (
        id, workspace_id, user_id, title, source_type, file_path, 
        mime_type, file_size, processing_status, page_count, created_at, updated_at
    )
    VALUES (
        NEW.id, NEW.workspace_id, NEW.user_id, NEW.original_name, 
        COALESCE(NEW.category, 'file'), NEW.storage_path, 
        NEW.mime_type, NEW.size_bytes, NEW.status, 
        NEW.page_count, NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        source_type = EXCLUDED.source_type,
        file_path = EXCLUDED.file_path,
        mime_type = EXCLUDED.mime_type,
        file_size = EXCLUDED.file_size,
        processing_status = EXCLUDED.processing_status,
        page_count = EXCLUDED.page_count,
        updated_at = EXCLUDED.updated_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_document_to_sources ON public.documents;
CREATE TRIGGER trigger_sync_document_to_sources
    AFTER INSERT OR UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.sync_document_to_sources();

CREATE OR REPLACE FUNCTION public.sync_delete_document_to_sources()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.sources WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_delete_document_to_sources ON public.documents;
CREATE TRIGGER trigger_sync_delete_document_to_sources
    AFTER DELETE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.sync_delete_document_to_sources();

-- ------------------------------------------------------------------------------
-- 5. Document Chunks Table (Fine-grained passage retrieval for RAG grounding)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    source_id UUID REFERENCES public.sources(id) ON DELETE CASCADE,
    subject_id UUID,
    chunk_index INT NOT NULL,
    text TEXT NOT NULL,
    page_number INT,
    section_label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. Subjects, Topics, and Syllabus Entries (Course Structure)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    parent_topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.syllabus_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    unit_number INT DEFAULT 1,
    unit_title TEXT,
    content_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. Chat Conversations & Chats
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    subject_id UUID,
    title TEXT DEFAULT 'Study Session',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. Chat Messages & Citations
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    sources_json JSONB DEFAULT '[]'::jsonb,
    citations JSONB DEFAULT '[]'::jsonb,
    grounding_status TEXT DEFAULT 'grounded',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View aliases for chats and messages
CREATE OR REPLACE VIEW public.chats AS
    SELECT id, workspace_id, user_id, title, created_at, updated_at
    FROM public.chat_conversations;

CREATE OR REPLACE VIEW public.messages AS
    SELECT 
        id, 
        COALESCE(chat_id, conversation_id) AS chat_id, 
        user_id, 
        role, 
        content, 
        COALESCE(citations, sources_json) AS citations, 
        created_at
    FROM public.chat_messages;

-- ------------------------------------------------------------------------------
-- 9. Flashcard Decks & Saved Study Sets
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.study_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    subject_id UUID,
    type TEXT NOT NULL, -- 'flashcards', 'mindmap', 'questions', 'summary', 'guide', 'exam_answer'
    title TEXT NOT NULL,
    content_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. Flashcards Table (SM-2 Spaced Repetition Parameters)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE SET NULL,
    study_set_id UUID REFERENCES public.study_sets(id) ON DELETE SET NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    topic TEXT DEFAULT 'General',
    difficulty TEXT DEFAULT 'medium',
    source_citations JSONB DEFAULT '[]'::jsonb,
    repetition INT DEFAULT 0,
    repetitions INT DEFAULT 0,
    interval_days INT DEFAULT 1,
    ease_factor NUMERIC(4,2) DEFAULT 2.50,
    next_review_date TIMESTAMPTZ DEFAULT NOW(),
    next_review_at TIMESTAMPTZ DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. Review Logs & History (SuperMemo SM-2 Review Events)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.review_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE,
    flashcard_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE,
    rating INT NOT NULL, -- 0 = Again, 3 = Hard, 4 = Good, 5 = Easy
    previous_interval_days INT DEFAULT 1,
    next_interval_days INT DEFAULT 1,
    reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW public.review_history AS
    SELECT 
        id, 
        COALESCE(flashcard_id, card_id) AS flashcard_id, 
        user_id, 
        rating, 
        reviewed_at, 
        previous_interval_days, 
        next_interval_days
    FROM public.review_logs;

-- ------------------------------------------------------------------------------
-- 12. Quizzes Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 13. Quiz Attempts & History
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE SET NULL,
    study_set_id UUID REFERENCES public.study_sets(id) ON DELETE SET NULL,
    subject_id UUID,
    total_questions INT NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    answers JSONB DEFAULT '{}'::jsonb,
    answers_json JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 14. Weak Topics & Diagnostic Analytics
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weak_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    subject_id UUID,
    topic_name TEXT NOT NULL,
    incorrect_count INT DEFAULT 1,
    total_attempts INT DEFAULT 1,
    last_tested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_workspace_topic UNIQUE (user_id, workspace_id, topic_name)
);

-- ==============================================================================
-- INDEXES FOR RETRIEVAL & QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_workspaces_user ON public.workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_sources_workspace ON public.sources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sources_user ON public.sources(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_src ON public.document_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_chunks_ws ON public.document_chunks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subjects_ws ON public.subjects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_sub ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_ws ON public.syllabus_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_ws ON public.chat_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_study_sets_ws ON public.study_sets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_ws ON public.flashcard_decks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_ws ON public.flashcards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_usr ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_due ON public.flashcards(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_review_logs_usr ON public.review_logs(user_id, reviewed_at);
CREATE INDEX IF NOT EXISTS idx_quizzes_ws ON public.quizzes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_ws ON public.quiz_attempts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_weak_topics_ws ON public.weak_topics(workspace_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict user-ownership isolation across all entities
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weak_topics ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view and update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Workspaces
DROP POLICY IF EXISTS "Users can manage own workspaces" ON public.workspaces;
CREATE POLICY "Users can manage own workspaces"
    ON public.workspaces FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Sources
DROP POLICY IF EXISTS "Users can manage own sources" ON public.sources;
CREATE POLICY "Users can manage own sources"
    ON public.sources FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Documents
DROP POLICY IF EXISTS "Users can manage own documents" ON public.documents;
CREATE POLICY "Users can manage own documents"
    ON public.documents FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Document Chunks
DROP POLICY IF EXISTS "Users can manage own chunks" ON public.document_chunks;
CREATE POLICY "Users can manage own chunks"
    ON public.document_chunks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Subjects
DROP POLICY IF EXISTS "Users can manage own subjects" ON public.subjects;
CREATE POLICY "Users can manage own subjects"
    ON public.subjects FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Topics
DROP POLICY IF EXISTS "Users can manage own topics" ON public.topics;
CREATE POLICY "Users can manage own topics"
    ON public.topics FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Syllabus Entries
DROP POLICY IF EXISTS "Users can manage own syllabus entries" ON public.syllabus_entries;
CREATE POLICY "Users can manage own syllabus entries"
    ON public.syllabus_entries FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Chat Conversations
DROP POLICY IF EXISTS "Users can manage own conversations" ON public.chat_conversations;
CREATE POLICY "Users can manage own conversations"
    ON public.chat_conversations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Chat Messages
DROP POLICY IF EXISTS "Users can manage own chat messages" ON public.chat_messages;
CREATE POLICY "Users can manage own chat messages"
    ON public.chat_messages FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Flashcard Decks
DROP POLICY IF EXISTS "Users can manage own decks" ON public.flashcard_decks;
CREATE POLICY "Users can manage own decks"
    ON public.flashcard_decks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Study Sets
DROP POLICY IF EXISTS "Users can manage own study sets" ON public.study_sets;
CREATE POLICY "Users can manage own study sets"
    ON public.study_sets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Flashcards
DROP POLICY IF EXISTS "Users can manage own flashcards" ON public.flashcards;
CREATE POLICY "Users can manage own flashcards"
    ON public.flashcards FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Review Logs
DROP POLICY IF EXISTS "Users can manage own review logs" ON public.review_logs;
CREATE POLICY "Users can manage own review logs"
    ON public.review_logs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Quizzes
DROP POLICY IF EXISTS "Users can manage own quizzes" ON public.quizzes;
CREATE POLICY "Users can manage own quizzes"
    ON public.quizzes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Quiz Attempts
DROP POLICY IF EXISTS "Users can manage own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can manage own quiz attempts"
    ON public.quiz_attempts FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Weak Topics
DROP POLICY IF EXISTS "Users can manage own weak topics" ON public.weak_topics;
CREATE POLICY "Users can manage own weak topics"
    ON public.weak_topics FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- SUPABASE STORAGE BUCKET POLICIES FOR 'study-documents'
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'study-documents',
    'study-documents',
    false,
    26214400, -- 25 MB
    ARRAY[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword',
        'application/vnd.ms-powerpoint',
        'text/plain',
        'text/markdown',
        'image/png',
        'image/jpeg',
        'image/webp'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 26214400;

DROP POLICY IF EXISTS "Users can upload their own study documents" ON storage.objects;
CREATE POLICY "Users can upload their own study documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'study-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can read their own study documents" ON storage.objects;
CREATE POLICY "Users can read their own study documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'study-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete their own study documents" ON storage.objects;
CREATE POLICY "Users can delete their own study documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'study-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );
