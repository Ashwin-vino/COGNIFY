import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { api } from '../services/api';

export default function ProgressPage({ currentWorkspace, setCurrentPage }) {
  const [progress, setProgress] = useState(null);
  const [weakTopics, setWeakTopics] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadData();
    }
  }, [currentWorkspace?.id]);

  async function loadData() {
    try {
      setLoading(true);
      const [progData, weakData, attData] = await Promise.all([
        api.getProgress(currentWorkspace.id),
        api.getWeakTopics(currentWorkspace.id),
        api.getQuizAttempts(currentWorkspace.id),
      ]);
      setProgress(progData);
      setWeakTopics(weakData || []);
      setAttempts(attData || []);
    } catch (err) {
      console.error('Failed to load progress data:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Learning Progress & Diagnostics</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Diagnostic analytics computed from actual quiz attempts and self-assessments. Identifies concepts needing revision.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="card" style={{ padding: '20px 24px' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Total Tests Taken</span>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{attempts.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4 }}>
            Graded assessments
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Overall Accuracy</span>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
            {progress?.avgPercentage || 0}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4 }}>
            Average across attempts
          </div>
        </div>

        <div className="card" style={{ padding: '20px 24px' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>Topics Needing Review</span>
          <div style={{ fontSize: 28, fontWeight: 800, color: weakTopics.length > 0 ? '#fbbf24' : '#10b981', marginTop: 8 }}>
            {weakTopics.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4 }}>
            Based on recorded mistakes
          </div>
        </div>
      </div>

      {/* Weak Topics Analysis */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <AlertTriangle size={20} color="#f59e0b" />
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Identified Weak Topics & Revision Priorities</h3>
        </div>

        {weakTopics.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>
            No weak topics recorded yet! Take practice quizzes on the <strong>Quiz Me</strong> page to test your knowledge and diagnose weak areas.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {weakTopics.map(topic => {
              const errorRate = Math.round((topic.incorrect_count / (topic.total_attempts || 1)) * 100);
              return (
                <div
                  key={topic.id}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                    borderLeft: '4px solid var(--color-warning)',
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                      {topic.topic_name}
                    </h4>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {topic.incorrect_count} missed answers out of {topic.total_attempts} tested ({errorRate}% error rate)
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary"
                    onClick={() => setCurrentPage('flashcards')}
                    style={{ fontSize: 12, padding: '6px 12px' }}
                  >
                    <span>Practice Flashcards</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quiz Attempt History */}
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Recent Quiz Attempts</h3>
      {attempts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
          No quiz attempts recorded yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {attempts.map(att => (
            <div
              key={att.id}
              className="card"
              style={{
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: att.percentage >= 70 ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                  color: att.percentage >= 70 ? '#34d399' : '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                }}>
                  {Math.round(att.percentage)}%
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                    Score: {att.score} / {att.total_questions} Correct
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>
                    {new Date(att.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <span className={`badge ${att.percentage >= 70 ? 'badge-grounded' : 'badge-partially_grounded'}`}>
                {att.percentage >= 70 ? 'Passed' : 'Needs Practice'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
