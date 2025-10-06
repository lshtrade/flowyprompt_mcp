# Research: GitHub MCP Server Technical Decisions

## Overview
This document consolidates research findings for implementing the GitHub MCP Server. All technical decisions are based on constitutional principles, performance requirements, and ecosystem best practices.

---

## 1. Network Retry Policy for GitHub API Calls

### Decision
Implement exponential backoff with jitter for GitHub API failures:
- **Max attempts**: 3 retries
- **Base delay**: 1000ms
- **Backoff multiplier**: 2 (1s → 2s → 4s)
- **Jitter**: ±20% random variation to prevent thundering herd
- **Retry conditions**: Network errors (ECONNRESET, ETIMEDOUT), 5xx GitHub errors, rate limit (429)
- **No retry**: 4xx client errors (except 429), 401/403 (auth failures)

### Rationale
- GitHub API Best Practices recommend exponential backoff for rate limiting
- Jitter prevents synchronized retry storms from multiple clients
- 3 retries balance reliability vs latency (max 7s total with backoff)
- Aligns with Performance Principle V (≤2s cold fetch target requires fast failure)

### Alternatives Considered
- **Linear backoff**: Rejected - less effective for bursty load, predictable retry patterns
- **Unlimited retries**: Rejected - violates latency constraints, can cause cascading failures
- **Circuit breaker pattern**: Deferred - adds complexity, will implement if production metrics show need

### Implementation Notes
```javascript
// Pseudocode structure
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || !isRetryable(response.status)) return response;
      if (attempt < maxRetries) await backoff(attempt);
    } catch (error) {
      if (!isNetworkError(error) || attempt === maxRetries) throw error;
      await backoff(attempt);
    }
  }
}

function backoff(attempt) {
  const baseDelay = 1000;
  const jitter = 0.2; // ±20%
  const delay = baseDelay * Math.pow(2, attempt) * (1 + (Math.random() * 2 - 1) * jitter);
  return new Promise(resolve => setTimeout(resolve, delay));
}
```

---

## 2. Concurrency Handling for Duplicate Requests

### Decision
Implement **request deduplication** with in-flight tracking:
- Same resource (type + name) requested concurrently → share single GitHub fetch
- Use Promise cache keyed by `${type}:${name}`
- First request triggers fetch, subsequent requests await same Promise
- Cache cleared on completion (success or failure)
- No locking required (JavaScript event loop is single-threaded)

### Rationale
- Prevents redundant GitHub API calls when users spam refresh
- Reduces API rate limit consumption
- Simpler than queueing, no artificial request delays
- Aligns with Performance Principle V (efficient use of remote requests)

### Alternatives Considered
- **Queue sequential requests**: Rejected - adds unnecessary latency for independent resources
- **Serve all in parallel**: Rejected - wastes API quota, increases load
- **Lock-based synchronization**: Rejected - unnecessary complexity in Node.js event loop

### Implementation Notes
```javascript
// In-flight request cache
const inflightRequests = new Map();

async function fetchTemplate(type, name) {
  const key = `${type}:${name}`;

  if (inflightRequests.has(key)) {
    return inflightRequests.get(key); // Reuse existing Promise
  }

  const fetchPromise = githubService.fetch(type, name)
    .finally(() => inflightRequests.delete(key));

  inflightRequests.set(key, fetchPromise);
  return fetchPromise;
}
```

---

## 3. Maximum File Size Limit for Templates/Flows

### Decision
- **Hard limit**: 10 MB per JSON file
- **Soft warning**: 1 MB (log warning, still process)
- **Enforcement**: Check Content-Length header before download, abort if exceeded
- **Error response**: `{ code: "FILE_TOO_LARGE", message: "Template exceeds 10MB limit", source: "github" }`

### Rationale
- GitHub file size limit is 100MB, but JSON templates should be far smaller
- 10MB accommodates large flow definitions (1000+ nodes) with metadata
- 1MB soft limit catches abnormally large templates for monitoring
- Prevents memory exhaustion from malicious/misconfigured repositories
- Aligns with Performance Principle V (efficient memory management)

### Alternatives Considered
- **No limit**: Rejected - exposes server to DoS via large files
- **1MB hard limit**: Rejected - too restrictive for complex flows
- **Streaming validation**: Deferred - adds complexity, most templates <100KB

### Implementation Notes
```javascript
async function fetchFromGitHub(url) {
  const response = await fetch(url, { method: 'HEAD' });
  const contentLength = parseInt(response.headers.get('content-length'), 10);

  const maxSize = 10 * 1024 * 1024; // 10MB
  const warnSize = 1 * 1024 * 1024; // 1MB

  if (contentLength > maxSize) {
    throw new Error('FILE_TOO_LARGE');
  }

  if (contentLength > warnSize) {
    logger.warn(`Large file detected: ${contentLength} bytes`, { url });
  }

  return fetch(url); // Proceed with GET
}
```

---

## 4. Minimum Concurrent Request Support

### Decision
**Target**: Support ≥20 concurrent requests per server instance
- **Rationale**: Constitutional minimum is 10, targeting 2x headroom
- **No artificial limits**: Node.js event loop handles concurrency naturally
- **Load testing required**: Validate target under Phase 5

### Alternatives Considered
- **Exactly 10**: Rejected - no safety margin for production spikes
- **50+**: Rejected - requires horizontal scaling discussion, premature optimization

---

## 5. GitHub API Rate Limit Handling

### Decision
**Proactive strategy**:
- **Check remaining quota**: Parse `X-RateLimit-Remaining` header on every response
- **Queue when low**: If remaining < 10, delay new requests until reset time
- **Retry 429 errors**: Use `Retry-After` header or `X-RateLimit-Reset` timestamp
- **Metrics exposure**: Track quota usage, expose via /metrics endpoint

**Reactive strategy**:
- On 429 response → calculate delay until `X-RateLimit-Reset`
- Queue request with exponential backoff (max 60s)
- Return `{ code: "RATE_LIMITED", message: "GitHub API rate limit exceeded, retry after {time}", source: "github" }`

### Rationale
- GitHub API rate limit: 5,000 requests/hour for authenticated requests (PAT)
- Proactive check prevents hitting limit unexpectedly
- Queuing maintains availability during rate limit periods
- Aligns with Performance Principle V (graceful degradation under load)

### Implementation Notes
```javascript
let rateLimitRemaining = 5000;
let rateLimitReset = Date.now();

async function checkRateLimit() {
  if (rateLimitRemaining < 10 && Date.now() < rateLimitReset) {
    const delayMs = rateLimitReset - Date.now();
    logger.warn(`Rate limit low, delaying ${delayMs}ms`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

function updateRateLimitFromResponse(response) {
  rateLimitRemaining = parseInt(response.headers.get('x-ratelimit-remaining'), 10);
  rateLimitReset = parseInt(response.headers.get('x-ratelimit-reset'), 10) * 1000;
}
```

---

## 6. Branch/Tag/Commit Reference Support

### Decision
**Supported reference types**:
- **Branch**: `main`, `develop`, `feature/xyz` (default: `main`)
- **Tag**: `v1.0.0`, `release-2024`
- **Commit SHA**: Full 40-character SHA (no short SHAs for security)

**Configuration**:
- Environment variable: `GITHUB_REF=main` (default)
- Per-request override: Optional `ref` field in fetch request body
- URL construction: `https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{type}/{name}.json`

### Rationale
- Enables version pinning (production uses `v1.0.0` tag, staging uses `main` branch)
- Commit SHAs provide immutable references for reproducibility
- Aligns with Principle I (extensible design for future Git providers)

### Alternatives Considered
- **Branch-only**: Rejected - no version pinning capability
- **Auto-detection**: Rejected - ambiguous, requires extra GitHub API calls

---

## 7. Cache Time-To-Live (TTL) Policy

### Decision
**Dynamic TTL based on GitHub response**:
- **With ETag**: Cache indefinitely, revalidate on every request (If-None-Match: ETag)
- **No ETag**: Cache for 5 minutes (default TTL)
- **Manual invalidation**: POST /admin/cache/invalidate endpoint (authenticated)

**Cache storage**:
- Development: In-memory Map (simple, no external deps)
- Production: Redis (persistence, multi-instance support)

### Rationale
- ETag-based caching is most efficient (304 Not Modified = no data transfer)
- 5-minute fallback prevents unbounded memory growth
- Manual invalidation allows emergency cache clearing
- Aligns with Performance Principle V (avoid redundant fetches)

### Implementation Notes
```javascript
// Cache entry structure
{
  content: { /* parsed JSON */ },
  etag: "W/\"abc123\"",
  fetchedAt: 1696502400000,
  ttl: 300000 // 5 minutes in ms
}

// Revalidation logic
async function fetchWithCache(type, name) {
  const cacheKey = `${type}:${name}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.etag) {
    // Revalidate with ETag
    const response = await fetch(url, {
      headers: { 'If-None-Match': cached.etag }
    });

    if (response.status === 304) {
      logger.info('Cache hit (ETag match)', { cacheKey });
      return cached.content;
    }
  } else if (cached && Date.now() - cached.fetchedAt < cached.ttl) {
    // TTL not expired
    logger.info('Cache hit (TTL valid)', { cacheKey });
    return cached.content;
  }

  // Cache miss or expired, fetch new data
  return fetchFreshData(type, name);
}
```

---

## 8. Node.js Best Practices for Express + MCP

### Decision
**Framework choices**:
- **Express 4.x**: Mature, well-documented, large ecosystem
- **Middleware stack**: helmet (security headers), compression (gzip), cors (cross-origin), morgan (HTTP logging)
- **ES modules**: Use `import/export` instead of `require()` (modern Node.js)
- **Async error handling**: express-async-errors package for cleaner async routes

**Why not alternatives**:
- Fastify: Faster but smaller ecosystem, less familiar to team
- Koa: Too minimalist, requires more boilerplate
- NestJS: Over-engineered for single-service API

### Implementation Pattern
```javascript
// src/server.js
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import 'express-async-errors'; // Auto-catches async errors

const app = express();

app.use(helmet()); // Security headers
app.use(compression()); // Gzip responses
app.use(express.json({ limit: '1mb' })); // JSON body parser

// Routes
app.post('/fetch', mcpController.fetchResource);

// Global error handler
app.use(errorHandler);

export default app;
```

---

## 9. AJV Schema Validation Configuration

### Decision
**AJV settings**:
- Strict mode: `strictSchema: false` (allow additional properties for extensibility)
- Remove additional: `false` (preserve extra fields, don't mutate input)
- Use defaults: `true` (apply schema defaults for optional fields)
- Coerce types: `false` (strict type checking, no implicit conversions)
- All errors: `true` (collect all validation errors, not just first)

### Rationale
- Extensibility: Templates may add custom metadata fields
- Non-destructive: Validation shouldn't modify original data
- Strict typing: Prevents subtle bugs from type coercion
- Complete error reporting: Users see all issues, not just first failure

---

## 10. Structured Logging Format

### Decision
Use Winston logger with JSON transport:
```json
{
  "level": "info",
  "timestamp": "2025-10-05T12:00:00.000Z",
  "module": "githubService",
  "message": "Template fetched successfully",
  "context": {
    "type": "template",
    "name": "Brand_Positioning_Strategy",
    "etag": "W/\"abc123\"",
    "duration_ms": 342
  }
}
```

**Sensitive data redaction**:
- PAT tokens: Replace with `***REDACTED***`
- GitHub URLs: Remove query params (may contain tokens)
- User emails: Hash or redact

---

## Summary of Decisions

| Area | Decision | Key Rationale |
|------|----------|---------------|
| Retry policy | 3 attempts, exponential backoff with jitter | Balance reliability vs latency |
| Concurrency | Request deduplication via Promise cache | Prevent redundant GitHub API calls |
| File size limit | 10MB hard, 1MB soft warning | Prevent DoS, accommodate complex flows |
| Concurrent requests | ≥20 per instance | 2x constitutional minimum |
| Rate limiting | Proactive quota check + reactive 429 handling | Graceful degradation |
| Git references | Branch/tag/commit with per-request override | Version pinning capability |
| Cache TTL | ETag revalidation + 5min fallback | Maximize cache efficiency |
| Framework | Express 4.x with helmet/compression | Maturity + security |
| Validation | AJV strict mode with extensibility | Balance strictness + flexibility |
| Logging | Winston JSON with sensitive data redaction | Production observability |

All decisions align with Constitutional Principles I-VII and performance requirements (≤2s cold, ≤300ms cached, ≥85% coverage).

---
**Research Complete**: Ready for Phase 1 (Design & Contracts)
