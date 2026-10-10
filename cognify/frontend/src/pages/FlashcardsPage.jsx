import React, { useState } from 'react';
import {
  Layers,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Check,
  Flag,
  Bookmark,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';

export default function FlashcardsPage({ currentWorkspace, currentSubjectId }) {
  const [topic, setTopic] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [difficulty, setDifficulty] = useState('mixed');
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cardStats, setCardStats] = useState({ know: new Set(), review: new Set() });

  async function handleGenerate(e) {
    e?.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setError(null);
      setSaved(false);
      setIsFlipped(false);
      setCurrentIndex(0);
      setCardStats({ know: new Set(), review: new Set() });

      const count = Math.min(Math.max(parseInt(quantity, 10) || 10, 1), 50);

      const res = await api.generateFlashcards({
        workspaceId: currentWorkspace.id,
        topic: topic.trim() || currentWorkspace.name,
        quantity: count,
        difficulty,
        subjectId: currentSubjectId || null,
      });

      setFlashcards(res.flashcards || []);
    } catch (err) {
      setError(err.message || 'Failed to generate flashcards.');
    } finally {
      setLoading(false);
    }
  }

  function handleFlip() {
    setIsFlipped(!isFlipped);
  }

  function handleNext() {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex(prev => prev - 1);
    }
  }

  function handleShuffle() {
    setIsFlipped(false);
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
  }

  function markCard(status) {
    setCardStats(prev => {
      const know = new Set(prev.know);
      const review = new Set(prev.review);
      if (status === 'know') {
        know.add(currentIndex);
        review.delete(currentIndex);
      } else {
        review.add(currentIndex);
        know.delete(currentIndex);
      }
      return { know, review };
    });
    // Advance to next card if available
    if (currentIndex < flashcards.length - 1) {
      handleNext();
    }
  }

  async function handleSaveDeck() {
    if (flashcards.length === 0 || saving || saved) return;
    try {
      setSaving(true);
      await api.saveStudySet(currentWorkspace.id, {
        subject_id: currentSubjectId || null,
        type: 'flashcards',
        title: `Flashcards: ${topic || currentWorkspace.name} (${flashcards.length} cards)`,
        content_json: { flashcards, topic },
      });
      setSaved(true);
    } catch (err) {
      alert(err.message || 'Failed to save flashcard deck');
    } finally {
      setSaving(false);
    }
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800 }}>Active Recall Flashcards</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Generate 1 to 50 syllabus-grounded cards to test definitions, formulas, and mechanisms.
          </p>
        </div>

        {flashcards.length > 0 && (
          <button className="btn btn-secondary" onClick={handleSaveDeck} disabled={saving || saved}>
            {saved ? <Check size={16} color="#10b981" /> : <Bookmark size={16} />}
            <span>{saved ? 'Saved Deck' : saving ? 'Saving...' : 'Save Deck'}</span>
          </button>
        )}
      </div>

      {/* Generator Control Card */}
      <div className="card" style={{ marginBottom: 28 }}>
        <form onSubmit={handleGenerate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subject Topic / Unit</label>
              <input
                type="text"
                className="form-input"
                placeholder={`e.g. Unit 2 Algorithms or Definitions`}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Card Count (1 to 50)</label>
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
                <option value="mixed">Mixed (Recommended)</option>
                <option value="easy">Easy (Definitions & Terms)</option>
                <option value="medium">Medium (Mechanisms & Rules)</option>
                <option value="hard">Hard (Analysis & Deep Recall)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: 42 }}>
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin-animation" />
                  <span>Synthesizing Cards...</span>
                </>
              ) : (
                <>
                  <Layers size={16} />
                  <span>Generate Deck</span>
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

      {/* Interactive 3D Flip Card */}
      {currentCard && (
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          {/* Card Meta & Counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)' }}>
              Card {currentIndex + 1} of {flashcards.length}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {currentCard.topic && <span className="badge badge-category">{currentCard.topic}</span>}
              <span className="badge badge-grounded">{currentCard.difficulty || 'standard'}</span>
            </div>
          </div>

          {/* Flip Container */}
          <div className="flashcard-wrapper" onClick={handleFlip}>
            <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
              {/* Front of Card */}
              <div className="flashcard-front">
                <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--accent-secondary)', fontWeight: 700, letterSpacing: 0.5 }}>
                  Question / Concept
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'white', lineHeight: 1.5, margin: 'auto 0' }}>
                  {currentCard.front}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <RotateCw size={13} />
                  <span>Click to reveal answer</span>
                </div>
              </div>

              {/* Back of Card */}
              <div className="flashcard-back">
                <div style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--color-success)', fontWeight: 700, letterSpacing: 0.5 }}>
                  Answer & Explanation
                </div>
                <div style={{ fontSize: 16, color: 'var(--text-main)', lineHeight: 1.6, margin: 'auto 0', whiteSpace: 'pre-line' }}>
                  {currentCard.back}
                </div>
                {currentCard.source ? (
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                    Source: {currentCard.source}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                    Grounded in workspace material
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation & Study Action Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={handlePrev} disabled={currentIndex === 0}>
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>
              <button className="btn btn-secondary" onClick={handleShuffle} title="Shuffle Deck">
                <Shuffle size={16} />
              </button>
            </div>

            {/* Know / Review Marking */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className={`btn ${cardStats.review.has(currentIndex) ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => markCard('review')}
                style={{ fontSize: 13 }}
              >
                <Flag size={15} />
                <span>Need Review ({cardStats.review.size})</span>
              </button>
              <button
                className={`btn ${cardStats.know.has(currentIndex) ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => markCard('know')}
                style={{ fontSize: 13 }}
              >
                <Check size={15} />
                <span>Mastered ({cardStats.know.size})</span>
              </button>
            </div>

            <button className="btn btn-secondary" onClick={handleNext} disabled={currentIndex === flashcards.length - 1}>
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
