import React, { useState } from 'react';
import {
  FileText,
  Globe,
  Image as ImageIcon,
  Plus,
  Trash2,
  Eye,
  CheckSquare,
  Square,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Sparkles,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import AddSourceModal from './AddSourceModal';
import SourcePreviewModal from './SourcePreviewModal';
import { api } from '../services/api';

export default function SourcesPanel({
  currentWorkspace,
  sources,
  selectedSourceIds,
  onToggleSource,
  onSelectAllSources,
  onDeselectAllSources,
  onRefreshSources,
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  async function handleDeleteSource(e, docId) {
    e.stopPropagation();
    if (!window.confirm('Remove this source from your notebook? All associated index chunks will be cleaned up.')) return;

    try {
      setDeletingId(docId);
      await api.deleteDocument(docId);
      onRefreshSources();
    } catch (err) {
      alert(err.message || 'Failed to remove source.');
    } finally {
      setDeletingId(null);
    }
  }

  function getFileIcon(source) {
    const cat = source.category || '';
    const name = (source.original_name || '').toLowerCase();
    if (cat === 'url' || source.mime_type === 'text/html') return <Globe size={16} color="#0ea5e9" />;
    if (cat === 'image' || ['.png', '.jpg', '.jpeg', '.webp'].some(ext => name.endsWith(ext))) return <ImageIcon size={16} color="#ec4899" />;
    return <FileText size={16} color="#6366f1" />;
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return 'Web page';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const allSelected = sources.length > 0 && selectedSourceIds.length === sources.length;

  return (
    <div className="sources-panel">
      {/* Sources Header */}
      <div className="sources-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-subtle)' }}>
              Sources
            </span>
            <span className="badge badge-category" style={{ fontSize: 11, padding: '2px 7px' }}>
              {selectedSourceIds.length} / {sources.length} active
            </span>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ padding: '6px 12px', fontSize: 12, gap: 6 }}
          >
            <Plus size={14} />
            <span>Add Sources</span>
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Only checked sources ground your answers, flashcards, and quizzes.
        </p>

        {sources.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
            <button
              onClick={allSelected ? onDeselectAllSources : onSelectAllSources}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-secondary)',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 0',
              }}
            >
              {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              <span>{allSelected ? 'Deselect all' : 'Select all sources'}</span>
            </button>

            <button
              onClick={onRefreshSources}
              className="btn-icon"
              title="Refresh source status"
              style={{ padding: 4 }}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Sources List Scroll Area */}
      <div className="sources-panel-body">
        {sources.length === 0 ? (
          <div className="sources-empty-state" onClick={() => setIsAddModalOpen(true)}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
              margin: '0 auto 12px auto'
            }}>
              <FolderOpen size={22} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
              Add your learning sources
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>
              Drop PDFs, slides (PPT/PPTX), documents, images, or web links (up to 25 MB).
            </p>
            <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>
              <Plus size={14} />
              <span>Add First Source</span>
            </button>
          </div>
        ) : (
          <div className="sources-list">
            {sources.map(src => {
              const isSelected = selectedSourceIds.includes(src.id);
              const isProcessing = src.status === 'processing';
              const isFailed = src.status === 'failed' || src.status === 'error';

              return (
                <div
                  key={src.id}
                  className={`source-card ${isSelected ? 'selected' : ''} ${isProcessing ? 'processing' : ''}`}
                  onClick={() => onToggleSource(src.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ paddingTop: 2 }} onClick={(e) => { e.stopPropagation(); onToggleSource(src.id); }}>
                      {isSelected ? (
                        <CheckSquare size={16} color="var(--accent-primary)" />
                      ) : (
                        <Square size={16} color="var(--text-subtle)" />
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <div className="source-icon-badge">
                        {getFileIcon(src)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="source-title" title={src.original_name}>
                          {src.original_name}
                        </div>
                        <div className="source-meta">
                          <span>{formatFileSize(src.size_bytes)}</span>
                          {src.page_count > 1 && <span>• {src.page_count} pages</span>}
                          {isProcessing && (
                            <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Loader2 size={11} className="spin-animation" />
                              Indexing...
                            </span>
                          )}
                          {isFailed && (
                            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertTriangle size={11} />
                              Failed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="source-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-icon"
                      title="Preview extracted content"
                      onClick={() => setPreviewSource(src)}
                      style={{ padding: 6 }}
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      className="btn-icon text-danger"
                      title="Remove source"
                      onClick={(e) => handleDeleteSource(e, src.id)}
                      disabled={deletingId === src.id}
                      style={{ padding: 6 }}
                    >
                      {deletingId === src.id ? <Loader2 size={14} className="spin-animation" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Source Modal */}
      <AddSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        workspaceId={currentWorkspace.id}
        onSourceAdded={onRefreshSources}
      />

      {/* Preview Modal */}
      <SourcePreviewModal
        source={previewSource}
        isOpen={!!previewSource}
        onClose={() => setPreviewSource(null)}
      />
    </div>
  );
}
