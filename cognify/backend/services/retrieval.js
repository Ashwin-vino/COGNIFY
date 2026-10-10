const db = require('./db');

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'what', 'which', 'who', 'how', 'why', 'when', 'where', 'can',
  'could', 'should', 'would', 'do', 'does', 'did', 'have', 'had', 'or', 'if',
  'explain', 'describe', 'discuss', 'tell', 'me', 'about', 'give', 'list',
]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Score a text chunk against question tokens using TF-IDF / term frequency with phrase bonus
 */
function scoreChunk(queryTokens, queryLower, chunkText) {
  const chunkLower = chunkText.toLowerCase();
  const chunkWords = chunkLower.split(/\s+/);
  const totalWords = chunkWords.length || 1;

  let matchScore = 0;
  let uniqueMatches = 0;

  for (const token of queryTokens) {
    let count = 0;
    let pos = chunkLower.indexOf(token);
    while (pos !== -1) {
      count++;
      pos = chunkLower.indexOf(token, pos + token.length);
    }

    if (count > 0) {
      uniqueMatches++;
      // Term frequency normalized with saturation
      const tf = Math.log(1 + count) / Math.log(1 + totalWords);
      matchScore += tf * 10;
    }
  }

  // Exact phrase match bonus
  if (queryLower.length > 8 && chunkLower.includes(queryLower)) {
    matchScore += 25;
  }

  // Fraction of query terms covered
  const coverage = queryTokens.length > 0 ? uniqueMatches / queryTokens.length : 0;
  const finalScore = matchScore * (1 + coverage * 2);

  return {
    score: parseFloat(finalScore.toFixed(2)),
    coverage,
    uniqueMatches,
  };
}

/**
 * Retrieves relevant chunks for a question within a workspace
 * Returns { chunks, sources, groundingStatus }
 */
async function retrieveContext(userId, workspaceId, query, options = {}, token = null) {
  const { subjectId = null, topK = 6, minScore = 0.5, selectedSourceIds = null } = options;

  if (!query || query.trim().length === 0) {
    return {
      chunks: [],
      sources: [],
      groundingStatus: 'insufficient_sources',
    };
  }

  // If user explicitly has an empty selection of sources
  if (Array.isArray(selectedSourceIds) && selectedSourceIds.length === 0) {
    return {
      chunks: [],
      sources: [],
      groundingStatus: 'no_sources_selected',
    };
  }

  // Fetch all chunks for this workspace and user (strictly isolated)
  let allChunks = await db.getChunksForWorkspace(userId, workspaceId, subjectId, token);

  // If specific sources are selected, strictly filter to those source IDs
  if (Array.isArray(selectedSourceIds) && selectedSourceIds.length > 0) {
    allChunks = allChunks.filter(c => selectedSourceIds.includes(c.document_id));
  }

  if (allChunks.length === 0) {
    return {
      chunks: [],
      sources: [],
      groundingStatus: 'insufficient_sources',
    };
  }

  const queryTokens = tokenize(query);
  const queryLower = query.toLowerCase().trim();

  // Score each chunk
  const scored = [];
  for (const chunk of allChunks) {
    const { score, coverage, uniqueMatches } = scoreChunk(queryTokens, queryLower, chunk.text);
    if (score >= minScore) {
      scored.push({
        ...chunk,
        score,
        coverage,
        uniqueMatches,
      });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Take top K distinct chunks
  const topChunks = scored.slice(0, topK);

  // Compute grounding status
  let groundingStatus = 'insufficient_sources';
  if (topChunks.length > 0) {
    const topScore = topChunks[0].score;
    const topCoverage = topChunks[0].coverage;

    if (topScore >= 8.0 || topCoverage >= 0.7) {
      groundingStatus = 'grounded';
    } else if (topScore >= 2.0 || topCoverage >= 0.3) {
      groundingStatus = 'partially_grounded';
    } else {
      groundingStatus = 'insufficient_sources';
    }
  }

  // Format distinct sources
  const sourceMap = new Map();
  for (const c of topChunks) {
    const key = `${c.document_name}-${c.page_number || c.section_label || 'all'}`;
    if (!sourceMap.has(key)) {
      sourceMap.set(key, {
        documentId: c.document_id,
        documentName: c.document_name,
        category: c.document_category,
        pageNumber: c.page_number,
        sectionLabel: c.section_label,
        snippet: c.text.substring(0, 180) + '...',
        score: c.score,
      });
    }
  }

  return {
    chunks: topChunks,
    sources: Array.from(sourceMap.values()),
    groundingStatus,
  };
}

module.exports = {
  tokenize,
  scoreChunk,
  retrieveContext,
};
