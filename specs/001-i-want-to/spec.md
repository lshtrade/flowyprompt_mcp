# Feature Specification: GitHub MCP Server for Template & Flow Retrieval

**Feature Branch**: `001-i-want-to`
**Created**: 2025-10-05
**Status**: Draft
**Input**: User description: "I want to build an HTTP-based Model Context Protocol (MCP) server that connects to a GitHub repository using a provided URL and Personal Access Token (PAT). The purpose of this server is to dynamically fetch and deliver JSON-based templates and flow definitions that are stored in the repository. Instead of manually specifying full file paths, users will simply provide the type (flow or template) and the name (e.g., 'Flow1', 'Brand_Positioning_Strategy'). The server will automatically resolve and retrieve the corresponding file from GitHub (flows/{name}.json or templates/{name}.json), validate its structure, and return it in MCP-compatible format for other systems (like FlowyPrompt) to consume. The goal is to create a simple, secure, and consistent bridge between external repositories and the MCP ecosystem, enabling reusable prompt templates and workflow definitions to be loaded on demand — ensuring version control, consistency, and easy collaboration."

---

## User Scenarios & Testing

### Primary User Story
A developer or system integrator wants to dynamically load reusable prompt templates and workflow definitions from a version-controlled GitHub repository into FlowyPrompt (or other MCP-compatible systems) without manually managing file paths. They configure the MCP server with their repository URL and authentication token once, then request templates or flows by simple names, receiving validated JSON data ready for immediate use.

### Acceptance Scenarios

1. **Given** the MCP server is configured with a valid GitHub repository URL and PAT, **When** a user requests a template named "Brand_Positioning_Strategy", **Then** the server fetches `templates/Brand_Positioning_Strategy.json` from GitHub, validates its schema, and returns the MCP-formatted response.

2. **Given** the MCP server is configured, **When** a user requests a flow named "Flow1", **Then** the server fetches `flows/Flow1.json` from GitHub, validates its structure (nodes, edges), and returns the validated flow definition.

3. **Given** the server has previously fetched a template, **When** the same template is requested again and GitHub indicates no changes (via ETag/Last-Modified), **Then** the server returns the cached version without re-downloading.

4. **Given** a user requests a non-existent template, **When** GitHub returns 404, **Then** the server returns a structured error: `{ code: "NOT_FOUND", message: "Template 'InvalidName' not found", source: "github" }`.

5. **Given** an invalid or expired PAT is configured, **When** any fetch request is made, **Then** the server returns a structured error: `{ code: "UNAUTHORIZED", message: "GitHub authentication failed", source: "github" }` without exposing the PAT.

6. **Given** a fetched JSON file has invalid schema, **When** validation occurs, **Then** the server rejects the file and returns: `{ code: "VALIDATION_ERROR", message: "Invalid template schema: missing required field 'metadata'", source: "validation" }`.

### Edge Cases

- What happens when the GitHub repository URL is malformed?
  → Server returns `{ code: "INVALID_CONFIG", message: "Invalid repository URL format", source: "config" }`

- What happens when network connectivity is lost during a fetch?
  → Server returns `{ code: "NETWORK_ERROR", message: "Failed to connect to GitHub", source: "network" }` and retries with exponential backoff [NEEDS CLARIFICATION: retry policy - max attempts, backoff strategy?]

- What happens when a template file exists but is not valid JSON?
  → Server returns `{ code: "PARSE_ERROR", message: "Invalid JSON format", source: "parsing" }`

- What happens when concurrent requests are made for the same template?
  → [NEEDS CLARIFICATION: concurrency handling - queue requests, serve in parallel, or use locking?]

- What happens when a template exceeds a size limit?
  → [NEEDS CLARIFICATION: max file size limit - reject files over X MB?]

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST accept GitHub repository URL and Personal Access Token (PAT) as configuration inputs
- **FR-002**: System MUST expose an MCP-compatible interface for requesting templates and flows by name and type
- **FR-003**: System MUST automatically construct file paths as `templates/{name}.json` for templates and `flows/{name}.json` for flows
- **FR-004**: System MUST fetch files from GitHub using HTTPS with PAT authentication
- **FR-005**: System MUST validate fetched JSON against defined schemas before returning data
- **FR-006**: System MUST define JSON schemas for template metadata, flow node definitions, and edge connections
- **FR-007**: System MUST cache fetched files using ETag or Last-Modified headers to avoid redundant downloads
- **FR-008**: System MUST return structured error messages in format `{ code, message, source }` for all failure scenarios
- **FR-009**: System MUST NOT log or expose PATs in responses, logs, or error messages
- **FR-010**: System MUST sanitize all remote data before parsing to prevent injection attacks
- **FR-011**: System MUST support parallel fetching of multiple templates/flows [NEEDS CLARIFICATION: minimum concurrent request support - 10, 50, 100?]
- **FR-012**: System MUST use asynchronous I/O for all GitHub fetch operations
- **FR-013**: System MUST return template/flow data in MCP-compatible format consumable by FlowyPrompt
- **FR-014**: System MUST handle GitHub API rate limiting gracefully [NEEDS CLARIFICATION: rate limit handling strategy - queue, reject, retry with delay?]
- **FR-015**: System MUST validate that fetched templates contain required fields: metadata, variables, result sections
- **FR-016**: System MUST validate that fetched flows contain required fields: nodes, edges, node types (input, template, result, flow-link)
- **FR-017**: System MUST log all fetch operations with structured format (level, timestamp, module, context) for monitoring
- **FR-018**: System MUST track and expose metrics: fetch success/failure rates, validation errors, latency per operation

### Performance Requirements

- **PR-001**: Template fetch (cold) MUST complete within ≤ 2 seconds
- **PR-002**: Template fetch (cached) MUST complete within ≤ 300 ms
- **PR-003**: JSON parsing and validation MUST complete within ≤ 100 ms
- **PR-004**: End-to-end template retrieval MUST complete within ≤ 2.5 seconds

### Security Requirements

- **SR-001**: PATs MUST be stored in environment variables or secure credential stores
- **SR-002**: All GitHub connections MUST use HTTPS with secure headers
- **SR-003**: All fetched data MUST be validated and sanitized before use
- **SR-004**: Error messages MUST NOT expose internal system details or credentials

### Key Entities

- **GitHub Repository**: Represents the source repository containing templates and flows; includes URL, owner, repo name, branch/tag reference [NEEDS CLARIFICATION: support for specific branches/tags/commits?]
- **Template**: A reusable prompt template; contains metadata (name, description, version), variables (input parameters), result sections (output structure)
- **Flow**: A workflow definition; contains nodes (processing steps with types: input/template/result/flow-link), edges (connections between nodes with source/target/conditions)
- **Fetch Request**: User request for a template or flow; includes type (template|flow), name (identifier), requester context
- **Cache Entry**: Cached template/flow data; includes content, ETag, Last-Modified timestamp, expiration time [NEEDS CLARIFICATION: cache TTL policy?]
- **Validation Schema**: JSON Schema definitions for templates and flows; ensures structural integrity and required fields

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

**Outstanding Clarifications**:
1. Retry policy for network failures (max attempts, backoff strategy)
2. Concurrency handling for duplicate requests
3. Maximum file size limit for templates/flows
4. Minimum concurrent request support target
5. GitHub API rate limit handling strategy
6. Branch/tag/commit reference support for repositories
7. Cache TTL (time-to-live) policy

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (pending clarifications)

---
