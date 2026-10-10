const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from cognify root or backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function normalizeSupabaseUrl(url) {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

// Model normalization: if gemini-2.5-flash is passed, map to gemini-3.8-flash per Google API migration
let configuredModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
if (configuredModel === 'gemini-2.5-flash') {
  console.warn('[Cognify] Note: gemini-2.5-flash is superseded by gemini-3.8-flash. Automatically updating model to gemini-3.8-flash.');
  configuredModel = 'gemini-3.8-flash';
}

const rawSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const normalizedSupabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: configuredModel,
  supabaseUrl: normalizedSupabaseUrl,
  supabaseAnonKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25,
  uploadDir: process.env.UPLOAD_DIR ? path.resolve(__dirname, '..', process.env.UPLOAD_DIR) : path.resolve(__dirname, '../uploads'),
  nodeEnv: process.env.NODE_ENV || 'development',
  normalizeSupabaseUrl,
};

// Diagnostics helper (never prints secrets)
config.getDiagnostics = () => {
  return {
    geminiConfigured: Boolean(config.geminiApiKey && config.geminiApiKey.length > 10),
    geminiModel: config.geminiModel,
    supabaseConfigured: Boolean(config.supabaseUrl && (config.supabaseServiceRoleKey || config.supabaseAnonKey)),
    supabaseUrlConfigured: Boolean(config.supabaseUrl),
    serviceRoleConfigured: Boolean(config.supabaseServiceRoleKey),
    port: config.port,
    uploadDir: config.uploadDir,
    maxFileSizeMb: config.maxFileSizeMb,
  };
};

module.exports = config;
