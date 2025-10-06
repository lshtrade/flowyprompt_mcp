# Quickstart: GitHub MCP Server

## Purpose
This document provides step-by-step verification scenarios for the GitHub MCP Server. Each scenario validates a key user story from the feature specification and serves as both documentation and integration test guidance.

---

## Prerequisites

### 1. Environment Setup
```bash
# Clone repository
git clone https://github.com/flowyprompt/mcp-server.git
cd mcp-server

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

### 2. Configure Environment Variables
Edit `.env`:
```env
# GitHub Configuration (REQUIRED)
GITHUB_REPO_URL=https://github.com/flowyprompt/templates
GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_REF=main

# Server Configuration
PORT=3000
NODE_ENV=development

# Cache Configuration
CACHE_TYPE=memory
CACHE_TTL_MS=300000

# Security (optional for development)
ENABLE_AUTH=false
JWT_SECRET=dev-secret-key

# Performance
MAX_FILE_SIZE=10485760
MAX_CONCURRENT_REQUESTS=20
RETRY_ATTEMPTS=3
```

### 3. Prepare Test Repository
Create GitHub repository with test files:
```
flowyprompt/templates/
├── templates/
│   ├── Brand_Positioning_Strategy.json
│   └── Simple_Prompt.json
└── flows/
    ├── Flow1.json
    └── Marketing_Workflow.json
```

### 4. Start Server
```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start

# Expected output:
# [INFO] Server starting...
# [INFO] GitHub connected: https://github.com/flowyprompt/templates (ref: main)
# [INFO] Cache type: memory
# [INFO] Server listening on http://0.0.0.0:3000
```

---

## Scenario 1: Fetch Template Successfully

### User Story
As a FlowyPrompt user, I want to fetch a template by name so that I can use it in my workflow.

### Steps
```bash
# 1. Make fetch request
curl -X POST http://localhost:3000/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "type": "template",
    "name": "Brand_Positioning_Strategy"
  }'
```

### Expected Response
```json
{
  "status": "success",
  "data": {
    "type": "template",
    "name": "Brand_Positioning_Strategy",
    "ref": "main",
    "content": {
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
        }
      ],
      "results": [
        {
          "section": "positioning_statement",
          "content": "...",
          "format": "markdown"
        }
      ]
    },
    "cached": false,
    "etag": "W/\"abc123\""
  },
  "metadata": {
    "fetchedAt": 1696502400000,
    "latencyMs": 342,
    "source": "github"
  }
}
```

### Validation Checklist
- [ ] Response status is 200
- [ ] `status` field equals "success"
- [ ] `data.type` equals "template"
- [ ] `data.name` matches request
- [ ] `data.content.metadata.name` exists
- [ ] `data.content.variables` is array
- [ ] `data.content.results` is array
- [ ] `data.cached` equals false (first fetch)
- [ ] `metadata.latencyMs` < 2000 (cold fetch target)
- [ ] `metadata.source` equals "github"

---

## Scenario 2: Fetch Flow Successfully

### User Story
As a FlowyPrompt user, I want to fetch a flow by name so that I can execute a workflow.

### Steps
```bash
# 1. Make fetch request with specific Git ref
curl -X POST http://localhost:3000/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "type": "flow",
    "name": "Flow1",
    "ref": "v1.0.0"
  }'
```

### Expected Response
```json
{
  "status": "success",
  "data": {
    "type": "flow",
    "name": "Flow1",
    "ref": "v1.0.0",
    "content": {
      "metadata": {
        "name": "Simple Content Flow",
        "version": "1.0.0",
        "description": "Input → Template → Result"
      },
      "nodes": [
        { "id": "input_1", "type": "input", "label": "User Input", "config": {} },
        { "id": "template_1", "type": "template", "label": "Process", "config": {} },
        { "id": "result_1", "type": "result", "label": "Output", "config": {} }
      ],
      "edges": [
        { "source": "input_1", "target": "template_1" },
        { "source": "template_1", "target": "result_1" }
      ]
    },
    "cached": false,
    "etag": "W/\"def456\""
  },
  "metadata": {
    "fetchedAt": 1696502401000,
    "latencyMs": 298,
    "source": "github"
  }
}
```

### Validation Checklist
- [ ] Response status is 200
- [ ] `data.type` equals "flow"
- [ ] `data.ref` equals "v1.0.0" (custom ref used)
- [ ] `data.content.nodes` has at least 1 node
- [ ] `data.content.edges` is array
- [ ] All `edges[].source` and `edges[].target` reference existing `nodes[].id`
- [ ] At least one node with `type="input"` exists
- [ ] No circular dependencies in edges

---

## Scenario 3: Cache Hit (ETag Revalidation)

### User Story
As a FlowyPrompt user, I want previously fetched templates to load instantly from cache when unchanged.

### Steps
```bash
# 1. First fetch (populates cache)
curl -X POST http://localhost:3000/fetch \
  -H "Content-Type: application/json" \
  -d '{"type": "template", "name": "Simple_Prompt"}'

# 2. Second fetch (cache hit, ETag revalidation)
curl -X POST http://localhost:3000/fetch \
  -H "Content-Type: application/json" \
  -d '{"type": "template", "name": "Simple_Prompt"}'
```

### Expected Response (Second Request)
```json
{
  "status": "success",
  "data": {
    "type": "template",
    "name": "Simple_Prompt",
    "ref": "main",
    "content": { /* ... same as first fetch ... */ },
    "cached": true,
    "etag": "W/\"abc123\""
  },
  "metadata": {
    "fetchedAt": 1696502402000,
    "latencyMs": 45,
    "source": "cache"
  }
}
```

### Validation Checklist
- [ ] Second request returns 200
- [ ] `data.cached` equals true
- [ ] `metadata.source` equals "cache"
- [ ] `metadata.latencyMs` < 300 (cached fetch target)
- [ ] Server logs show "Cache hit (ETag match)" or "Cache hit (TTL valid)"
- [ ] GitHub API was NOT called (check metrics: `/metrics` should show `github.notModified` incremented)

---

## Scenario 4: Template Not Found Error

### User Story
As a FlowyPrompt user, I want clear error messages when requesting non-existent templates.

### Steps
```bash
curl -X POST http://localhost:3000/fetch \
  -H "Content-Type: application/json" \
  -d '{
    "type": "template",
    "name": "NonExistentTemplate"
  }'
```

### Expected Response
```json
{
  "status": "error",
  "error": {
    "code": "NOT_FOUND",
    "message": "Template 'NonExistentTemplate' not found",
    "source": "github"
  }
}
```

### Validation Checklist
- [ ] Response status is 404
- [ ] `status` field equals "error"
- [ ] `error.code` equals "NOT_FOUND"
- [ ] `error.message` contains the requested name
- [ ] `error.source` equals "github"
- [ ] No `error.details` (no sensitive GitHub API details exposed)

---

## Scenario 5: Invalid GitHub PAT

### User Story
As a FlowyPrompt administrator, I want clear error messages when GitHub authentication fails without exposing the PAT.

### Steps
```bash
# 1. Stop server
# 2. Edit .env: Set GITHUB_PAT=invalid_token
# 3. Restart server
npm start

# 4. Make fetch request
curl -X POST http://localhost:3000/fetch \
  -H "Content-Type: application/json" \
  -d '{"type": "template", "name": "Brand_Positioning_Strategy"}'
```

### Expected Response
```json
{
  "status": "error",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "GitHub authentication failed",
    "source": "github"
  }
}
```

### Validation Checklist
- [ ] Response status is 401
- [ ] `error.code` equals "UNAUTHORIZED"
- [ ] `error.message` does NOT contain PAT value
- [ ] Server logs do NOT contain PAT value (check with `grep -r "ghp_" logs/` → no results)

---

## Scenario 6: Schema Validation Failure

### User Story
As a FlowyPrompt user, I want to be notified when fetched templates have invalid structure.

### Steps
```bash
# 1. Prepare test: Create invalid template in GitHub repo
# templates/Invalid_Template.json:
{
  "variables": [],  # Missing required "metadata" field
  "results": []
}

# 2. Fetch invalid template
curl -X POST http://localhost:3000/fetch \
  -H "Content-Type: application/json" \
  -d '{"type": "template", "name": "Invalid_Template"}'
```

### Expected Response
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid template schema: missing required field 'metadata'",
    "source": "validation",
    "details": {
      "schemaErrors": [
        {
          "path": ".metadata",
          "message": "must have required property 'metadata'"
        }
      ]
    }
  }
}
```

### Validation Checklist
- [ ] Response status is 422
- [ ] `error.code` equals "VALIDATION_ERROR"
- [ ] `error.source` equals "validation"
- [ ] `error.details.schemaErrors` is array
- [ ] `error.details.schemaErrors[0].path` indicates missing field
- [ ] Invalid template NOT stored in cache

---

## Scenario 7: Malformed Request

### User Story
As a FlowyPrompt user, I want helpful error messages when sending invalid requests.

### Steps
```bash
# Test 1: Invalid type
curl -X POST http://localhost:3000/fetch \
  -H "Content-Type: application/json" \
  -d '{"type": "invalid", "name": "Test"}'

# Test 2: Invalid name (path traversal attempt)
curl -X POST http://localhost:3000/fetch \
  -H "Content-Type: application/json" \
  -d '{"type": "template", "name": "../../../etc/passwd"}'

# Test 3: Missing required field
curl -X POST http://localhost:3000/fetch \
  -H "Content-Type: application/json" \
  -d '{"type": "template"}'
```

### Expected Responses

**Test 1 (Invalid type):**
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid type: must be 'template' or 'flow'",
    "source": "request"
  }
}
```

**Test 2 (Path traversal):**
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid name: must match pattern [a-zA-Z0-9_-]+",
    "source": "request"
  }
}
```

**Test 3 (Missing field):**
```json
{
  "status": "error",
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing required field: name",
    "source": "request"
  }
}
```

### Validation Checklist
- [ ] All responses return 400
- [ ] `error.code` equals "INVALID_REQUEST"
- [ ] `error.source` equals "request"
- [ ] Error messages are descriptive
- [ ] Server does NOT attempt GitHub fetch for invalid requests

---

## Scenario 8: Health Check & Metrics

### User Story
As a DevOps engineer, I want to monitor server health and operational metrics.

### Steps
```bash
# 1. Check health
curl http://localhost:3000/health

# 2. Get metrics
curl http://localhost:3000/metrics
```

### Expected Responses

**Health Check:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "github": {
    "connected": true,
    "rateLimitRemaining": 4987
  }
}
```

**Metrics:**
```json
{
  "requests": {
    "total": 42,
    "successful": 38,
    "failed": 4
  },
  "cache": {
    "hits": 25,
    "misses": 13,
    "evictions": 0,
    "hitRate": 0.658
  },
  "github": {
    "requests": 13,
    "errors": 1,
    "notModified": 7,
    "rateLimitRemaining": 4987,
    "rateLimitReset": 1696506000
  },
  "performance": {
    "averageLatencyMs": 156,
    "p95LatencyMs": 890,
    "p99LatencyMs": 1420
  },
  "validation": {
    "errors": 2,
    "schemaViolations": {
      "MISSING_METADATA": 1,
      "INVALID_VERSION": 1
    }
  }
}
```

### Validation Checklist
- [ ] `/health` returns 200
- [ ] `/metrics` returns 200
- [ ] `github.connected` is true
- [ ] `cache.hitRate` is between 0-1
- [ ] `performance.p95LatencyMs` < 2000 (constitutional target)
- [ ] All metrics are cumulative (never reset)

---

## Performance Validation

### Load Test (Concurrent Requests)
```bash
# Install load testing tool
npm install -g autocannon

# Run load test: 20 concurrent connections for 30 seconds
autocannon -c 20 -d 30 \
  -m POST \
  -H "Content-Type: application/json" \
  -b '{"type":"template","name":"Brand_Positioning_Strategy"}' \
  http://localhost:3000/fetch
```

### Expected Results
- **Requests/sec**: ≥50 (target: system handles 20 concurrent without queueing)
- **Latency (avg)**: <300ms (cached requests)
- **Latency (p95)**: <2000ms (cold requests)
- **Errors**: 0% (all requests succeed)

---

## Cleanup & Teardown
```bash
# Stop server
# Ctrl+C or:
npm run stop

# Clear cache (if using Redis)
redis-cli FLUSHDB

# Remove test data
rm -rf node_modules
rm .env
```

---

## Integration Test Mapping

These scenarios map to integration test files:

| Scenario | Test File | Assertion Count |
|----------|-----------|-----------------|
| 1. Fetch Template | `tests/integration/fetch-template.test.js` | 10 |
| 2. Fetch Flow | `tests/integration/fetch-flow.test.js` | 8 |
| 3. Cache Hit | `tests/integration/caching.test.js` | 6 |
| 4. Not Found | `tests/integration/error-handling.test.js` | 5 |
| 5. Invalid PAT | `tests/integration/auth-errors.test.js` | 4 |
| 6. Validation Failure | `tests/integration/validation.test.js` | 6 |
| 7. Malformed Request | `tests/integration/request-validation.test.js` | 9 |
| 8. Health & Metrics | `tests/integration/system-endpoints.test.js` | 10 |

**Total Integration Tests**: 8 files, 58 assertions

---

**Quickstart Complete**: All scenarios executable and documented for Phase 1 validation
