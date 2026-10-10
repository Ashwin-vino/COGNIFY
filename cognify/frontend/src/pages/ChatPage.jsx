import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Bookmark,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../services/api';

export default function ChatPage({ currentWorkspace, currentSubjectId, onOpenStudyTool }) {
  const [messages, setMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState({});
  const messagesEndRef = useRef(null);

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
        // Welcome message
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: `Hello! I am your Cognify study assistant for **${currentWorkspace.name}**.\n\nAsk me anything about your course. I will ground my answers strictly in your uploaded syllabus, class notes, and textbook materials, and provide exact citations!`,
            grounding_status: 'grounded',
            sources_json: [],
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }

  async function handleSend(e) {
    e?.preventDefault();
    const query = inputQuestion.trim();
    if (!query || loading) return;

    setInputQuestion('');

    // Optimistically append user message
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
        subjectId: currentSubjectId || null,
      });

      const assistantMsg = {
        id: res.messageId,
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
        content: `Error: ${err.message || 'Failed to process question. Please try again.'}`,
        grounding_status: 'insufficient_sources',
        sources_json: [],
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function toggleSources(msgId) {
    setExpandedSources(prev => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  }

  function handleQuickPrompt(promptText) {
    setInputQuestion(promptText);
  }

  return (
    <div className="chat-page-container">
      {/* Messages Scroll Area */}
      <div className="messages-list">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          const sources = msg.sources_json || [];
          const hasSources = sources.length > 0;
          const isExpanded = expandedSources[msg.id];

          return (
            <div key={msg.id} className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
              <div className="avatar" style={{ backgroundColor: isUser ? '#6366f1' : '#10b981' }}>
                {isUser ? 'U' : <Sparkles size={16} />}
              </div>

              <div className="message-bubble">
                {!isUser && msg.grounding_status && (
                  <div style={{ marginBottom: 10 }}>
                    {msg.grounding_status === 'grounded' && (
                      <span className="badge badge-grounded">
                        <ShieldCheck size={12} />
                        <span>Syllabus Grounded</span>
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
                        <span>Insufficient Study Sources</span>
                      </span>
                    )}
                  </div>
                )}

                <div style={{ whiteSpace: 'pre-line' }}>{msg.content}</div>

                {/* Sources Accordion */}
                {!isUser && hasSources && (
                  <div className="sources-box">
                    <button
                      onClick={() => toggleSources(msg.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-secondary)',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <FileText size={14} />
                      <span>{sources.length} Grounded Source Citation{sources.length > 1 ? 's' : ''}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isExpanded && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {sources.map((src, idx) => (
                          <div key={idx} className="source-item">
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 2 }}>
                              {src.documentName} {src.sectionLabel ? `• ${src.sectionLabel}` : ''}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              "{src.snippet}"
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="chat-message assistant">
            <div className="avatar" style={{ backgroundColor: '#10b981' }}>
              <Sparkles size={16} />
            </div>
            <div className="message-bubble" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Analyzing syllabus, retrieving relevant lecture notes, and formulating answer with Gemini...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestions */}
      <div style={{ padding: '0 32px 8px 32px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: '4px 10px', whiteSpace: 'nowrap' }}
          onClick={() => handleQuickPrompt('Summarize the key definitions and formulas from Unit 1')}
        >
          Summarize Key Points
        </button>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: '4px 10px', whiteSpace: 'nowrap' }}
          onClick={() => handleQuickPrompt('Explain the core concepts in a 5-mark exam answer format')}
        >
          5-Mark Answer Format
        </button>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: '4px 10px', whiteSpace: 'nowrap' }}
          onClick={() => handleQuickPrompt('What are the most important differences and comparisons?')}
        >
          Important Comparisons
        </button>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: '4px 10px', whiteSpace: 'nowrap' }}
          onClick={() => handleQuickPrompt('Give 3 potential exam questions with their step-by-step marking schemes')}
        >
          Exam Questions & Marking
        </button>
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <form onSubmit={handleSend}>
          <div className="chat-input-wrapper">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask a question from your syllabus or notes..."
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={loading}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px' }} disabled={!inputQuestion.trim() || loading}>
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
