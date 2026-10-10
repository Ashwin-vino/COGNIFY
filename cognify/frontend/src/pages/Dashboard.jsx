import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  MessageSquare,
  Network,
  Layers,
  CheckCircle,
  FileText,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileCheck,
} from 'lucide-react';
import { api } from '../services/api';

export default function Dashboard({ currentWorkspace, setCurrentPage, onOpenNewWorkspaceModal }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadProgress();
    }
  }, [currentWorkspace?.id]);

  async function loadProgress() {
    try {
      setLoading(true);
      const data = await api.getProgress(currentWorkspace.id);
      setProgress(data);
    } catch (err) {
      console.error('Failed to load dashboard progress:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!currentWorkspace) {
    return (
      <div className="card" style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center', padding: 40 }}>
        <div style={{
          width: 56,
          height: 56,
          margin: '0 auto 16px auto',
          borderRadius: 16,
          background: 'rgba(99, 102, 241, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#818cf8',
        }}>
          <BookOpen size={28} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>No Active Learning Workspace</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          Create your first workspace for a college course, school subject, or competitive examination (like UPSC or GATE) to begin grounding AI answers in your syllabus.
        </p>
        <button className="btn btn-primary" onClick={onOpenNewWorkspaceModal}>
          Create Your First Workspace
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Workspace Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="badge badge-category">{currentWorkspace.education_type}</span>
            {currentWorkspace.academic_term && (
              <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>• {currentWorkspace.academic_term}</span>
            )}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
            {currentWorkspace.name}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {currentWorkspace.institution_or_exam ? `${currentWorkspace.institution_or_exam} • ` : ''}
            {currentWorkspace.course_or_class || 'Prescribed Course Material'}
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setCurrentPage('chat')}>
          <span>Open Study Chat</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Weak Topics Banner if applicable */}
      {progress?.weakTopicsCount > 0 && (
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={20} color="#f59e0b" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>
                Revision Alert: {progress.weakTopicsCount} Topic{progress.weakTopicsCount > 1 ? 's' : ''} Need Review
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Repeated mistakes detected in: {progress.weakTopicsList.map(t => t.topic_name).join(', ')}
              </div>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => setCurrentPage('progress')} style={{ fontSize: 13, padding: '6px 12px' }}>
            Review Weak Topics
          </button>
        </div>
      )}

      {/* Real Statistics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Study Documents</span>
            <FileCheck size={18} color="#6366f1" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{progress?.totalDocuments || 0}</div>
          <div style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 4 }}>
            {progress?.readyDocuments || 0} indexed & ready
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Saved Study Sets</span>
            <Layers size={18} color="#8b5cf6" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{progress?.totalStudySets || 0}</div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4 }}>
            Decks, maps & summaries
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Quizzes Completed</span>
            <CheckCircle size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{progress?.totalQuizzes || 0}</div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4 }}>
            Graded on server
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Average Quiz Score</span>
            <TrendingUp size={18} color="#ec4899" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{progress?.avgPercentage || 0}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4 }}>
            Across all attempts
          </div>
        </div>
      </div>

      {/* Quick Launch Study Tools */}
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Syllabus Study Tools</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setCurrentPage('chat')}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', marginBottom: 16 }}>
            <MessageSquare size={20} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Syllabus Study Chat</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Ask questions grounded strictly in your syllabus and uploaded documents with verifiable source citations.
          </p>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setCurrentPage('flashcards')}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', marginBottom: 16 }}>
            <Layers size={20} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Flashcard Generator</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Create 1 to 50 active recall flashcards from your notes. Practice with 3D flip cards and save study decks.
          </p>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setCurrentPage('mindmap')}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', marginBottom: 16 }}>
            <Network size={20} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Mind Map Visualizer</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Transform complex subjects into hierarchical branches and subtopics for rapid conceptual comprehension.
          </p>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setCurrentPage('quiz')}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', marginBottom: 16 }}>
            <CheckCircle size={20} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Interactive Quiz Me</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Test your knowledge with auto-graded multiple choice questions. Track mistakes and identify weak topics.
          </p>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setCurrentPage('exam')}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(236, 72, 153, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f472b6', marginBottom: 16 }}>
            <FileText size={20} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Exam Answer Generator</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Generate structured answers for 2-, 5-, 10-, and 13-mark exam questions formatted for maximum marks.
          </p>
        </div>

        <div className="card" style={{ cursor: 'pointer' }} onClick={() => setCurrentPage('syllabus')}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', marginBottom: 16 }}>
            <BookOpen size={20} />
          </div>
          <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Manage Materials & Syllabus</h4>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Upload PDFs, DOCX, and PPTX notes, organize syllabus units, and review extracted document chunks.
          </p>
        </div>
      </div>
    </div>
  );
}
