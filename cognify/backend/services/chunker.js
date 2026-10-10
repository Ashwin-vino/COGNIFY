/**
 * Text chunking service for RAG
 * Chunks text into 800-1200 character segments with sentence-aware overlap
 */

function chunkText(text, options = {}) {
  const targetChunkSize = options.chunkSize || 1000;
  const overlapSize = options.overlap || 180;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split into paragraphs first to preserve semantic cohesion
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    // If adding this paragraph keeps chunk within acceptable size
    if (currentChunk.length + para.length <= targetChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + para.trim();
    } else {
      // If currentChunk is already substantial, save it
      if (currentChunk.length >= 600) {
        chunks.push({
          chunk_index: chunkIndex++,
          text: currentChunk.trim(),
        });
        // Retain trailing sentence/characters for overlap
        const overlapText = getOverlapText(currentChunk, overlapSize);
        currentChunk = overlapText ? overlapText + '\n\n' + para.trim() : para.trim();
      } else {
        // Current paragraph itself might be very long; split by sentences
        const sentences = para.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [para];
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length <= targetChunkSize) {
            currentChunk += (currentChunk ? ' ' : '') + sentence.trim();
          } else {
            if (currentChunk.trim().length > 0) {
              chunks.push({
                chunk_index: chunkIndex++,
                text: currentChunk.trim(),
              });
              const overlapText = getOverlapText(currentChunk, overlapSize);
              currentChunk = overlapText ? overlapText + ' ' + sentence.trim() : sentence.trim();
            } else {
              // Edge case: single sentence longer than targetChunkSize
              chunks.push({
                chunk_index: chunkIndex++,
                text: sentence.trim(),
              });
              currentChunk = '';
            }
          }
        }
      }
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      chunk_index: chunkIndex++,
      text: currentChunk.trim(),
    });
  }

  return chunks;
}

function getOverlapText(text, overlapSize) {
  if (text.length <= overlapSize) return text;
  const slice = text.substring(text.length - overlapSize);
  // Find first space so we don't slice a word mid-way
  const firstSpace = slice.indexOf(' ');
  return firstSpace !== -1 ? slice.substring(firstSpace + 1).trim() : slice.trim();
}

/**
 * Creates chunk records for a parsed document
 */
function createDocumentChunks(parsedDoc, documentId, workspaceId, subjectId = null) {
  const allChunks = [];
  let globalChunkIndex = 0;

  if (parsedDoc.pages && parsedDoc.pages.length > 0) {
    for (const page of parsedDoc.pages) {
      const pageChunks = chunkText(page.text);
      for (const chunk of pageChunks) {
        allChunks.push({
          document_id: documentId,
          workspace_id: workspaceId,
          subject_id: subjectId,
          chunk_index: globalChunkIndex++,
          text: chunk.text,
          page_number: page.pageNumber || null,
          section_label: page.pageNumber ? `Page ${page.pageNumber}` : null,
        });
      }
    }
  } else {
    const rawChunks = chunkText(parsedDoc.text);
    for (const chunk of rawChunks) {
      allChunks.push({
        document_id: documentId,
        workspace_id: workspaceId,
        subject_id: subjectId,
        chunk_index: globalChunkIndex++,
        text: chunk.text,
        page_number: null,
        section_label: null,
      });
    }
  }

  return allChunks;
}

module.exports = {
  chunkText,
  createDocumentChunks,
};
