import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  MessageSquare,
  Network,
  Layers,
  CheckCircle,
  FileText,
  Bookmark,
  TrendingUp,
  LogOut,
  Sparkles,
} from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage, user, onSignOut }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'syllabus', label: 'Syllabus & Materials', icon: BookOpen },
    { id: 'chat', label: 'Study Chat', icon: MessageSquare },
    { id: 'mindmap', label: 'Mind Map', icon: Network },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'quiz', label: 'Quiz Me', icon: CheckCircle },
    { id: 'exam', label: 'Exam Answers', icon: FileText },
    { id: 'saved', label: 'Saved Study Sets', icon: Bookmark },
    { id: 'progress', label: 'Learning Progress', icon: TrendingUp },
  ];

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo-badge">
          <Sparkles size={20} />
        </div>
        <div>
          <div className="logo-title">Cognify</div>
          <div className="logo-subtitle">Syllabus AI Assistant</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Study Workspace</div>
        {navItems.slice(0, 3).map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="nav-section-label" style={{ marginTop: 12 }}>
          Study Tools
        </div>
        {navItems.slice(3, 7).map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="nav-section-label" style={{ marginTop: 12 }}>
          Revision & Review
        </div>
        {navItems.slice(7).map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentPage(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-row">
          <div className="user-info">
            <div className="avatar">{initial}</div>
            <div style={{ maxWidth: 140 }}>
              <div className="user-name">{displayName}</div>
              <div className="user-email">{user?.email || 'Logged in'}</div>
            </div>
          </div>
          <button className="btn-icon" onClick={onSignOut} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
