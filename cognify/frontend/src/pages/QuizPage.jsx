import React, { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Award,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export default function QuizPage({ currentWorkspace, currentSubjectId }) {
  const [topic, setTopic] = useState('');
  const [quantity, setQuantity] = useState(5);
  const [difficulty, setDifficulty] = useState('medium');
  const [quizData, setQuizData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [submissionResult, setSubmissionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerate(e) {
    e?.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      setSubmissionResult(null);
      setUserAnswers({});

      const count = Math.min(Math.max(parseInt(quantity, 10) || 5, 1), 50);

      const res = await api.generateQuiz({
        workspaceId: currentWorkspace.id,
        topic: topic.trim() || currentWorkspace.name,
        quantity: count,
        difficulty,
        subjectId: currentSubjectId || null,
      });

      setQuizData(res);
    } catch (err) {
      setError(err.message || 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectOption(questionId, optionIndex) {
    if (submissionResult) return; // Locked after submission
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  }

  async function handleSubmitQuiz() {
    if (!quizData?.questions || submitting) return;

    try {
      setSubmitting(true);
      setError(null);

      const result = await api.submitQuiz({
        workspaceId: currentWorkspace.id,
        subjectId: currentSubjectId || null,
        questions: quizData.questions,
        userAnswers,
      });

      setSubmissionResult(result);

      // Trigger celebration confetti if score >= 70%
      if (result.percentage >= 70) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to grade quiz.');
    } finally {
      setSubmitting(false);
    }
  }

  const answeredCount = Object.keys(userAnswers).length;
  const totalQuestions = quizData?.questions?.length || 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Syllabus Practice Quiz</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Generate self-assessment multiple-choice quizzes grounded in your course materials. Submitted answers are evaluated on the server to diagnose weak areas.
        </p>
      </div>

      {/* Generator Control Form */}
      <div className="card" style={{ marginBottom: 28 }}>
        <form onSubmit={handleGenerate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subject Topic / Exam Section</label>
              <input
                type="text"
                className="form-input"
                placeholder={`e.g. ${currentWorkspace.name} or Unit 1`}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Question Count (1 to 50)</label>
              <input
                type="number"
                min="1"
                max="50"
                className="form-input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Difficulty</label>
              <select className="form-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="easy">Easy (Fundamentals)</option>
                <option value="medium">Medium (Standard Exam Level)</option>
                <option value="hard">Hard (Advanced Problem Solving)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 42 }}>
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin-animation" />
                  <span>Synthesizing Quiz...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Generate Quiz</span>
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

      {/* Results Banner if graded */}
      {submissionResult && (
        <div style={{
          background: submissionResult.percentage >= 70
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)'
            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)',
          border: `1px solid ${submissionResult.percentage >= 70 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Award size={22} color={submissionResult.percentage >= 70 ? '#34d399' : '#fbbf24'} />
              <h3 style={{ fontSize: 20, fontWeight: 800 }}>
                Quiz Score: {submissionResult.score} / {submissionResult.totalQuestions} ({submissionResult.percentage}%)
              </h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {submissionResult.percentage >= 70
                ? 'Strong mastery of this topic! Review any explanations below to solidify details.'
                : 'Identified areas for revision. Review incorrect answers below to strengthen your fundamentals.'}
            </p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => {
              setSubmissionResult(null);
              setUserAnswers({});
            }}
          >
            <RotateCcw size={16} />
            <span>Retake Quiz</span>
          </button>
        </div>
      )}

      {/* Quiz Questions List */}
      {quizData?.questions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {quizData.questions.map((q, idx) => {
            const evaluated = submissionResult?.evaluatedAnswers?.find(
              a => a.questionId === (q.id !== undefined ? q.id : idx)
            );
            const userChoice = userAnswers[q.id !== undefined ? q.id : idx];

            return (
              <div
                key={q.id !== undefined ? q.id : idx}
                className="card"
                style={{
                  borderLeft: evaluated
                    ? evaluated.isCorrect
                      ? '4px solid var(--color-success)'
                      : '4px solid var(--color-danger)'
                    : '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-secondary)' }}>
                    Question {idx + 1} of {quizData.questions.length}
                  </span>
                  {q.topic && <span className="badge badge-category">{q.topic}</span>}
                </div>

                <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)', marginBottom: 16, lineHeight: 1.5 }}>
                  {q.question}
                </h4>

                {/* Options List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.options?.map((opt, optIdx) => {
                    const isSelected = userChoice === optIdx;
                    let optionClass = '';

                    if (submissionResult) {
                      if (optIdx === q.correctIndex) {
                        optionClass = 'correct';
                      } else if (isSelected && optIdx !== q.correctIndex) {
                        optionClass = 'wrong';
                      }
                    } else if (isSelected) {
                      optionClass = 'selected';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`quiz-option-card ${optionClass}`}
                        onClick={() => handleSelectOption(q.id !== undefined ? q.id : idx, optIdx)}
                      >
                        <span style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                          color: isSelected ? 'white' : 'var(--text-muted)',
                        }}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span style={{ fontSize: 14, color: 'var(--text-main)' }}>{opt}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Post-grading explanation */}
                {submissionResult && q.explanation && (
                  <div style={{
                    marginTop: 14,
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderLeft: `3px solid ${evaluated?.isCorrect ? 'var(--color-success)' : 'var(--color-warning)'}`,
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                  }}>
                    <strong style={{ color: 'var(--text-main)' }}>Explanation: </strong>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit Quiz Button */}
          {!submissionResult && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
                {answeredCount} of {totalQuestions} questions answered
              </span>
              <button
                className="btn btn-primary"
                onClick={handleSubmitQuiz}
                disabled={answeredCount === 0 || submitting}
                style={{ padding: '10px 24px', fontSize: 15 }}
              >
                {submitting ? 'Grading on Server...' : 'Submit Answers for Grading'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
