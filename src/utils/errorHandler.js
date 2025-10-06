import { log } from './logger.js';
import metricsService from '../services/metricsService.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Error code to HTTP status mapping
const errorStatusMap = {
  INVALID_REQUEST: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 422,
  FILE_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  INVALID_CONFIG: 400,
  GITHUB_ERROR: 502,
  NETWORK_ERROR: 503,
  PARSE_ERROR: 422,
  INTERNAL_ERROR: 500,
};

// Map application error codes to MCP ErrorCode
const mcpErrorCodeMap = {
  INVALID_REQUEST: ErrorCode.InvalidRequest,
  NOT_FOUND: ErrorCode.InvalidRequest,
  UNAUTHORIZED: ErrorCode.InvalidRequest,
  VALIDATION_ERROR: ErrorCode.InvalidRequest,
  FILE_TOO_LARGE: ErrorCode.InvalidRequest,
  RATE_LIMITED: ErrorCode.InvalidRequest,
  INVALID_CONFIG: ErrorCode.InvalidRequest,
  GITHUB_ERROR: ErrorCode.InternalError,
  NETWORK_ERROR: ErrorCode.InternalError,
  PARSE_ERROR: ErrorCode.ParseError,
  INTERNAL_ERROR: ErrorCode.InternalError,
};

/**
 * Format error as McpErrorResponse
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {string} source - Error source
 * @param {object} details - Optional additional details
 * @returns {object} Formatted error response
 */
export function formatError(code, message, source, details = null) {
  const errorResponse = {
    status: 'error',
    error: {
      code,
      message,
      source,
    },
  };

  if (details) {
    errorResponse.error.details = details;
  }

  return errorResponse;
}

/**
 * Global error handler middleware
 * Catches all errors and formats them as MCP error responses
 */
export function errorHandler(err, req, res, next) {
  // Log the error
  log.error('Error occurred', err, {
    path: req.path,
    method: req.method,
    body: req.body,
  }, 'errorHandler');

  // Check if error has MCP format already
  if (err.code && err.source) {
    // Track error in metrics
    metricsService.recordError(err.code);

    const status = errorStatusMap[err.code] || 500;
    return res.status(status).json(formatError(err.code, err.message, err.source, err.details));
  }

  // Handle Joi validation errors
  if (err.isJoi) {
    return res.status(400).json(formatError(
      'INVALID_REQUEST',
      err.details[0].message,
      'request',
      { validationErrors: err.details }
    ));
  }

  // Handle common HTTP errors
  if (err.status || err.statusCode) {
    const status = err.status || err.statusCode;
    const code = status >= 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST';
    return res.status(status).json(formatError(
      code,
      err.message || 'An error occurred',
      'server'
    ));
  }

  // Default to internal error
  res.status(500).json(formatError(
    'INTERNAL_ERROR',
    'An unexpected error occurred',
    'server'
  ));
}

/**
 * Create a custom MCP error
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {string} source - Error source
 * @param {object} details - Optional details
 * @returns {Error} Custom error with MCP properties
 */
export function createMcpError(code, message, source, details = null) {
  const error = new Error(message);
  error.code = code;
  error.source = source;
  if (details) {
    error.details = details;
  }
  return error;
}

/**
 * Convert application error to MCP SDK error
 * @param {string} code - Application error code
 * @param {string} message - Error message
 * @returns {McpError} MCP SDK error
 */
export function toMcpError(code, message) {
  const mcpCode = mcpErrorCodeMap[code] || ErrorCode.InternalError;
  return new McpError(mcpCode, message);
}

export default errorHandler;
