const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/env');
const db = require('../services/db');
const { parseDocument } = require('../services/documentParser');
const { createDocumentChunks } = require('../services/chunker');
const { fetchAndParseUrl } = require('../services/urlParser');
const { requireAuth } = require('../middleware/auth');
const { getSupabaseAdmin, isConfigured } = require('../services/supabase');

// Ensure local upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

// Allowed file extensions: PDF, PPT/PPTX, DOC/DOCX, TXT, MD, Images
const allowedExtensions = new Set([
  '.pdf',
  '.docx',
  '.doc',
  '.pptx',
  '.ppt',
  '.txt',
  '.md',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}. Supported formats: PDF, PPT/PPTX, DOC/DOCX, TXT, MD, Images (JPG, PNG, WebP)`));
  }
};

// 25 MB limit
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB limit
  },
  fileFilter,
});

function handleUploadMiddleware(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'This file exceeds the 25 MB limit. Please upload a smaller file.',
          },
        });
      }
      return res.status(400).json({
        success: false,
        error: { code: 'UPLOAD_ERROR', message: err.message },
      });
    }
    next();
  });
}

router.use(requireAuth);

// POST /api/workspaces/:id/documents (Upload and process file)
router.post('/workspaces/:id/documents', handleUploadMiddleware, async (req, res, next) => {
  let tempFilePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file uploaded.' },
      });
    }

    tempFilePath = req.file.path;
    const workspaceId = req.params.id;
    const { category = 'other', subject_id = null } = req.body;

    // Verify workspace ownership
    const workspace = await db.getWorkspaceById(req.user.id, workspaceId, req.token);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Target workspace not found.' },
      });
    }

    // Determine category based on extension if not provided
    const ext = path.extname(req.file.originalname).toLowerCase();
    let detectedCategory = category || 'other';
    if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      detectedCategory = 'image';
    }

    // Create document record in "processing" status
    const docRecord = await db.createDocument(
      req.user.id,
      workspaceId,
      {
        subject_id: subject_id || null,
        original_name: req.file.originalname,
        stored_name: req.file.filename,
        category: detectedCategory,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        status: 'processing',
      },
      req.token
    );

    // If Supabase Storage is configured, asynchronously upload to bucket
    let storagePath = null;
    if (isConfigured()) {
      try {
        const admin = getSupabaseAdmin();
        const fileBuffer = fs.readFileSync(tempFilePath);
        const remotePath = `${req.user.id}/${docRecord.id}/${req.file.filename}`;
        const { data: uploadRes, error: uploadErr } = await admin.storage
          .from('study-documents')
          .upload(remotePath, fileBuffer, {
            contentType: req.file.mimetype,
            upsert: true,
          });
        if (!uploadErr && uploadRes) {
          storagePath = remotePath;
        }
      } catch (storageErr) {
        console.warn('[Cognify] Supabase Storage upload skipped/failed:', storageErr.message);
      }
    }

    // Parse and extract document text
    let parsedDoc;
    try {
      parsedDoc = await parseDocument(tempFilePath, req.file.mimetype, req.file.originalname);
    } catch (parseErr) {
      await db.updateDocument(
        req.user.id,
        docRecord.id,
        {
          status: 'failed',
          extraction_error: parseErr.message,
        },
        req.token
      );

      return res.status(422).json({
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: parseErr.message,
        },
      });
    }

    // Chunk extracted text
    const chunks = createDocumentChunks(parsedDoc, docRecord.id, workspaceId, subject_id);

    // Save chunks to database
    await db.createChunks(req.user.id, chunks, req.token);

    // Update document record to "ready"
    const updatedDoc = await db.updateDocument(
      req.user.id,
      docRecord.id,
      {
        status: 'ready',
        page_count: parsedDoc.pageCount || 1,
        storage_path: storagePath,
      },
      req.token
    );

    res.status(201).json({
      success: true,
      data: {
        document: updatedDoc,
        chunkCount: chunks.length,
        pageCount: parsedDoc.pageCount || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/workspaces/:id/sources/url (Fetch & Ingest Web URL)
router.post('/workspaces/:id/sources/url', async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const { url } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid web URL.' },
      });
    }

    // Verify workspace
    const workspace = await db.getWorkspaceById(req.user.id, workspaceId, req.token);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Target workspace not found.' },
      });
    }

    // Fetch and extract webpage text with SSRF protection
    const parsedWeb = await fetchAndParseUrl(url.trim());

    // Create document record
    const docRecord = await db.createDocument(
      req.user.id,
      workspaceId,
      {
        original_name: parsedWeb.title || url,
        stored_name: url.trim(),
        category: 'url',
        mime_type: 'text/html',
        size_bytes: Buffer.byteLength(parsedWeb.text, 'utf8'),
        status: 'ready',
        page_count: 1,
      },
      req.token
    );

    // Chunk extracted text
    const chunks = createDocumentChunks(
      {
        text: `[Source URL: ${url}]\n${parsedWeb.title ? `Title: ${parsedWeb.title}\n` : ''}${parsedWeb.text}`,
        pages: [{ pageNumber: 1, text: parsedWeb.text }],
        pageCount: 1,
      },
      docRecord.id,
      workspaceId,
      null
    );

    // Save chunks to database
    await db.createChunks(req.user.id, chunks, req.token);

    res.status(201).json({
      success: true,
      data: {
        document: docRecord,
        chunkCount: chunks.length,
        title: parsedWeb.title,
        domain: parsedWeb.domain,
      },
    });
  } catch (err) {
    const isSecurityOrValidation = err.message.includes('blocked') || err.message.includes('forbidden') || err.message.includes('Invalid URL');
    res.status(isSecurityOrValidation ? 400 : 422).json({
      success: false,
      error: { code: isSecurityOrValidation ? 'SSRF_BLOCKED' : 'URL_EXTRACTION_FAILED', message: err.message },
    });
  }
});

// GET /api/workspaces/:id/documents
router.get('/workspaces/:id/documents', async (req, res, next) => {
  try {
    const docs = await db.getDocuments(req.user.id, req.params.id, req.token);
    res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id
router.get('/documents/:id', async (req, res, next) => {
  try {
    const doc = await db.getDocumentById(req.user.id, req.params.id, req.token);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found.' },
      });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/status
router.get('/documents/:id/status', async (req, res, next) => {
  try {
    const doc = await db.getDocumentById(req.user.id, req.params.id, req.token);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found.' },
      });
    }
    res.json({
      success: true,
      data: {
        status: doc.status,
        extractionError: doc.extraction_error,
        pageCount: doc.page_count,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/text (Preview text)
router.get('/documents/:id/text', async (req, res, next) => {
  try {
    const doc = await db.getDocumentById(req.user.id, req.params.id, req.token);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found.' },
      });
    }

    // Retrieve chunks to reconstruct preview
    const chunks = await db.getChunksForWorkspace(req.user.id, doc.workspace_id, null, req.token);
    const docChunks = chunks
      .filter(c => c.document_id === doc.id)
      .sort((a, b) => a.chunk_index - b.chunk_index);

    const fullPreview = docChunks.map(c => c.text).join('\n\n');

    res.json({
      success: true,
      data: {
        documentId: doc.id,
        originalName: doc.original_name,
        category: doc.category,
        pageCount: doc.page_count,
        chunkCount: docChunks.length,
        previewText: fullPreview || 'No text extracted.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/signed-url (Secure time-limited access to private storage)
router.get('/documents/:id/signed-url', async (req, res, next) => {
  try {
    const doc = await db.getDocumentById(req.user.id, req.params.id, req.token);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found or access denied.' },
      });
    }

    if (doc.storage_path && isConfigured()) {
      try {
        const { createSignedUrl } = require('../services/supabase');
        const signedUrl = await createSignedUrl('study-documents', doc.storage_path, 3600);
        return res.json({
          success: true,
          data: {
            signedUrl,
            expiresInSeconds: 3600,
            storageType: 'supabase_storage',
          },
        });
      } catch (storageErr) {
        console.warn('[Cognify] Failed to generate signed URL:', storageErr.message);
      }
    }

    // Local file fallback for dev/test
    if (doc.stored_name && !doc.stored_name.startsWith('http')) {
      return res.json({
        success: true,
        data: {
          downloadUrl: `/api/documents/${doc.id}/download`,
          expiresInSeconds: 3600,
          storageType: 'local_disk',
        },
      });
    }

    res.json({
      success: true,
      data: {
        url: doc.stored_name,
        storageType: 'url',
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/download (Owner-verified document download)
router.get('/documents/:id/download', async (req, res, next) => {
  try {
    const doc = await db.getDocumentById(req.user.id, req.params.id, req.token);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found or access denied.' },
      });
    }

    if (doc.stored_name && !doc.stored_name.startsWith('http')) {
      const localPath = path.join(config.uploadDir, doc.stored_name);
      if (fs.existsSync(localPath)) {
        return res.download(localPath, doc.original_name);
      }
    }

    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Underlying file not found.' },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id
router.delete('/documents/:id', async (req, res, next) => {
  try {
    const doc = await db.getDocumentById(req.user.id, req.params.id, req.token);
    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found.' },
      });
    }

    // Delete local file if exists
    if (doc.stored_name && !doc.stored_name.startsWith('http')) {
      const localPath = path.join(config.uploadDir, doc.stored_name);
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
        } catch (e) {}
      }
    }

    // Delete from Supabase Storage if remote
    if (doc.storage_path && isConfigured()) {
      try {
        const admin = getSupabaseAdmin();
        await admin.storage.from('study-documents').remove([doc.storage_path]);
      } catch (e) {}
    }

    await db.deleteDocument(req.user.id, req.params.id, req.token);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
