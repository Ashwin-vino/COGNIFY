import React, { useState } from 'react';
import {
  X,
  Upload,
  Globe,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../services/api';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_FILE_SIZE_ERROR = 'This file exceeds the 25 MB limit. Please upload a smaller file.';

export default function AddSourceModal({ isOpen, onClose, workspaceId, onSourceAdded }) {
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  function validateFile(file) {
    if (!file) return false;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(MAX_FILE_SIZE_ERROR);
      return false;
    }
    setError(null);
    return true;
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
    }
  }

  async function handleUploadFile(e) {
    e.preventDefault();
    if (!selectedFile) return;

    if (!validateFile(selectedFile)) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      await api.uploadDocument(workspaceId, formData);
      setSelectedFile(null);
      onSourceAdded?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  }

  async function handleAddUrl(e) {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setError('Please provide a valid website URL.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await api.addUrlSource(workspaceId, trimmed);
      setUrlInput('');
      onSourceAdded?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to fetch website contents.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={18} color="var(--accent-primary)" />
            <span>Add Study Sources</span>
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          gap: 6,
          backgroundColor: 'var(--bg-secondary)',
          padding: 4,
          borderRadius: 'var(--radius-md)',
          marginBottom: 20
        }}>
          <button
            type="button"
            className={`btn-tab ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => { setActiveTab('file'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'file' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'file' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <FileText size={16} />
            <span>Upload File (PDF, PPT, DOC, Image)</span>
          </button>

          <button
            type="button"
            className={`btn-tab ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => { setActiveTab('url'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: activeTab === 'url' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'url' ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <Globe size={16} />
            <span>Website Link / URL</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            backgroundColor: 'var(--color-danger-bg)',
            color: '#f87171',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            marginBottom: 16,
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        {/* File Upload Tab */}
        {activeTab === 'file' && (
          <form onSubmit={handleUploadFile}>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '36px 20px',
                textAlign: 'center',
                backgroundColor: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: 16,
              }}
              onClick={() => document.getElementById('file-upload-input')?.click()}
            >
              <input
                id="file-upload-input"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto',
              }}>
                <Upload size={22} />
              </div>

              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                {selectedFile ? selectedFile.name : 'Choose a file or drag & drop here'}
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {selectedFile
                  ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to ingest`
                  : 'PDF, PowerPoint, Word, Markdown, Text, or Images (Max 25 MB per file)'}
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--text-subtle)',
              marginBottom: 20
            }}>
              <span>Limit: 25 MB per file</span>
              <span>Gemini 3.8 Flash Vision for images</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={uploading}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="spin-animation" />
                    <span>Processing & Indexing...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Upload & Process Source</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* URL Ingestion Tab */}
        {activeTab === 'url' && (
          <form onSubmit={handleAddUrl}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
              Cognify extracts the clean article and study content from any public webpage with server-side protection.
            </p>

            <div className="form-group">
              <label className="form-label">Webpage URL</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://en.wikipedia.org/wiki/Operating_system"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={uploading}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!urlInput.trim() || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="spin-animation" />
                    <span>Fetching & Extracting...</span>
                  </>
                ) : (
                  <>
                    <Globe size={16} />
                    <span>Add Web Source</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
