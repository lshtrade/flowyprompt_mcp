import { createMcpError } from '../utils/errorHandler.js';

/**
 * Validate and sanitize fetch request fields
 * @param {object} request - Raw request body
 * @returns {object} Sanitized request
 * @throws {Error} If validation fails
 */
export function sanitizeFetchRequest(request) {
  const { type, name, ref, validate } = request;

  // Validate type
  if (!type || !['template', 'flow'].includes(type)) {
    throw createMcpError(
      'INVALID_REQUEST',
      "Invalid type: must be 'template' or 'flow'",
      'request'
    );
  }

  // Validate name exists
  if (!name || typeof name !== 'string') {
    throw createMcpError(
      'INVALID_REQUEST',
      'Missing required field: name',
      'request'
    );
  }

  // Sanitize and validate name pattern
  const sanitizedName = name.trim();

  // Check for path traversal attempts
  if (sanitizedName.includes('..') || sanitizedName.includes('/') || sanitizedName.includes('\\')) {
    throw createMcpError(
      'INVALID_REQUEST',
      'Invalid name: must match pattern [a-zA-Z0-9_-]+',
      'request'
    );
  }

  // Validate name pattern (alphanumeric, underscore, hyphen only)
  const namePattern = /^[a-zA-Z0-9_-]+$/;
  if (!namePattern.test(sanitizedName)) {
    throw createMcpError(
      'INVALID_REQUEST',
      'Invalid name: must match pattern [a-zA-Z0-9_-]+',
      'request'
    );
  }

  // Check name length
  if (sanitizedName.length < 1 || sanitizedName.length > 255) {
    throw createMcpError(
      'INVALID_REQUEST',
      'Invalid name: must be between 1 and 255 characters',
      'request'
    );
  }

  // Validate ref if provided
  let sanitizedRef = 'main';
  if (ref) {
    sanitizedRef = ref.trim();

    // Check ref length
    if (sanitizedRef.length > 255) {
      throw createMcpError(
        'INVALID_REQUEST',
        'Invalid ref: must be less than 255 characters',
        'request'
      );
    }

    // Validate ref pattern (branch, tag, or commit SHA)
    const refPattern = /^[a-zA-Z0-9/_.-]+$/;
    const shaPattern = /^[a-f0-9]{40}$/;

    if (!refPattern.test(sanitizedRef) && !shaPattern.test(sanitizedRef)) {
      throw createMcpError(
        'INVALID_REQUEST',
        'Invalid ref: must be a valid branch, tag, or commit SHA',
        'request'
      );
    }
  }

  return {
    type,
    name: sanitizedName,
    ref: sanitizedRef,
    validate: typeof validate === 'boolean' ? validate : true,
  };
}

/**
 * Redact PAT tokens from strings
 * @param {string} text - Text that may contain PAT
 * @returns {string} Text with PAT redacted
 */
export function redactPAT(text) {
  if (typeof text !== 'string') return text;

  // Redact GitHub PAT format (ghp_XXXX...)
  return text.replace(/ghp_[a-zA-Z0-9]{36}/g, '***REDACTED***');
}

/**
 * Sanitize log context to remove sensitive data
 * @param {object} context - Log context object
 * @returns {object} Sanitized context
 */
export function sanitizeLogContext(context) {
  if (!context || typeof context !== 'object') return context;

  const sanitized = { ...context };

  // Redact PAT from all string values
  Object.keys(sanitized).forEach((key) => {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = redactPAT(sanitized[key]);
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogContext(sanitized[key]);
    }
  });

  return sanitized;
}

export default {
  sanitizeFetchRequest,
  redactPAT,
  sanitizeLogContext,
};
