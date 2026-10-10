# Cognify --- Product Requirements Document (PRD)

**Project:** Cognify\
**Problem Statement:** PS09 --- AI-Powered Personalized Study Assistant\
**Document type:** Product requirements + implementation instructions
for Antigravity\
**Stage:** Working prototype / hackathon MVP\
**Priority:** Backend functionality, reliable document processing,
syllabus-grounded answers, and working study tools\
**Payments:** Out of scope for this prototype

------------------------------------------------------------------------

## 1. Master Instruction for Antigravity

Build **Cognify**, a fully working AI-powered study assistant.
Prioritize the backend, data flow, document processing, AI integration,
and end-to-end functionality over visual polish.

Do not create only a static UI or mock demo. Every visible control must
perform its intended action and connect to a real backend endpoint. Do
not use hardcoded AI responses, fake upload progress, placeholder
generated content, or simulated database records.

Use simple, understandable code suitable for a college-level developer.
Keep the project organized without unnecessary architecture or
overengineering. Before making changes, inspect the existing repository
and preserve useful working code. If the project is empty, create the
structure in this document.

Implement in small stages, but continue until the core acceptance
criteria in this PRD pass. Run the app, run available tests, fix errors,
and document any remaining limitations. Do not stop after creating files
or explaining what should be done.

### Required technology

-   **Frontend:** React + Vite + JavaScript
-   **Backend:** Node.js + Express
-   **AI provider:** Google Gemini API using the current supported
    official JavaScript SDK (`@google/genai`)
-   **Database:** SQLite for prototype persistence
-   **Document extraction:** suitable Node.js libraries for PDF, DOCX,
    PPTX, TXT, and Markdown
-   **Validation:** validate all request parameters and uploaded files
    on the server
-   **Testing:** Node.js test runner or the simplest compatible test
    setup, including tests that do not require a paid AI call

Do not introduce subscriptions, payment gateways, authentication
systems, LangChain, or complex cloud infrastructure in this prototype
unless explicitly requested later. The app should work locally with one
developer-owned Gemini API key.

------------------------------------------------------------------------

## 2. Product Overview

Cognify helps learners study from the exact materials relevant to their
course or examination. A user can either:

1.  **Learn from My Syllabus:** create a learning workspace for a
    college subject, school subject, UPSC preparation, or another
    competitive exam, then add the syllabus, teacher notes, question
    banks, and answer keys.
2.  **Learn from My Files:** upload the material they want to learn and
    ask questions about it without first creating a full syllabus.

The user may combine syllabus information and uploaded files in the same
workspace.

Cognify must prioritize the material selected by the user. It must not
confidently invent unsupported syllabus facts. If the material does not
contain enough information, it should say so and, where useful, ask the
user to add a source.

### Main product promise

> An AI study assistant that uses your syllabus and study materials to
> help you understand, practise, and revise the content relevant to your
> exam.

------------------------------------------------------------------------

## 3. Goals and Non-Goals

### Goals

-   Create and manage learning workspaces.
-   Store syllabus details and subject/unit/chapter structure.
-   Upload and extract text from study documents.
-   Index document text so relevant passages can be retrieved for a
    question.
-   Generate answers grounded in retrieved passages.
-   Provide source references to the uploaded file and page/section when
    available.
-   Generate summaries, mind maps, questions, flashcards, and
    interactive quizzes.
-   Let users control the number of questions and flashcards.
-   Persist workspaces, files, and generated study sets in SQLite.
-   Handle API failures, invalid files, empty material, and out-of-scope
    questions clearly.
-   Provide a minimal but usable frontend connected to the real backend.

### Non-goals for this prototype

-   Payments, subscriptions, or institution billing.
-   Public multi-user deployment or production-grade account security.
-   Training a new foundation model.
-   Guaranteed predictions of exam questions.
-   Automatic access to private college portals.
-   A polished mobile app.
-   Claims that generated answers are official unless they come from an
    identified official source.

------------------------------------------------------------------------

## 4. User Types and Learning Modes

### Learning modes

**A. Syllabus Learning** - Select education category: College, High
School, UPSC, or Other Competitive Exam. - Create an
institution/course/exam and subject. - Add syllabus text or upload a
syllabus file. - Organize content into units and topics where
possible. - Upload teacher notes, key notes, question banks,
previous-year papers, and answer keys. - Select a subject and optionally
a unit/topic before asking questions.

**B. Learn from My Files** - Create a file-based workspace or use a
temporary workspace. - Upload one or more supported documents. - Ask
questions and use the same study-generation tools. - If no syllabus is
supplied, ground responses in the uploaded files and do not pretend that
a syllabus has been verified.

**C. Combined Mode** - Use both the syllabus and relevant uploaded study
documents. - Give higher priority to selected course materials and
official/teacher-provided answer keys where applicable. - When sources
disagree, point out the conflict rather than silently choosing an
answer.

------------------------------------------------------------------------

## 5. Functional Requirements

### 5.1 Workspace and syllabus management

Users must be able to: - Create, view, rename, and delete a workspace. -
Choose an education category. - Add an institution/course/exam name,
subject name, and optional academic term. - Add or edit syllabus text. -
Add units, chapters, and topics manually. - Upload a syllabus document
and review extracted text before saving it as the syllabus. - Attach
multiple documents to a workspace and optionally categorize each as
`syllabus`, `notes`, `question_bank`, `answer_key`, `previous_paper`, or
`other`. - Select a workspace, subject, and optional topic for each AI
request.

Do not silently infer that an uploaded file is an official syllabus.
Show its user-selected document category and source name.

### 5.2 File upload and document processing

Support at minimum: - PDF - DOCX - PPTX - TXT - MD

Requirements: - Validate extension, MIME type where possible, and file
size on the server. - Set a reasonable default maximum of **15 MB per
file**, configurable with an environment variable. - Use safe generated
storage names; preserve the original display name in the database. -
Store files in a local `backend/uploads/` directory for the prototype. -
Extract text and split it into chunks with overlap, preserving page
numbers or section metadata when the parser exposes them. - Store
extracted text and chunk metadata in SQLite. - Show processing status:
`processing`, `ready`, or `failed`. - Return a useful error if a PDF is
scanned/image-only and no text can be extracted. OCR is not required for
the first MVP. - Avoid reprocessing an unchanged file unnecessarily. -
Deleting a document must remove its database records and local file when
possible. - Never execute uploaded files or trust their contents as
instructions.

### 5.3 Grounded retrieval (RAG)

Implement a simple, explainable retrieval system. Do not rely only on a
prompt that tells Gemini to "use the syllabus."

For the MVP: 1. Extract and normalize text. 2. Split content into chunks
(target approximately 800--1,200 characters, with overlap). 3. Store
chunks with `workspaceId`, `documentId`, source category, page/section
if available, and chunk order. 4. For each user question, retrieve
relevant chunks using a simple lexical scoring method (for example,
token overlap/TF-IDF). Keep this implementation isolated so it can be
replaced with embeddings later. 5. Filter retrieval by the selected
workspace and, where requested, subject/topic or document category. 6.
Send only the most relevant chunks to Gemini with clear source labels.
7. Return the answer and a list of sources used. 8. If retrieval finds
no relevant material or only weak matches, tell Gemini to say the
information is not present or is insufficient. Do not fabricate
citations.

Retrieval must not mix material from different workspaces. Keep a clear
distinction between source text and user instructions.

### 5.4 AI chat

The chat endpoint must: - Accept a workspace ID, question, optional
subject/topic, and optional recent conversation history. - Retrieve
relevant source chunks before calling Gemini. - Use a server-side system
instruction that prioritizes the selected material, distinguishes
supported facts from general explanation, and refuses to invent page
numbers or citations. - Return structured JSON containing the answer,
source references, and a grounding status such as `grounded`,
`partially_grounded`, or `insufficient_sources`. - Allow simple
explanations, examples, comparisons, and step-by-step teaching while
staying aligned to the provided content. - Support follow-up questions
using a limited recent history, but re-retrieve evidence for every new
question. - Handle Gemini quota, timeout, invalid-key, and network
errors with friendly messages. - Never expose the Gemini API key or
internal stack traces to the frontend.

When a user explicitly requests general knowledge beyond their material,
the app may answer separately if supported by the configured model, but
must clearly label it as general information and not syllabus-grounded.

### 5.5 Study tools in the prompt area

All tools must be real backend features, not static cards. Tool controls
should allow users to set relevant options before generating content.

**Mind Map** - Generate a structured hierarchy of the selected topic. -
Return valid JSON with a central topic, branches, and child nodes. -
Render the result as an interactive or readable tree/diagram in the
frontend. - Allow saving and reopening a generated mind map. - If the
model returns invalid JSON, retry once with a correction prompt or
return a clear error.

**Questions** - Let users specify quantity, default 10, with a safe
range of 1--50. - Let users choose question type: MCQ, short answer,
long answer, or mixed. - Let users choose difficulty: easy, medium,
hard, or mixed. - Optionally choose marks (e.g., 2, 5, 10/13) and a
topic. - Include answer keys and concise explanations where
appropriate. - Return structured JSON with question text, type, options
when relevant, correct answer, explanation, difficulty, and source
references. - Do not claim generated questions are guaranteed to appear
in an exam.

**Flashcards** - Let users choose quantity, default 10, with a safe
range of 1--50. - Each card must contain a concise front/question and
back/answer. - Include optional topic and difficulty. - Support flipping
cards, moving next/previous, shuffling, and marking `Know` / `Review`. -
Save generated decks and allow reopening them. - Ground cards in
retrieved material and attach source references where available.

**Summaries** - Support short, medium, and detailed length. - Summarize
a selected document, topic, unit, or retrieved source set. - Preserve
important terms, formulas, definitions, and distinctions from the
source. - Do not add unsupported claims without clearly labeling them.

**Quiz Me** - Let users choose question count (1--50), question type,
and difficulty. - Present questions one at a time or in a clear quiz
list. - For MCQs, allow answer selection and submission. - Show score,
correct answers, and explanations after answering. - Save attempts and
answers to SQLite for history and later weak-topic analysis.

**Exam Answer** - Generate a structured answer based on selected
materials and marks/length. - Support formats such as 2-mark, 5-mark,
and 10/13-mark answers. - Include definition, key points,
examples/diagram description, and conclusion when relevant. - Highlight
important keywords. - If a supplied answer key exists, use it as a
priority reference and mention when the generated answer differs from
it.

### 5.6 Source references and trust

-   Every grounded response should return source file name and
    page/section when known.
-   Do not invent page numbers.
-   Display source snippets or allow the user to open the source record.
-   Distinguish `grounded`, `partially_grounded`, and
    `insufficient_sources`.
-   If source materials conflict, show the conflicting source
    references.
-   If content cannot be extracted, explain the limitation.
-   Make it clear that AI-generated study content should be checked
    against official course material.

### 5.7 Progress and saved content

For the MVP: - Save generated mind maps, flashcard decks, summaries, and
question sets. - Save quiz attempts, score, date, and question/topic
identifiers. - Track questions marked wrong and topics associated with
them. - Show a simple list of weak topics based on repeated mistakes. -
A full adaptive learning engine and spaced-repetition scheduler can be
added later; do not block the MVP on them.

------------------------------------------------------------------------

## 6. Data Model

Use SQLite with migrations or a simple schema initialization module. Use
parameterized SQL queries.

Suggested tables:

### `workspaces`

-   `id`
-   `name`
-   `education_type`
-   `institution_or_exam`
-   `course_or_class`
-   `created_at`
-   `updated_at`

### `subjects`

-   `id`
-   `workspace_id`
-   `name`
-   `description`
-   `created_at`

### `topics`

-   `id`
-   `subject_id`
-   `parent_topic_id` (nullable)
-   `name`
-   `description`
-   `sort_order`

### `documents`

-   `id`
-   `workspace_id`
-   `subject_id` (nullable)
-   `original_name`
-   `stored_name`
-   `category`
-   `mime_type`
-   `size_bytes`
-   `status`
-   `extraction_error` (nullable)
-   `created_at`

### `document_chunks`

-   `id`
-   `document_id`
-   `workspace_id`
-   `subject_id` (nullable)
-   `chunk_index`
-   `text`
-   `page_number` (nullable)
-   `section_label` (nullable)
-   `created_at`

### `study_sets`

-   `id`
-   `workspace_id`
-   `subject_id` (nullable)
-   `type` (`mindmap`, `flashcards`, `questions`, `summary`)
-   `title`
-   `content_json`
-   `created_at`

### `quiz_attempts`

-   `id`
-   `workspace_id`
-   `subject_id` (nullable)
-   `study_set_id` (nullable)
-   `score`
-   `total_questions`
-   `answers_json`
-   `created_at`

### `chat_messages`

-   `id`
-   `workspace_id`
-   `role`
-   `message`
-   `sources_json`
-   `grounding_status`
-   `created_at`

Add indexes for workspace, document, subject, and creation time as
needed. Enforce foreign keys where practical. Keep database operations
in a small reusable module.

------------------------------------------------------------------------

## 7. API Contract

Use JSON for ordinary requests/responses and multipart form data for
uploads. Prefix API endpoints with `/api`.

### Health

-   `GET /api/health` --- returns server status and database
    connectivity.

### Workspaces and subjects

-   `GET /api/workspaces`
-   `POST /api/workspaces`
-   `GET /api/workspaces/:id`
-   `PATCH /api/workspaces/:id`
-   `DELETE /api/workspaces/:id`
-   `GET /api/workspaces/:id/subjects`
-   `POST /api/workspaces/:id/subjects`
-   `PATCH /api/subjects/:id`
-   `DELETE /api/subjects/:id`
-   `GET /api/subjects/:id/topics`
-   `POST /api/subjects/:id/topics`

### Documents and syllabus

-   `POST /api/workspaces/:id/documents` --- upload a document; accept
    category and optional subject ID.
-   `GET /api/workspaces/:id/documents`
-   `GET /api/documents/:id`
-   `GET /api/documents/:id/status`
-   `GET /api/documents/:id/text` --- return extracted text for preview.
-   `DELETE /api/documents/:id`
-   `POST /api/workspaces/:id/syllabus` --- save or update syllabus
    text.
-   `GET /api/workspaces/:id/syllabus`

### Chat and generation

-   `POST /api/chat`
-   `POST /api/study/mindmap`
-   `POST /api/study/questions`
-   `POST /api/study/flashcards`
-   `POST /api/study/summary`
-   `POST /api/study/exam-answer`
-   `POST /api/study/quiz`

### Saved study content and progress

-   `GET /api/workspaces/:id/study-sets`
-   `GET /api/study-sets/:id`
-   `DELETE /api/study-sets/:id`
-   `POST /api/quizzes/:id/submit`
-   `GET /api/workspaces/:id/quiz-attempts`
-   `GET /api/workspaces/:id/weak-topics`

### API response conventions

Success:

``` json
{
  "success": true,
  "data": {}
}
```

Error:

``` json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please provide a valid question."
  }
}
```

Use appropriate HTTP status codes. Do not return secret keys, local
absolute paths, or raw stack traces.

------------------------------------------------------------------------

## 8. Recommended Project Structure

Keep this structure simple. It is acceptable to adjust names if the
result remains organized and every feature is implemented.

``` text
cognify/
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── style.css
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── Header.jsx
│       │   ├── ChatBox.jsx
│       │   ├── PromptBox.jsx
│       │   ├── FileUpload.jsx
│       │   ├── StudyTools.jsx
│       │   └── SubjectSelector.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── SyllabusPage.jsx
│       │   ├── ChatPage.jsx
│       │   ├── MindMapPage.jsx
│       │   ├── FlashcardsPage.jsx
│       │   └── QuizPage.jsx
│       └── services/
│           └── api.js
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── app.js
│   ├── config/
│   │   └── env.js
│   ├── db/
│   │   ├── database.js
│   │   └── schema.sql
│   ├── routes/
│   │   ├── health.js
│   │   ├── workspaces.js
│   │   ├── subjects.js
│   │   ├── syllabus.js
│   │   ├── documents.js
│   │   ├── chat.js
│   │   └── study.js
│   ├── services/
│   │   ├── gemini.js
│   │   ├── documentParser.js
│   │   ├── chunker.js
│   │   ├── retrieval.js
│   │   ├── studyGenerator.js
│   │   └── progress.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── uploadValidation.js
│   ├── utils/
│   │   └── validation.js
│   └── uploads/
│       └── .gitkeep
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Use a root `package.json` with convenient scripts to run the frontend
and backend together, or document separate commands clearly. Do not put
the real `.env` file inside a public frontend folder.

------------------------------------------------------------------------

## 9. Environment Variables and Secrets

Create `.env.example` containing placeholders only:

``` env
GEMINI_API_KEY=replace_with_your_key
GEMINI_MODEL=choose_a_current_supported_gemini_model
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
DATABASE_PATH=./data/cognify.sqlite
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=15
```

Implementation rules: - Read `GEMINI_API_KEY` only in the backend. - Use
the current official Gemini JavaScript SDK and its current documented
API. - Make the model configurable using `GEMINI_MODEL`; verify that the
configured model is available instead of hardcoding an obsolete model
name. - Fail at startup with a clear developer-facing message if the API
key is missing, but keep `/api/health` useful for diagnosis. - Never
print the API key to logs or return it to the browser. - Add `.env`,
database files, uploads, `node_modules`, and build outputs to
`.gitignore`. - Never ask the user to paste the key into chat or source
code.

------------------------------------------------------------------------

## 10. Security, Reliability, and Error Handling

-   Validate all IDs, strings, numeric ranges, document categories, and
    generation options on the backend.
-   Restrict file extensions and size; use generated disk filenames.
-   Prevent path traversal when accessing or deleting uploads.
-   Use parameterized SQL queries.
-   Add basic request timeouts and a sensible request-size limit.
-   Do not allow the frontend to choose arbitrary filesystem paths.
-   Treat document content as untrusted data. A document may contain
    instructions such as "ignore previous instructions"; never let
    document text override the server's system rules.
-   Send only relevant retrieved text to the model, not every document
    in full.
-   Avoid sending unrelated workspace content to Gemini.
-   Handle empty extraction, unsupported formats, malformed model JSON,
    rate limits, invalid API keys, and network failures.
-   If generation returns invalid structured data, attempt one
    repair/retry at most, then return a clear error.
-   Do not log entire uploaded documents or secrets.
-   Add a clear "Delete document" action that removes stored data.
-   For this local prototype, explain that uploaded files are stored
    locally and that there is no user authentication; do not present it
    as secure multi-user hosting.

------------------------------------------------------------------------

## 11. Frontend Requirements (Functional, Not Visual-First)

Build a simple, usable interface. Do not spend the majority of
development time on animations or decorative styling.

Required working flows: 1. Create a workspace and select education type.
2. Add a subject and syllabus. 3. Upload a document and see its
processing status. 4. Preview extracted text. 5. Select a
workspace/subject and ask a question. 6. View the AI response and
sources. 7. Generate a mind map. 8. Generate a chosen number of
questions. 9. Generate a chosen number of flashcards. 10. Generate a
summary or exam answer. 11. Complete a quiz and see score/explanations.
12. Reopen saved study sets and quiz history. 13. Delete documents and
workspaces.

Use loading indicators, empty states, disabled states while requests are
running, and readable error messages. Avoid fake data unless it is
clearly labeled as an optional demo fixture. All generated results must
come from actual API calls.

------------------------------------------------------------------------

## 12. Testing and Acceptance Criteria

The project is not complete until the following are checked.

### Setup and infrastructure

-   [ ] `npm install` completes successfully.
-   [ ] The frontend and backend start with documented commands.
-   [ ] `GET /api/health` returns a successful response.
-   [ ] SQLite tables are created automatically.
-   [ ] Missing Gemini key is reported clearly without exposing secrets.
-   [ ] `.env` and uploads are excluded from Git.

### Workspace and documents

-   [ ] User can create and delete a workspace.
-   [ ] User can create a subject and add syllabus text.
-   [ ] PDF, DOCX, PPTX, TXT, and MD uploads are validated and
    processed.
-   [ ] Extracted text is persisted and previewable.
-   [ ] Empty or unsupported files fail with a useful message.
-   [ ] A document from one workspace never appears in another
    workspace's retrieval results.

### AI grounding

-   [ ] Chat retrieves relevant chunks before asking Gemini.
-   [ ] Response includes actual source names and page/section
    information when available.
-   [ ] Unsupported questions are marked as insufficiently grounded.
-   [ ] The system does not fabricate citations.
-   [ ] A question about one subject does not retrieve unrelated
    subjects by default.
-   [ ] Model errors and quota limits are handled without crashing the
    server.

### Study generation

-   [ ] Mind map produces valid structured data.
-   [ ] Questions endpoint respects requested quantity and type.
-   [ ] Flashcards endpoint respects requested quantity.
-   [ ] Summary length option works.
-   [ ] Exam answer respects requested marks/format.
-   [ ] Quiz submission calculates the score on the server.
-   [ ] Saved study sets and quiz attempts survive a server restart.

### Frontend

-   [ ] Every required flow is connected to the backend.
-   [ ] Loading and error states are visible.
-   [ ] No main action is a dead button.
-   [ ] No API key is included in frontend bundles or browser requests.

Provide a final report with the commands used, tests run, features that
work, and any remaining known limitations. Never claim a test passed
unless it was actually run.

------------------------------------------------------------------------

## 13. Suggested Implementation Order

Follow this order to reduce debugging:

1.  Inspect the repository and confirm the runtime/tool versions.
2.  Create the project skeleton, environment configuration, Express
    server, and health endpoint.
3.  Set up SQLite schema and workspace/subject CRUD.
4.  Implement upload validation, text extraction, chunking, and
    persistence.
5.  Implement retrieval and test it without Gemini first.
6.  Integrate Gemini through a backend-only service and build grounded
    chat.
7.  Implement structured mind map, question, flashcard, summary,
    exam-answer, and quiz generation.
8.  Add saved study sets, quiz attempts, and weak-topic tracking.
9.  Connect the frontend to all real endpoints.
10. Run tests, launch both servers, fix errors, and update the README.

If a feature fails, fix it before moving to dependent features. Do not
replace a failing feature with a mock.

------------------------------------------------------------------------

## 14. Definition of Done

Cognify is ready for the prototype demonstration when a user can create
a syllabus workspace, upload study material, ask a question that is
answered using retrieved source passages, inspect citations, generate a
chosen number of flashcards/questions, complete a quiz, and reopen saved
results after restarting the server.

The primary success measure is **reliable, working syllabus-grounded
study functionality**, not visual polish or number of files created.
