const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const officeParser = require('officeparser');
const { GoogleGenAI } = require('@google/genai');
const config = require('../config/env');

/**
 * Robust document text extraction supporting:
 * - PDF
 * - DOCX / DOC
 * - PPTX / PPT
 * - TXT & Markdown
 * - Images (JPG, JPEG, PNG, WebP) with Gemini Vision transcription
 */
async function parseDocument(filePath, mimeType, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();

  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist at path: ${filePath}`);
  }

  const fileStats = fs.statSync(filePath);
  if (fileStats.size === 0) {
    throw new Error('The uploaded document is completely empty (0 bytes).');
  }

  // 25 MB limit check
  const maxBytes = 25 * 1024 * 1024;
  if (fileStats.size > maxBytes) {
    throw new Error('This file exceeds the 25 MB limit. Please upload a smaller file.');
  }

  // 1. Plain Text and Markdown
  if (ext === '.txt' || ext === '.md' || mimeType === 'text/plain' || mimeType === 'text/markdown') {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const cleaned = cleanText(rawContent);
    if (!cleaned) {
      throw new Error('The uploaded text file does not contain any readable text.');
    }
    return {
      text: cleaned,
      pages: [{ pageNumber: 1, text: cleaned }],
      pageCount: 1,
    };
  }

  // 2. Images (JPG, JPEG, PNG, WebP) via Gemini Vision
  if (
    ext === '.png' ||
    ext === '.jpg' ||
    ext === '.jpeg' ||
    ext === '.webp' ||
    (mimeType && mimeType.startsWith('image/'))
  ) {
    if (!config.geminiApiKey) {
      throw new Error('Gemini API key is required to analyze image study materials.');
    }

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');
      const detectedMime = mimeType || (ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg');

      const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      const prompt = `You are Cognify's academic document and vision analyzer.
Inspect this educational image, diagram, textbook page, whiteboard photo, or slide.
1. Transcribe all text, formulas, symbols, headings, and labels accurately.
2. If there are flowcharts, diagrams, anatomy, or charts, describe the visual relationships and core concepts in depth.
3. Provide a thorough, well-structured explanation so this can be used as a primary study source.`;

      const response = await ai.models.generateContent({
        model: config.geminiModel || 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: detectedMime,
                  data: base64Data,
                },
              },
            ],
          },
        ],
      });

      const extractedText = cleanText(response.text);
      if (!extractedText || extractedText.length < 15) {
        throw new Error('Unable to extract meaningful text or visual concepts from this image.');
      }

      return {
        text: `[Image Source: ${originalName}]\n\n${extractedText}`,
        pages: [{ pageNumber: 1, text: extractedText }],
        pageCount: 1,
        isImage: true,
      };
    } catch (err) {
      throw new Error(`Failed to process image: ${err.message}`);
    }
  }

  // 3. PDF Documents
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    let pdfParse;
    try {
      pdfParse = require('pdf-parse');
    } catch (e) {
      throw new Error('PDF parsing engine failed to initialize.');
    }

    try {
      const pdfData = await pdfParse(dataBuffer);
      const cleaned = cleanText(pdfData.text);

      if (!cleaned || cleaned.length < 20) {
        throw new Error(
          'This PDF appears to be a scanned image or contains no selectable text. Please upload a searchable PDF or convert it to text first.'
        );
      }

      const pageCount = pdfData.numpages || 1;
      const pages = [];
      const approxPageLength = Math.ceil(cleaned.length / pageCount);

      for (let i = 0; i < pageCount; i++) {
        const start = i * approxPageLength;
        const pageText = cleaned.substring(start, start + approxPageLength);
        pages.push({
          pageNumber: i + 1,
          text: pageText,
        });
      }

      return {
        text: cleaned,
        pages,
        pageCount,
      };
    } catch (err) {
      if (err.message && err.message.includes('scanned image')) throw err;
      throw new Error(`Failed to extract text from PDF document: ${err.message}`);
    }
  }

  // 4. DOCX Word Documents
  if (
    ext === '.docx' ||
    ext === '.doc' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const cleaned = cleanText(result.value);

      if (!cleaned || cleaned.length < 10) {
        throw new Error('The Word document did not yield any readable text.');
      }

      return {
        text: cleaned,
        pages: [{ pageNumber: 1, text: cleaned }],
        pageCount: 1,
      };
    } catch (err) {
      throw new Error(`Failed to extract text from Word file: ${err.message}`);
    }
  }

  // 5. PPTX / PPT Presentations
  if (
    ext === '.pptx' ||
    ext === '.ppt' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.ms-powerpoint'
  ) {
    try {
      const extractedText = await new Promise((resolve, reject) => {
        officeParser.parseOffice(filePath, (data, err) => {
          if (err) return reject(err);
          resolve(data);
        });
      });

      const cleaned = cleanText(extractedText);
      if (!cleaned || cleaned.length < 10) {
        throw new Error('The presentation did not yield any readable text.');
      }

      return {
        text: cleaned,
        pages: [{ pageNumber: 1, text: cleaned }],
        pageCount: 1,
      };
    } catch (err) {
      throw new Error(`Failed to extract text from presentation file: ${err.message}`);
    }
  }

  throw new Error(`Unsupported document format: ${ext}. Supported formats are PDF, PPT/PPTX, DOC/DOCX, TXT, MD, and Images.`);
}

/**
 * Clean unusable characters while preserving structure
 */
function cleanText(raw) {
  if (!raw) return '';
  return raw
    .replace(/\0/g, '') // remove null bytes
    .replace(/\r\n/g, '\n') // normalize newlines
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ') // collapse multi-spaces
    .replace(/\n{3,}/g, '\n\n') // collapse multiple blank lines
    .trim();
}

module.exports = {
  parseDocument,
  cleanText,
};
