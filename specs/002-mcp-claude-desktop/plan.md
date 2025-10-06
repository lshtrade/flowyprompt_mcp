# Implementation Plan: MCP 프롬프트 템플릿 관리 시스템

**Branch**: `002-mcp-claude-desktop` | **Date**: 2025-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-mcp-claude-desktop/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded: 29 functional requirements, 6 acceptance scenarios, 7 entities
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ Detected: MCP server (single project), existing services reuse
   → ⚠️  3 pending clarifications (variable mismatch, cache TTL, max size)
3. Fill the Constitution Check section
   → ✅ All 7 principles evaluated for MCP transformation
4. Evaluate Constitution Check section
   → ✅ PASS - All principles satisfied with existing code reuse strategy
   → Update Progress Tracking: Initial Constitution Check ✅
5. Execute Phase 0 → research.md
   → IN PROGRESS
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → PENDING
7. Re-evaluate Constitution Check section
   → PENDING
8. Plan Phase 2 → Task generation approach
   → PENDING
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

**Primary Requirement**: Transform existing HTTP REST API server into MCP server for Claude Desktop integration, enabling dialog-based prompt template execution with automatic variable extraction and prompt generation.

**Technical Approach**: Reuse 65% of existing codebase (services: GitHub, Cache, Validation, Sanitizer, Logger) while replacing Express HTTP layer with MCP SDK stdio transport. Implement MCP Prompts API for template listing and execution.

**Key Transformation**:
- **Before**: HTTP REST API with /fetch, /health, /metrics endpoints
- **After**: MCP server with prompts.list() and prompts.get() tools for Claude Desktop

## Technical Context

**Language/Version**: Node.js 18.0.0+ (ES Modules)
**Primary Dependencies**:
- NEW: `@modelcontextprotocol/sdk` (MCP SDK for stdio transport)
- REUSE: `ajv` (JSON Schema validation), `winston` (logging), `joi` (config validation), `dotenv` (environment)

**Storage**: In-memory cache with ETag support (existing cacheService.js)
**Testing**: Jest 30.x + Supertest + Nock (70 existing tests, 50 reusable)
**Target Platform**: Claude Desktop via MCP stdio transport (Node.js process communication)
**Project Type**: Single (MCP server)
**Performance Goals**: ≤2s cold template fetch, ≤300ms cached response, ≤100ms prompt generation
**Constraints**:
- Reuse 65% of existing code (services, schemas, utilities)
- String-only variable types (simplified from multi-type support)
- MCP protocol compliance (stdio transport, Prompts API)
- No breaking changes to existing template JSON schemas

**Scale/Scope**: Single GitHub repository, ~50-100 templates, 1-5 concurrent Claude Desktop users

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Modularity & Isolation (Principle I)
- [x] MCP components (server, tool handlers) isolated from business logic
- [x] Protocol logic separated from application logic (MCP layer vs service layer)
- [x] No tight coupling to GitHub API (existing githubService abstraction maintained)
- **Status**: ✅ PASS - Existing modular architecture (controllers/services/schemas) fully compatible

### Schema-First Validation (Principle II)
- [x] JSON schemas defined for all data structures (existing templateSchema.json, flowSchema.json)
- [x] Validation occurs before execution (existing validationService.js)
- [x] Clear error messages for invalid data (existing MCP error format)
- **Status**: ✅ PASS - Existing schemas reusable, validation service unchanged

### Test-Driven Development (Principle III) - NON-NEGOTIABLE
- [x] Tests written before implementation (plan includes contract test creation first)
- [x] Red-Green-Refactor cycle planned (Phase 1 creates failing tests, Phase 4 implements)
- [x] ≥85% coverage target for core logic (existing 70 tests provide base, add MCP-specific tests)
- [x] Unit, integration, and schema validation tests planned
- **Status**: ✅ PASS - TDD workflow designed, 50 existing tests reusable

### Security-First Design (Principle IV)
- [x] No PAT exposure or logging (existing logger.js sanitizes PAT)
- [x] Remote data validation and sanitization planned (existing sanitizer.js)
- [x] HTTPS-only connections enforced (existing githubService.js enforces HTTPS)
- [x] Secure credential storage (environment variables via .env)
- **Status**: ✅ PASS - All security measures already implemented

### Performance & Efficiency (Principle V)
- [x] Caching strategy defined (existing ETag-based caching with revalidation)
- [x] Async I/O for remote requests (existing async/await throughout)
- [x] Performance targets documented (≤2s cold, ≤300ms cached)
- [x] Parallel fetching support (existing request deduplication in githubService)
- **Status**: ✅ PASS - Existing performance optimizations maintained

### User Experience Consistency (Principle VI)
- [x] Template structure consistency maintained (existing JSON schemas enforce structure)
- [x] Error message format defined (existing MCP format: `{code, message, source}`)
- [x] Accessibility requirements addressed (MCP protocol provides consistent CLI interface)
- [x] Rendering performance considered (prompt generation <100ms target)
- **Status**: ✅ PASS - MCP protocol ensures consistent UX in Claude Desktop

### Code Quality & Maintainability (Principle VII)
- [x] Naming conventions and structure documented (existing ESLint + Prettier config)
- [x] Documentation plan (update README for MCP usage, add quickstart.md)
- [x] Declarative configuration preferred (existing .env-based config)
- [x] Public method documentation planned (add JSDoc for MCP tool handlers)
- **Status**: ✅ PASS - Existing quality tools remain, add MCP-specific docs

## Project Structure

### Documentation (this feature)
```
specs/002-mcp-claude-desktop/
├── spec.md              # ✅ Feature specification (29 FR, 6 scenarios, 7 entities)
├── plan.md              # ⏳ This file (/plan command output)
├── research.md          # ⏳ Phase 0 output (MCP SDK best practices)
├── data-model.md        # ⏳ Phase 1 output (entities and relationships)
├── quickstart.md        # ⏳ Phase 1 output (Claude Desktop setup guide)
├── contracts/           # ⏳ Phase 1 output (MCP tool contracts)
│   ├── prompts-list.json    # List all templates
│   └── prompts-get.json     # Get template with variables
└── tasks.md             # ⏳ Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
src/
├── mcp/                         # ⏳ NEW - MCP server layer
│   ├── server.js                #    MCP SDK stdio server initialization
│   ├── tools/                   #    MCP tool handlers
│   │   ├── promptsList.js       #    Implement prompts.list() tool
│   │   └── promptsGet.js        #    Implement prompts.get() tool
│   └── formatters/              #    MCP response formatters
│       └── promptFormatter.js   #    Format prompts for Claude Desktop
│
├── services/                    # ✅ REUSE - Business logic (minimal changes)
│   ├── githubService.js         #    95% reuse (add template listing method)
│   ├── cacheService.js          #    100% reuse
│   ├── validationService.js     #    100% reuse
│   ├── metricsService.js        #    90% reuse (add MCP-specific metrics)
│   └── promptService.js         # ⏳ NEW - Variable extraction & prompt generation
│
├── schemas/                     # ✅ REUSE - JSON Schema validation
│   ├── templateSchema.json      #    100% reuse
│   └── flowSchema.json          #    100% reuse (for future flow support)
│
├── security/                    # ✅ REUSE - Security layer
│   └── sanitizer.js             #    100% reuse (input validation)
│
├── config/                      # ✅ REUSE - Configuration
│   └── index.js                 #    95% reuse (add MCP-specific config)
│
├── utils/                       # ✅ REUSE - Utilities
│   ├── logger.js                #    100% reuse
│   └── errorHandler.js          #    90% reuse (adapt for MCP error format)
│
├── controllers/                 # ⚠️  DEPRECATE - Express controllers (keep for reference)
│   ├── fetchController.js       #    Logic migrates to mcp/tools/
│   ├── healthController.js      #    Convert to MCP health check tool
│   └── metricsController.js     #    Convert to MCP metrics tool
│
└── server.js                    # ⚠️  REPLACE - Express server → MCP server

index.js                         # ⏳ UPDATE - Entry point (launch MCP server)

tests/
├── mcp/                         # ⏳ NEW - MCP protocol tests
│   ├── prompts-list.test.js     #    Contract test for prompts.list()
│   ├── prompts-get.test.js      #    Contract test for prompts.get()
│   └── stdio-transport.test.js  #    Integration test for stdio communication
│
├── contract/                    # ✅ REUSE - Template schema tests (25 tests)
│   ├── fetch-template.test.js   #    50% reusable (adapt assertions)
│   └── fetch-flow.test.js       #    50% reusable
│
├── integration/                 # ✅ REUSE - End-to-end scenarios (45 tests)
│   ├── github-*.test.js         #    80% reusable (mock MCP instead of HTTP)
│   ├── cache-*.test.js          #    100% reusable
│   └── validation-*.test.js     #    100% reusable
│
└── unit/                        # ✅ REUSE - Service unit tests
    ├── githubService.test.js    #    95% reusable
    ├── cacheService.test.js     #    100% reusable
    ├── validationService.test.js #   100% reusable
    └── promptService.test.js    # ⏳ NEW - Variable extraction tests
```

**Structure Decision**: Single project architecture maintained. Added `src/mcp/` layer for MCP-specific code while preserving existing `src/services/` business logic. Express HTTP layer (`src/controllers/`, `src/server.js`) will be deprecated but kept for reference during migration.

**Code Reuse Summary**:
- **Services**: 65% reuse (4 services unchanged, 1 new promptService.js)
- **Tests**: 70% reuse (50/70 existing tests adaptable)
- **Utilities**: 95% reuse (logger, sanitizer, errorHandler)
- **Schemas**: 100% reuse (templateSchema.json, flowSchema.json)
- **New Code**: MCP server layer (~500 LOC), promptService (~200 LOC), MCP tests (~300 LOC)

## Phase 0: Outline & Research

**Goal**: Research MCP SDK best practices and resolve 3 pending clarifications

### Research Tasks

1. **MCP SDK stdio transport implementation**
   - Decision needed: How to initialize MCP server with stdio transport
   - Research: `@modelcontextprotocol/sdk` documentation and examples
   - Output: Code patterns for server initialization and tool registration

2. **MCP Prompts API specification**
   - Decision needed: prompts.list() and prompts.get() tool signatures
   - Research: MCP protocol specification for Prompts API
   - Output: Tool input/output schemas and error handling patterns

3. **Template variable extraction strategy**
   - Decision needed: Regex vs AST parsing for {{variable}} extraction
   - Research: Best practices for placeholder extraction from strings
   - Output: Algorithm for extracting variables and validating against template definitions

4. **Prompt generation and formatting**
   - Decision needed: How to format generated prompts for Claude Desktop
   - Research: MCP message format and Claude Desktop prompt expectations
   - Output: Prompt formatting patterns (metadata + results sections)

5. **Clarification 1: Variable mismatch handling**
   - Decision needed: Warning vs Error vs Auto-add for undefined variables in content
   - Research: Template authoring best practices and error recovery strategies
   - **Recommended**: Option A (Warning) - Log mismatch but continue execution for flexibility
   - Output: Error handling strategy documented in research.md

6. **Clarification 2: Cache TTL policy**
   - Decision needed: Optimal TTL for template cache
   - Research: Template update frequency vs API rate limits
   - **Recommended**: 15 minutes (vs current 5 min) - Templates change infrequently
   - Output: Cache configuration documented in research.md

7. **Clarification 3: Max template size**
   - Decision needed: Practical template size limit
   - Research: Prompt token limits and JSON parsing performance
   - **Recommended**: 100KB (vs current 10MB) - Typical templates are 5-20KB
   - Output: Size limit validation documented in research.md

### Research Output Structure (research.md)

```markdown
# Research: MCP 프롬프트 템플릿 관리 시스템

## MCP SDK Implementation
**Decision**: Use @modelcontextprotocol/sdk with stdio transport
**Rationale**: Official SDK provides type-safe tool registration and automatic error handling
**Alternatives considered**: Custom stdio implementation (rejected - unnecessary complexity)
**Code pattern**: [Example server initialization code]

## Prompts API Design
**Decision**: Implement prompts.list() and prompts.get() tools
**Rationale**: MCP Prompts API standard for template management
**Tool signatures**: [JSON schemas for inputs/outputs]

## Variable Extraction
**Decision**: Regex-based extraction with validation
**Rationale**: Simple, fast, sufficient for {{variable}} pattern
**Algorithm**: [Pseudo-code for extraction and validation]

## Prompt Formatting
**Decision**: Metadata header + Results sections in markdown
**Rationale**: Claude Desktop renders markdown well, maintains structure
**Format**: [Example formatted prompt]

## Clarification Resolutions
1. **Variable mismatch**: WARNING (log but continue)
2. **Cache TTL**: 15 minutes (templates rarely change)
3. **Max template size**: 100KB (practical limit for prompts)
```

**Output**: `specs/002-mcp-claude-desktop/research.md` with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### 1. Data Model (`data-model.md`)

Extract 7 entities from spec.md and define relationships:

**Entities**:
1. **MCP Server**: stdio transport, tool registry, GitHub config
2. **GitHub Repository**: URL, PAT, ref (branch/tag/commit)
3. **Template**: metadata, variables[], results[], JSON schema compliance
4. **Variable**: name, type=string, description, required, default
5. **Result Section**: name, content (with {{placeholders}}), format
6. **Prompt**: generated text (metadata + variable-substituted results)
7. **Cache Entry**: key, content, ETag, TTL=15min

**Relationships**:
- MCP Server 1:1 GitHub Repository
- GitHub Repository 1:N Template
- Template 1:N Variable
- Template 1:N Result Section
- Template 1:N Prompt (generated per execution)
- Template 1:1 Cache Entry

**State Transitions**:
- Template: UNCACHED → CACHED → STALE → REVALIDATED
- Prompt: TEMPLATE_LOADED → VARIABLES_EXTRACTED → VALUES_PROVIDED → GENERATED

### 2. MCP Tool Contracts (`contracts/`)

**prompts-list.json** (OpenAPI-style contract for prompts.list tool):
```json
{
  "tool": "prompts.list",
  "description": "List all templates from GitHub repository",
  "input": {},
  "output": {
    "prompts": [
      {
        "name": "string",
        "description": "string",
        "version": "string (semver)",
        "tags": ["string"]
      }
    ]
  },
  "errors": [
    {"code": "GITHUB_AUTH_FAILED", "message": "GitHub PAT authentication failed"},
    {"code": "NETWORK_ERROR", "message": "Cannot connect to GitHub"}
  ]
}
```

**prompts-get.json** (Contract for prompts.get tool):
```json
{
  "tool": "prompts.get",
  "description": "Get template with variables and generate prompt",
  "input": {
    "name": "string (template name)",
    "arguments": {
      "variable_name": "string value"
    }
  },
  "output": {
    "messages": [
      {
        "role": "user",
        "content": "string (generated prompt)"
      }
    ]
  },
  "errors": [
    {"code": "TEMPLATE_NOT_FOUND", "message": "Template '{name}' not found"},
    {"code": "MISSING_REQUIRED_VARIABLE", "message": "Required variable '{name}' not provided"},
    {"code": "VALIDATION_ERROR", "message": "Template schema validation failed"}
  ]
}
```

### 3. Contract Tests (Failing Tests - TDD Red Phase)

**tests/mcp/prompts-list.test.js**:
```javascript
describe('MCP Tool: prompts.list', () => {
  test('should return list of templates with metadata', async () => {
    // Arrange: Mock GitHub API
    // Act: Call prompts.list()
    // Assert: Verify template list structure
    expect(result).toHaveProperty('prompts');
    expect(result.prompts[0]).toMatchSchema(promptListItemSchema);
  });

  test('should handle GitHub auth failure', async () => {
    // Assert: Error code = GITHUB_AUTH_FAILED
  });
});
```

**tests/mcp/prompts-get.test.js**:
```javascript
describe('MCP Tool: prompts.get', () => {
  test('should extract variables and generate prompt', async () => {
    // Arrange: Template with {{company_name}}, {{industry}}
    // Act: Call prompts.get with arguments
    // Assert: Variables substituted in output
  });

  test('should error on missing required variable', async () => {
    // Assert: Error code = MISSING_REQUIRED_VARIABLE
  });
});
```

### 4. Integration Test Scenarios (`quickstart.md`)

**Quickstart Guide for Claude Desktop Setup**:

```markdown
# MCP 프롬프트 템플릿 시스템 - 빠른 시작 가이드

## 1. MCP 서버 설치
\`\`\`bash
npm install
\`\`\`

## 2. GitHub 설정
\`\`\`bash
cp .env.example .env
# Edit .env:
# GITHUB_REPO_URL=https://github.com/your-org/templates
# GITHUB_PAT=ghp_your_token
\`\`\`

## 3. Claude Desktop 설정
`~/.config/claude/claude_desktop_config.json`:
\`\`\`json
{
  "mcpServers": {
    "flowyprompt": {
      "command": "node",
      "args": ["/path/to/flowyprompt_mcp/index.js"],
      "env": {
        "GITHUB_REPO_URL": "https://github.com/your-org/templates",
        "GITHUB_PAT": "ghp_your_token"
      }
    }
  }
}
\`\`\`

## 4. 사용 방법
1. Claude Desktop 재시작
2. `/` 입력하여 템플릿 목록 확인
3. 템플릿 선택
4. 변수 입력 (대화형)
5. 자동 실행

## 검증 테스트
- [ ] MCP 서버 초기화 성공 (stdio transport 연결)
- [ ] 템플릿 목록 로드 (최소 1개 이상)
- [ ] 변수 추출 정확성 (모든 {{variable}} 감지)
- [ ] 프롬프트 생성 및 실행 (Claude 응답 확인)
- [ ] 캐시 동작 (2번째 요청 <300ms)
- [ ] 에러 처리 (잘못된 PAT, 네트워크 오류)
```

### 5. Update Agent File (CLAUDE.md)

```bash
.specify/scripts/bash/update-agent-context.sh claude
```

**Updates to CLAUDE.md**:
- Add "@modelcontextprotocol/sdk" to technology stack
- Add "MCP Prompts API implementation" to recent changes
- Add "stdio transport for Claude Desktop" to architecture notes
- Preserve existing manual sections between markers

**Output**:
- `specs/002-mcp-claude-desktop/data-model.md` (7 entities, relationships, state machines)
- `specs/002-mcp-claude-desktop/contracts/` (prompts-list.json, prompts-get.json)
- `tests/mcp/prompts-list.test.js` (5 failing tests)
- `tests/mcp/prompts-get.test.js` (8 failing tests)
- `specs/002-mcp-claude-desktop/quickstart.md` (setup guide with verification checklist)
- `CLAUDE.md` (updated with MCP context)

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

**Input Sources**:
1. **Contracts**: `contracts/prompts-list.json`, `contracts/prompts-get.json`
2. **Data Model**: `data-model.md` (7 entities)
3. **Quickstart**: `quickstart.md` (6 verification steps)
4. **Research**: `research.md` (MCP SDK patterns, variable extraction algorithm)

**Task Categories**:
1. **Setup Tasks** (T001-T005):
   - Update package.json with @modelcontextprotocol/sdk dependency
   - Update .env.example with MCP-specific config
   - Update README.md with MCP usage instructions
   - Create src/mcp/ directory structure
   - Update index.js to launch MCP server

2. **Contract Test Tasks** (T006-T018) - [P] Parallel:
   - T006: Contract test for prompts.list (success case)
   - T007: Contract test for prompts.list (auth failure)
   - T008: Contract test for prompts.list (network error)
   - T009: Contract test for prompts.list (cache hit)
   - T010: Contract test for prompts.get (success case)
   - T011: Contract test for prompts.get (variable substitution)
   - T012: Contract test for prompts.get (missing required variable)
   - T013: Contract test for prompts.get (optional variable)
   - T014: Contract test for prompts.get (template not found)
   - T015: Contract test for prompts.get (validation error)
   - T016: Integration test for stdio transport
   - T017: Integration test for cache revalidation
   - T018: Integration test for prompt generation performance

3. **Service Implementation Tasks** (T019-T025):
   - T019: Implement promptService.js (variable extraction) [depends: research.md]
   - T020: Implement promptService.js (variable validation)
   - T021: Implement promptService.js (prompt generation)
   - T022: Update githubService.js (add listTemplates method)
   - T023: Update metricsService.js (add MCP-specific metrics)
   - T024: Update errorHandler.js (adapt for MCP errors)
   - T025: Update config/index.js (add MCP config validation)

4. **MCP Layer Tasks** (T026-T032):
   - T026: Implement mcp/server.js (SDK initialization) [depends: research.md]
   - T027: Implement mcp/tools/promptsList.js [depends: T022, contract tests]
   - T028: Implement mcp/tools/promptsGet.js [depends: T019-T021, contract tests]
   - T029: Implement mcp/formatters/promptFormatter.js [depends: research.md]
   - T030: Update index.js (replace Express with MCP server)
   - T031: Add MCP health check tool (migrate healthController logic)
   - T032: Add MCP metrics tool (migrate metricsController logic)

5. **Unit Test Tasks** (T033-T037) - [P] Parallel:
   - T033: Unit tests for promptService.js
   - T034: Unit tests for mcp/tools/promptsList.js
   - T035: Unit tests for mcp/tools/promptsGet.js
   - T036: Unit tests for promptFormatter.js
   - T037: Update existing service tests (ensure 85% coverage)

6. **Documentation & Validation** (T038-T042):
   - T038: Add JSDoc comments to all MCP tools and promptService
   - T039: Create CHANGELOG.md entry for MCP transformation
   - T040: Update README.md with Claude Desktop setup instructions
   - T041: Run test coverage verification (≥85%)
   - T042: Execute quickstart.md validation steps

### Task Ordering Strategy

**TDD Order**: All contract tests (T006-T018) before implementation (T019-T032)
**Dependency Order**:
1. Setup (T001-T005) - Foundation
2. Contract tests (T006-T018) - Red phase
3. Services (T019-T025) - Green phase (business logic)
4. MCP layer (T026-T032) - Green phase (protocol layer)
5. Unit tests (T033-T037) - Coverage verification
6. Documentation (T038-T042) - Finalization

**Parallel Execution Markers**:
- Contract tests T006-T018: [P] - Independent test files
- Unit tests T033-T037: [P] - Independent service tests
- Service tasks T019-T021 (promptService methods): [P] - Different functions

**Estimated Output**: 42 numbered, ordered tasks in tasks.md

**Completion Criteria**:
- All 70+ tests passing (existing + new MCP tests)
- ≥85% code coverage
- MCP server successfully registers with Claude Desktop
- Quickstart validation checklist complete (6/6 steps)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD and constitutional principles)
**Phase 5**: Validation (70+ tests passing, quickstart.md executed, Claude Desktop integration verified)

## Complexity Tracking

*No constitutional violations - all principles satisfied*

**Architectural Simplifications Applied**:
1. **String-only variables**: Reduced from 5 types to 1 type (simpler validation)
2. **Single repository**: No multi-repo support (simpler configuration)
3. **stdio transport only**: No SSE transport (simpler deployment)

**No complexity deviations documented** - All design decisions align with constitutional principles.

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - ✅ COMPLETE
- [x] Phase 1: Design complete (/plan command) - ✅ COMPLETE
- [x] Phase 2: Task planning complete (/plan command - describe approach only) - ✅ COMPLETE
- [x] Phase 3: Tasks generated (/tasks command) - ✅ COMPLETE (42 tasks ready)
- [ ] Phase 4: Implementation complete - ⏳ READY TO START
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all 7 principles satisfied)
- [x] Post-Design Constitution Check: PASS (re-evaluated, no new violations)
- [x] All NEEDS CLARIFICATION resolved (3 resolved in research.md)
- [x] Complexity deviations documented (none - architecture simplified)

**Phase 0 Outputs** (✅ Complete):
- [x] `research.md` created (6 research topics + 3 clarifications resolved)
  - MCP SDK implementation patterns documented
  - Prompts API specification defined
  - Variable extraction algorithm specified
  - Prompt formatting rules established
  - Clarification #1: Variable mismatch → WARNING strategy
  - Clarification #2: Cache TTL → 15 minutes
  - Clarification #3: Max template size → 100KB

**Phase 1 Outputs** (✅ Complete):
- [x] `data-model.md` created (7 entities, relationships, state machines, validation matrix)
  - Entity definitions: MCP Server, GitHub Repository, Template, Variable, ResultSection, Prompt, CacheEntry
  - Relationship diagram with cardinalities
  - State transition diagrams (Template, Prompt generation)
  - Security considerations documented
- [x] `contracts/prompts-list.json` created (tool contract, 5 test cases, performance targets)
- [x] `contracts/prompts-get.json` created (tool contract, 8 test cases, error codes)
- [x] `quickstart.md` created (complete setup guide with 6-step verification checklist)
  - Installation instructions
  - Claude Desktop configuration
  - Troubleshooting guide
  - 25 verification test cases

**Phase 2 Outputs** (✅ Complete):
- [x] Task planning approach documented in plan.md
  - 42 tasks across 6 categories (Setup, Contract Tests, Services, MCP Layer, Unit Tests, Documentation)
  - TDD ordering strategy defined
  - Parallel execution markers identified
  - Estimated timeline: 9-11 hours

**Phase 3 Outputs** (✅ Complete):
- [x] `tasks.md` created (42 numbered, dependency-ordered tasks)
  - Phase 3.1: Setup (5 tasks, 30min)
  - Phase 3.2: Tests First - TDD (13 tasks, 3.5h)
  - Phase 3.3: Core Implementation (7 tasks, 3.5h)
  - Phase 3.4: MCP Protocol Layer (7 tasks, 4h)
  - Phase 3.5: Polish & Validation (10 tasks, 4h)
  - 28 tasks marked [P] for parallel execution (67%)
  - Detailed file paths, dependencies, acceptance criteria
  - Parallel execution examples provided

**Completed Actions**:
1. ✅ Execute Phase 0: research.md created
2. ✅ Execute Phase 1: data-model.md, contracts/, quickstart.md created
3. ✅ Re-evaluate Constitution Check: PASS (no new violations)
4. ✅ Document Phase 2 task approach: Complete
5. ✅ Execute /tasks command: tasks.md generated

**Next Steps for Implementation**:
1. **Start with T001-T005** (Setup): ~30 minutes
2. **Complete T006-T018** (Contract Tests - MUST FAIL): ~3.5 hours
3. **Implement T019-T032** (Services + MCP Layer): ~7.5 hours
4. **Finish T033-T042** (Unit Tests + Docs + Validation): ~4 hours
5. **Total estimated time**: 15 hours

**Ready to begin implementation following TDD principles!** 🚀

---

*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
*Reusing 65% of existing codebase from 002-i-want-to implementation*
