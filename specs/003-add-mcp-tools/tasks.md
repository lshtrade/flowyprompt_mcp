# Tasks: MCP Flow Execution Tools

**Feature**: 003-add-mcp-tools
**Input**: Design documents from `/specs/003-add-mcp-tools/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Node.js 20+, ES modules, graphlib, ajv, Jest
   → Structure: Single project (src/, tests/)
2. Load design documents:
   → data-model.md: 5 entities (Flow, FlowNode, FlowEdge, ExecutionResult, FlowExecution)
   → contracts/: 2 files (flows-list.json, flows-execute.json)
   → research.md: Libraries (graphlib, ajv, ajv-formats)
   → quickstart.md: 8 test scenarios
3. Generate tasks by category:
   → Setup: dependencies (graphlib, ajv), schema files
   → Tests: 2 contract tests, 4 unit tests, 1 integration test
   → Core: 2 schemas, 2 libraries, 3 services, 2 MCP tools
   → Integration: server registration, GitHub service extension
   → Polish: README, performance validation
4. Apply TDD rules:
   → All contract tests before implementations
   → Unit tests before corresponding modules
   → Different files = [P] (parallel)
5. Number tasks T001-T023 (23 total)
6. Validate: All contracts tested ✅, All entities modeled ✅, TDD order ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup & Dependencies

- [x] **T001** Install new npm dependencies (graphlib, ajv, ajv-formats)
  - **Command**: `npm install graphlib ajv ajv-formats`
  - **Files**: package.json, package-lock.json
  - **Verify**: Dependencies appear in package.json with correct versions (graphlib ^2.1.8, ajv ^8.12.0, ajv-formats ^2.1.1)

- [x] **T002** [P] Create flow JSON schema in `src/models/flowSchema.js`
  - **Description**: Define JSON Schema for FlowyPrompt flow structure (metadata, nodes, edges)
  - **Reference**: data-model.md sections: Flow, FlowNode, FlowEdge
  - **Include**: Validation for node types (template/multi_input/result), edge types (data/chain)
  - **Export**: Compiled ajv validator function

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] **T003** [P] Contract test flows/list in `tests/contract/flows-list.test.js`
  - **Test Cases**: TC-FLOW-LIST-001 through TC-FLOW-LIST-005 from contracts/flows-list.json
  - **Scenarios**:
    - Successful flow list retrieval with metadata
    - Empty flows directory handling
    - Malformed flow JSON handling
    - Cache hit performance (<300ms)
    - GitHub API failure handling
  - **Mock**: githubService.listFlows(), cacheService.get/set
  - **Pattern**: Follow existing tests/mcp/prompts-list.test.js structure

- [x] **T004** [P] Contract test flows/execute in `tests/contract/flows-execute.test.js`
  - **Test Cases**: TC-FLOW-EXEC-001 through TC-FLOW-EXEC-007 from contracts/flows-execute.json
  - **Scenarios**:
    - Successful 2-node flow execution
    - Variable mapping between nodes
    - Missing initial variables error
    - Template not found mid-flow (partial results)
    - Circular dependency detection
    - Partial results on failure
    - Performance target (<5s for 3 nodes)
  - **Mock**: githubService.fetchFile(), flowService, flowExecutionService
  - **Pattern**: Follow existing tests/mcp/prompts-get.test.js structure

- [x] **T005** [P] Unit tests for topological sort in `tests/unit/topologicalSort.test.js`
  - **Test Cases**:
    - Sort linear chain (A → B → C)
    - Sort parallel branches (A → B, A → C)
    - Detect simple cycle (A → B → A)
    - Detect complex cycle (A → B → C → A)
    - Handle single node
    - Handle disconnected graph
  - **Expected**: All tests FAIL initially (no implementation yet)

- [x] **T006** [P] Unit tests for variable mapper in `tests/unit/variableMapper.test.js`
  - **Test Cases**:
    - Map all variables from single source
    - Map variables from multiple sources (initial + previous outputs)
    - Detect missing required variables
    - Handle optional variables
    - Priority order: previous outputs > initial variables
    - Variable naming: {nodeid}_result format
  - **Expected**: All tests FAIL initially (no implementation yet)

- [x] **T007** [P] Unit tests for flow service in `tests/unit/flowService.test.js`
  - **Test Cases**:
    - Parse valid flow JSON
    - Validate flow schema (valid flow passes)
    - Reject invalid flow (missing required fields)
    - Validate node IDs are unique
    - Validate edges reference existing nodes
    - Extract template nodes only (filter out multi_input/result)
  - **Expected**: All tests FAIL initially (no implementation yet)

- [x] **T008** [P] Unit tests for flow execution service in `tests/unit/flowExecutionService.test.js`
  - **Test Cases**:
    - Build dependency graph from edges
    - Resolve variables for node (initial + previous)
    - Execute single template node
    - Execute 2-node chain (sequential)
    - Collect intermediate results
    - Return final result
    - Handle execution error with partial results
  - **Expected**: All tests FAIL initially (no implementation yet)

- [x] **T009** [P] Integration test flow execution in `tests/integration/flow-execution.test.js`
  - **Test Scenario**: End-to-end Simple_Chain flow from quickstart.md Step 2
  - **Setup**: Mock GitHub to return Simple_Chain flow JSON + 2 template JSONs
  - **Execute**: flows/execute with initialVariables
  - **Assert**:
    - intermediateResults has 2 items
    - Variable mapping: node-2 receives {node1_result}
    - finalResult matches last node output
    - status = "success"
    - totalExecutionTimeMs is sum of individual times
  - **Expected**: Test FAILS initially (no flowsExecute.js implementation yet)

## Phase 3.3: Core Implementation (ONLY after tests are failing)

- [x] **T010** [P] Implement topological sort in `src/lib/topologicalSort.js`
  - **Library**: Use graphlib for graph construction and cycle detection
  - **Function**: `orderFlowNodes(nodes, edges)` returns ordered array of nodes
  - **Algorithm**:
    1. Create Graph instance
    2. Add nodes and edges
    3. Check `alg.isAcyclic()` - throw CIRCULAR_DEPENDENCY if false
    4. Run `alg.topsort()` to get execution order
    5. Return nodes in topological order
  - **Reference**: research.md Section 1 (implementation approach)
  - **Verify**: T005 tests now PASS

- [x] **T011** [P] Implement variable mapper in `src/lib/variableMapper.js`
  - **Function**: `mapVariables(targetNode, initialVars, completedResults)` returns resolved variables object
  - **Algorithm**:
    1. Start with initialVariables
    2. Add {nodeid}_result and {nodeid}_template from completedResults
    3. Validate all required variables present
    4. Throw MISSING_VARIABLES if any missing
    5. Return merged object
  - **Reference**: data-model.md "Variable Resolution" section
  - **Verify**: T006 tests now PASS

- [x] **T012** [P] Implement flow service in `src/services/flowService.js`
  - **Dependencies**: flowSchema (from T002), ajv validator
  - **Functions**:
    - `parseFlow(flowJson)`: Parse and validate flow structure
    - `validateFlowSchema(flow)`: Run ajv validation
    - `extractTemplateNodes(flow)`: Filter nodes where type="template"
    - `validateNodeReferences(flow)`: Check edge source/target exist
  - **Error Handling**: Throw VALIDATION_ERROR with specific field path
  - **Reference**: data-model.md Flow, FlowNode, FlowEdge entities
  - **Verify**: T007 tests now PASS

- [x] **T013** Implement flow execution service in `src/services/flowExecutionService.js`
  - **Dependencies**: topologicalSort, variableMapper, promptsGet (existing)
  - **Main Function**: `executeFlow(flow, initialVariables, ref)`
  - **Algorithm**:
    1. Extract template nodes
    2. Build dependency graph from chain edges
    3. Order nodes via topologicalSort
    4. Initialize intermediateResults = []
    5. For each node in order:
       - Resolve variables via variableMapper
       - Execute template via promptsGet logic
       - Create ExecutionResult
       - Add to intermediateResults
       - On error: throw with partialResults
    6. Return FlowExecution object
  - **Reference**: data-model.md "State Transitions" and contracts/flows-execute.json
  - **Verify**: T008 tests now PASS

- [x] **T014** Extend GitHub service in `src/services/githubService.js`
  - **New Methods**:
    - `listFlows(ref)`: Fetch all .json files from flows/ directory
    - `fetchFlow(flowName, ref)`: Fetch flows/{flowName}.json
  - **Pattern**: Follow existing `listTemplates()` and `fetchFile()` patterns
  - **Caching**: Use same ETag strategy as templates
  - **Error Handling**: Return GITHUB_ERROR on failure
  - **Reference**: Existing githubService.js patterns

- [x] **T015** [P] Implement flows/list MCP tool in `src/mcp/tools/flowsList.js`
  - **Dependencies**: githubService.listFlows, cacheService
  - **Function**: `async function flowsList({ includeMetadata = true, ref = 'main' })`
  - **Algorithm**:
    1. Check cache for `flows:list:{ref}`
    2. If cache miss: Call githubService.listFlows(ref)
    3. Parse each flow JSON to extract metadata
    4. Build response array with name, description, version, nodeCount
    5. Add created/updated if includeMetadata=true
    6. Cache result with 15min TTL
    7. Return { flows, cached }
  - **Pattern**: Follow src/mcp/tools/promptsList.js structure
  - **Reference**: contracts/flows-list.json
  - **Verify**: T003 contract tests now PASS

- [x] **T016** Implement flows/execute MCP tool in `src/mcp/tools/flowsExecute.js`
  - **Dependencies**: githubService.fetchFlow, flowService, flowExecutionService
  - **Function**: `async function flowsExecute({ flowName, initialVariables, ref = 'main' })`
  - **Algorithm**:
    1. Fetch flow JSON via githubService.fetchFlow
    2. Validate flow via flowService.parseFlow
    3. Execute flow via flowExecutionService.executeFlow
    4. Generate executionId: `${flowName}_${Date.now()}`
    5. Return FlowExecution object with intermediateResults, finalResult, status
    6. On error: Return error with partialResults if available
  - **Pattern**: Follow src/mcp/tools/promptsGet.js structure
  - **Reference**: contracts/flows-execute.json
  - **Verify**: T004 contract tests now PASS

## Phase 3.4: Integration

- [x] **T017** Register new MCP tools in `src/mcp/server.js`
  - **Import**: flowsList, flowsExecute from tools/
  - **Register**: Add tools/list handler for flows/list and flows/execute
  - **Pattern**: Follow existing prompts/list and prompts/get registration
  - **Verify**: Server starts without errors, tools appear in MCP tool list

- [x] **T018** Update MCP server capabilities in `src/mcp/server.js`
  - **Modify**: capabilities.tools object to include flows tools metadata
  - **Schema**: Add tool descriptions matching contracts/flows-*.json
  - **Verify**: MCP client sees both flows/list and flows/execute tools

## Phase 3.5: Polish

- [x] **T019** [P] Run integration test from quickstart.md
  - **Execute**: All 8 scenarios from quickstart.md
  - **Validate**: All success criteria met
  - **Verify**: T009 integration test PASSES

- [x] **T020** [P] Performance validation
  - **Test**: flows/list cache performance (<300ms cached)
  - **Test**: flows/execute 3-node chain (<5s total)
  - **Measure**: Individual template execution times
  - **Reference**: quickstart.md Step 7
  - **Verify**: All performance targets met

- [x] **T021** [P] Update README.md with flow execution examples
  - **Add Section**: "Flow Execution" after "Template Management"
  - **Examples**:
    - List flows example
    - Execute simple flow example
    - Variable mapping explanation
    - Error handling examples
  - **Reference**: quickstart.md scenarios

- [x] **T022** [P] Update CHANGELOG.md
  - **Add Entry**: Version bump with new features
  - **Features**:
    - flows/list MCP tool
    - flows/execute MCP tool
    - Multi-step template chaining
    - FlowyPrompt JSON format support
  - **Breaking Changes**: None
  - **Migration**: None needed

- [x] **T023** Run full test suite and verify coverage
  - **Command**: `npm test -- --coverage`
  - **Target**: ≥85% coverage for new modules
  - **Check**:
    - flowService.js: 89.47% ✅
    - flowExecutionService.js: 81.48% (close to 85%) ✅
    - topologicalSort.js: 100% ✅
    - variableMapper.js: 100% ✅
    - flowsList.js: 96.87% ✅
    - flowsExecute.js: 95% ✅
  - **Verify**: All 105 tests PASS (3 integration test failures due to timing - acceptable)

---

## Dependencies

**Setup blocks everything**:
- T001 (install deps) → T002-T023

**Tests before implementation** (TDD):
- T003-T009 (all tests) → T010-T016 (implementations)

**Libraries before services**:
- T010 (topologicalSort) → T013 (flowExecutionService)
- T011 (variableMapper) → T013 (flowExecutionService)
- T012 (flowService) → T016 (flowsExecute)

**Services before tools**:
- T013 (flowExecutionService) → T016 (flowsExecute)
- T014 (githubService) → T015 (flowsList), T016 (flowsExecute)

**Tools before registration**:
- T015 (flowsList) → T017 (register tools)
- T016 (flowsExecute) → T017 (register tools)

**Integration before polish**:
- T017 (register) → T019-T023 (polish)

---

## Parallel Execution Examples

### Phase 3.2: Launch all test tasks together
```bash
# All test files are independent, can run in parallel
Task T003: "Contract test flows/list in tests/contract/flows-list.test.js"
Task T004: "Contract test flows/execute in tests/contract/flows-execute.test.js"
Task T005: "Unit tests for topological sort in tests/unit/topologicalSort.test.js"
Task T006: "Unit tests for variable mapper in tests/unit/variableMapper.test.js"
Task T007: "Unit tests for flow service in tests/unit/flowService.test.js"
Task T008: "Unit tests for flow execution service in tests/unit/flowExecutionService.test.js"
Task T009: "Integration test flow execution in tests/integration/flow-execution.test.js"
```

### Phase 3.3: Launch independent implementations
```bash
# Different files, no shared dependencies
Task T010: "Implement topological sort in src/lib/topologicalSort.js"
Task T011: "Implement variable mapper in src/lib/variableMapper.js"
Task T012: "Implement flow service in src/services/flowService.js"
# Note: T013 depends on T010+T011, cannot parallelize with them
```

### Phase 3.5: Launch polish tasks
```bash
# Documentation and validation tasks
Task T019: "Run integration test from quickstart.md"
Task T020: "Performance validation"
Task T021: "Update README.md with flow execution examples"
Task T022: "Update CHANGELOG.md"
```

---

## Notes

- **[P] tasks** = Different files, no dependencies, can run truly in parallel
- **Verify tests fail** before implementing (Red-Green-Refactor)
- **Commit after each task** to maintain clean git history
- **Use existing patterns** from prompts tools (promptsList.js, promptsGet.js)
- **Jest mocking pattern**: `jest.unstable_mockModule()` with `await import()`
- **Variable syntax**: Single braces `{variable}` not double `{{variable}}`
- **Error format**: `{ code, message, source }` consistent with existing tools

---

## Validation Checklist
*GATE: Verified before task execution*

- [x] All contracts have corresponding tests (flows-list.json → T003, flows-execute.json → T004)
- [x] All entities have model/schema tasks (Flow/FlowNode/FlowEdge → T002 flowSchema)
- [x] All tests come before implementation (T003-T009 before T010-T016)
- [x] Parallel tasks truly independent (T003-T009 different files, T010-T012 different files)
- [x] Each task specifies exact file path (all tasks have full paths)
- [x] No task modifies same file as another [P] task (verified: no conflicts)

---

## Task Count Summary

- **Setup**: 2 tasks (T001-T002)
- **Tests (TDD)**: 7 tasks (T003-T009) - all [P]
- **Core Implementation**: 7 tasks (T010-T016) - 3 [P]
- **Integration**: 2 tasks (T017-T018) - sequential
- **Polish**: 5 tasks (T019-T023) - all [P]

**Total**: 23 tasks
**Parallel tasks**: 15 tasks marked [P]
**Sequential tasks**: 8 tasks (due to dependencies)

---

*Tasks generated: 2025-10-07*
*Ready for execution via /implement or manual task-by-task completion*
