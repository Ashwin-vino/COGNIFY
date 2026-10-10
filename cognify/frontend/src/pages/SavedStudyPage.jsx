import React, { useState, useEffect } from 'react';
import { Bookmark, Trash2, Eye, Network, Layers, FileText, X } from 'lucide-react';
import { api } from '../services/api';

export default function SavedStudyPage({ currentWorkspace }) {
  const [studySets, setStudySets] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [activeSet, setActiveSet] = useState(null);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadStudySets();
    }
  }, [currentWorkspace?.id, filterType]);

  async function loadStudySets() {
    try {
      setLoading(true);
      const data = await api.getStudySets(
        currentWorkspace.id,
        filterType === 'all' ? null : filterType
      );
      setStudySets(data || []);
    } catch (err) {
      console.error('Failed to load study sets:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(setId) {
    if (!window.confirm('Delete this saved study set?')) return;
    try {
      await api.deleteStudySet(setId);
      setStudySets(prev => prev.filter(s => s.id !== setId));
      if (activeSet?.id === setId) setActiveSet(null);
    } catch (err) {
      alert(err.message || 'Failed to delete study set');
    }
  }

  function getIcon(type) {
    switch (type) {
      case 'mindmap':
        return <Network size={18} color="#6366f1" />;
      case 'flashcards':
        return <Layers size={18} color="#8b5cf6" />;
      default:
        return <FileText size={18} color="#10b981" />;
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Saved Study Materials</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Review your saved mind maps, active recall flashcards, and model exam answers.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'mindmap', 'flashcards', 'exam_answer'].map(type => (
            <button
              key={type}
              className={`btn ${filterType === type ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: 12, textTransform: 'capitalize' }}
              onClick={() => setFilterType(type)}
            >
              {type === 'all' ? 'All Sets' : type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading saved study sets...
        </div>
      ) : studySets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
          No study sets saved yet. Generate flashcards, mind maps, or exam answers and click "Save" to keep them here.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {studySets.map(set => (
            <div key={set.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {getIcon(set.type)}
                    <span className="badge badge-category" style={{ fontSize: 10 }}>{set.type}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                    {new Date(set.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8, lineHeight: 1.4 }}>
                  {set.title}
                </h4>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <button className="btn btn-secondary" onClick={() => setActiveSet(set)} style={{ padding: '6px 12px', fontSize: 12 }}>
                  <Eye size={14} />
                  <span>Open Set</span>
                </button>
                <button className="btn-icon" onClick={() => handleDelete(set.id)} title="Delete">
                  <Trash2 size={16} color="#ef4444" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Viewer Modal */}
      {activeSet && (
        <div className="modal-overlay" onClick={() => setActiveSet(null)}>
          <div className="modal-content" style={{ maxWidth: 720, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{activeSet.title}</h3>
                <span className="badge badge-category">{activeSet.type}</span>
              </div>
              <button className="btn-icon" onClick={() => setActiveSet(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              fontSize: 13,
              lineHeight: 1.6,
            }}>
              {/* If flashcards */}
              {activeSet.type === 'flashcards' && activeSet.content_json?.flashcards && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {activeSet.content_json.flashcards.map((c, i) => (
                    <div key={i} style={{ backgroundColor: 'var(--bg-secondary)', padding: 14, borderRadius: 8 }}>
                      <div style={{ fontWeight: 700, color: '#818cf8', marginBottom: 4 }}>Q: {c.front}</div>
                      <div style={{ color: 'var(--text-main)', whiteSpace: 'pre-line' }}>A: {c.back}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* If mindmap */}
              {activeSet.type === 'mindmap' && activeSet.content_json?.branches && (
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 12 }}>
                    {activeSet.content_json.centralTopic}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {activeSet.content_json.branches.map((b, bi) => (
                      <div key={bi} style={{ backgroundColor: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                        <div style={{ fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>{b.title}</div>
                        <ul style={{ paddingLeft: 18, color: 'var(--text-muted)' }}>
                          {b.subtopics?.map((s, si) => (
                            <li key={si} style={{ marginBottom: 4 }}>
                              <strong style={{ color: 'var(--text-main)' }}>{s.title}: </strong>
                              {s.details}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* If exam answer */}
              {activeSet.type === 'exam_answer' && (
                <div>
                  {activeSet.content_json?.definitionOrIntro && (
                    <div style={{ marginBottom: 14, padding: 12, backgroundColor: 'var(--bg-secondary)', borderRadius: 8 }}>
                      <strong style={{ color: '#818cf8' }}>Introduction: </strong>
                      {activeSet.content_json.definitionOrIntro}
                    </div>
                  )}
                  {activeSet.content_json?.sections?.map((sec, si) => (
                    <div key={si} style={{ marginBottom: 12 }}>
                      <h5 style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>{sec.heading}</h5>
                      <p style={{ color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>{sec.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setActiveSet(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
