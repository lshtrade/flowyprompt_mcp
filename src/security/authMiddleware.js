import { createMcpError } from '../utils/errorHandler.js';
import { log } from '../utils/logger.js';
import config from '../config/index.js';

/**
 * Authentication middleware (optional Bearer token validation)
 * Skips authentication if ENABLE_AUTH=false
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Express next middleware
 */
export function authMiddleware(req, res, next) {
  // Skip authentication if disabled
  if (!config.enableAuth) {
    return next();
  }

  const authHeader = req.headers.authorization;

  // Check for Authorization header
  if (!authHeader) {
    log.warn('Missing Authorization header', { path: req.path }, 'authMiddleware');
    throw createMcpError(
      'UNAUTHORIZED',
      'Missing Authorization header',
      'auth'
    );
  }

  // Validate Bearer token format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    log.warn('Invalid Authorization header format', { path: req.path }, 'authMiddleware');
    throw createMcpError(
      'UNAUTHORIZED',
      'Invalid Authorization header format. Expected: Bearer <token>',
      'auth'
    );
  }

  const token = parts[1];

  // Validate token (basic validation - extend with JWT if needed)
  if (!token || token.length < 10) {
    log.warn('Invalid token', { path: req.path }, 'authMiddleware');
    throw createMcpError(
      'UNAUTHORIZED',
      'Invalid authentication token',
      'auth'
    );
  }

  // For future JWT implementation:
  // try {
  //   const decoded = jwt.verify(token, config.jwtSecret);
  //   req.user = decoded;
  // } catch (err) {
  //   throw createMcpError('UNAUTHORIZED', 'Invalid or expired token', 'auth');
  // }

  // Attach basic auth info to request
  req.auth = {
    token,
    authenticated: true,
  };

  log.info('Request authenticated', { path: req.path }, 'authMiddleware');
  next();
}

export default authMiddleware;
