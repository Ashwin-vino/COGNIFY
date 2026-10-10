const express = require('express');
const router = express.Router();
const config = require('../config/env');
const { isConfigured: isSupabaseConfigured } = require('../services/supabase');

router.get('/health', (req, res) => {
  const diagnostics = config.getDiagnostics();
  res.json({
    success: true,
    data: {
      status: 'healthy',
      app: 'Cognify API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      diagnostics: {
        ...diagnostics,
        supabaseConnected: isSupabaseConfigured(),
      },
    },
  });
});

module.exports = router;
