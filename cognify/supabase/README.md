# Supabase Database & Security Guide for Cognify

This guide covers the database schema, security rules, environment configuration, and migration execution for Cognify.

---

## 1. Remote Supabase Project Setup

- **Project URL:** `https://your-project-ref.supabase.co`
- **Dashboard URL:** `https://supabase.com/dashboard/project/<your-project-ref>`
- **SQL Editor Direct Link:** `https://supabase.com/dashboard/project/<your-project-ref>/sql`
- **Storage Status:** The private storage bucket `study-documents` is configured with a 25 MB file size limit.

---

## 2. Applying the Database Migration

To create all required database tables, relationships, indexes, sync triggers, and Row Level Security (RLS) policies:

1. Open your browser and navigate to the Supabase SQL Editor:
   👉 **`https://supabase.com/dashboard/project/<your-project-ref>/sql`**
2. Click **"+ New Query"**.
3. Open the migration file:
   [`cognify/supabase/migrations/20261010000000_cognify_schema.sql`](./migrations/20261010000000_cognify_schema.sql)
4. Copy the entire file contents and paste them into the Supabase SQL Editor.
5. Click the green **Run** button (or press `Cmd + Enter` / `Ctrl + Enter`).
6. You should see `Success. No rows returned`.

### What This Migration Creates:
- **`profiles`**: User profile synced to `auth.users` via `handle_new_user()` trigger (capturing Google Sign-In avatar & display name).
- **`workspaces`**: AI study notebooks / workspaces owned by `user_id`.
- **`sources` & `documents`**: Study documents, file paths, MIME types, sizes, processing statuses, and auto-sync triggers between sources and documents.
- **`document_chunks`**: Passage-level chunk indexes for citation-grounded RAG.
- **`subjects`, `topics`, `syllabus_entries`**: Course curriculum structure.
- **`chat_conversations` & `chat_messages`**: Chat history, citations JSONB, and view aliases `chats` & `messages`.
- **`flashcard_decks` & `study_sets`**: Decks and study resources.
- **`flashcards`**: SM-2 spaced repetition cards (`repetitions`, `interval_days`, `ease_factor`, `next_review_at`, `source_citations`).
- **`review_logs` & `review_history`**: History of review ratings and interval progressions.
- **`quizzes` & `quiz_attempts`**: Questions JSONB, student answers JSONB, scores, and completion timestamps.
- **`weak_topics`**: Missed topics tracking for revision.
- **Row Level Security (RLS)**: Enforced across all tables with `auth.uid() = user_id`.
- **Storage Policies**: Private bucket `study-documents` restricted to `auth.uid()::text = (storage.foldername(name))[1]`.

---

## 3. Local Environment Variables Setup

### Frontend (`frontend/.env.local`)
Create or edit `cognify/frontend/.env.local`:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
```
*(The codebase automatically normalizes `/rest/v1/` to the base domain `https://your-project-ref.supabase.co`)*

### Backend (`backend/.env` and root `cognify/.env`)
Create or edit `cognify/backend/.env`:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key_here
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
PORT=3001
MAX_FILE_SIZE_MB=25
```

---

## 4. Vercel Production Environment Variables

When deploying to Vercel, configure the following variables in **Project Settings -> Environment Variables**:

| Variable Name | Value Description | Environments |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://your-project-ref.supabase.co` | Production, Preview, Dev |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `your_supabase_publishable_key_here` | Production, Preview, Dev |
| `SUPABASE_URL` | `https://your-project-ref.supabase.co` | Production, Preview, Dev |
| `SUPABASE_SECRET_KEY` | `your_supabase_secret_key_here` | Production, Preview (Backend only!) |
| `GEMINI_API_KEY` | `your_gemini_api_key_here` | Production, Preview (Backend only!) |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Production, Preview, Dev |
| `MAX_FILE_SIZE_MB` | `25` | Production, Preview, Dev |

> ⚠️ **CRITICAL SECURITY NOTE:** Never add `SUPABASE_SECRET_KEY` or `GEMINI_API_KEY` with a `VITE_` prefix. Only the publishable key should be bundled into frontend client code.

---

## 5. Google OAuth Configuration in Supabase

1. Go to **Authentication -> Providers -> Google** on your Supabase dashboard:
   👉 **`https://supabase.com/dashboard/project/<your-project-ref>/auth/providers`**
2. Toggle Google **Enabled**.
3. Copy the **Callback URL (for OAuth)**:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Add the Callback URL to **Authorized redirect URIs**.
   - Add your domains (`http://localhost:5173` and `https://<your-app>.vercel.app`) to **Authorized JavaScript origins**.
   - Save and copy your Google Client ID and Client Secret into Supabase.
5. In Supabase **Authentication -> URL Configuration**:
   - Set **Site URL** to `http://localhost:5173` (or your Vercel URL in production).
   - Add `http://localhost:5173/**` and `https://*.vercel.app/**` to **Redirect URLs**.
