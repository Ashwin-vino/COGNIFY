import React from 'react';
import { Plus, ShieldCheck, Sparkles, BookOpen, LogOut, TrendingUp } from 'lucide-react';

export default function Header({
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onOpenNewWorkspaceModal,
  user,
  onSignOut,
  onOpenRetention,
}) {
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="top-header">
      {/* Brand & Workspace Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="logo-badge" style={{ width: 32, height: 32, fontSize: 16 }}>
            <Sparkles size={18} />
          </div>
          <div>
            <span className="logo-title" style={{ fontSize: 18 }}>Cognify</span>
          </div>
        </div>

        <div style={{ height: 20, width: 1, backgroundColor: 'var(--border-subtle)', margin: '0 4px' }} />

        <div className="workspace-selector-group">
          <label style={{ fontSize: 12, color: 'var(--text-subtle)', fontWeight: 600 }}>
            Notebook:
          </label>
          {workspaces && workspaces.length > 0 ? (
            <select
              className="workspace-select"
              value={currentWorkspace?.id || ''}
              onChange={(e) => {
                const selected = workspaces.find(w => w.id === e.target.value);
                if (selected) onSelectWorkspace(selected);
              }}
            >
              {workspaces.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No notebooks yet</span>
          )}

          <button
            className="btn btn-secondary"
            onClick={onOpenNewWorkspaceModal}
            style={{ padding: '5px 10px', fontSize: 12, gap: 4 }}
          >
            <Plus size={14} />
            <span>New Notebook</span>
          </button>
        </div>
      </div>

      {/* Right Side Header Items */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          className="badge badge-grounded"
          style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'default' }}
          title="All answers and study materials are strictly grounded in active sources"
        >
          <ShieldCheck size={14} />
          <span>Source Grounded</span>
        </div>

        {/* User Profile & Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 10, borderLeft: '1px solid var(--border-subtle)' }}>
          <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }} title={user?.email}>
            {initial}
          </div>
          <button
            className="btn-icon"
            onClick={onSignOut}
            title="Sign out of Cognify"
            style={{ padding: 6 }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
