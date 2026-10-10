# Cognify — Syllabus-Grounded AI Study Assistant

> **An AI study assistant that uses your prescribed syllabus, class notes, textbooks, and examination papers to help you understand, practice, and revise content relevant to your exams.**

[![Tests](https://img.shields.io/badge/tests-13%2F13%20passing-10b981)]()
[![Gemini](https://img.shields.io/badge/Gemini%20API-gemini--3.8--flash-6366f1)]()
[![Supabase](https://img.shields.io/badge/database-Supabase%20PostgreSQL-3ecf8e)]()
[![Vercel](https://img.shields.io/badge/deployment-Vercel%20Serverless-000000)]()

---

## 1. Product Overview

General AI models frequently provide answers that are technically accurate but fail to match a student's specific university syllabus, prescribed grading scheme, or course notes.

**Cognify solves this by grounding every interaction in the student's actual study material:**
- **Mode A — Learn from My Syllabus:** Upload course curriculum and organize units/topics.
- **Mode B — Learn from My Files:** Upload PDFs, DOCX notes, PPTX slides, and answer keys.
- **Mode C — Combined Learning:** Prioritize syllabus coverage and cite exact source documents and pages.

---

## 2. Core Capabilities & Study Tools

| Study Tool | Description | Capabilities |
| :--- | :--- | :--- |
| **Grounded Study Chat** | Real-time AI chat grounded in student materials | Provides verified source citations and grounding status (`grounded`, `partially_grounded`, `insufficient_sources`). |
| **Active Recall Flashcards** | 3D interactive flip cards | Generate 1 to 50 cards with difficulty settings; track "Mastered" vs "Need Review"; save and reopen decks. |
| **Hierarchical Mind Map** | Visual hierarchical tree diagram | Breaks down complex subjects into central topics, color-coded branches, and subtopics; savable to study sets. |
| **Interactive Quiz Me** | Self-assessment test engine | Generates 1 to 50 MCQs; server-side grading; instant feedback with detailed explanations and celebratory confetti. |
| **Exam Answer Generator** | Structured exam model answers | Custom formats for **2, 5, 10, and 13 marks**; includes definitions, numbered points, diagrams/examples, and high-yield keywords. |
| **Progress & Weak Topics** | Diagnostic learning analytics | Records mistake patterns from quiz attempts and highlights topics needing revision. |

---

## 3. Technology Stack & Architecture

- **Frontend:** React 18, Vite 6, JavaScript, Vanilla CSS design system, Lucide icons, Canvas Confetti.
- **Backend:** Node.js, Express, Vercel-compatible serverless functions under `/api`.
- **AI Engine:** Official Google `@google/genai` JavaScript SDK with `gemini-3.8-flash`.
- **Database:** Supabase PostgreSQL with relational schema, foreign keys, and Row Level Security (RLS).
- **Authentication:** Supabase Auth with Google OAuth provider & JWT Bearer token verification.
- **Document Processing:** Server-side parsers for PDF (`pdf-parse`), DOCX (`mammoth`), PPTX (`officeparser`), TXT, and Markdown; sentence-aware chunker (800–1200 characters).
- **Deployment:** Vercel (monorepo structure with `vercel.json` rewrites and `api/index.js` serverless handler).

---

## 4. Local Quick Start

### Prerequisites
- Node.js v20+ or v22+
- npm v10+
- Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/))

### 1. Clone & Install
```bash
cd cognify

# Install root, backend, and frontend dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
PORT=3001

# Supabase (Optional for local test runner; required for cloud persistence)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Automated Tests
```bash
npm test
```
*Runs all 13 test suites including API security, CRUD, document processing, and live Gemini AI generation.*

### 4. Start Local Development Server
```bash
npm run dev
```
- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3001](http://localhost:3001)
- **API Health:** [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## 5. Supabase & Google Cloud OAuth Configuration

Detailed instructions are provided in [`supabase/README.md`](./supabase/README.md).

### Summary Steps:
1. **Run Migration:** Paste [`supabase/migrations/20261010000000_cognify_schema.sql`](./supabase/migrations/20261010000000_cognify_schema.sql) into the Supabase SQL Editor.
2. **Enable Google Provider:** In Supabase **Authentication -> Providers**, enable **Google** and copy the callback URL.
3. **Google Cloud Console:** Create an OAuth 2.0 Web Client in Google Cloud Console, add the Supabase callback URL to authorized redirect URIs, and copy the Client ID and Secret back to Supabase.
4. **URL Configuration:** Add `http://localhost:5173/**` and `https://<your-vercel-app>.vercel.app/**` to allowed redirect URLs in Supabase.

---

## 6. Vercel Deployment Guide

Cognify is configured out-of-the-box for serverless deployment on Vercel using `vercel.json` and `api/index.js`.

### 1. Deploy via Vercel CLI
```bash
npm install -g vercel
vercel
```
Or connect your GitHub repository directly in the [Vercel Dashboard](https://vercel.com).

### 2. Configure Vercel Project Settings
- **Root Directory:** `cognify` (or repository root if deploying from repo)
- **Build Command:** `cd frontend && npm install && npm run build`
- **Output Directory:** `frontend/dist`

### 3. Configure Environment Variables in Vercel
Set the following under **Project Settings -> Environment Variables**:
- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-3.8-flash`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 7. Backend API Specification

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Server diagnostics and connectivity status |
| `/api/workspaces` | `GET`, `POST` | Workspace CRUD |
| `/api/workspaces/:id` | `GET`, `PATCH`, `DELETE` | Single workspace management |
| `/api/workspaces/:id/subjects` | `GET`, `POST` | Subjects management |
| `/api/workspaces/:id/syllabus` | `GET`, `POST` | Syllabus entries storage |
| `/api/workspaces/:id/documents` | `POST` | Upload and process PDF, DOCX, PPTX, TXT, MD |
| `/api/workspaces/:id/documents` | `GET` | List documents for workspace |
| `/api/documents/:id/text` | `GET` | Preview extracted text from document |
| `/api/documents/:id` | `DELETE` | Delete document and indexed chunks |
| `/api/chat` | `POST` | Grounded AI chat with source citations |
| `/api/study/mindmap` | `POST` | Generate structured hierarchical mind map |
| `/api/study/flashcards` | `POST` | Generate 1 to 50 active recall flashcards |
| `/api/study/questions` | `POST` | Generate exam questions with marking scheme |
| `/api/study/quiz` | `POST` | Generate interactive MCQ test |
| `/api/study/summary` | `POST` | Generate short, medium, or detailed summary |
| `/api/study/exam-answer` | `POST` | Generate structured 2-, 5-, 10-, 13-mark answers |
| `/api/quizzes/submit` | `POST` | Grade quiz answers and update weak topics |
| `/api/workspaces/:id/study-sets` | `GET`, `POST` | Saved study materials CRUD |
| `/api/workspaces/:id/weak-topics` | `GET` | Identified weak topics and error rates |
| `/api/workspaces/:id/progress` | `GET` | Diagnostic learning statistics |

---

## 8. Security & Secret Management

- **Zero Secret Leakage:** The Gemini API key is accessed exclusively server-side and is never exposed in frontend bundles or browser network requests.
- **Strict Authorization:** All private endpoints verify the Supabase JWT Bearer token and derive user identity exclusively from the verified token.
- **Row Level Security:** Database policies ensure users cannot view or manipulate workspaces, documents, or study sets belonging to other accounts.
