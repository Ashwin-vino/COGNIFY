const { GoogleGenAI } = require('@google/genai');
const config = require('../config/env');

let aiClient = null;

function getAiClient() {
  if (!aiClient && config.geminiApiKey) {
    aiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return aiClient;
}

/**
 * System instruction enforcing syllabus grounding and preventing fabricated citations
 */
const SYSTEM_GROUNDING_INSTRUCTION = `You are Cognify, an expert, syllabus-grounded AI study assistant.
Your mission is to help students learn, revise, and prepare for exams using THEIR prescribed syllabus and uploaded study materials.

CRITICAL GROUNDING RULES:
1. ALWAYS prioritize the provided syllabus and study materials over generic AI knowledge.
2. ONLY make factual statements that are directly supported by the provided context.
3. NEVER fabricate or invent citations, page numbers, document titles, authors, or quotes.
4. If the retrieved material contains the answer, answer thoroughly and cite the source documents and page/unit numbers provided.
5. If the retrieved material is INSUFFICIENT or does NOT cover the topic:
   - State clearly: "Your uploaded study materials do not contain sufficient information to answer this question according to your syllabus."
   - You may offer a helpful general explanation only if clearly labeled as [GENERAL KNOWLEDGE (NOT FOUND IN YOUR UPLOADED MATERIALS)].
   - NEVER disguise general knowledge as verified syllabus content.
6. When conflicting materials or multiple answer keys exist, transparently highlight the differences.
7. Adapt the explanation to the requested exam structure or marks format when specified.
`;

/**
 * Clean and parse JSON from Gemini text response (handling ```json codeblocks)
 */
function extractAndParseJson(text) {
  if (!text) throw new Error('Empty response from model');
  let cleaned = text.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();
  return JSON.parse(cleaned);
}

/**
 * Grounded Chat Completion
 */
async function generateGroundedAnswer({ question, contextChunks, history = [], workspaceInfo = {} }) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please configure it in .env');
  }

  // Build context block
  let contextBlock = '';
  if (contextChunks && contextChunks.length > 0) {
    contextBlock = contextChunks
      .map((c, idx) => {
        const sourceLabel = `[SOURCE ${idx + 1}: ${c.document_name || 'Document'} | ${c.section_label || (c.page_number ? `Page ${c.page_number}` : 'Section')} | Category: ${c.document_category || 'Material'}]`;
        return `${sourceLabel}\n${c.text}`;
      })
      .join('\n\n---\n\n');
  } else {
    contextBlock = 'NO STUDY MATERIALS FOUND OR MATCHED FOR THIS QUERY.';
  }

  // Build prompt
  const prompt = `WORKSPACE CONTEXT:
Workspace Name: ${workspaceInfo.name || 'General Study'}
Education Category: ${workspaceInfo.education_type || 'General'}
Target Exam/Course: ${workspaceInfo.institution_or_exam || workspaceInfo.course_or_class || 'Standard Curriculum'}

STUDENT QUESTION:
"${question}"

RETRIEVED STUDY MATERIALS & SYLLABUS:
${contextBlock}

INSTRUCTIONS FOR YOUR RESPONSE:
1. Ground your answer in the provided study materials.
2. Quote or reference specific sources using their source labels [SOURCE X] when citing facts.
3. If the answer cannot be established from the materials, explicitly inform the student.
4. Provide structured, clear academic explanations with clear headings, bullet points, and key terms highlighted.
`;

  try {
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_GROUNDING_INSTRUCTION,
        temperature: 0.3,
      },
    });

    return {
      answer: response.text ? response.text.trim() : 'Unable to generate response.',
      model: config.geminiModel,
    };
  } catch (err) {
    console.error('[Cognify] Gemini API Error:', err.message);
    if (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('Quota exceeded'))) {
      const rateErr = new Error('Gemini API rate limit reached. Please wait a moment and try again.');
      rateErr.status = 429;
      rateErr.code = 'RATE_LIMITED';
      throw rateErr;
    }
    if (err.message && err.message.includes('API_KEY_INVALID')) {
      const authErr = new Error('Invalid Gemini API Key configured. Please verify your GEMINI_API_KEY.');
      authErr.status = 401;
      throw authErr;
    }
    throw new Error(`AI generation error: ${err.message}`);
  }
}

/**
 * Generate structured content (JSON) with automatic retry repair
 */
async function generateStructuredContent({ prompt, systemInstruction, retryCount = 1 }) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('GEMINI_API_KEY is not configured on the server. Please configure it in .env');
  }

  let lastError = null;
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: config.geminiModel,
        contents: attempt === 0 ? prompt : `${prompt}\n\nIMPORTANT: Your previous attempt did not produce valid JSON. Please return STRICT valid JSON only. Do not include markdown codeblocks or commentary.`,
        config: {
          systemInstruction: systemInstruction || 'You are an educational study material generator. You MUST respond ONLY with valid JSON.',
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });

      const parsed = extractAndParseJson(response.text);
      return parsed;
    } catch (err) {
      lastError = err;
      console.warn(`[Cognify] Structured JSON generation attempt ${attempt + 1} failed:`, err.message);
      if (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('Quota exceeded'))) {
        break; // do not retry if quota is exhausted
      }
    }
  }

  if (lastError?.message && (lastError.message.includes('429') || lastError.message.includes('RESOURCE_EXHAUSTED') || lastError.message.includes('Quota exceeded'))) {
    const rateErr = new Error('Gemini API rate limit reached. Please wait a moment and try again.');
    rateErr.status = 429;
    rateErr.code = 'RATE_LIMITED';
    throw rateErr;
  }

  throw new Error(`Failed to generate valid structured study material: ${lastError?.message}`);
}

module.exports = {
  getAiClient,
  generateGroundedAnswer,
  generateStructuredContent,
  SYSTEM_GROUNDING_INSTRUCTION,
};
