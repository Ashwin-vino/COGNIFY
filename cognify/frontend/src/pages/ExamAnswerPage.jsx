import React, { useState } from 'react';
import { FileText, Copy, Check, Bookmark, RefreshCw, Sparkles, Key } from 'lucide-react';
import { api } from '../services/api';

export default function ExamAnswerPage({ currentWorkspace, currentSubjectId }) {
  const [question, setQuestion] = useState('');
  const [marks, setMarks] = useState(5);
  const [answerStyle, setAnswerStyle] = useState('standard');
  const [answerData, setAnswerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleGenerate(e) {
    e?.preventDefault();
    if (!question.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);
      setCopied(false);
      setSaved(false);

      const res = await api.generateExamAnswer({
        workspaceId: currentWorkspace.id,
        question: question.trim(),
        marks: parseInt(marks, 10) || 5,
        answerStyle,
        subjectId: currentSubjectId || null,
      });

      setAnswerData(res);
    } catch (err) {
      setError(err.message || 'Failed to generate exam answer.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!answerData) return;
    const textToCopy = answerData.fullFormattedAnswer || JSON.stringify(answerData, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    if (!answerData || saving || saved) return;
    try {
      setSaving(true);
      await api.saveStudySet(currentWorkspace.id, {
        subject_id: currentSubjectId || null,
        type: 'exam_answer',
        title: `${marks}-Mark Answer: ${question.substring(0, 40)}...`,
        content_json: answerData,
      });
      setSaved(true);
    } catch (err) {
      alert(err.message || 'Failed to save exam answer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Exam Answer Generator</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Format high-scoring model answers for 2-, 5-, 10-, and 13-mark questions strictly aligned with your course syllabus.
          </p>
        </div>

        {answerData && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={handleCopy}>
              {copied ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
              <span>{copied ? 'Copied' : 'Copy Answer'}</span>
            </button>
            <button className="btn btn-secondary" onClick={handleSave} disabled={saving || saved}>
              {saved ? <Check size={16} color="#10b981" /> : <Bookmark size={16} />}
              <span>{saved ? 'Saved' : saving ? 'Saving...' : 'Save Answer'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Generator Control Form */}
      <div className="card" style={{ marginBottom: 28 }}>
        <form onSubmit={handleGenerate}>
          <div className="form-group">
            <label className="form-label">Exam Question or Topic *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Explain the Banker's algorithm and write its safety algorithm steps"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Mark Allocation</label>
              <select className="form-select" value={marks} onChange={(e) => setMarks(parseInt(e.target.value, 10))}>
                <option value={2}>2 Marks (Concise definition & key bullets)</option>
                <option value={5}>5 Marks (Intro, 4-5 points, diagram/example note)</option>
                <option value={10}>10 Marks (Comprehensive university essay format)</option>
                <option value={13}>13 Marks (Detailed competitive/UPSC answer format)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Answer Style</label>
              <select className="form-select" value={answerStyle} onChange={(e) => setAnswerStyle(e.target.value)}>
                <option value="standard">Standard University Format</option>
                <option value="bulleted">Point-by-point Bulleted</option>
                <option value="competitive">Competitive Exam (Headings + Diagrams)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={!question.trim() || loading} style={{ height: 42 }}>
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin-animation" />
                  <span>Drafting Structured Answer...</span>
                </>
              ) : (
                <>
                  <FileText size={16} />
                  <span>Generate Model Answer</span>
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

      {/* Structured Answer Output */}
      {answerData && (
        <div className="card" style={{ padding: '32px 36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span className="badge badge-grounded">{answerData.marks} Marks Target</span>
            <span style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Structured Academic Marking Standard</span>
          </div>

          <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginBottom: 20, lineHeight: 1.4 }}>
            {answerData.question}
          </h3>

          {/* Definition / Introduction */}
          {answerData.definitionOrIntro && (
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              borderLeft: '4px solid var(--accent-primary)',
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--accent-secondary)', fontWeight: 700, marginBottom: 4 }}>
                Definition / Introduction
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 1.6 }}>
                {answerData.definitionOrIntro}
              </p>
            </div>
          )}

          {/* Sections */}
          {answerData.sections?.map((sec, idx) => (
            <div key={idx} style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8 }}>
                {idx + 1}. {sec.heading}
              </h4>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {sec.content}
              </p>
            </div>
          ))}

          {/* Diagram or Example */}
          {answerData.diagramOrExample && (
            <div style={{
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              border: '1px dashed rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#818cf8', fontWeight: 700, marginBottom: 4 }}>
                Diagrammatic Representation & Example
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: 1.6 }}>
                {answerData.diagramOrExample}
              </p>
            </div>
          )}

          {/* Conclusion */}
          {answerData.conclusion && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                Conclusion
              </h4>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {answerData.conclusion}
              </p>
            </div>
          )}

          {/* High-Score Keywords */}
          {answerData.keywords && answerData.keywords.length > 0 && (
            <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-subtle)' }}>
                <Key size={14} />
                <span>Essential Keywords:</span>
              </div>
              {answerData.keywords.map((kw, kIdx) => (
                <span key={kIdx} className="badge badge-category" style={{ fontSize: 12 }}>
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
