const { generateStructuredContent, generateGroundedAnswer } = require('./gemini');
const { retrieveContext } = require('./retrieval');

/**
 * 1. Mind Map Generation
 */
async function generateMindMap({ topic, contextText, workspaceInfo }) {
  const prompt = `Generate a comprehensive hierarchical Mind Map for the following topic based on the study materials:

TOPIC: "${topic || 'Overview of Subject'}"
CONTEXT:
${contextText ? contextText.substring(0, 8000) : 'General syllabus overview.'}

Return a STRICT JSON object in this exact schema:
{
  "centralTopic": "${topic || 'Main Topic'}",
  "description": "Brief description of the central concept",
  "branches": [
    {
      "id": "b1",
      "title": "Branch Name",
      "description": "Short explanation",
      "subtopics": [
        {
          "id": "s1",
          "title": "Subtopic Name",
          "details": "Key definition, rule, or mechanism"
        }
      ]
    }
  ]
}
Ensure 3 to 6 logical branches with 2 to 4 subtopics each.`;

  return await generateStructuredContent({ prompt });
}

/**
 * 2. Flashcards Generation (1 - 50 cards)
 */
async function generateFlashcards({ topic, quantity = 10, difficulty = 'mixed', contextText }) {
  const count = Math.min(Math.max(parseInt(quantity, 10) || 10, 1), 50);

  const prompt = `Generate exactly ${count} study flashcards for topic: "${topic || 'Selected Study Material'}".
Target Difficulty: ${difficulty}.
STUDY MATERIAL CONTEXT:
${contextText ? contextText.substring(0, 8000) : 'Standard curriculum.'}

Return a STRICT JSON object with this exact schema:
{
  "topic": "${topic || 'General'}",
  "total": ${count},
  "flashcards": [
    {
      "id": 1,
      "front": "Clear question, prompt, or term to define",
      "back": "Accurate, concise explanation or definition from the study material",
      "topic": "Specific subtopic",
      "difficulty": "easy | medium | hard",
      "source": "Document or unit reference if found in text"
    }
  ]
}
Make questions clear and answers concise, memorable, and academically rigorous.`;

  return await generateStructuredContent({ prompt });
}

/**
 * 3. Questions Generation (1 - 50 questions)
 */
async function generateQuestions({ topic, quantity = 10, type = 'mixed', difficulty = 'mixed', marks = null, contextText }) {
  const count = Math.min(Math.max(parseInt(quantity, 10) || 10, 1), 50);

  const prompt = `Generate exactly ${count} examination questions for topic: "${topic || 'General'}".
Question Type: ${type} (can be 'mcq', 'short', 'long', or 'mixed').
Difficulty: ${difficulty}.
${marks ? `Target Mark Allocation: ${marks} marks.` : ''}

STUDY MATERIAL CONTEXT:
${contextText ? contextText.substring(0, 8000) : 'Standard curriculum.'}

Return a STRICT JSON object with this exact schema:
{
  "topic": "${topic || 'General'}",
  "total": ${count},
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "type": "mcq | short | long",
      "options": ["Option A", "Option B", "Option C", "Option D"], // only for mcq, omit or empty array for short/long
      "correctAnswer": "Answer key / expected answer",
      "explanation": "Detailed step-by-step marking explanation",
      "marks": ${marks || 5},
      "difficulty": "easy | medium | hard"
    }
  ]
}`;

  return await generateStructuredContent({ prompt });
}

/**
 * 4. Interactive Quiz Me Generation (1 - 50 MCQs)
 */
async function generateQuiz({ topic, quantity = 5, difficulty = 'medium', contextText }) {
  const count = Math.min(Math.max(parseInt(quantity, 10) || 5, 1), 50);

  const prompt = `Generate an interactive examination quiz with exactly ${count} multiple choice questions (MCQs) on "${topic || 'Syllabus Review'}".
Difficulty: ${difficulty}.

STUDY MATERIAL CONTEXT:
${contextText ? contextText.substring(0, 8000) : 'Standard curriculum.'}

Return a STRICT JSON object in this exact schema:
{
  "title": "Quiz: ${topic || 'Revision'}",
  "topic": "${topic || 'General'}",
  "totalQuestions": ${count},
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0, // 0-indexed integer corresponding to the correct option (0, 1, 2, or 3)
      "explanation": "Academic explanation of why this option is correct and others are incorrect",
      "topic": "${topic || 'General'}"
    }
  ]
}
Ensure there are exactly 4 distinct options per question. The correctIndex MUST be between 0 and 3.`;

  return await generateStructuredContent({ prompt });
}

/**
 * 5. Summary Generation
 */
async function generateSummary({ topic, length = 'medium', contextText }) {
  const prompt = `Generate a structured, high-yield academic summary for: "${topic || 'Study Material'}".
Target Length: ${length} (short = ~250 words, medium = ~500 words, detailed = ~900 words).

STUDY MATERIAL CONTEXT:
${contextText ? contextText.substring(0, 8000) : 'Standard curriculum.'}

Return a STRICT JSON object in this exact schema:
{
  "title": "Summary of ${topic || 'Material'}",
  "length": "${length}",
  "overview": "High-level summary paragraph",
  "keyConcepts": [
    { "term": "Concept Name", "definition": "Clear academic definition" }
  ],
  "corePrinciplesAndFormulas": [
    "Key formula, principle, or mechanism 1",
    "Key formula, principle, or mechanism 2"
  ],
  "takeaways": [
    "Critical exam point 1",
    "Critical exam point 2"
  ],
  "fullSummaryMarkdown": "Full formatted markdown text of the summary with clear headings and bullet points"
}`;

  return await generateStructuredContent({ prompt });
}

/**
 * 6. Exam Answer Generator (2, 5, 10, 13 marks)
 */
async function generateExamAnswer({ question, marks = 5, answerStyle = 'standard', contextText }) {
  const marksNum = parseInt(marks, 10) || 5;

  let structureGuide = '';
  if (marksNum === 2) {
    structureGuide = 'Format: 2 Marks. Concise 2-4 sentence definition, 2 key bullet points, essential keyword.';
  } else if (marksNum === 5) {
    structureGuide = 'Format: 5 Marks. Crisp Introduction/Definition, 4-5 well-structured numbered points with explanations, 1 practical example or diagram description, Brief conclusion.';
  } else {
    structureGuide = 'Format: 10/13 Marks (Long Answer). Comprehensive university/competitive exam format: Introduction & Definitions, Theoretical Background, Core Mechanism/Analysis divided into 4-6 detailed subsections with examples, Schematic Diagram/Flowchart textual representation, Evaluation/Implications, and Conclusion. List high-scoring keywords.';
  }

  const prompt = `Generate a top-scoring exam answer for the following question:

EXAM QUESTION: "${question}"
TARGET MARKS: ${marksNum} Marks
ANSWER STYLE: ${answerStyle}
STRUCTURE REQUIREMENT: ${structureGuide}

STUDY MATERIAL & ANSWER KEY CONTEXT:
${contextText ? contextText.substring(0, 8000) : 'Standard academic curriculum.'}

Return a STRICT JSON object in this exact schema:
{
  "question": "${question}",
  "marks": ${marksNum},
  "definitionOrIntro": "Precise opening definition or introductory paragraph",
  "sections": [
    {
      "heading": "Section Title",
      "content": "Detailed explanatory text and bullet points"
    }
  ],
  "diagramOrExample": "Recommended diagram/flowchart description or case example",
  "conclusion": "Final wrap-up paragraph",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "fullFormattedAnswer": "Complete beautifully formatted markdown text ready for the student to revise"
}`;

  return await generateStructuredContent({ prompt });
}

/**
 * 7. Comprehensive Study Guide Generator (NotebookLM style)
 */
async function generateStudyGuide({ topic, contextText }) {
  const prompt = `Generate an authoritative, comprehensive study guide for: "${topic || 'Selected Study Sources'}".

STUDY MATERIAL CONTEXT:
${contextText ? contextText.substring(0, 8500) : 'Course materials.'}

Return a STRICT JSON object in this exact schema:
{
  "title": "Study Guide: ${topic || 'Core Material'}",
  "overview": "Comprehensive executive summary of the topic and main theme",
  "keyConcepts": [
    { "concept": "Concept Name", "explanation": "Clear, intuitive explanation with significance" }
  ],
  "importantDefinitions": [
    { "term": "Technical Term", "definition": "Exact rigorous academic definition" }
  ],
  "mainArguments": [
    "Key argument, principle, or theoretical pillar 1",
    "Key argument, principle, or theoretical pillar 2"
  ],
  "formulasAndExamples": [
    { "name": "Formula or Mechanism", "details": "Formula/equation and concrete walkthrough" }
  ],
  "commonConfusions": [
    { "misconception": "Common student misunderstanding", "clarification": "The correct distinction" }
  ],
  "practiceQuestions": [
    "Self-test question 1 to test deep retention",
    "Self-test question 2 to test application"
  ]
}`;

  return await generateStructuredContent({ prompt });
}

module.exports = {
  generateMindMap,
  generateFlashcards,
  generateQuestions,
  generateQuiz,
  generateSummary,
  generateExamAnswer,
  generateStudyGuide,
};
