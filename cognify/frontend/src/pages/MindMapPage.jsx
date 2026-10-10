import React, { useState } from 'react';
import { Network, Sparkles, Bookmark, Check, RefreshCw, ChevronRight } from 'lucide-react';
import { api } from '../services/api';

const BRANCH_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#0ea5e9', // Sky
  '#f59e0b', // Amber
];

export default function MindMapPage({ currentWorkspace, currentSubjectId }) {
  const [topic, setTopic] = useState('');
  const [mindMapData, setMindMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleGenerate(e) {
    e?.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      setSaved(false);

      const res = await api.generateMindMap({
        workspaceId: currentWorkspace.id,
        topic: topic.trim() || currentWorkspace.name,
        subjectId: currentSubjectId || null,
      });

      setMindMapData(res.mindMap);
    } catch (err) {
      setError(err.message || 'Failed to generate mind map. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!mindMapData || saving || saved) return;
    try {
      setSaving(true);
      await api.saveStudySet(currentWorkspace.id, {
        subject_id: currentSubjectId || null,
        type: 'mindmap',
        title: `Mind Map: ${mindMapData.centralTopic || topic || 'Syllabus'}`,
        content_json: mindMapData,
      });
      setSaved(true);
    } catch (err) {
      alert(err.message || 'Failed to save mind map');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Hierarchical Mind Map</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Generate structured visual hierarchies from your study materials to visualize topics, branches, and connections.
          </p>
        </div>

        {mindMapData && (
          <button className="btn btn-secondary" onClick={handleSave} disabled={saving || saved}>
            {saved ? <Check size={16} color="#10b981" /> : <Bookmark size={16} />}
            <span>{saved ? 'Saved to Study Sets' : saving ? 'Saving...' : 'Save Mind Map'}</span>
          </button>
        )}
      </div>

      {/* Generator Control Card */}
      <div className="card" style={{ marginBottom: 28 }}>
        <form onSubmit={handleGenerate}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 260, marginBottom: 0 }}>
              <label className="form-label">Subject Topic or Concept to Map</label>
              <input
                type="text"
                className="form-input"
                placeholder={`e.g. ${currentWorkspace.name} or Unit 1 Topics`}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 42 }}>
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin-animation" />
                  <span>Synthesizing Hierarchy...</span>
                </>
              ) : (
                <>
                  <Network size={16} />
                  <span>Generate Mind Map</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--color-danger-bg)', color: '#f87171', borderRadius: 10, fontSize: 13, marginBottom: 24 }}>
          {error}
        </div>
      )}

      {/* Render Mind Map */}
      {mindMapData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Central Root Node */}
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px 32px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-glow)',
            maxWidth: 600,
            margin: '0 auto',
            width: '100%',
          }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 6 }}>
              {mindMapData.centralTopic}
            </h3>
            {mindMapData.description && (
              <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13 }}>
                {mindMapData.description}
              </p>
            )}
          </div>

          {/* Branches Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {mindMapData.branches?.map((branch, idx) => {
              const color = BRANCH_COLORS[idx % BRANCH_COLORS.length];
              return (
                <div
                  key={branch.id || idx}
                  className="card"
                  style={{
                    borderTop: `4px solid ${color}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: color,
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                      }}>
                        {idx + 1}
                      </span>
                      <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
                        {branch.title}
                      </h4>
                    </div>

                    {branch.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                        {branch.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {branch.subtopics?.map((sub, sIdx) => (
                        <div
                          key={sub.id || sIdx}
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            padding: '10px 14px',
                            borderLeft: `2px solid ${color}`,
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 2 }}>
                            {sub.title}
                          </div>
                          {sub.details && (
                            <div style={{ fontSize: 12, color: 'var(--text-subtle)', lineHeight: 1.4 }}>
                              {sub.details}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
