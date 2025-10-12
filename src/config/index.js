import Joi from 'joi';

// For MCP servers: NO dotenv loading
// All environment variables MUST come from claude_desktop_config.json
// Loading .env causes stdout pollution which breaks MCP JSON-RPC protocol

const configSchema = Joi.object({
  githubRepoUrl: Joi.string().uri().required(),
  githubPat: Joi.string().required(),
  githubRef: Joi.string().default('main'),
  port: Joi.number().port().default(3000),
  host: Joi.string().default('0.0.0.0'),
  httpPort: Joi.number().port().default(3001),
  env: Joi.string().valid('development', 'production', 'test').default('development'),
  cacheType: Joi.string().valid('memory', 'redis').default('memory'),
  cacheTtlMs: Joi.number().default(300000),
  maxFileSize: Joi.number().default(10485760),
  maxConcurrentRequests: Joi.number().default(20),
  retryAttempts: Joi.number().min(0).max(5).default(3),
  enableAuth: Joi.boolean().default(false),
  mcp: Joi.object({
    serverName: Joi.string().default('flowyprompt-mcp-server'),
    serverVersion: Joi.string().default('1.0.0'),
  }).default(),
}).unknown(true);

// Helper function to parse integers with fallback to undefined
function parseIntOrUndefined(value) {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

const rawConfig = {
  githubRepoUrl: process.env.GITHUB_REPO_URL,
  githubPat: process.env.GITHUB_PAT,
  githubRef: process.env.GITHUB_REF,
  port: parseIntOrUndefined(process.env.PORT),
  host: process.env.HOST,
  httpPort: parseIntOrUndefined(process.env.HTTP_PORT) || parseIntOrUndefined(process.env.PORT),
  env: process.env.NODE_ENV,
  cacheType: process.env.CACHE_TYPE,
  cacheTtlMs: parseIntOrUndefined(process.env.CACHE_TTL_MS),
  maxFileSize: parseIntOrUndefined(process.env.MAX_FILE_SIZE),
  maxConcurrentRequests: parseIntOrUndefined(process.env.MAX_CONCURRENT_REQUESTS),
  retryAttempts: parseIntOrUndefined(process.env.RETRY_ATTEMPTS),
  enableAuth: process.env.ENABLE_AUTH === 'true',
  mcp: {
    serverName: process.env.MCP_SERVER_NAME,
    serverVersion: process.env.MCP_SERVER_VERSION,
  },
};

const { error, value: config } = configSchema.validate(rawConfig);

// Skip validation in test environment when config is mocked
if (error && process.env.NODE_ENV !== 'test') {
  throw new Error(`Config validation error: ${error.message}`);
}

export default error && process.env.NODE_ENV === 'test' ? {} : config;
