import React, { useState } from 'react';
import { X, Sparkles, BookOpen } from 'lucide-react';

export default function WorkspaceModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for your notebook or workspace.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onCreate({
        name: name.trim(),
        education_type: category,
        course_or_class: description.trim() || null,
        institution_or_exam: null,
        academic_term: null,
      });
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create workspace.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <BookOpen size={17} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>New Study Notebook</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
          Create a personal AI workspace to drop in your documents, slides, images, and links. Ask questions and generate grounded active recall study sets instantly.
        </p>

        {error && (
          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-danger-bg)', color: '#f87171', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Notebook / Workspace Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Distributed Systems & Consensus, Molecular Biology"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Study Focus or Description (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Preparing for midterm exam, reading research papers"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Domain or Category</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="general">General Studies / Research</option>
              <option value="stem">STEM & Computer Science</option>
              <option value="biology_medicine">Biology & Medicine</option>
              <option value="humanities">Humanities & Social Sciences</option>
              <option value="business_law">Business, Economics & Law</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Sparkles size={16} />
              <span>{loading ? 'Creating...' : 'Create Notebook'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
