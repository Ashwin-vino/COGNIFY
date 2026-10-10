import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  BookOpen,
  Network,
  TrendingUp,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  Bookmark,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Loader2,
  Award,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export default function StudyToolsPanel({
  currentWorkspace,
  selectedSourceIds,
  activeTool,
  setActiveTool,
  isCollapsed,
  onToggleCollapse,
}) {
  // Common tool states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Flashcards State ---
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [dueQueueMode, setDueQueueMode] = useState(false);
  const [dueCardsCount, setDueCardsCount] = useState(0);
  const [cardReviewing, setCardReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);

  // Flashcards generation config
  const [cardCount, setCardCount] = useState(10);
  const [cardTopic, setCardTopic] = useState('');
  const [cardDifficulty, setCardDifficulty] = useState('mixed');

  // --- Quiz State ---
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [userQuizAnswers, setUserQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizQuantity, setQuizQuantity] = useState(5);
  const [quizDifficulty, setQuizDifficulty] = useState('medium');

  // --- Study Guide State ---
  const [studyGuide, setStudyGuide] = useState(null);

  // --- Mind Map State ---
  const [mindMapData, setMindMapData] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});

  // --- 7-Day Retention State ---
  const [retentionMetrics, setRetentionMetrics] = useState(null);
  const [loadingRetention, setLoadingRetention] = useState(false);

  // Load existing flashcards or retention on workspace change
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadWorkspaceFlashcards();
      loadRetentionData();
    }
  }, [currentWorkspace?.id]);

  // Keyboard navigation for Flashcards (Space to flip, Arrows to navigate, 1-4 for SM-2 ratings)
  useEffect(() => {
    function handleKeyDown(e) {
      if (activeTool !== 'flashcards' || flashcards.length === 0) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextCard();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCard();
      } else if (isFlipped) {
        if (e.key === '1') handleRateCard(0); // Again
        else if (e.key === '2') handleRateCard(3); // Hard
        else if (e.key === '3') handleRateCard(4); // Good
        else if (e.key === '4') handleRateCard(5); // Easy
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool, flashcards, currentIndex, isFlipped]);

  async function loadWorkspaceFlashcards() {
    try {
      const cards = await api.getWorkspaceFlashcards(currentWorkspace.id);
      if (cards && cards.length > 0) {
        setFlashcards(cards);
      }
      const due = await api.getDueFlashcards(currentWorkspace.id);
      setDueCardsCount(due ? due.length : 0);
    } catch (err) {
      console.error('Failed to load flashcards:', err);
    }
  }

  async function loadRetentionData() {
    try {
      setLoadingRetention(true);
      const metrics = await api.getRetentionMetrics(currentWorkspace.id);
      setRetentionMetrics(metrics);
    } catch (err) {
      console.error('Failed to load retention metrics:', err);
    } finally {
      setLoadingRetention(false);
    }
  }

  // --- Flashcard Actions ---
  async function handleGenerateFlashcards() {
    try {
      setLoading(true);
      setError(null);
      setIsFlipped(false);
      setCurrentIndex(0);
      setReviewResult(null);

      const res = await api.generateFlashcards({
        workspaceId: currentWorkspace.id,
        topic: cardTopic.trim() || currentWorkspace.name,
        quantity: cardCount,
        difficulty: cardDifficulty,
        selectedSourceIds: selectedSourceIds && selectedSourceIds.length > 0 ? selectedSourceIds : null,
      });

      setFlashcards(res.flashcards || []);
      await loadRetentionData();
    } catch (err) {
      setError(err.message || 'Failed to generate flashcards.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchToDueQueue() {
    try {
      setLoading(true);
      const due = await api.getDueFlashcards(currentWorkspace.id);
      if (due && due.length > 0) {
        setFlashcards(due);
        setDueQueueMode(true);
        setCurrentIndex(0);
        setIsFlipped(false);
      } else {
        alert('All flashcards are reviewed for today! Great job maintaining your retention schedule.');
      }
    } catch (err) {
      console.error('Failed to load due flashcards:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleNextCard() {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setReviewResult(null);
      setCurrentIndex(prev => prev + 1);
    }
  }

  function handlePrevCard() {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setReviewResult(null);
      setCurrentIndex(prev => prev - 1);
    }
  }

  function handleShuffleCards() {
    setIsFlipped(false);
    setReviewResult(null);
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
  }

  async function handleRateCard(rating) {
    const currentCard = flashcards[currentIndex];
    if (!currentCard || !currentCard.id || cardReviewing) return;

    try {
      setCardReviewing(true);
      const res = await api.reviewFlashcard(currentCard.id, {
        rating,
        workspaceId: currentWorkspace.id,
      });

      setReviewResult(res);

      // Update card in local array
      setFlashcards(prev => prev.map((c, idx) => (idx === currentIndex ? { ...c, ...res.card } : c)));

      // Advance after brief pause
      setTimeout(() => {
        if (currentIndex < flashcards.length - 1) {
          handleNextCard();
        } else {
          loadRetentionData();
        }
      }, 600);
    } catch (err) {
      console.error('Failed to record card review:', err);
    } finally {
      setCardReviewing(false);
    }
  }

  // --- Quiz Actions ---
  async function handleGenerateQuiz() {
    try {
      setLoading(true);
      setError(null);
      setQuizSubmitted(false);
      setUserQuizAnswers({});
      setQuizIndex(0);
      setQuizScore(0);

      const res = await api.generateQuiz({
        workspaceId: currentWorkspace.id,
        topic: cardTopic.trim() || currentWorkspace.name,
        quantity: quizQuantity,
        difficulty: quizDifficulty,
        selectedSourceIds: selectedSourceIds && selectedSourceIds.length > 0 ? selectedSourceIds : null,
      });

      setQuizQuestions(res.questions || []);
    } catch (err) {
      setError(err.message || 'Failed to generate quiz.');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectQuizAnswer(optionIdx) {
    if (userQuizAnswers[quizIndex] !== undefined) return; // already answered
    const currentQ = quizQuestions[quizIndex];
    const isCorrect = optionIdx === currentQ.correctIndex;

    setUserQuizAnswers(prev => ({
      ...prev,
      [quizIndex]: optionIdx,
    }));

    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }
  }

  function handleSubmitEntireQuiz() {
    setQuizSubmitted(true);
    const percentage = Math.round((quizScore / quizQuestions.length) * 100);
    if (percentage >= 70) {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    }
  }

  // --- Study Guide Actions ---
  async function handleGenerateStudyGuide() {
    try {
      setLoading(true);
      setError(null);

      const res = await api.generateStudyGuide({
        workspaceId: currentWorkspace.id,
        topic: cardTopic.trim() || currentWorkspace.name,
        selectedSourceIds: selectedSourceIds && selectedSourceIds.length > 0 ? selectedSourceIds : null,
      });

      setStudyGuide(res.guide);
    } catch (err) {
      setError(err.message || 'Failed to generate study guide.');
    } finally {
      setLoading(false);
    }
  }

  // --- Mind Map Actions ---
  async function handleGenerateMindMap() {
    try {
      setLoading(true);
      setError(null);

      const res = await api.generateMindMap({
        workspaceId: currentWorkspace.id,
        topic: cardTopic.trim() || currentWorkspace.name,
        selectedSourceIds: selectedSourceIds && selectedSourceIds.length > 0 ? selectedSourceIds : null,
      });

      setMindMapData(res.mindMap);
    } catch (err) {
      setError(err.message || 'Failed to generate mind map.');
    } finally {
      setLoading(false);
    }
  }

  if (isCollapsed) {
    return (
      <div className="study-tools-collapsed-bar" onClick={onToggleCollapse} title="Expand Study Tools Studio">
        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="var(--accent-primary)" />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.5px' }}>STUDY STUDIO</span>
        </div>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="study-tools-panel">
      {/* Tools Studio Header & Tabs */}
      <div className="study-tools-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-subtle)' }}>
              Study Studio
            </span>
            {dueCardsCount > 0 && (
              <span className="badge badge-warning" style={{ fontSize: 10, padding: '2px 6px' }}>
                {dueCardsCount} due
              </span>
            )}
          </div>

          <button className="btn-icon" onClick={onToggleCollapse} title="Collapse Study Studio">
            <Minimize2 size={15} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="study-tool-tabs">
          <button
            className={`tool-tab-btn ${activeTool === 'flashcards' ? 'active' : ''}`}
            onClick={() => setActiveTool('flashcards')}
          >
            <Layers size={14} />
            <span>Cards</span>
          </button>
          <button
            className={`tool-tab-btn ${activeTool === 'quiz' ? 'active' : ''}`}
            onClick={() => setActiveTool('quiz')}
          >
            <CheckCircle2 size={14} />
            <span>Quiz</span>
          </button>
          <button
            className={`tool-tab-btn ${activeTool === 'guide' ? 'active' : ''}`}
            onClick={() => setActiveTool('guide')}
          >
            <BookOpen size={14} />
            <span>Guide</span>
          </button>
          <button
            className={`tool-tab-btn ${activeTool === 'mindmap' ? 'active' : ''}`}
            onClick={() => setActiveTool('mindmap')}
          >
            <Network size={14} />
            <span>Map</span>
          </button>
          <button
            className={`tool-tab-btn ${activeTool === 'retention' ? 'active' : ''}`}
            onClick={() => setActiveTool('retention')}
          >
            <TrendingUp size={14} />
            <span>Retention</span>
          </button>
        </div>
      </div>

      {/* Tool Content Area */}
      <div className="study-tools-body">
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            backgroundColor: 'var(--color-danger-bg)',
            color: '#f87171',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            marginBottom: 14,
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* =========================================================================
            TAB 1: FLASHCARDS (3D FLIP + GENUINE SM-2)
            ========================================================================= */}
        {activeTool === 'flashcards' && (
          <div className="flashcards-studio-view">
            {/* Top Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className="workspace-select"
                  value={cardCount}
                  onChange={(e) => setCardCount(Number(e.target.value))}
                  style={{ padding: '4px 8px', fontSize: 12 }}
                >
                  <option value={5}>5 cards</option>
                  <option value={10}>10 cards</option>
                  <option value={15}>15 cards</option>
                  <option value={20}>20 cards</option>
                </select>

                <button
                  className="btn btn-secondary"
                  onClick={handleGenerateFlashcards}
                  disabled={loading}
                  style={{ padding: '5px 10px', fontSize: 12 }}
                >
                  {loading ? <Loader2 size={13} className="spin-animation" /> : <Sparkles size={13} />}
                  <span>{loading ? 'Synthesizing...' : 'New Deck'}</span>
                </button>
              </div>

              {dueCardsCount > 0 && !dueQueueMode && (
                <button
                  className="btn btn-secondary"
                  onClick={handleSwitchToDueQueue}
                  style={{ padding: '5px 10px', fontSize: 12, color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                >
                  <Clock size={13} />
                  <span>Review Due ({dueCardsCount})</span>
                </button>
              )}
            </div>

            {flashcards.length === 0 ? (
              <div className="empty-tool-box">
                <Layers size={36} color="var(--accent-secondary)" style={{ marginBottom: 12 }} />
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No Flashcards Yet</h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Generate source-grounded active recall cards from your active notes and slides.
                </p>
                <button className="btn btn-primary" onClick={handleGenerateFlashcards} disabled={loading} style={{ fontSize: 13 }}>
                  <Sparkles size={15} />
                  <span>Generate Flashcards</span>
                </button>
              </div>
            ) : (
              <>
                {/* Deck Progress Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                  <span>Card {currentIndex + 1} of {flashcards.length}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button className="btn-icon" onClick={handleShuffleCards} title="Shuffle deck" style={{ padding: 4 }}>
                      <Shuffle size={14} />
                    </button>
                    {dueQueueMode && <span className="badge badge-warning" style={{ fontSize: 10 }}>SM-2 Due Queue</span>}
                  </div>
                </div>

                {/* Tactile 3D Flip Card */}
                <div className="tactile-flashcard-container" onClick={() => setIsFlipped(prev => !prev)}>
                  <div className={`tactile-flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
                    {/* FRONT */}
                    <div className="tactile-card-face tactile-card-front">
                      <div className="card-top-meta">
                        <span className="badge badge-category" style={{ fontSize: 10 }}>
                          {currentCard?.topic || 'Concept'}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                          Click or press Space to flip
                        </span>
                      </div>

                      <div className="card-body-text">
                        {currentCard?.front}
                      </div>

                      <div className="card-bottom-meta">
                        <span style={{ fontSize: 11, color: 'var(--accent-secondary)' }}>
                          Active Recall • Question
                        </span>
                        <RotateCw size={14} color="var(--text-subtle)" />
                      </div>
                    </div>

                    {/* BACK */}
                    <div className="tactile-card-face tactile-card-back">
                      <div className="card-top-meta">
                        <span className="badge badge-grounded" style={{ fontSize: 10 }}>
                          Answer & Explanation
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                          Click to flip back
                        </span>
                      </div>

                      <div className="card-body-text" style={{ fontSize: 14 }}>
                        {currentCard?.back}
                      </div>

                      <div className="card-bottom-meta">
                        <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                          Interval: {currentCard?.interval_days || 1}d • EF: {currentCard?.ease_factor || 2.5}
                        </span>
                        <RotateCw size={14} color="var(--text-subtle)" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SM-2 Spaced Repetition Grading Controls */}
                <div className="sm2-grading-container">
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)', textAlign: 'center', marginBottom: 8, fontWeight: 600 }}>
                    Rate your recall (SM-2 Spaced Repetition):
                  </div>

                  <div className="sm2-buttons-row">
                    <button
                      className="sm2-rating-btn again"
                      onClick={(e) => { e.stopPropagation(); handleRateCard(0); }}
                      disabled={cardReviewing}
                      title="Forgot concept (resets interval to 1 day) [Key: 1]"
                    >
                      <div className="sm2-btn-title">Again</div>
                      <div className="sm2-btn-sub">1d</div>
                    </button>

                    <button
                      className="sm2-rating-btn hard"
                      onClick={(e) => { e.stopPropagation(); handleRateCard(3); }}
                      disabled={cardReviewing}
                      title="Correct with hesitation [Key: 2]"
                    >
                      <div className="sm2-btn-title">Hard</div>
                      <div className="sm2-btn-sub">1.2x</div>
                    </button>

                    <button
                      className="sm2-rating-btn good"
                      onClick={(e) => { e.stopPropagation(); handleRateCard(4); }}
                      disabled={cardReviewing}
                      title="Correct with reasonable recall [Key: 3]"
                    >
                      <div className="sm2-btn-title">Good</div>
                      <div className="sm2-btn-sub">Standard</div>
                    </button>

                    <button
                      className="sm2-rating-btn easy"
                      onClick={(e) => { e.stopPropagation(); handleRateCard(5); }}
                      disabled={cardReviewing}
                      title="Instant, effortless recall [Key: 4]"
                    >
                      <div className="sm2-btn-title">Easy</div>
                      <div className="sm2-btn-sub">Bonus</div>
                    </button>
                  </div>
                </div>

                {/* Navigation Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handlePrevCard}
                    disabled={currentIndex === 0}
                    style={{ padding: '6px 14px', fontSize: 12 }}
                  >
                    <ChevronLeft size={15} />
                    <span>Previous</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={handleNextCard}
                    disabled={currentIndex === flashcards.length - 1}
                    style={{ padding: '6px 14px', fontSize: 12 }}
                  >
                    <span>Next</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: QUIZ ME (INTERACTIVE SOURCE-GROUNDED MCQs)
            ========================================================================= */}
        {activeTool === 'quiz' && (
          <div className="quiz-studio-view">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className="workspace-select"
                  value={quizQuantity}
                  onChange={(e) => setQuizQuantity(Number(e.target.value))}
                  style={{ padding: '4px 8px', fontSize: 12 }}
                >
                  <option value={3}>3 Questions</option>
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                </select>

                <select
                  className="workspace-select"
                  value={quizDifficulty}
                  onChange={(e) => setQuizDifficulty(e.target.value)}
                  style={{ padding: '4px 8px', fontSize: 12 }}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleGenerateQuiz}
                disabled={loading}
                style={{ padding: '5px 12px', fontSize: 12 }}
              >
                {loading ? <Loader2 size={13} className="spin-animation" /> : <Sparkles size={13} />}
                <span>{loading ? 'Synthesizing...' : 'Start Quiz'}</span>
              </button>
            </div>

            {quizQuestions.length === 0 ? (
              <div className="empty-tool-box">
                <CheckCircle2 size={36} color="var(--color-success)" style={{ marginBottom: 12 }} />
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Source Practice Quiz</h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Test your understanding with multiple-choice questions synthesized from your active documents.
                </p>
                <button className="btn btn-primary" onClick={handleGenerateQuiz} disabled={loading} style={{ fontSize: 13 }}>
                  <Sparkles size={15} />
                  <span>Generate Practice Quiz</span>
                </button>
              </div>
            ) : !quizSubmitted ? (
              <div className="interactive-quiz-container">
                {/* Question progress */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>Question {quizIndex + 1} of {quizQuestions.length}</span>
                  <span>Score: {quizScore}</span>
                </div>

                {/* Current Question */}
                {(() => {
                  const q = quizQuestions[quizIndex];
                  const chosenAnswer = userQuizAnswers[quizIndex];
                  const isAnswered = chosenAnswer !== undefined;

                  return (
                    <div className="quiz-question-card">
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 14, lineHeight: 1.5 }}>
                        {q.question}
                      </div>

                      <div className="quiz-options-list">
                        {q.options?.map((opt, oIdx) => {
                          const isSelected = chosenAnswer === oIdx;
                          const isCorrect = isAnswered && oIdx === q.correctIndex;
                          const isWrong = isAnswered && isSelected && oIdx !== q.correctIndex;

                          let optionClass = 'quiz-option-choice';
                          if (isCorrect) optionClass += ' correct';
                          else if (isWrong) optionClass += ' wrong';
                          else if (isSelected) optionClass += ' selected';

                          return (
                            <div
                              key={oIdx}
                              className={optionClass}
                              onClick={() => handleSelectQuizAnswer(oIdx)}
                            >
                              <div className="option-indicator">
                                {String.fromCharCode(65 + oIdx)}
                              </div>
                              <div style={{ flex: 1, fontSize: 13 }}>{opt}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation box after answer */}
                      {isAnswered && (
                        <div style={{
                          marginTop: 14,
                          padding: 12,
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: 12,
                          lineHeight: 1.5,
                        }}>
                          <div style={{ fontWeight: 700, color: chosenAnswer === q.correctIndex ? 'var(--color-success)' : '#f87171', marginBottom: 4 }}>
                            {chosenAnswer === q.correctIndex ? '✓ Correct!' : '✗ Needs Review'}
                          </div>
                          <div style={{ color: 'var(--text-main)' }}>{q.explanation}</div>
                          {q.sourceCitation && (
                            <div style={{ fontSize: 11, color: 'var(--accent-secondary)', marginTop: 4 }}>
                              Citation: {q.sourceCitation}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quiz nav controls */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setQuizIndex(prev => Math.max(prev - 1, 0))}
                          disabled={quizIndex === 0}
                          style={{ padding: '6px 12px', fontSize: 12 }}
                        >
                          <ChevronLeft size={14} />
                          <span>Previous</span>
                        </button>

                        {quizIndex < quizQuestions.length - 1 ? (
                          <button
                            className="btn btn-primary"
                            onClick={() => setQuizIndex(prev => prev + 1)}
                            disabled={!isAnswered}
                            style={{ padding: '6px 14px', fontSize: 12 }}
                          >
                            <span>Next Question</span>
                            <ChevronRight size={14} />
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary"
                            onClick={handleSubmitEntireQuiz}
                            disabled={!isAnswered}
                            style={{ padding: '6px 14px', fontSize: 12 }}
                          >
                            <span>Finish Quiz</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Quiz Completion Summary */
              <div className="quiz-summary-card">
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto'
                }}>
                  <Award size={24} />
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
                  Quiz Completed!
                </h3>
                <div style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', color: 'var(--accent-primary)', marginBottom: 8 }}>
                  {Math.round((quizScore / quizQuestions.length) * 100)}%
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>
                  You scored {quizScore} out of {quizQuestions.length} questions correctly.
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => { setQuizSubmitted(false); setUserQuizAnswers({}); setQuizIndex(0); setQuizScore(0); }}>
                    <RotateCcw size={14} />
                    <span>Retry Quiz</span>
                  </button>
                  <button className="btn btn-primary" onClick={handleGenerateQuiz}>
                    <Sparkles size={14} />
                    <span>New Quiz</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: STUDY GUIDE
            ========================================================================= */}
        {activeTool === 'guide' && (
          <div className="guide-studio-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Comprehensive Revision Guide</span>
              <button className="btn btn-primary" onClick={handleGenerateStudyGuide} disabled={loading} style={{ padding: '5px 12px', fontSize: 12 }}>
                {loading ? <Loader2 size={13} className="spin-animation" /> : <Sparkles size={13} />}
                <span>{loading ? 'Synthesizing...' : 'Generate Guide'}</span>
              </button>
            </div>

            {!studyGuide ? (
              <div className="empty-tool-box">
                <BookOpen size={36} color="#0ea5e9" style={{ marginBottom: 12 }} />
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Structured Study Guide</h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Synthesize key definitions, core concepts, worked formulas, and common pitfalls from your sources.
                </p>
                <button className="btn btn-primary" onClick={handleGenerateStudyGuide} disabled={loading} style={{ fontSize: 13 }}>
                  <Sparkles size={15} />
                  <span>Generate Study Guide</span>
                </button>
              </div>
            ) : (
              <div className="study-guide-content-box">
                {studyGuide.title && (
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-secondary)', marginBottom: 12 }}>
                    {studyGuide.title}
                  </h3>
                )}

                {/* Key Concepts */}
                {studyGuide.keyConcepts && (
                  <div className="guide-section">
                    <h4 className="guide-section-title">Key Concepts & Principles</h4>
                    <ul className="guide-list">
                      {studyGuide.keyConcepts.map((item, idx) => (
                        <li key={idx}>
                          <strong>{item.concept || item.name}:</strong> {item.explanation || item.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Definitions */}
                {studyGuide.definitions && (
                  <div className="guide-section">
                    <h4 className="guide-section-title">Important Definitions</h4>
                    <ul className="guide-list">
                      {studyGuide.definitions.map((item, idx) => (
                        <li key={idx}>
                          <strong>{item.term}:</strong> {item.definition}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Common Pitfalls */}
                {studyGuide.commonConfusions && (
                  <div className="guide-section">
                    <h4 className="guide-section-title" style={{ color: '#fbbf24' }}>Common Pitfalls & Confusions</h4>
                    <ul className="guide-list">
                      {studyGuide.commonConfusions.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Practice Questions */}
                {studyGuide.practiceQuestions && (
                  <div className="guide-section">
                    <h4 className="guide-section-title">Discussion & Practice Questions</h4>
                    <ol className="guide-list" style={{ paddingLeft: 18 }}>
                      {studyGuide.practiceQuestions.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: MIND MAP
            ========================================================================= */}
        {activeTool === 'mindmap' && (
          <div className="mindmap-studio-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>Concept Hierarchy</span>
              <button className="btn btn-primary" onClick={handleGenerateMindMap} disabled={loading} style={{ padding: '5px 12px', fontSize: 12 }}>
                {loading ? <Loader2 size={13} className="spin-animation" /> : <Sparkles size={13} />}
                <span>{loading ? 'Synthesizing...' : 'Generate Map'}</span>
              </button>
            </div>

            {!mindMapData ? (
              <div className="empty-tool-box">
                <Network size={36} color="#ec4899" style={{ marginBottom: 12 }} />
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Visual Topic Tree</h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Organize source concepts into a clear, hierarchical knowledge tree with expandable nodes.
                </p>
                <button className="btn btn-primary" onClick={handleGenerateMindMap} disabled={loading} style={{ fontSize: 13 }}>
                  <Sparkles size={15} />
                  <span>Generate Mind Map</span>
                </button>
              </div>
            ) : (
              <div className="mindmap-tree-container">
                <div className="mindmap-root-node">
                  <Sparkles size={16} />
                  <span>{mindMapData.centralTopic || currentWorkspace.name}</span>
                </div>

                <div className="mindmap-branches-list">
                  {mindMapData.branches?.map((branch, bIdx) => (
                    <div key={bIdx} className="mindmap-branch-item">
                      <div className="branch-header">
                        <span className="branch-bullet" />
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{branch.name}</span>
                      </div>

                      {branch.subtopics && (
                        <div className="branch-subtopics">
                          {branch.subtopics.map((sub, sIdx) => (
                            <div key={sIdx} className="subtopic-node">
                              <span style={{ color: 'var(--text-subtle)' }}>•</span>
                              <span>{typeof sub === 'string' ? sub : sub.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 5: 7-DAY RETENTION & SPACED REPETITION METRICS
            ========================================================================= */}
        {activeTool === 'retention' && (
          <div className="retention-studio-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>
                  7-Day Retention Progress
                </h3>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Strengthen recall through consistent SM-2 spaced repetition practice.
                </p>
              </div>

              <button className="btn-icon" onClick={loadRetentionData} title="Refresh metrics">
                <RotateCw size={14} />
              </button>
            </div>

            {loadingRetention ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, gap: 8, color: 'var(--text-muted)' }}>
                <Loader2 size={16} className="spin-animation" />
                <span>Computing real retention analytics...</span>
              </div>
            ) : retentionMetrics ? (
              <>
                {/* 3 Metrics Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  <div className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Recall Rate</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-success)', marginTop: 4 }}>
                      {retentionMetrics.overallRecallRate || retentionMetrics.overallRetentionRate || 0}%
                    </div>
                  </div>

                  <div className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Due Today</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24', marginTop: 4 }}>
                      {retentionMetrics.dueCardsCount || 0}
                    </div>
                  </div>

                  <div className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>7d Reviews</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-primary)', marginTop: 4 }}>
                      {retentionMetrics.totalReviews7d || 0}
                    </div>
                  </div>
                </div>

                {/* 7-Day Activity Bar Chart */}
                <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 }}>
                    7-Day Daily Study Activity
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, gap: 6, paddingTop: 10 }}>
                    {(retentionMetrics.dailyActivity || retentionMetrics.last7Days || []).map((day, dIdx) => {
                      const count = day.totalReviews || 0;
                      const maxCount = Math.max(...(retentionMetrics.dailyActivity || retentionMetrics.last7Days || []).map(d => d.totalReviews || 0), 5);
                      const heightPercent = Math.min(Math.round((count / maxCount) * 100), 100);

                      return (
                        <div key={dIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-subtle)' }}>{count}</span>
                          <div style={{
                            width: '100%',
                            maxWidth: 24,
                            height: `${Math.max(heightPercent, 6)}%`,
                            backgroundColor: count > 0 ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.08)',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s ease',
                          }} />
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                            {day.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Revision Recommendation Box */}
                <div style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  fontSize: 12,
                  lineHeight: 1.5,
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} />
                    <span>Next Review Step</span>
                  </div>
                  <div style={{ color: 'var(--text-main)', marginBottom: 10 }}>
                    {retentionMetrics.dueCardsCount > 0
                      ? `You have ${retentionMetrics.dueCardsCount} flashcards scheduled for review today. Review them to prevent memory decay!`
                      : 'You are up to date! Practice a 5-question quiz to test knowledge retention across active sources.'}
                  </div>
                  {retentionMetrics.dueCardsCount > 0 && (
                    <button
                      className="btn btn-primary"
                      onClick={() => { setActiveTool('flashcards'); handleSwitchToDueQueue(); }}
                      style={{ fontSize: 12, padding: '5px 12px', width: '100%' }}
                    >
                      Start Due Flashcard Review
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                No review logs found yet. Rate flashcards using SM-2 to track your 7-day recall trend!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
