const { verifyToken } = require('../services/supabase');

/**
 * Express middleware to authenticate requests via Supabase JWT
 * Extracts token from 'Authorization: Bearer <token>'
 * Derives user.id from verified session, never from request body.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Missing Bearer token.',
        },
      });
    }

    const token = authHeader.split(' ')[1].trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Empty authorization token provided.',
        },
      });
    }

    const { user, error } = await verifyToken(token);
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error?.message || 'Invalid or expired session. Please sign in again.',
        },
      });
    }

    // Attach verified user and token to request object
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication verification failed.',
      },
    });
  }
}

module.exports = {
  requireAuth,
};
