<!--
=== SYNC IMPACT REPORT ===
Version Change: Initial → 1.0.0
Modified Principles: N/A (initial creation)
Added Sections:
  - Core Principles (I-VII)
  - Security & Compliance
  - Performance & Quality Standards
  - Governance
Removed Sections: N/A
Templates Status:
  ✅ .specify/templates/plan-template.md - Constitution Check section verified
  ✅ .specify/templates/spec-template.md - Requirement alignment verified
  ✅ .specify/templates/tasks-template.md - Task categorization verified
  ✅ .specify/templates/agent-file-template.md - Template structure verified
Follow-up TODOs: None
-->

# FlowyPrompt MCP Constitution

## Core Principles

### I. Modularity & Isolation
Each MCP component (fetching, validation, caching, transformation) MUST be isolated and reusable. Protocol logic MUST be separated from application logic. Components MUST NOT be tightly coupled to specific APIs (e.g., GitHub-only assumptions are prohibited).

**Rationale**: Modular architecture enables independent testing, easier maintenance, and future extensibility to support multiple data sources beyond GitHub.

### II. Schema-First Validation
Every JSON template or flow fetched from external sources MUST pass schema validation before execution. JSON Schemas MUST be defined for template metadata, flow node definitions, and edge connections/relationships. Invalid data MUST be rejected with clear error messages.

**Rationale**: Schema validation prevents runtime errors, ensures data integrity, and provides self-documenting contracts for all data structures.

### III. Test-Driven Development (NON-NEGOTIABLE)
TDD is mandatory for all features: Tests MUST be written first, user-approved, verified to fail, then implementation proceeds. The Red-Green-Refactor cycle MUST be strictly enforced. Minimum 85% code coverage is required for all core logic (fetching, parsing, validation, caching).

**Test Coverage Requirements**:
- Unit tests for all protocol logic
- Integration tests for GitHub fetch flows
- Schema validation tests for all data structures
- Mocking for all external dependencies (GitHub, network calls)
- Snapshot testing for template and flow parsing consistency

**Rationale**: TDD ensures code correctness, prevents regressions, and produces inherently testable, maintainable code.

### IV. Security-First Design
GitHub Personal Access Tokens (PATs) MUST NEVER be exposed or logged. All remote data MUST be validated and sanitized before parsing. Only HTTPS connections with secure headers are permitted. Credentials MUST be stored securely using environment variables or secure credential management systems.

**Rationale**: Security breaches can compromise user data and system integrity. Proactive security measures are non-negotiable in handling third-party authentication.

### V. Performance & Efficiency
Data fetching MUST implement caching via ETag or Last-Modified headers. Redundant fetches MUST be avoided when templates are unchanged. Asynchronous I/O MUST be used for all remote requests. Parallel fetching of ≥10 templates simultaneously MUST be supported.

**Performance Targets**:
- Template fetch (cold): ≤ 2 seconds
- Template fetch (cached): ≤ 300 ms
- Flow parsing: ≤ 100 ms
- End-to-end loading: ≤ 2.5 seconds
- Streamable operations: Partial result delivery for long operations

**Rationale**: Users expect responsive systems. Performance is a feature, and caching prevents unnecessary network overhead and API rate limiting.

### VI. User Experience Consistency
MCP-fetched templates and locally created templates MUST share identical structure and rendering logic. Node types (input, template, result, flow-link) MUST be consistent across all sources. Error messages MUST be clear, structured ({ code, message, source }), and actionable.

**UX Requirements**:
- Consistent field order and labels for template variables, result sections, input nodes
- Smooth rendering for large flows
- Keyboard navigation support
- Accessible color contrast compliance

**Rationale**: Consistency reduces cognitive load, improves learnability, and ensures accessibility for all users.

### VII. Code Quality & Maintainability
Consistent naming conventions and directory structure MUST be maintained. All public methods MUST include docstrings or JSDoc comments. Declarative configuration MUST be preferred over hard-coded logic. Code readability MUST be prioritized over cleverness.

**Documentation Requirements**:
- README with MCP server setup guide
- GitHub PAT usage and permissions explanation
- Inline comments for complex logic
- Changelog entries for each release

**Rationale**: Maintainable code reduces technical debt, accelerates onboarding, and enables long-term project sustainability.

## Security & Compliance

### Data Handling
- MUST validate all remote data before parsing
- MUST sanitize all user inputs
- MUST enforce HTTPS for all external connections
- MUST NOT log sensitive data (tokens, credentials, PII)

### Authentication
- GitHub PATs MUST be stored in environment variables
- PATs MUST have minimal required scopes
- Unauthorized access MUST return clear error messages without exposing system internals

### Error Transparency
Display clear, structured error messages for:
- Invalid schema violations
- Unauthorized GitHub access
- Connection failures
- Parsing errors

Error format: `{ code: string, message: string, source: string }`

## Performance & Quality Standards

### Continuous Integration
CI pipelines MUST enforce:
- Linting (zero warnings policy)
- Type-checking (strict mode)
- Full test suite execution (≥85% coverage)
- Merge blocking on failing checks

### Logging & Monitoring
Use structured logs with: level, timestamp, module, context.

**Track**:
- Fetch success/failure rates
- Validation errors
- Latency metrics per operation
- Error tracking integration (Sentry, OpenTelemetry)

### Scalability
- Support parallel fetching of ≥10 templates
- Asynchronous I/O for all remote requests
- Efficient memory management for large flows
- Graceful degradation under load

## Governance

### Amendment Procedure
Constitution amendments require:
1. Documented proposal with rationale
2. Impact analysis on existing features
3. Approval from project maintainers
4. Migration plan for affected code
5. Updated documentation

### Versioning Policy
Follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Backward incompatible changes, principle removals, governance redefinitions
- **MINOR**: New principles, materially expanded guidance, new sections
- **PATCH**: Clarifications, wording improvements, typo fixes

### Compliance Review
All pull requests MUST verify constitutional compliance:
- Code reviews MUST check adherence to core principles
- Complexity deviations MUST be explicitly justified
- Violations MUST be documented in PR descriptions
- Reviewers MUST reject non-compliant changes unless justified and approved

### Constitutional Authority
This constitution supersedes all other development practices, guidelines, and conventions. In case of conflict, constitutional principles take precedence. Exceptions require explicit documentation and maintainer approval.

### Development Guidance
For runtime development guidance specific to Claude Code, consult `.claude/claude/agents/project-supervisor-orchestrator.md` and related command files. Agent-specific instructions complement but do not override constitutional principles.

**Version**: 1.0.0 | **Ratified**: 2025-10-05 | **Last Amended**: 2025-10-05
