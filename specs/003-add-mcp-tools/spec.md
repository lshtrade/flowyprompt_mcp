# Feature Specification: MCP Flow Execution Tools

**Feature Branch**: `003-add-mcp-tools`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "Add MCP tools for flow execution: flows/list to list available prompt template flows, and flows/execute to execute a flow chain where template A's result becomes template B's input, automatically generating intermediate and final results"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature is clear: Add flow listing and execution tools
2. Extract key concepts from description
   → Actors: Claude Desktop users
   → Actions: List flows, execute flow chains
   → Data: Flow definitions (nodes, edges, templates), intermediate results, final results
   → Constraints: Must work with existing GitHub-based storage
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: Flow file format - confirmed as FlowyPrompt JSON format from example]
   → [NEEDS CLARIFICATION: Storage location - specified as "flows" directory in GitHub repo]
4. Fill User Scenarios & Testing section
   → Clear user flow: Discover flows → Select flow → Execute → View results
5. Generate Functional Requirements
   → All requirements are testable
6. Identify Key Entities
   → Flow, FlowNode (template nodes), FlowEdge (connections), ExecutionResult
7. Run Review Checklist
   → Some clarifications needed on error handling and performance
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing

### Primary User Story
As a Claude Desktop user, I want to execute multi-step prompt workflows where one prompt's output automatically feeds into the next prompt's input, so that I can automate complex reasoning chains without manual copy-pasting between prompts.

**Example Flow**:
1. User asks Claude Desktop to list available flows
2. User sees "Marketing Strategy Flow" which chains: "Brand Positioning" → "Campaign Plan"
3. User executes the flow with initial inputs (company name, market, etc.)
4. System automatically:
   - Executes "Brand Positioning" template with user inputs
   - Takes that result and feeds it into "Campaign Plan" template
   - Returns both intermediate and final results
5. User receives complete output showing the reasoning chain

### Acceptance Scenarios

**Scenario 1: List Available Flows**
- **Given** the GitHub repository contains flow JSON files in the `flows/` directory
- **When** user invokes the flows/list MCP tool
- **Then** system returns a list of flow names with descriptions and metadata (name, version, template count)

**Scenario 2: Execute Simple 2-Step Flow**
- **Given** a flow exists with Template A → Template B chain
- **When** user executes the flow with required initial variables
- **Then** system:
  - Executes Template A with user-provided variables
  - Passes Template A's result to Template B as input
  - Returns both intermediate result (from A) and final result (from B)

**Scenario 3: Execute Flow with Variable Mapping**
- **Given** Template A outputs variables {result, summary} and Template B needs {context, requirements}
- **When** user executes the flow
- **Then** system correctly maps Template A's output variables to Template B's input variables based on edge connections

**Scenario 4: Handle Missing Initial Variables**
- **Given** a flow requires initial variables {company, market, budget}
- **When** user executes flow without providing "budget"
- **Then** system returns error indicating missing required variable

**Scenario 5: View Execution Progress**
- **Given** a flow with 3 chained templates
- **When** user executes the flow
- **Then** system shows intermediate results after each template execution [NEEDS CLARIFICATION: Real-time streaming or batch return?]

### Edge Cases
- What happens when a template in the middle of the flow fails?
  - [NEEDS CLARIFICATION: Should execution stop or continue with partial results?]
- How does system handle circular dependencies in flow edges?
  - System MUST detect and reject flows with cycles
- What happens when Template A's output variables don't match Template B's expected inputs?
  - [NEEDS CLARIFICATION: Auto-map by name, require explicit mapping, or fail?]
- What happens when a flow file is corrupted or has invalid JSON?
  - System MUST return validation error with specific issue
- How does system handle flows with multiple parallel branches?
  - [NEEDS CLARIFICATION: Execute in parallel or sequentially?]

## Requirements

### Functional Requirements

**Flow Discovery & Listing**
- **FR-001**: System MUST list all flow files from the `flows/` directory in the GitHub repository
- **FR-002**: System MUST parse each flow file's metadata section (name, version, description, created/updated dates)
- **FR-003**: System MUST display the number of template nodes in each flow
- **FR-004**: System MUST cache flow list data to improve performance (similar to template list caching)
- **FR-005**: System MUST handle empty flows directory gracefully (return empty list)

**Flow Validation**
- **FR-006**: System MUST validate flow JSON structure matches FlowyPrompt format before execution
- **FR-007**: System MUST verify all template nodes reference existing saved templates
- **FR-008**: System MUST detect circular dependencies in flow edges and reject invalid flows
- **FR-009**: System MUST validate that edge connections between nodes are valid (source outputs match target inputs)

**Flow Execution**
- **FR-010**: System MUST execute template nodes in topological order based on edge connections
- **FR-011**: System MUST pass output from source template node to target template node as input variables
- **FR-012**: System MUST support variable mapping between connected nodes (e.g., {result} → {context})
- **FR-013**: System MUST collect and return all intermediate results from each template execution
- **FR-014**: System MUST return final result from the last template in the chain
- **FR-015**: Users MUST be able to provide initial input variables for the first template in the flow
- **FR-016**: System MUST substitute variables in templates using the same variable substitution logic as prompts/get

**Error Handling**
- **FR-017**: System MUST return clear error messages when flow file is not found
- **FR-018**: System MUST return clear error messages when required initial variables are missing
- **FR-019**: System MUST return clear error messages when template execution fails mid-flow [NEEDS CLARIFICATION: Include partial results in error response?]
- **FR-020**: System MUST handle GitHub API failures gracefully (network errors, auth failures)

**Performance & Caching**
- **FR-021**: Flow list requests MUST complete in < 300ms when cached
- **FR-022**: Flow execution MUST respect template fetching cache to avoid redundant GitHub API calls
- **FR-023**: System MUST cache flow definitions after first fetch [NEEDS CLARIFICATION: Cache duration same as templates (15 min)?]

**Data Persistence**
- **FR-024**: System MUST NOT persist execution results permanently [NEEDS CLARIFICATION: Should results be stored temporarily or only returned?]
- **FR-025**: System MUST fetch latest flow definition from GitHub on each execution [NEEDS CLARIFICATION: Or allow cached flows with TTL?]

### Key Entities

- **Flow**: Represents a multi-step prompt workflow
  - Attributes: id, name, version, description, created/updated timestamps
  - Relationships: Contains multiple FlowNodes and FlowEdges

- **FlowNode**: Represents a step in the flow (template, input, or result node)
  - Attributes: id, type (template/multi_input/result), position (x, y), data
  - For template nodes: template text, variables list, label, selected template ID
  - Relationships: Connected by FlowEdges

- **FlowEdge**: Represents connection between two nodes
  - Attributes: id, source node, target node, connection type (data/chain)
  - Defines data flow direction and variable mapping

- **ExecutionResult**: Result from executing a single template node
  - Attributes: node id, template name, input variables, output content, timestamp
  - Used to build execution chain visualization

- **FlowExecution**: Complete execution of a flow from start to finish
  - Attributes: flow id, initial variables, intermediate results, final result, execution time
  - Relationships: Contains multiple ExecutionResults in execution order

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (7 clarifications needed)
- [x] Requirements are testable and unambiguous (where specified)
- [x] Success criteria are measurable
- [x] Scope is clearly bounded (flows/list and flows/execute tools only)
- [x] Dependencies and assumptions identified (GitHub storage, FlowyPrompt format)

**Outstanding Clarifications Needed**:
1. Real-time execution progress streaming vs batch return?
2. Error handling: stop execution or return partial results on template failure?
3. Variable mapping strategy: auto-map by name or require explicit mapping?
4. Parallel branch execution strategy?
5. Include partial results in error responses?
6. Flow cache TTL same as templates (15 min)?
7. Temporary vs permanent result storage?

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (7 items)
- [x] User scenarios defined
- [x] Requirements generated (25 functional requirements)
- [x] Entities identified (5 entities)
- [ ] Review checklist passed (pending clarifications)

---
