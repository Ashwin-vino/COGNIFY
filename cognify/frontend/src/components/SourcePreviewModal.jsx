import React, { useState, useEffect } from 'react';
import { X, FileText, Globe, Layers, Loader2, Copy, Check } from 'lucide-react';
import { api } from '../services/api';

export default function SourcePreviewModal({ source, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && source?.id) {
      loadText();
    } else {
      setData(null);
    }
  }, [isOpen, source?.id]);

  async function loadText() {
    try {
      setLoading(true);
      const textData = await api.getDocumentText(source.id);
      setData(textData);
    } catch (err) {
      console.error('Failed to load source text:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!data?.text) return;
    navigator.clipboard.writeText(data.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isOpen || !source) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {source.category === 'url' ? <Globe size={18} /> : <FileText size={18} />}
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 460 }}>
                {source.original_name}
              </h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {source.category?.toUpperCase()} • {data?.chunkCount || 0} chunks indexed
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-secondary" onClick={handleCopy} disabled={!data?.text} style={{ padding: '6px 12px', fontSize: 12 }}>
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
            <button className="btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-md)',
          padding: 18,
          border: '1px solid var(--border-subtle)',
          fontFamily: 'monospace',
          fontSize: 13,
          lineHeight: 1.6,
          color: 'var(--text-main)',
          whiteSpace: 'pre-wrap',
        }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, gap: 10, color: 'var(--text-muted)' }}>
              <Loader2 size={18} className="spin-animation" />
              <span>Loading extracted source text...</span>
            </div>
          ) : data?.text ? (
            data.text
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              No text extracted or content is empty.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
