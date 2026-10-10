const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

function initClient() {
  if (config.supabaseUrl && (config.supabaseServiceRoleKey || config.supabaseAnonKey)) {
    const key = config.supabaseServiceRoleKey || config.supabaseAnonKey;
    return createClient(config.supabaseUrl, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return null;
}

supabaseAdmin = initClient();

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = initClient();
  }
  return supabaseAdmin;
}

function getSupabaseUserClient(accessToken) {
  // A valid Supabase JWT consists of 3 dot-separated base64 segments
  if (!accessToken || typeof accessToken !== 'string' || accessToken.split('.').length !== 3) {
    return null;
  }
  const userKey = config.supabaseAnonKey || config.supabaseServiceRoleKey;
  if (!config.supabaseUrl || !userKey) {
    return null;
  }
  return createClient(config.supabaseUrl, userKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

/**
 * Verify a Supabase JWT access token
 * Returns { user, error }
 * Enforces production security: never allows demo-token bypass in production.
 */
async function verifyToken(token) {
  if (!token) {
    return { user: null, error: new Error('No token provided') };
  }

  const isProduction = process.env.NODE_ENV === 'production' || config.nodeEnv === 'production';

  // Demo token bypass is strictly prohibited in production environments
  if (isProduction && token.startsWith('dev-token-')) {
    return {
      user: null,
      error: new Error('Demo login bypass is disabled in production. Valid Supabase session required.'),
    };
  }

  // Allow mock dev-tokens strictly in test environment or non-prod
  if (!isProduction && token.startsWith('dev-token-')) {
    const devUserId = token.replace('dev-token-', '') || 'test-user-id';
    return {
      user: {
        id: devUserId,
        email: `${devUserId}@example.com`,
        user_metadata: { full_name: 'Test Student' },
      },
      error: null,
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      user: null,
      error: new Error('Supabase is not configured yet. Please configure SUPABASE_URL and SUPABASE_SECRET_KEY in .env'),
    };
  }

  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      return { user: null, error: error || new Error('Invalid or expired token') };
    }
    return { user: data.user, error: null };
  } catch (err) {
    return { user: null, error: err };
  }
}

/**
 * Create a signed URL for a private storage object
 * Enforces authenticated time-limited access.
 */
async function createSignedUrl(bucketName, filePath, expiresIn = 3600) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('Supabase Storage is not configured.');
  }

  const { data, error } = await admin.storage
    .from(bucketName)
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data?.signedUrl || null;
}

module.exports = {
  getSupabaseAdmin,
  getSupabaseUserClient,
  verifyToken,
  createSignedUrl,
  isConfigured: () => Boolean(getSupabaseAdmin()),
};
