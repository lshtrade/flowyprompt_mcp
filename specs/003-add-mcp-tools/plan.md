# Implementation Plan: MCP Flow Execution Tools

**Branch**: `003-add-mcp-tools` | **Date**: 2025-10-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-add-mcp-tools/spec.md`

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

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Add two MCP tools (flows/list and flows/execute) to enable executing multi-step prompt workflows where Template A's output automatically feeds into Template B's input. Flow definitions are stored as FlowyPrompt JSON format in the flows/ directory of the GitHub repository, containing nodes (template/input/result types) and edges (connections defining data flow). The system must execute templates in topological order, map variables between connected nodes, collect intermediate results, and return the complete execution chain.

## Technical Context
**Language/Version**: Node.js 20+ with ES modules
**Primary Dependencies**: @modelcontextprotocol/sdk (existing), graphlib (topological sort)
**Storage**: GitHub repository flows/ directory (FlowyPrompt JSON format)
**Testing**: Jest 29+ with experimental VM modules mode, unstable_mockModule pattern
**Target Platform**: Claude Desktop via MCP stdio transport
**Project Type**: single - MCP server application
**Performance Goals**: List flows <300ms (cached), <2s (cold); Execute flow <5s for 3-node chain
**Constraints**: No persistent execution storage, batch results (not streaming), sequential execution
**Scale/Scope**: Support 10+ flows, 5-10 nodes per flow, handle 10 concurrent executions

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Modularity & Isolation (Principle I)
- [x] Flow parsing logic separated from execution logic
- [x] Node execution isolated from flow orchestration
- [x] Variable mapping as separate reusable function
- [x] Extend existing GitHub service (no tight coupling to new types)

### Schema-First Validation (Principle II)
- [x] JSON schema for FlowyPrompt flow structure (metadata, nodes, edges)
- [x] Validation before flow execution starts
- [x] Clear error messages for invalid flows (circular deps, missing templates)

### Test-Driven Development (Principle III) - NON-NEGOTIABLE
- [x] Contract tests written first for flows/list and flows/execute
- [x] Red-Green-Refactor cycle planned in tasks
- [x] ≥85% coverage target (flow service, execution engine)
- [x] Unit tests (topological sort, variable mapping), integration tests (full flow execution)

### Security-First Design (Principle IV)
- [x] No PAT exposure in flow files or logs
- [x] Flow JSON validation before parsing (prevent injection)
- [x] Same HTTPS-only GitHub access as existing tools
- [x] Template access control inherited from prompts/get

### Performance & Efficiency (Principle V)
- [x] Reuse existing template cache (avoid redundant fetches)
- [x] Flow list caching with 15min TTL (same as templates)
- [x] Parallel template fetching within single flow execution
- [x] Performance targets: <300ms cached list, <5s flow execution

### User Experience Consistency (Principle VI)
- [x] Error format matches existing MCP tools ({ code, message, source })
- [x] Flow results structure consistent with prompts/get
- [x] Variable substitution uses same {variable} syntax
- [x] Intermediate results clearly labeled by node

### Code Quality & Maintainability (Principle VII)
- [x] Follow existing MCP tool patterns (promptsList.js, promptsGet.js structure)
- [x] Documentation: README update, API docs for new tools
- [x] Declarative flow configuration (JSON, no code)
- [x] Public methods documented with JSDoc

## Project Structure

### Documentation (this feature)
```
specs/003-add-mcp-tools/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── flows-list.json
│   └── flows-execute.json
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── models/
│   ├── flowSchema.js           # NEW: Flow JSON validation schema
│   └── templateSchema.js       # Existing
├── services/
│   ├── githubService.js        # MODIFY: Add listFlows, fetchFlow methods
│   ├── cacheService.js         # Existing (reuse)
│   ├── flowService.js          # NEW: Flow parsing and validation
│   └── flowExecutionService.js # NEW: Execution orchestration
├── lib/
│   ├── variableMapper.js       # NEW: Map vars between nodes
│   └── topologicalSort.js      # NEW: Order nodes by dependencies
└── mcp/
    ├── server.js               # MODIFY: Register new tools
    └── tools/
        ├── flowsList.js        # NEW: flows/list handler
        └── flowsExecute.js     # NEW: flows/execute handler

tests/
├── contract/
│   ├── flows-list.test.js      # NEW: Contract tests for flows/list
│   └── flows-execute.test.js   # NEW: Contract tests for flows/execute
├── integration/
│   └── flow-execution.test.js  # NEW: End-to-end flow tests
└── unit/
    ├── flowService.test.js     # NEW: Flow parsing tests
    ├── flowExecutionService.test.js # NEW: Execution logic tests
    ├── variableMapper.test.js  # NEW: Variable mapping tests
    └── topologicalSort.test.js # NEW: Dependency ordering tests
```

**Structure Decision**: Single project (Option 1) - MCP server with new flow execution capabilities added to existing src/ structure. Follows existing patterns from prompts tools.

## Phase 0: Outline & Research

### Unknowns from Technical Context
1. **Topological Sort Implementation**:
   - Research: Evaluate graphlib vs custom implementation
   - Decision criteria: Bundle size, reliability, maintenance

2. **Variable Mapping Strategy**:
   - Research: Auto-map by name vs explicit edge mapping
   - Decision criteria: Flexibility, error detection, user clarity

3. **Flow Validation Approach**:
   - Research: JSON Schema vs Joi vs custom validation
   - Decision criteria: Consistency with existing code, error messages

4. **Error Handling Strategy**:
   - Research: Fail-fast vs partial results collection
   - Decision criteria: User value, debugging ease

### Research Tasks
1. **Task**: Research topological sort libraries for Node.js
   - Evaluate graphlib (most popular), dag-map, toposort
   - Best practices: Cycle detection, error messages
   - Decision factors: Size (<50KB), TypeScript support, maintenance

2. **Task**: Find best practices for flow execution engines
   - Domain: Workflow engines (Temporal, n8n concepts)
   - Patterns: Error boundaries, state management, resumability
   - Apply: Simplified approach for MCP context (no persistence)

3. **Task**: Research variable mapping patterns
   - Evaluate: JSONPath, dot notation, direct name matching
   - Best practices: Validation, type coercion, missing value handling
   - Decision: Balance flexibility vs simplicity

4. **Task**: Study FlowyPrompt JSON format specification
   - Analyze: Existing flow examples from user description
   - Identify: Required vs optional fields, edge types, node types
   - Document: Canonical structure for validation

**Output**: research.md with all decisions documented

## Phase 1: Design & Contracts

### 1. Extract Entities → `data-model.md`

**Flow Entity**:
- Fields: id (string), name (string), version (string), description (string), metadata (object with created/updated)
- Relationships: Contains FlowNodes (array), FlowEdges (array)
- Validation: Name required, version semver format, at least one node

**FlowNode Entity**:
- Fields: id (string), type (enum: template/multi_input/result), position (x, y), data (object)
- For template nodes: data.template (string), data.variables (array), data.label (string), data.selectedTemplateId (string)
- Relationships: Connected by FlowEdges (source/target)
- Validation: ID unique within flow, type required, template nodes must reference existing templates

**FlowEdge Entity**:
- Fields: id (string), source (node id), target (node id), type (enum: data/chain)
- Defines: Data flow direction and execution order
- Validation: Source and target nodes exist, no circular dependencies

**ExecutionResult Entity**:
- Fields: nodeId (string), templateName (string), inputVariables (object), outputContent (string), timestamp (ISO string), executionTimeMs (number)
- Used for: Building execution chain visualization
- Validation: Required fields present, timestamp valid ISO format

**FlowExecution Entity**:
- Fields: flowId (string), initialVariables (object), intermediateResults (array of ExecutionResult), finalResult (string), totalExecutionTimeMs (number), status (enum: success/partial/failed)
- Relationships: Contains ordered ExecutionResults
- Validation: At least one result if status=success, error details if status=failed

### 2. Generate API Contracts → `/contracts/`

**Contract: flows/list** (flows-list.json)
```json
{
  "tool": "flows/list",
  "description": "List all available flow templates from flows/ directory",
  "request": {
    "params": {},
    "optional": {
      "includeMetadata": "boolean - include full metadata (default: true)"
    }
  },
  "response": {
    "success": {
      "flows": [
        {
          "name": "string - flow filename without .json",
          "description": "string - from metadata.description",
          "version": "string - semver from metadata.version",
          "nodeCount": "number - count of nodes in flow",
          "created": "ISO8601 timestamp",
          "updated": "ISO8601 timestamp"
        }
      ]
    },
    "error": {
      "code": "string - GITHUB_ERROR | PARSE_ERROR",
      "message": "string - human-readable error",
      "source": "flows/list"
    }
  },
  "performance": {
    "cached": "<300ms",
    "cold": "<2s"
  }
}
```

**Contract: flows/execute** (flows-execute.json)
```json
{
  "tool": "flows/execute",
  "description": "Execute a flow chain with variable substitution",
  "request": {
    "params": {
      "flowName": "string - name of flow to execute",
      "initialVariables": "object - key-value pairs for first template"
    },
    "optional": {
      "ref": "string - GitHub ref (default: main)"
    }
  },
  "response": {
    "success": {
      "flowName": "string",
      "executionId": "string - timestamp-based ID",
      "intermediateResults": [
        {
          "nodeId": "string",
          "templateName": "string",
          "inputVariables": "object",
          "output": "string - generated content",
          "executionTimeMs": "number",
          "timestamp": "ISO8601"
        }
      ],
      "finalResult": "string - output from last node",
      "totalExecutionTimeMs": "number",
      "status": "success | partial | failed"
    },
    "error": {
      "code": "string - FLOW_NOT_FOUND | VALIDATION_ERROR | TEMPLATE_NOT_FOUND | EXECUTION_ERROR | CIRCULAR_DEPENDENCY | MISSING_VARIABLES",
      "message": "string",
      "source": "flows/execute",
      "partialResults": "array - if execution stopped mid-flow"
    }
  },
  "performance": {
    "target": "<5s for 3-node chain"
  }
}
```

### 3. Generate Contract Tests

**tests/contract/flows-list.test.js**:
- TC-FLOW-LIST-001: Successful flow list retrieval
- TC-FLOW-LIST-002: Handle empty flows directory
- TC-FLOW-LIST-003: Handle malformed flow JSON
- TC-FLOW-LIST-004: Cache hit performance
- TC-FLOW-LIST-005: GitHub API failure handling

**tests/contract/flows-execute.test.js**:
- TC-FLOW-EXEC-001: Successful 2-node flow execution
- TC-FLOW-EXEC-002: Variable mapping between nodes
- TC-FLOW-EXEC-003: Missing initial variables error
- TC-FLOW-EXEC-004: Template not found mid-flow
- TC-FLOW-EXEC-005: Circular dependency detection
- TC-FLOW-EXEC-006: Partial results on failure
- TC-FLOW-EXEC-007: Performance target (5s for 3 nodes)

Tests written first (TDD), expect failures until implementation.

### 4. Extract Test Scenarios from User Stories

**Integration Test Scenario** (from spec.md Scenario 2):
```markdown
Given: Flow "Marketing_Strategy" with Brand_Positioning → Campaign_Plan
When: User executes with { company: "TechCorp", market: "AI", budget: "100K" }
Then:
  1. System fetches flow JSON from flows/Marketing_Strategy.json
  2. Validates flow structure (nodes, edges, no cycles)
  3. Executes Brand_Positioning with initial variables
  4. Captures Brand_Positioning output
  5. Maps output to Campaign_Plan input variables
  6. Executes Campaign_Plan with mapped variables
  7. Returns:
     - intermediateResults[0]: Brand_Positioning output
     - intermediateResults[1]: Campaign_Plan output
     - finalResult: Campaign_Plan output
     - status: "success"
     - totalExecutionTimeMs: <5000
```

### 5. Update Agent File (CLAUDE.md)

Run: `.specify/scripts/bash/update-agent-context.sh claude`

Add to CLAUDE.md (NEW tech from this plan):
- Flow execution orchestration (topological sort)
- FlowyPrompt JSON format (nodes, edges)
- Variable mapping between templates
- MCP tools: flows/list, flows/execute

Keep under 150 lines, preserve manual additions, update recent changes.

**Output**: data-model.md, contracts/flows-list.json, contracts/flows-execute.json, failing contract tests, quickstart.md, CLAUDE.md updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Generate tasks from Phase 1 design docs:
   - Each contract → contract test task [P]
   - Each entity → schema creation task [P]
   - Each service → unit test + implementation task
   - Integration test → end-to-end flow test task
   - Each user story → acceptance test task

**Specific Task Breakdown**:
- **Phase 1: Validation Layer** (parallel)
  - T001: Create flowSchema.js with JSON Schema [P]
  - T002: Write flow schema validation tests [P]
  - T003: Implement flow schema validator [P]

- **Phase 2: Core Libraries** (parallel after Phase 1)
  - T004: Write topologicalSort tests [P]
  - T005: Implement topologicalSort with cycle detection [P]
  - T006: Write variableMapper tests [P]
  - T007: Implement variableMapper [P]

- **Phase 3: Services** (sequential, depends on Phase 2)
  - T008: Extend githubService with listFlows/fetchFlow
  - T009: Write flowService tests
  - T010: Implement flowService (parse, validate)
  - T011: Write flowExecutionService tests
  - T012: Implement flowExecutionService (orchestrate execution)

- **Phase 4: MCP Tools** (depends on Phase 3)
  - T013: Write flows/list contract tests (TC-FLOW-LIST-001 to 005)
  - T014: Implement flowsList.js tool
  - T015: Write flows/execute contract tests (TC-FLOW-EXEC-001 to 007)
  - T016: Implement flowsExecute.js tool
  - T017: Register new tools in src/mcp/server.js

- **Phase 5: Integration** (final validation)
  - T018: Write end-to-end flow execution test
  - T019: Update README with flow execution examples
  - T020: Performance validation (meet <300ms cached, <5s execution targets)

**Ordering Strategy**:
- TDD order: All tests before corresponding implementation
- Dependency order: Schema → Libraries → Services → Tools → Integration
- Mark [P] for parallel execution (independent files)
- Estimated total: 20 tasks

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No violations - all constitutional principles satisfied:
- Modularity: Flow logic separated into distinct services
- Schema-First: JSON Schema validation before execution
- TDD: Contract tests written first, ≥85% coverage planned
- Security: Inherits GitHub PAT protection, validates flow JSON
- Performance: Caching strategy defined, targets documented
- UX: Consistent with existing MCP tools
- Quality: Follows existing code patterns, documentation planned

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (N/A - no deviations)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
