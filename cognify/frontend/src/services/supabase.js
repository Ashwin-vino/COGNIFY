import { createClient } from '@supabase/supabase-js';

export function normalizeSupabaseUrl(url) {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseUrl = normalizeSupabaseUrl(rawUrl);
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  (supabaseUrl.includes('supabase.co') || supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1'))
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Mock local user for development / demo mode when Supabase is not yet configured
const DEMO_USER = {
  id: 'student-demo-user-1',
  email: 'student@cognify.study',
  user_metadata: {
    full_name: 'Alex Rivera (Demo Student)',
    avatar_url: '',
  },
};

export async function getCurrentSession() {
  if (supabase) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (session) return session;
  }
  // Demo mode is only available in development when Supabase is not configured
  if (!import.meta.env.PROD && !isSupabaseConfigured) {
    const demoActive = localStorage.getItem('cognify_demo_session');
    if (demoActive === 'true') {
      return {
        access_token: 'dev-token-student-demo-user-1',
        user: DEMO_USER,
      };
    }
  }
  return null;
}

export async function signInWithGoogle() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.');
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signInDemoStudent() {
  if (import.meta.env.PROD) {
    throw new Error('Demo login is disabled in production. Please sign in with Google or your Supabase account.');
  }
  localStorage.setItem('cognify_demo_session', 'true');
  return {
    access_token: 'dev-token-student-demo-user-1',
    user: DEMO_USER,
  };
}

export async function signOutUser() {
  localStorage.removeItem('cognify_demo_session');
  if (supabase) {
    await supabase.auth.signOut();
  }
}

