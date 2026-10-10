import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Paperclip,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Layers,
  CheckCircle2,
  FileQuestion,
  Network,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import AddSourceModal from './AddSourceModal';

export default function ChatPanel({
  currentWorkspace,
  sources,
  selectedSourceIds,
  onOpenStudyTool,
  onGenerateStudyTool,
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const [activeCitationExcerpt, setActiveCitationExcerpt] = useState(null);
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
  const [toolMenuOpen, setToolMenuOpen] = useState(null); // 'flashcards' | 'quiz' | 'guide' | null

  // Tool parameter states
  const [toolQuantity, setToolQuantity] = useState(10);
  const [toolDifficulty, setToolDifficulty] = useState('medium');

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadHistory();
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function loadHistory() {
    try {
      const data = await api.getChatMessages(currentWorkspace.id);
      if (data?.messages && data.messages.length > 0) {
        setMessages(data.messages);
      } else {
        // Welcoming pedagogical tutor prompt
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: `Welcome to **${currentWorkspace.name}**!\n\nI am your personal AI tutor grounded strictly in your study sources. You can upload lecture notes, slides, research documents, diagrams, or website links on the left.\n\nAsk me anything, or click the study tool chips below to generate interactive flashcards, quizzes, or structured study guides!`,
            grounding_status: 'grounded',
            sources_json: [],
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }

  async function handleSendMessage(customPrompt = null) {
    const query = (typeof customPrompt === 'string' ? customPrompt : inputText).trim();
    if (!query || loading) return;

    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: query,
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.sendChatMessage({
        workspaceId: currentWorkspace.id,
        question: query,
        selectedSourceIds: selectedSourceIds && selectedSourceIds.length > 0 ? selectedSourceIds : null,
      });

      const assistantMsg = {
        id: res.messageId || `res-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        grounding_status: res.groundingStatus,
        sources_json: res.sources || [],
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `I ran into an issue retrieving or analyzing your sources: ${err.message || 'Please check your connection and try again.'}`,
        grounding_status: 'insufficient_sources',
        sources_json: [],
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function handleTextareaChange(e) {
    setInputText(e.target.value);
    // Auto-adjust height
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  }

  function handleCopy(id, text) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleRegenerate() {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content);
    }
  }

  // Handle clipboard image paste directly in composer
  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          if (file.size > 25 * 1024 * 1024) {
            alert('This file exceeds the 25 MB limit. Please upload a smaller file.');
            return;
          }
          // Open upload modal or upload file
          const formData = new FormData();
          formData.append('file', file, `Pasted_Diagram_${Date.now()}.png`);
          api.uploadDocument(currentWorkspace.id, formData).then(() => {
            alert('Pasted image uploaded and indexed into sources!');
          }).catch(err => {
            alert(`Failed to upload pasted image: ${err.message}`);
          });
        }
      }
    }
  }

  const activeCount = selectedSourceIds.length;

  return (
    <div className="chat-panel">
      {/* Workspace Context Header */}
      <div className="chat-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="workspace-avatar">
            <Sparkles size={17} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
              {currentWorkspace.name}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span className={`status-dot ${activeCount > 0 ? 'online' : 'offline'}`} />
              <span>
                {activeCount > 0
                  ? `Grounded in ${activeCount} active source${activeCount > 1 ? 's' : ''}`
                  : 'No sources selected (General tutor mode)'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={handleRegenerate}
            disabled={loading || messages.length <= 1}
            style={{ padding: '6px 12px', fontSize: 12 }}
            title="Regenerate last answer"
          >
            <RotateCcw size={14} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-messages-container">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const sources = msg.sources_json || [];
          const hasSources = sources.length > 0;
          const isExpanded = expandedSources[msg.id];

          return (
            <div key={msg.id || idx} className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
              <div className="message-avatar">
                {isUser ? 'U' : <Sparkles size={16} />}
              </div>

              <div className="message-bubble-wrapper">
                <div className="message-bubble">
                  {/* Grounding Status Indicator */}
                  {!isUser && msg.grounding_status && (
                    <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {msg.grounding_status === 'grounded' && (
                        <span className="badge badge-grounded">
                          <ShieldCheck size={12} />
                          <span>Source Grounded</span>
                        </span>
                      )}
                      {msg.grounding_status === 'partially_grounded' && (
                        <span className="badge badge-partially_grounded">
                          <AlertTriangle size={12} />
                          <span>Partially Grounded</span>
                        </span>
                      )}
                      {msg.grounding_status === 'insufficient_sources' && (
                        <span className="badge badge-insufficient_sources">
                          <AlertTriangle size={12} />
                          <span>No Relevant Source Material</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Formatted Text Content */}
                  <div className="message-content" style={{ whiteSpace: 'pre-line' }}>
                    {msg.content}
                  </div>

                  {/* Citations Accordion */}
                  {!isUser && hasSources && (
                    <div className="message-sources-accordion">
                      <button
                        onClick={() => setExpandedSources(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                        className="sources-toggle-btn"
                      >
                        <FileText size={13} />
                        <span>{sources.length} Grounded Source Citation{sources.length > 1 ? 's' : ''}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isExpanded && (
                        <div className="citation-pills-container">
                          {sources.map((src, sIdx) => (
                            <div
                              key={sIdx}
                              className="citation-pill"
                              onClick={() => setActiveCitationExcerpt(src)}
                              title="Click to view cited passage excerpt"
                            >
                              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                {src.documentName || `Source [${sIdx + 1}]`}
                              </div>
                              {src.pageNumber && (
                                <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>
                                  Page / Slide {src.pageNumber}
                                </div>
                              )}
                              <div style={{ fontSize: 11, color: 'var(--accent-secondary)', marginTop: 2 }}>
                                Click to preview excerpt →
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Assistant Message Actions */}
                {!isUser && (
                  <div className="message-actions-row">
                    <button
                      className="btn-action-icon"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                      <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="chat-message assistant">
            <div className="message-avatar">
              <Sparkles size={16} />
            </div>
            <div className="message-bubble-wrapper">
              <div className="message-bubble loading-pulse">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 13 }}>
                  <Loader2 size={16} className="spin-animation" color="var(--accent-primary)" />
                  <span>Consulting active sources and synthesizing response...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Prominent ChatGPT-Style Composer */}
      <div className="chat-composer-wrapper">
        {/* Study Tool Shortcut Chips */}
        <div className="composer-shortcuts-row">
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-subtle)', marginRight: 4 }}>
            Study Tools:
          </div>

          <button
            type="button"
            className="shortcut-chip"
            onClick={() => onGenerateStudyTool?.('flashcards', { quantity: 10, difficulty: 'mixed' })}
            title="Generate interactive active recall flashcards from active sources"
          >
            <Layers size={14} color="#8b5cf6" />
            <span>Flashcards</span>
          </button>

          <button
            type="button"
            className="shortcut-chip"
            onClick={() => onGenerateStudyTool?.('quiz', { quantity: 5, difficulty: 'medium' })}
            title="Generate a self-assessment multiple-choice quiz"
          >
            <CheckCircle2 size={14} color="#10b981" />
            <span>Quiz Me</span>
          </button>

          <button
            type="button"
            className="shortcut-chip"
            onClick={() => onGenerateStudyTool?.('guide', {})}
            title="Generate a comprehensive structured revision study guide"
          >
            <BookOpen size={14} color="#0ea5e9" />
            <span>Study Guide</span>
          </button>

          <button
            type="button"
            className="shortcut-chip"
            onClick={() => onGenerateStudyTool?.('mindmap', {})}
            title="Generate hierarchical visual mind map"
          >
            <Network size={14} color="#ec4899" />
            <span>Mind Map</span>
          </button>

          <button
            type="button"
            className="shortcut-chip"
            onClick={() => onGenerateStudyTool?.('questions', { quantity: 5 })}
            title="Generate practice questions from sources"
          >
            <FileQuestion size={14} color="#f59e0b" />
            <span>Questions</span>
          </button>

          <button
            type="button"
            className="shortcut-chip"
            onClick={() => onOpenStudyTool?.('retention')}
            title="View 7-day recall metrics and spaced repetition queue"
          >
            <TrendingUp size={14} color="#06b6d4" />
            <span>7-Day Retention</span>
          </button>
        </div>

        {/* Input Composer Box */}
        <div className="composer-input-card">
          <button
            type="button"
            className="composer-attach-btn"
            onClick={() => setIsAddSourceModalOpen(true)}
            title="Attach file (PDF, PPT, DOC, Image) or add web URL"
          >
            <Paperclip size={18} />
          </button>

          <textarea
            ref={textareaRef}
            className="composer-textarea"
            placeholder={
              activeCount > 0
                ? `Ask about your ${activeCount} active source${activeCount > 1 ? 's' : ''}... (Shift+Enter for newline)`
                : 'Ask a question or attach study materials to begin...'
            }
            value={inputText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="composer-grounding-pill" title={activeCount > 0 ? `${activeCount} sources active` : 'No sources active'}>
              {activeCount > 0 ? `${activeCount} src` : '0 src'}
            </span>

            <button
              type="button"
              className="composer-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || loading}
              title="Send question (Enter)"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Citation Excerpt Popup Modal */}
      {activeCitationExcerpt && (
        <div className="modal-overlay" onClick={() => setActiveCitationExcerpt(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="var(--color-success)" />
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                  Cited Excerpt: {activeCitationExcerpt.documentName}
                </h3>
              </div>
              <button className="btn-icon" onClick={() => setActiveCitationExcerpt(null)}>
                <X size={18} />
              </button>
            </div>

            {activeCitationExcerpt.pageNumber && (
              <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 12 }}>
                Page / Slide: {activeCitationExcerpt.pageNumber}
              </div>
            )}

            <div style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              border: '1px solid var(--border-subtle)',
              fontFamily: 'monospace',
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--text-main)',
              maxHeight: 320,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}>
              {activeCitationExcerpt.snippet || activeCitationExcerpt.text || 'No text snippet available.'}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setActiveCitationExcerpt(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Source Modal for attachment button */}
      <AddSourceModal
        isOpen={isAddSourceModalOpen}
        onClose={() => setIsAddSourceModalOpen(false)}
        workspaceId={currentWorkspace.id}
        onSourceAdded={() => {
          // Sources will refresh via parent
        }}
      />
    </div>
  );
}
