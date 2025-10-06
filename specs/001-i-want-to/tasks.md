# Tasks: GitHub MCP Server for Template & Flow Retrieval

**Input**: Design documents from `/Users/sanghee/Desktop/project2/flowyprompt_mcp/specs/001-i-want-to/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Path Conventions
- **Single project structure**: `src/`, `tests/` at repository root
- All paths relative to `/Users/sanghee/Desktop/project2/flowyprompt_mcp/`

---

## Phase 3.1: Setup
- [x] **T001** Create project directory structure per plan.md (src/, tests/, config/)
- [x] **T002** Initialize Node.js project with package.json (name: github-mcp-server, version: 1.0.0, type: module)
- [x] **T003** Install core dependencies: express, ajv, dotenv
- [x] **T004** Install dev dependencies: jest, supertest, nock, eslint, prettier
- [x] **T005** [P] Create .env.example with required environment variables (GITHUB_REPO_URL, GITHUB_PAT, GITHUB_REF, PORT, NODE_ENV, CACHE_TYPE, MAX_FILE_SIZE)
- [x] **T006** [P] Create .gitignore (node_modules/, .env, coverage/, *.log)
- [x] **T007** [P] Configure ESLint (.eslintrc.js) with Airbnb style guide
- [x] **T008** [P] Configure Prettier (.prettierrc)
- [x] **T009** [P] Configure Jest (jest.config.js) with coverage ≥85% threshold
- [x] **T010** [P] Create Dockerfile for production deployment
- [x] **T011** [P] Create docker-compose.yml (Node.js service + Redis)

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (from contracts/fetch-endpoint.openapi.yaml)
- [x] **T012** [P] Contract test POST /fetch with type=template in tests/contract/fetch-template.test.js (validate request/response schema, 200 success, 400 invalid request, 404 not found)
- [x] **T013** [P] Contract test POST /fetch with type=flow in tests/contract/fetch-flow.test.js (validate flow structure, node/edge schemas)
- [x] **T014** [P] Contract test GET /health in tests/contract/health.test.js (validate health response format, github.connected field)
- [x] **T015** [P] Contract test GET /metrics in tests/contract/metrics.test.js (validate all metrics fields: requests, cache, github, performance, validation)

### Integration Tests (from quickstart.md scenarios)
- [x] **T016** [P] Integration test: fetch template successfully in tests/integration/fetch-template-success.test.js (mock GitHub API with Nock, verify ETag caching, latency <2s)
- [x] **T017** [P] Integration test: fetch flow successfully in tests/integration/fetch-flow-success.test.js (mock GitHub API, verify flow validation, custom ref parameter)
- [x] **T018** [P] Integration test: cache hit (ETag revalidation) in tests/integration/caching.test.js (first fetch → cache → second fetch returns cached, verify 304 Not Modified, latency <300ms)
- [x] **T019** [P] Integration test: template not found (404) in tests/integration/error-not-found.test.js (mock GitHub 404, verify error response format)
- [x] **T020** [P] Integration test: invalid GitHub PAT (401) in tests/integration/error-unauthorized.test.js (mock GitHub 401, verify PAT not exposed in error)
- [x] **T021** [P] Integration test: schema validation failure (422) in tests/integration/error-validation.test.js (fetch invalid template, verify AJV error details)
- [x] **T022** [P] Integration test: malformed request (400) in tests/integration/error-invalid-request.test.js (test invalid type, path traversal in name, missing fields)
- [x] **T023** [P] Integration test: rate limit exceeded (429) in tests/integration/error-rate-limit.test.js (mock GitHub 429, verify retry-after handling)

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### JSON Schemas (from data-model.md)
- [x] **T024** [P] Create Template JSON schema in src/schemas/templateSchema.json (metadata, variables, results fields with required constraints)
- [x] **T025** [P] Create Flow JSON schema in src/schemas/flowSchema.json (metadata, nodes, edges fields, validate node.id uniqueness, edge references, acyclic graph)

### Configuration & Utilities
- [x] **T026** Create config loader in src/config/index.js (load from .env, validate with Joi schema, export ServerConfig object)
- [x] **T027** Create structured logger in src/utils/logger.js (Winston JSON transport, levels: info/warn/error, sanitize PAT tokens, format: {level, timestamp, module, message, context})
- [x] **T028** Create error handler middleware in src/utils/errorHandler.js (catch all errors, format as McpErrorResponse with {code, message, source}, map HTTP status codes)

### Security Layer
- [x] **T029** [P] Create input sanitizer in src/security/sanitizer.js (sanitize FetchRequest fields, validate name pattern, prevent path traversal, redact PAT from logs)
- [x] **T030** [P] Create auth middleware in src/security/authMiddleware.js (optional Bearer token validation with JWT, skip if ENABLE_AUTH=false)

### Service Layer (sequential due to dependencies)
- [x] **T031** Create GitHub service in src/services/githubService.js (fetch from GitHub API with PAT auth, exponential backoff retry logic [3 attempts, 1s→2s→4s with ±20% jitter], parse ETag/Last-Modified headers, check Content-Length for 10MB limit, handle 404/401/429 errors)
- [x] **T032** Create cache service in src/services/cacheService.js (in-memory Map implementation, store CacheEntry {content, etag, lastModified, fetchedAt, ttl}, get/set/invalidate methods, ETag revalidation logic, 5min default TTL)
- [x] **T033** Create validation service in src/services/validationService.js (AJV validator with strict mode, load templateSchema.json and flowSchema.json, validate method returns {valid, errors}, collect all errors not just first)
- [x] **T034** Create MCP formatter in src/formatters/mcpFormatter.js (transform validated data to McpSuccessResponse format, include metadata {fetchedAt, latencyMs, source}, handle error formatting to McpErrorResponse)

### Request Deduplication (from research.md decision 2)
- [x] **T035** Add in-flight request tracking to githubService.js (Map keyed by ${type}:${name}, share Promise for duplicate concurrent requests, clear on completion)

### Controller Layer
- [x] **T036** Create MCP controller in src/controllers/fetchController.js (fetchResource handler: validate request → check cache → fetch from GitHub → validate schema → format response → return, track latency, handle all error codes)
- [x] **T037** Add health endpoint handler in src/controllers/healthController.js (getHealth: return {status, uptime, github: {connected, rateLimitRemaining}})
- [x] **T038** Add metrics endpoint handler in src/controllers/metricsController.js and create metricsService.js (getMetrics: return cumulative stats from all services, calculate cache hit rate, p95/p99 latency)

---

## Phase 3.4: Integration

### Express Server Setup
- [x] **T039** Create Express app in src/server.js (initialize express, apply helmet, compression, express.json middleware with 1MB limit, CORS, morgan HTTP logging)
- [x] **T040** Add routing to server.js (POST /fetch → fetchController, GET /health → healthController, GET /metrics → metricsController)
- [x] **T041** Add global error handler to server.js (use errorHandler middleware, catch async errors with express-async-errors)
- [x] **T042** Add server startup logic to server.js (load config, connect to Redis if CACHE_TYPE=redis, log startup message with port/github repo, export app for testing)
- [x] **T043** Create index.js entry point (import server.js, listen on PORT, handle SIGTERM/SIGINT for graceful shutdown)

### Metrics Tracking
- [x] **T044** Add metrics collection to githubService.js (increment githubRequests, githubErrors, github304Responses, track rateLimitRemaining/Reset from headers) - integrated via metricsService
- [x] **T045** Add metrics collection to cacheService.js (increment cacheHits, cacheMisses, cacheEvictions, calculate hitRate) - integrated via metricsService
- [x] **T046** Add metrics collection to validationService.js (increment validationErrors, track schemaViolations by error type) - integrated via metricsService
- [x] **T047** Add latency tracking to fetchController.js (measure request start/end, update averageLatencyMs, p95LatencyMs, p99LatencyMs using percentile library) - implemented in metricsService

---

## Phase 3.5: Polish

### Unit Tests (parallel per service)
- [ ] **T048** [P] Unit tests for githubService.js in tests/unit/githubService.test.js (test retry logic, backoff calculation, ETag handling, error mapping, file size limit enforcement)
- [ ] **T049** [P] Unit tests for cacheService.js in tests/unit/cacheService.test.js (test get/set/invalidate, TTL expiration, ETag revalidation, cache key format)
- [ ] **T050** [P] Unit tests for validationService.js in tests/unit/validationService.test.js (test template schema validation, flow schema validation, error collection, invalid data rejection)
- [ ] **T051** [P] Unit tests for mcpFormatter.js in tests/unit/mcpFormatter.test.js (test success response formatting, error response formatting, metadata inclusion)
- [ ] **T052** [P] Unit tests for sanitizer.js in tests/unit/sanitizer.test.js (test name validation, path traversal prevention, PAT redaction, request sanitization)
- [ ] **T053** [P] Unit tests for config loader in tests/unit/config.test.js (test env var loading, default values, validation errors, missing required fields)

### Documentation
- [ ] **T054** [P] Create README.md (setup instructions, environment variables table, API endpoints, GitHub PAT permissions, Docker setup, quickstart example)
- [ ] **T055** [P] Create CHANGELOG.md (version 1.0.0 initial release notes)
- [ ] **T056** [P] Add JSDoc comments to all public methods in services, controllers, formatters (document parameters, return types, throws)

### Performance Validation
- [ ] **T057** Create performance test script in tests/performance/load-test.js (use autocannon, 20 concurrent connections, 30 second duration, target POST /fetch, verify ≥50 req/sec, p95 <2s, 0% errors)
- [ ] **T058** Run performance tests and verify constitutional targets (cold fetch ≤2s, cached fetch ≤300ms, parsing ≤100ms, end-to-end ≤2.5s)

### Quickstart Validation
- [ ] **T059** Execute all 8 quickstart.md scenarios manually (verify each scenario produces expected responses, check logs for PAT leakage, validate metrics endpoint)
- [ ] **T060** Verify TDD compliance (ensure all tests were written before implementation, check git history for test-first commits, validate ≥85% coverage with `npm run test:coverage`)

---

## Dependencies

### Setup Dependencies
- T001-T011 must complete before any other phase

### Test Phase Dependencies
- T012-T023 (all tests) must complete and FAIL before T024 (first implementation task)
- Tests are independent, can run in parallel

### Core Implementation Dependencies
- T024, T025 (schemas) block T033 (validationService)
- T026 (config) blocks T042 (server startup)
- T027 (logger) blocks all services
- T028 (errorHandler) blocks T041 (global error handling)
- T031 (githubService) blocks T032 (cacheService) - cache wraps GitHub calls
- T031, T032, T033 block T036 (mcpController) - controller uses all services
- T029, T030 (security) block T036 (controller uses sanitizer/auth)
- T034 (formatter) blocks T036 (controller uses formatter)

### Integration Dependencies
- T024-T038 (all core) must complete before T039 (Express setup)
- T039-T042 are sequential (server setup order matters)
- T044-T047 (metrics) can happen after respective services exist

### Polish Dependencies
- T048-T053 (unit tests) require respective implementation complete
- T054-T056 (docs) can happen anytime after implementation
- T057-T058 (performance) require T043 (server running)
- T059-T060 (validation) require all implementation complete

---

## Parallel Execution Examples

### Setup Phase (T005-T011 in parallel)
```bash
# All configuration files are independent:
Task: "Create .env.example with required environment variables"
Task: "Create .gitignore"
Task: "Configure ESLint (.eslintrc.js)"
Task: "Configure Prettier (.prettierrc)"
Task: "Configure Jest (jest.config.js)"
Task: "Create Dockerfile"
Task: "Create docker-compose.yml"
```

### Contract Tests (T012-T015 in parallel)
```bash
# Different test files, no dependencies:
Task: "Contract test POST /fetch with type=template in tests/contract/fetch-template.test.js"
Task: "Contract test POST /fetch with type=flow in tests/contract/fetch-flow.test.js"
Task: "Contract test GET /health in tests/contract/health.test.js"
Task: "Contract test GET /metrics in tests/contract/metrics.test.js"
```

### Integration Tests (T016-T023 in parallel)
```bash
# Independent scenarios, different test files:
Task: "Integration test: fetch template successfully in tests/integration/fetch-template-success.test.js"
Task: "Integration test: fetch flow successfully in tests/integration/fetch-flow-success.test.js"
Task: "Integration test: cache hit (ETag revalidation) in tests/integration/caching.test.js"
Task: "Integration test: template not found (404) in tests/integration/error-not-found.test.js"
Task: "Integration test: invalid GitHub PAT (401) in tests/integration/error-unauthorized.test.js"
Task: "Integration test: schema validation failure (422) in tests/integration/error-validation.test.js"
Task: "Integration test: malformed request (400) in tests/integration/error-invalid-request.test.js"
Task: "Integration test: rate limit exceeded (429) in tests/integration/error-rate-limit.test.js"
```

### Schemas (T024-T025 in parallel)
```bash
# Different JSON files:
Task: "Create Template JSON schema in src/schemas/templateSchema.json"
Task: "Create Flow JSON schema in src/schemas/flowSchema.json"
```

### Security Layer (T029-T030 in parallel)
```bash
# Different files, independent:
Task: "Create input sanitizer in src/security/sanitizer.js"
Task: "Create auth middleware in src/security/authMiddleware.js"
```

### Unit Tests (T048-T053 in parallel)
```bash
# Different test files per service:
Task: "Unit tests for githubService.js in tests/unit/githubService.test.js"
Task: "Unit tests for cacheService.js in tests/unit/cacheService.test.js"
Task: "Unit tests for validationService.js in tests/unit/validationService.test.js"
Task: "Unit tests for mcpFormatter.js in tests/unit/mcpFormatter.test.js"
Task: "Unit tests for sanitizer.js in tests/unit/sanitizer.test.js"
Task: "Unit tests for config loader in tests/unit/config.test.js"
```

### Documentation (T054-T056 in parallel)
```bash
# Independent doc files:
Task: "Create README.md"
Task: "Create CHANGELOG.md"
Task: "Add JSDoc comments to all public methods"
```

---

## Task Execution Notes

### TDD Enforcement
- **Phase 3.2 MUST complete before Phase 3.3**
- Run `npm test` after T012-T023 to verify all tests fail
- Do NOT proceed to implementation if tests pass prematurely
- After each implementation task, run tests to verify they pass

### Commit Strategy
- Commit after each task completion
- Use conventional commits format: `feat(task): T### description`
- Example: `feat(task): T024 create template JSON schema`

### Testing Commands
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test tests/contract/fetch-template.test.js

# Run integration tests only
npm test tests/integration/

# Run unit tests only
npm test tests/unit/
```

### Verification Checklist
- [ ] All contract endpoints have tests (4 contract tests)
- [ ] All quickstart scenarios have integration tests (8 scenarios)
- [ ] All services have unit tests (6 service unit tests)
- [ ] All tests written before implementation (TDD)
- [ ] Test coverage ≥85%
- [ ] Performance targets met (≤2s cold, ≤300ms cached)
- [ ] No PAT exposure in logs or errors
- [ ] All constitutional principles satisfied

---

## Summary

**Total Tasks**: 60
- **Phase 3.1 Setup**: 11 tasks (7 parallel)
- **Phase 3.2 Tests**: 12 tasks (all parallel)
- **Phase 3.3 Core**: 12 tasks (sequential with some parallelization)
- **Phase 3.4 Integration**: 9 tasks (mostly sequential)
- **Phase 3.5 Polish**: 13 tasks (10 parallel)
- **Validation**: 3 tasks

**Parallel Tasks**: 35 tasks marked [P] (58% parallelizable)

**Estimated Completion Time**:
- Sequential path: ~40 tasks × 30min avg = 20 hours
- With parallelization: ~15-18 hours (3 agents working concurrently)

**Constitutional Compliance**:
- ✅ TDD enforced (tests before implementation)
- ✅ Modularity (layered architecture)
- ✅ Schema validation (AJV with JSON schemas)
- ✅ Security first (PAT protection, input sanitization)
- ✅ Performance targets (caching, async I/O)
- ✅ Test coverage (≥85% requirement)
- ✅ Code quality (ESLint, Prettier, JSDoc)

---
**Tasks Ready for Execution**: Proceed with T001
