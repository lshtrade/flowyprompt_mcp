import winston from 'winston';

const { combine, timestamp, printf, errors } = winston.format;

// Custom format that sanitizes PAT tokens
const sanitizePAT = winston.format((info) => {
  const sanitizedInfo = { ...info };

  // Sanitize PAT in message
  if (typeof sanitizedInfo.message === 'string') {
    sanitizedInfo.message = sanitizedInfo.message.replace(/ghp_[a-zA-Z0-9]{36}/g, '***REDACTED***');
  }

  // Sanitize PAT in context
  if (sanitizedInfo.context) {
    const contextStr = JSON.stringify(sanitizedInfo.context);
    const sanitizedContextStr = contextStr.replace(/ghp_[a-zA-Z0-9]{36}/g, '***REDACTED***');
    sanitizedInfo.context = JSON.parse(sanitizedContextStr);
  }

  return sanitizedInfo;
});

// JSON format with structured fields
const jsonFormat = printf(({ level, message, timestamp: ts, module, context, ...meta }) => {
  const logEntry = {
    level,
    timestamp: ts,
    module: module || 'unknown',
    message,
  };

  if (context) {
    logEntry.context = context;
  }

  // Include any additional metadata
  if (Object.keys(meta).length > 0) {
    logEntry.meta = meta;
  }

  return JSON.stringify(logEntry);
});

// Create logger instance
// MCP servers MUST NOT write to stdout (reserved for JSON-RPC)
// All logs go to stderr or file
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    sanitizePAT(),
    jsonFormat
  ),
  transports: [
    // Use stderr instead of stdout for MCP compatibility
    new winston.transports.Console({
      stderrLevels: ['error', 'warn', 'info', 'debug'], // All levels to stderr
      silent: process.env.NODE_ENV === 'test',
    }),
  ],
});

// Helper methods for structured logging
export const log = {
  debug: (message, context = {}, module = 'app') => {
    logger.debug(message, { module, context });
  },

  info: (message, context = {}, module = 'app') => {
    logger.info(message, { module, context });
  },

  warn: (message, context = {}, module = 'app') => {
    logger.warn(message, { module, context });
  },

  error: (message, error = null, context = {}, module = 'app') => {
    const errorContext = { ...context };
    if (error) {
      errorContext.error = {
        message: error.message,
        stack: error.stack,
        code: error.code,
      };
    }
    logger.error(message, { module, context: errorContext });
  },
};

export default logger;
