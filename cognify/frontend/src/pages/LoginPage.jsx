import React, { useState } from 'react';
import { Sparkles, Shield, BookOpen, Layers, CheckCircle } from 'lucide-react';
import { signInWithGoogle, signInDemoStudent, isSupabaseConfigured } from '../services/supabase';

export default function LoginPage({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please check your credentials.');
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    try {
      setLoading(true);
      setError(null);
      const session = await signInDemoStudent();
      onLoginSuccess(session.user);
    } catch (err) {
      setError(err.message || 'Failed to start demo session.');
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(circle at 50% 20%, rgba(99, 102, 241, 0.15) 0%, #0a0e17 70%)',
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 20,
        padding: '40px 36px',
        boxShadow: 'var(--shadow-lg)',
        textAlign: 'center',
      }}>
        {/* Brand Header */}
        <div style={{
          width: 56,
          height: 56,
          margin: '0 auto 20px auto',
          borderRadius: 16,
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: 'var(--shadow-glow)',
        }}>
          <Sparkles size={28} />
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: -0.5 }}>
          Welcome to Cognify
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
          Your syllabus-grounded AI study assistant. Learn, practice, and revise from your exact prescribed notes, textbooks, and exam papers.
        </p>

        {/* Feature Highlights */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginBottom: 32,
          textAlign: 'left',
        }}>
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            fontSize: 12,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Shield size={16} color="#10b981" />
            <span>Syllabus Grounded</span>
          </div>
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            fontSize: 12,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <BookOpen size={16} color="#6366f1" />
            <span>PDF & Notes RAG</span>
          </div>
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            fontSize: 12,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Layers size={16} color="#8b5cf6" />
            <span>Flashcards & Mindmaps</span>
          </div>
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 10,
            border: '1px solid var(--border-subtle)',
            fontSize: 12,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <CheckCircle size={16} color="#ec4899" />
            <span>Interactive Quizzes</span>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-danger-bg)',
            color: '#f87171',
            borderRadius: 10,
            fontSize: 13,
            marginBottom: 20,
            textAlign: 'left',
          }}>
            {error}
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          className="btn btn-primary"
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 20px',
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Demo Mode Button for Development & Offline Testing (Disabled in Production) */}
        {!import.meta.env.PROD && (
          <>
            <button
              className="btn btn-secondary"
              onClick={handleDemoLogin}
              disabled={loading}
              style={{ width: '100%', padding: '12px 20px', fontSize: 14 }}
            >
              <span>Continue as Demo Student</span>
            </button>

            {!isSupabaseConfigured && (
              <p style={{
                marginTop: 18,
                fontSize: 11,
                color: 'var(--text-subtle)',
                lineHeight: 1.4,
              }}>
                Development mode: Click <strong>Continue as Demo Student</strong> to explore the full assistant locally.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
