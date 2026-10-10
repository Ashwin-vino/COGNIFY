import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SourcesPanel from './components/SourcesPanel';
import ChatPanel from './components/ChatPanel';
import StudyToolsPanel from './components/StudyToolsPanel';
import WorkspaceModal from './components/WorkspaceModal';
import LoginPage from './pages/LoginPage';
import { getCurrentSession, signOutUser, supabase } from './services/supabase';
import { api } from './services/api';
import { BookOpen, Plus, Sparkles, Layers, MessageSquare, Files } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Workspaces / Notebooks
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  // Sources & Selected Sources for Grounding
  const [sources, setSources] = useState([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);

  // Study Tools Studio state
  const [activeStudyTool, setActiveStudyTool] = useState('flashcards'); // 'flashcards' | 'quiz' | 'guide' | 'mindmap' | 'retention'
  const [isToolsCollapsed, setIsToolsCollapsed] = useState(false);

  // Mobile active tab ('sources' | 'chat' | 'tools')
  const [mobileTab, setMobileTab] = useState('chat');

  // Initialize auth
  useEffect(() => {
    checkAuth();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      });
      return () => subscription?.unsubscribe();
    }
  }, []);

  // When user is authenticated, load workspaces
  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user]);

  // When current workspace changes, load its sources
  useEffect(() => {
    if (currentWorkspace?.id) {
      loadSources(currentWorkspace.id);
    } else {
      setSources([]);
      setSelectedSourceIds([]);
    }
  }, [currentWorkspace?.id]);

  async function checkAuth() {
    try {
      setAuthLoading(true);
      const session = await getCurrentSession();
      setUser(session?.user || null);
    } catch (err) {
      console.error('Auth verification error:', err);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadWorkspaces() {
    try {
      const data = await api.getWorkspaces();
      setWorkspaces(data || []);
      if (data && data.length > 0) {
        setCurrentWorkspace(prev => (prev ? data.find(w => w.id === prev.id) || data[0] : data[0]));
      } else {
        setCurrentWorkspace(null);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  }

  async function loadSources(workspaceId) {
    try {
      setLoadingSources(true);
      const docs = await api.getDocuments(workspaceId);
      const safeDocs = docs || [];
      setSources(safeDocs);

      // By default, select all ready or available sources
      setSelectedSourceIds(prev => {
        if (prev && prev.length > 0) {
          // Keep existing selections that still exist
          const existingIds = prev.filter(id => safeDocs.some(d => d.id === id));
          return existingIds.length > 0 ? existingIds : safeDocs.map(d => d.id);
        }
        return safeDocs.map(d => d.id);
      });
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setLoadingSources(false);
    }
  }

  function handleToggleSource(sourceId) {
    setSelectedSourceIds(prev =>
      prev.includes(sourceId) ? prev.filter(id => id !== sourceId) : [...prev, sourceId]
    );
  }

  function handleSelectAllSources() {
    setSelectedSourceIds(sources.map(s => s.id));
  }

  function handleDeselectAllSources() {
    setSelectedSourceIds([]);
  }

  async function handleCreateWorkspace(workspaceData) {
    const created = await api.createWorkspace(workspaceData);
    await loadWorkspaces();
    setCurrentWorkspace(created);
  }

  async function handleSignOut() {
    await signOutUser();
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
  }

  function handleOpenStudyTool(toolName) {
    setActiveStudyTool(toolName);
    setIsToolsCollapsed(false);
    setMobileTab('tools');
  }

  function handleGenerateStudyTool(toolName, options) {
    setActiveStudyTool(toolName);
    setIsToolsCollapsed(false);
    setMobileTab('tools');
  }

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-muted)',
        fontSize: 14,
        gap: 10,
      }}>
        <Sparkles size={18} color="var(--accent-primary)" />
        <span>Initializing Cognify study environment...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Top Header */}
      <Header
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={setCurrentWorkspace}
        onOpenNewWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
        user={user}
        onSignOut={handleSignOut}
        onOpenRetention={() => handleOpenStudyTool('retention')}
      />

      {/* Mobile Tab Switcher (shown on <= 1024px screens) */}
      <div className="mobile-nav-bar" style={{
        display: 'none',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '6px 12px',
        gap: 6,
      }}>
        <button
          className={`btn-tab ${mobileTab === 'sources' ? 'active' : ''}`}
          onClick={() => setMobileTab('sources')}
          style={{ flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: 'none', background: mobileTab === 'sources' ? 'var(--bg-surface)' : 'transparent', color: mobileTab === 'sources' ? 'var(--text-main)' : 'var(--text-muted)' }}
        >
          <Files size={14} /> Sources ({sources.length})
        </button>
        <button
          className={`btn-tab ${mobileTab === 'chat' ? 'active' : ''}`}
          onClick={() => setMobileTab('chat')}
          style={{ flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: 'none', background: mobileTab === 'chat' ? 'var(--bg-surface)' : 'transparent', color: mobileTab === 'chat' ? 'var(--text-main)' : 'var(--text-muted)' }}
        >
          <MessageSquare size={14} /> Tutor Chat
        </button>
        <button
          className={`btn-tab ${mobileTab === 'tools' ? 'active' : ''}`}
          onClick={() => setMobileTab('tools')}
          style={{ flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: 'none', background: mobileTab === 'tools' ? 'var(--bg-surface)' : 'transparent', color: mobileTab === 'tools' ? 'var(--text-main)' : 'var(--text-muted)' }}
        >
          <Layers size={14} /> Study Studio
        </button>
      </div>

      {/* Main Workspace Body */}
      {currentWorkspace ? (
        <div className="workspace-layout-container">
          {/* Left Panel: Sources */}
          <SourcesPanel
            currentWorkspace={currentWorkspace}
            sources={sources}
            selectedSourceIds={selectedSourceIds}
            onToggleSource={handleToggleSource}
            onSelectAllSources={handleSelectAllSources}
            onDeselectAllSources={handleDeselectAllSources}
            onRefreshSources={() => loadSources(currentWorkspace.id)}
          />

          {/* Center Panel: Tutor Chat & ChatGPT Composer */}
          <ChatPanel
            currentWorkspace={currentWorkspace}
            sources={sources}
            selectedSourceIds={selectedSourceIds}
            onOpenStudyTool={handleOpenStudyTool}
            onGenerateStudyTool={handleGenerateStudyTool}
          />

          {/* Right Panel: Study Tools Studio */}
          <StudyToolsPanel
            currentWorkspace={currentWorkspace}
            selectedSourceIds={selectedSourceIds}
            activeTool={activeStudyTool}
            setActiveTool={setActiveStudyTool}
            isCollapsed={isToolsCollapsed}
            onToggleCollapse={() => setIsToolsCollapsed(prev => !prev)}
          />
        </div>
      ) : (
        /* Empty State when no notebook exists */
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.1) 0%, transparent 60%)',
        }}>
          <div className="card" style={{ maxWidth: 540, textAlign: 'center', padding: '48px 36px' }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              margin: '0 auto 20px auto',
              boxShadow: 'var(--shadow-glow)',
            }}>
              <BookOpen size={28} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', marginBottom: 10 }}>
              Welcome to Cognify
            </h2>

            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              Your personal source-grounded AI learning workspace. Create a notebook for your course or research, upload your documents or website links, and learn through conversation and active recall.
            </p>

            <button
              className="btn btn-primary"
              onClick={() => setIsWorkspaceModalOpen(true)}
              style={{ fontSize: 14, padding: '10px 24px', margin: '0 auto', gap: 8 }}
            >
              <Plus size={18} />
              <span>Create Your First Notebook</span>
            </button>
          </div>
        </div>
      )}

      {/* New Notebook Modal */}
      <WorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        onCreate={handleCreateWorkspace}
      />
    </div>
  );
}
