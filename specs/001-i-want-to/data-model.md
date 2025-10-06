# Data Model: GitHub MCP Server

## Overview
This document defines the data structures, validation rules, and state transitions for the GitHub MCP Server. All entities are JSON-based to maintain compatibility with MCP protocol and GitHub storage.

---

## 1. Configuration Entity

### Purpose
Server configuration loaded from environment variables and config files.

### Fields
```typescript
interface ServerConfig {
  // GitHub Configuration
  githubRepoUrl: string;        // Format: "https://github.com/owner/repo"
  githubPat: string;             // Personal Access Token (env: GITHUB_PAT)
  githubRef: string;             // Branch/tag/commit (default: "main")

  // Server Configuration
  port: number;                  // HTTP server port (default: 3000)
  host: string;                  // Bind address (default: "0.0.0.0")
  env: 'development' | 'production';

  // Cache Configuration
  cacheType: 'memory' | 'redis';
  redisCon?: string;             // Redis connection URL (if cacheType=redis)
  cacheTtlMs: number;            // Default TTL (default: 300000 = 5min)

  // Performance Configuration
  maxFileSize: number;           // Max JSON file size (default: 10MB)
  maxConcurrentRequests: number; // Target concurrent load (default: 20)
  retryAttempts: number;         // GitHub fetch retries (default: 3)

  // Security Configuration
  jwtSecret?: string;            // JWT signing secret (optional)
  enableAuth: boolean;           // Require Bearer token (default: false)
}
```

### Validation Rules
- `githubRepoUrl` MUST match pattern: `https://github.com/[owner]/[repo]`
- `githubPat` MUST be non-empty string (never logged)
- `githubRef` MUST be valid branch/tag/SHA (validated via GitHub API)
- `port` MUST be between 1-65535
- `maxFileSize` MUST be > 0 and ≤ 100MB
- `retryAttempts` MUST be 0-5

### State Transitions
- Load on server startup
- Immutable during runtime (restart required for changes)
- Validated before server initialization

---

## 2. Fetch Request Entity

### Purpose
Incoming MCP fetch request from client.

### Fields
```typescript
interface FetchRequest {
  type: 'template' | 'flow';     // Resource type
  name: string;                   // Resource identifier (e.g., "Flow1")
  ref?: string;                   // Optional Git reference override
  validate?: boolean;             // Force schema validation (default: true)
}
```

### Validation Rules
- `type` MUST be exactly "template" or "flow"
- `name` MUST:
  - Be 1-255 characters
  - Match pattern: `[a-zA-Z0-9_-]+` (alphanumeric, underscore, hyphen)
  - Not contain path separators (`/`, `\`, `..`)
- `ref` (if provided):
  - Be 1-255 characters
  - Match branch pattern: `[a-zA-Z0-9/_.-]+`
  - Or match commit SHA: `[a-f0-9]{40}`

### Path Construction
```javascript
const filePath = `${type}s/${name}.json`;
// Examples:
// type="template", name="Brand_Positioning_Strategy" → "templates/Brand_Positioning_Strategy.json"
// type="flow", name="Flow1" → "flows/Flow1.json"
```

### Sanitization
- URL-encode `name` before GitHub API call
- Strip leading/trailing whitespace from all fields
- Convert `type` to lowercase

---

## 3. Template Entity

### Purpose
Reusable prompt template fetched from GitHub.

### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["metadata", "variables", "results"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["name", "description", "version"],
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "description": { "type": "string" },
        "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
        "author": { "type": "string" },
        "tags": { "type": "array", "items": { "type": "string" } }
      }
    },
    "variables": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "type"],
        "properties": {
          "name": { "type": "string", "minLength": 1 },
          "type": { "enum": ["string", "number", "boolean", "array", "object"] },
          "default": {},
          "description": { "type": "string" },
          "required": { "type": "boolean", "default": false }
        }
      }
    },
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["section", "content"],
        "properties": {
          "section": { "type": "string", "minLength": 1 },
          "content": { "type": "string" },
          "format": { "enum": ["text", "markdown", "json"] }
        }
      }
    }
  },
  "additionalProperties": true
}
```

### Example
```json
{
  "metadata": {
    "name": "Brand Positioning Strategy",
    "description": "Generate comprehensive brand positioning",
    "version": "1.0.0",
    "author": "FlowyPrompt Team",
    "tags": ["marketing", "strategy"]
  },
  "variables": [
    {
      "name": "brand_name",
      "type": "string",
      "required": true,
      "description": "Name of the brand"
    },
    {
      "name": "target_audience",
      "type": "array",
      "default": [],
      "description": "Target demographic segments"
    }
  ],
  "results": [
    {
      "section": "positioning_statement",
      "content": "{{ brand_name }} helps {{ target_audience }} ...",
      "format": "markdown"
    }
  ]
}
```

---

## 4. Flow Entity

### Purpose
Workflow definition with nodes and edges representing processing steps.

### JSON Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["metadata", "nodes", "edges"],
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["name", "version"],
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "description": { "type": "string" },
        "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" }
      }
    },
    "nodes": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "type"],
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "type": { "enum": ["input", "template", "result", "flow-link"] },
          "label": { "type": "string" },
          "config": { "type": "object" }
        }
      }
    },
    "edges": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["source", "target"],
        "properties": {
          "source": { "type": "string", "minLength": 1 },
          "target": { "type": "string", "minLength": 1 },
          "condition": { "type": "string" }
        }
      }
    }
  },
  "additionalProperties": true
}
```

### Validation Rules
- All `node.id` values MUST be unique within the flow
- All `edge.source` and `edge.target` MUST reference existing `node.id` values
- At least one node with `type="input"` MUST exist
- Graph MUST be acyclic (no circular dependencies)

### Example
```json
{
  "metadata": {
    "name": "Simple Content Flow",
    "version": "1.0.0",
    "description": "Input → Template → Result"
  },
  "nodes": [
    { "id": "input_1", "type": "input", "label": "User Input", "config": {} },
    { "id": "template_1", "type": "template", "label": "Process", "config": { "templateId": "Brand_Positioning_Strategy" } },
    { "id": "result_1", "type": "result", "label": "Output", "config": {} }
  ],
  "edges": [
    { "source": "input_1", "target": "template_1" },
    { "source": "template_1", "target": "result_1" }
  ]
}
```

---

## 5. Cache Entry Entity

### Purpose
Cached template/flow data with ETag for revalidation.

### Fields
```typescript
interface CacheEntry {
  content: Template | Flow;      // Parsed and validated JSON
  etag: string | null;           // GitHub ETag header (e.g., "W/\"abc123\"")
  lastModified: string | null;   // GitHub Last-Modified header (ISO 8601)
  fetchedAt: number;             // Unix timestamp (ms)
  ttl: number;                   // Time-to-live in milliseconds
  size: number;                  // Content size in bytes
}
```

### Cache Key Format
```typescript
const cacheKey = `${type}:${name}:${ref}`;
// Examples:
// "template:Brand_Positioning_Strategy:main"
// "flow:Flow1:v1.0.0"
```

### State Transitions
1. **Cache Miss**: Entry doesn't exist → Fetch from GitHub → Store with ETag
2. **Cache Hit (Valid)**: Entry exists, TTL not expired → Return cached content
3. **Cache Hit (Revalidation)**: Entry exists with ETag → Send If-None-Match → 304 = return cached, 200 = update cache
4. **Cache Invalidation**: Manual or on error → Delete entry

---

## 6. MCP Response Entity

### Purpose
Standardized response format for MCP protocol compliance.

### Success Response
```typescript
interface McpSuccessResponse {
  status: 'success';
  data: {
    type: 'template' | 'flow';
    name: string;
    ref: string;
    content: Template | Flow;
    cached: boolean;              // True if served from cache
    etag?: string;                // Current ETag for client caching
  };
  metadata: {
    fetchedAt: number;            // Unix timestamp (ms)
    latencyMs: number;            // Request processing time
    source: 'cache' | 'github';
  };
}
```

### Error Response
```typescript
interface McpErrorResponse {
  status: 'error';
  error: {
    code: ErrorCode;              // Enum: see below
    message: string;              // Human-readable description
    source: ErrorSource;          // Enum: see below
    details?: object;             // Additional context (no sensitive data)
  };
}

enum ErrorCode {
  // Client Errors (4xx)
  INVALID_REQUEST = 'INVALID_REQUEST',         // Malformed request body
  NOT_FOUND = 'NOT_FOUND',                     // Template/flow doesn't exist
  VALIDATION_ERROR = 'VALIDATION_ERROR',       // Schema validation failed
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',           // Exceeds maxFileSize
  INVALID_CONFIG = 'INVALID_CONFIG',           // Malformed GitHub URL/ref

  // Server Errors (5xx)
  GITHUB_ERROR = 'GITHUB_ERROR',               // GitHub API returned 5xx
  NETWORK_ERROR = 'NETWORK_ERROR',             // Connection failure
  PARSE_ERROR = 'PARSE_ERROR',                 // Invalid JSON syntax
  RATE_LIMITED = 'RATE_LIMITED',               // GitHub rate limit exceeded
  UNAUTHORIZED = 'UNAUTHORIZED',               // Invalid PAT
  INTERNAL_ERROR = 'INTERNAL_ERROR'            // Unexpected server error
}

enum ErrorSource {
  REQUEST = 'request',         // Client-side error
  GITHUB = 'github',           // GitHub API error
  VALIDATION = 'validation',   // Schema validation error
  CACHE = 'cache',             // Cache operation error
  CONFIG = 'config',           // Configuration error
  SERVER = 'server'            // Internal server error
}
```

### Example Error
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid template schema: missing required field 'metadata'",
    "source": "validation",
    "details": {
      "schemaErrors": [
        { "path": ".metadata", "message": "must have required property 'metadata'" }
      ]
    }
  }
}
```

---

## 7. Metrics Entity

### Purpose
Operational metrics for monitoring and observability.

### Fields
```typescript
interface Metrics {
  // Request Metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;

  // Cache Metrics
  cacheHits: number;
  cacheMisses: number;
  cacheEvictions: number;

  // GitHub Metrics
  githubRequests: number;
  githubErrors: number;
  github304Responses: number;       // Not Modified (ETag match)
  rateLimitRemaining: number;
  rateLimitReset: number;           // Unix timestamp

  // Performance Metrics
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;

  // Validation Metrics
  validationErrors: number;
  schemaViolations: Map<string, number>; // Error type → count
}
```

### Exposure
- GET `/metrics` endpoint (JSON format)
- Optional Prometheus format via `prom-client` library
- Metrics reset: Never (cumulative since server start)

---

## Relationships

```
FetchRequest --[constructs]--> FilePath
FilePath --[fetches from]--> GitHub Repository
GitHub Response --[validates against]--> Template Schema OR Flow Schema
Validated Data --[stores in]--> Cache Entry
Cache Entry --[formats as]--> MCP Response
Server Config --[configures]--> All Operations
Metrics --[tracks]--> All Operations
```

---

## Validation Summary

| Entity | Validator | Enforcement Point |
|--------|-----------|-------------------|
| FetchRequest | Express middleware + sanitizer.js | Request ingress |
| Template | AJV + templateSchema.json | After GitHub fetch |
| Flow | AJV + flowSchema.json | After GitHub fetch |
| ServerConfig | Config loader (Joi schema) | Server startup |
| Cache Entry | N/A (internal structure) | Cache service |
| MCP Response | N/A (always valid by construction) | Response formatter |

---

**Data Model Complete**: Ready for contract generation in Phase 1
