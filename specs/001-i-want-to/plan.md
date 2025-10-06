
# Implementation Plan: GitHub MCP Server for Template & Flow Retrieval

**Branch**: `001-i-want-to` | **Date**: 2025-10-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/sanghee/Desktop/project2/flowyprompt_mcp/specs/001-i-want-to/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
HTTP-based MCP server that fetches JSON templates and flow definitions from GitHub repositories using PAT authentication. Supports dynamic file path resolution (templates/{name}.json, flows/{name}.json), schema validation, ETag-based caching, and returns MCP-compatible JSON responses. Built with Node.js + Express following modular, layered architecture for security, performance, and extensibility.

## Technical Context
**Language/Version**: Node.js v18+ (LTS) with ES modules
**Primary Dependencies**: Express (HTTP server), AJV (JSON schema validation), node-fetch or native fetch (GitHub API), Redis or in-memory cache (caching layer)
**Storage**: In-memory cache (development), Redis (production) for template/flow caching with ETag support
**Testing**: Jest (unit/integration), Supertest (API contract tests), Nock (GitHub API mocking)
**Target Platform**: Linux/macOS server (Docker containerized), Node.js runtime
**Project Type**: Single project (backend API server)
**Performance Goals**: ≤2s cold fetch, ≤300ms cached fetch, ≤100ms JSON parsing, ≥10 concurrent requests
**Constraints**: <2.5s end-to-end latency, ≥85% test coverage, zero PAT exposure in logs/errors
**Scale/Scope**: Single MCP server instance, GitHub API rate limit aware, horizontally scalable via load balancer

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Modularity & Isolation (Principle I)
- [x] MCP components (fetching, validation, caching, transformation) are isolated - Layered architecture: Controller, Service, Schema, Formatter, Security
- [x] Protocol logic separated from application logic - Service layer handles GitHub, Controller handles HTTP
- [x] No tight coupling to GitHub API (extensible to other sources) - Service layer abstraction allows future GitLab/Bitbucket support

### Schema-First Validation (Principle II)
- [x] JSON schemas defined for all data structures - AJV schemas for templates (metadata, variables, results) and flows (nodes, edges)
- [x] Validation occurs before execution - Service layer validates fetched JSON before returning to controller
- [x] Clear error messages for invalid data - Structured error format: { code, message, source }

### Test-Driven Development (Principle III) - NON-NEGOTIABLE
- [x] Tests written before implementation - Contract tests with Supertest, unit tests with Jest, integration tests with Nock
- [x] Red-Green-Refactor cycle planned - Phase 1 creates failing contract tests, Phase 3 implements to pass
- [x] ≥85% coverage target for core logic - Jest coverage configured for src/ directory
- [x] Unit, integration, and schema validation tests planned - Full test suite in Phase 1 contracts

### Security-First Design (Principle IV)
- [x] No PAT exposure or logging - Security layer sanitizes logs, PAT stored in process.env.GITHUB_PAT
- [x] Remote data validation and sanitization planned - All GitHub responses validated/sanitized before parsing
- [x] HTTPS-only connections enforced - GitHub API client configured with https:// only
- [x] Secure credential storage (environment variables) - .env file with GITHUB_PAT, never committed

### Performance & Efficiency (Principle V)
- [x] Caching strategy defined (ETag/Last-Modified) - Redis/in-memory cache with ETag headers from GitHub
- [x] Async I/O for remote requests - Native fetch (async/await) for all GitHub API calls
- [x] Performance targets documented (≤2s cold, ≤300ms cached) - Documented in Technical Context
- [x] Parallel fetching support (≥10 templates) - Promise.all for concurrent requests, no blocking I/O

### User Experience Consistency (Principle VI)
- [x] Template structure consistency maintained - Response formatter ensures MCP-compatible output structure
- [x] Error message format defined ({ code, message, source }) - Documented in spec, implemented in error middleware
- [x] Accessibility requirements addressed - N/A for backend API (no UI)
- [x] Rendering performance considered for large flows - Streaming JSON responses for large payloads

### Code Quality & Maintainability (Principle VII)
- [x] Naming conventions and structure documented - Standard Node.js patterns, ESLint/Prettier configured
- [x] Documentation plan (README, API docs, changelog) - README with setup, OpenAPI spec for API, CHANGELOG.md
- [x] Declarative configuration preferred - Config loaded from .env and config.js, not hardcoded
- [x] Public method documentation planned - JSDoc comments for all exported functions/classes

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── controllers/
│   └── mcpController.js        # HTTP request handlers for /fetch endpoint
├── services/
│   ├── githubService.js        # GitHub API fetch logic
│   ├── cacheService.js         # ETag-based caching (in-memory/Redis)
│   └── validationService.js    # JSON schema validation with AJV
├── schemas/
│   ├── templateSchema.json     # Template JSON schema definition
│   └── flowSchema.json         # Flow JSON schema definition
├── formatters/
│   └── mcpFormatter.js         # Converts validated data to MCP format
├── security/
│   ├── authMiddleware.js       # JWT/Bearer token validation
│   └── sanitizer.js            # Input sanitization & PAT protection
├── config/
│   └── index.js                # Configuration loader (env vars, defaults)
├── utils/
│   ├── logger.js               # Structured logging (level, timestamp, context)
│   └── errorHandler.js         # Global error middleware with { code, message, source }
└── server.js                   # Express app initialization & routing

tests/
├── contract/
│   ├── fetch-template.test.js  # POST /fetch with type=template
│   └── fetch-flow.test.js      # POST /fetch with type=flow
├── integration/
│   ├── github-fetch.test.js    # GitHub API integration (mocked with Nock)
│   ├── caching.test.js         # ETag caching behavior
│   └── validation.test.js      # Schema validation failures
└── unit/
    ├── githubService.test.js   # GitHub service unit tests
    ├── validationService.test.js # AJV schema validation
    ├── mcpFormatter.test.js    # MCP response formatting
    └── sanitizer.test.js       # Input sanitization logic

.env.example                    # Example environment variables (no secrets)
package.json                    # Dependencies: express, ajv, jest, supertest, nock
jest.config.js                  # Jest configuration (coverage ≥85%)
.eslintrc.js                    # ESLint rules (Airbnb style)
.prettierrc                     # Prettier configuration
Dockerfile                      # Container image definition
docker-compose.yml              # Local development setup (Node + Redis)
README.md                       # Setup guide, API documentation, PAT usage
CHANGELOG.md                    # Version history
```

**Structure Decision**: Single project structure selected for backend API server. Layered architecture separates concerns: controllers (HTTP), services (business logic), schemas (validation), formatters (output transformation), security (auth/sanitization). Tests mirror src/ structure with contract/integration/unit divisions following TDD principles.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 artifacts:
  - **From contracts/fetch-endpoint.openapi.yaml**:
    - Contract test for POST /fetch (template type) [P]
    - Contract test for POST /fetch (flow type) [P]
    - Contract test for GET /health [P]
    - Contract test for GET /metrics [P]
  - **From data-model.md**:
    - Create JSON schemas (templateSchema.json, flowSchema.json) [P]
    - Validation service with AJV integration
    - Configuration loader with Joi validation
    - MCP formatter for response transformation
  - **From quickstart.md scenarios**:
    - Integration test: fetch template successfully
    - Integration test: fetch flow successfully
    - Integration test: cache hit (ETag revalidation)
    - Integration test: error handling (404, 401, 422, 429)
  - **From research.md decisions**:
    - GitHub service with retry logic (exponential backoff)
    - Cache service with in-memory/Redis support
    - Request deduplication (in-flight Promise cache)
    - Security middleware (PAT sanitization, input validation)

**Ordering Strategy**:
- **Phase 3.1 Setup**: Project init, npm dependencies, Docker config
- **Phase 3.2 Tests First (TDD)**: Contract tests + integration tests (must fail before implementation)
- **Phase 3.3 Core Implementation**:
  - Schemas → Validation service → GitHub service → Cache service → Formatter
  - Security layer (sanitizer, auth middleware)
  - Controllers (mcpController)
  - Error handling middleware
- **Phase 3.4 Integration**: Express server.js, routing, middleware stack
- **Phase 3.5 Polish**: Unit tests, linting config, documentation, performance validation

**Parallelization**:
- All contract tests can run in parallel [P] (different test files)
- Schema creation tasks are parallel [P] (different JSON files)
- Service implementations are sequential (githubService → cacheService → validationService due to dependencies)
- Unit tests are parallel per service [P]

**Estimated Output**: 35-40 numbered tasks in tasks.md

**Dependency Highlights**:
- Schemas block validation service
- GitHub service blocks cache service
- All services block controller implementation
- Contract tests block core implementation (TDD enforcement)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS - All 7 principles satisfied
- [x] Post-Design Constitution Check: PASS - Design maintains all constitutional principles
- [x] All NEEDS CLARIFICATION resolved - Addressed in research.md (10 decisions documented)
- [x] Complexity deviations documented - None (fully constitutional design)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
