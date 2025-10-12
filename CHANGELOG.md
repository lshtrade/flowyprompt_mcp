# Changelog

All notable changes to FlowyPrompt MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-10-07

### 🎉 Feature Release: Multi-Step Flow Execution

This release adds support for executing multi-step template chains where the output of one template automatically flows into subsequent templates.

### Added

- **MCP Tools**:
  - `flows/list`: List all available flow templates from GitHub repository
  - `flows/execute`: Execute multi-step flow chains with automatic variable mapping

- **Flow Execution Service** (`src/services/flowExecutionService.js`):
  - `executeFlow()`: Orchestrate multi-step template execution
  - Topological sort for execution ordering
  - Partial results on failure for debugging
  - Performance tracking per node execution

- **Flow Service** (`src/services/flowService.js`):
  - `parseFlow()`: Parse and validate flow JSON structures
  - `validateFlowSchema()`: JSON schema validation for flows
  - `extractTemplateNodes()`: Filter template nodes from flow
  - `validateNodeReferences()`: Validate edge source/target references

- **Flow Libraries**:
  - `src/lib/topologicalSort.js`: Graph-based execution ordering using graphlib
  - `src/lib/variableMapper.js`: Variable resolution from multiple sources

- **Flow Schema** (`src/models/flowSchema.js`):
  - JSON Schema for FlowyPrompt flow structure
  - Validation for node types (template/multi_input/result)
  - Validation for edge types (data/chain)
  - Node ID uniqueness enforcement
  - Edge reference validation

- **Enhanced GitHub Service**:
  - `listFlows()`: List all flow files from flows/ directory
  - `fetchFlow()`: Fetch specific flow definition
  - Request deduplication for flow operations
  - Retry logic with exponential backoff

### Features

- **Topological Sort**: Uses graphlib for robust cycle detection and dependency resolution
- **Variable Mapping**: Automatic variable resolution with priority (previous outputs > initial variables)
- **Circular Dependency Detection**: Prevents infinite loops before execution
- **Partial Results**: Returns intermediate results on failure for debugging
- **Performance Target**: <5s for 3-node flow chains

### Variable Naming Convention

- Previous node outputs are available as `{nodeX_result}` variables
- Example: node-1 output becomes `{node1_result}` for subsequent nodes
- Template names available as `{nodeX_template}`

### Error Handling

- Partial results included in error response when execution fails
- `failedAt` field indicates which node caused the failure
- Clear error messages for template not found, circular dependencies, missing variables

### Dependencies

- Added: `graphlib@^2.1.8` for topological sorting
- Added: `ajv@^8.17.1` for JSON schema validation
- Added: `ajv-formats@^3.0.1` for schema format validation

### Testing

- Contract tests: flows/list (7 tests), flows/execute (8 tests)
- Unit tests: topologicalSort (7 tests), variableMapper (6 tests), flowService (10 tests), flowExecutionService (7 tests)
- Integration test: end-to-end flow execution
- Test coverage: ≥85% for all new modules

### Documentation

- README updated with Flow Execution section
- Flow definition format documented
- Variable mapping examples
- Error handling examples
- Performance targets documented

### Performance

- flows/list cached fetch: <300ms
- flows/execute 3-node chain: <5s
- Individual template execution time tracking
- Topological sort overhead: negligible (<10ms)

### Breaking Changes

None. This is a backward-compatible feature addition.

### Migration

No migration needed. Existing prompt templates continue to work unchanged.

---

## [2.0.0] - 2025-01-06

### 🎉 Major Release: MCP Transformation

This release represents a complete architectural transformation from HTTP REST API to Model Context Protocol (MCP) server for Claude Desktop integration.

**Key Highlight**: ✨ No `.env` file required! All configuration is done through Claude Desktop's `claude_desktop_config.json`.

### Added

- **MCP Server**: Complete MCP server implementation with stdio transport
  - `@modelcontextprotocol/sdk` v1.19.1 integration
  - stdio transport for Claude Desktop communication
  - Server initialization with proper capabilities declaration

- **MCP Tools**:
  - `prompts/list`: List all available prompt templates from GitHub repository
  - `prompts/get`: Get specific prompt template with automatic variable substitution
  - `health_check`: MCP server health and configuration status
  - `get_metrics`: Server performance and usage metrics

- **Prompt Service** (`src/services/promptService.js`):
  - `extractVariablesFromContent()`: Automatic variable extraction using `{{variable}}` pattern
  - `validateVariables()`: Template variable validation with warning strategy
  - `validateOrWarn()`: Non-blocking validation with comprehensive logging
  - `substituteVariables()`: Variable placeholder substitution
  - `generatePrompt()`: Complete markdown-formatted prompt generation

- **Enhanced GitHub Service**:
  - `listTemplates()`: List all .json template files from GitHub repository
  - Request deduplication for list operations
  - Retry logic with exponential backoff for list endpoints

- **MCP-Specific Metrics**:
  - `promptGeneration.count`: Counter for prompt generation operations
  - `promptGeneration.latencyMs`: Histogram for generation latency
  - `mcpTools.prompts_list.count`: Counter for prompts/list tool invocations
  - `mcpTools.prompts_get.count`: Counter for prompts/get tool invocations
  - `recordMcpTool()`: Method to record tool invocations
  - `recordPromptGeneration()`: Method to record generation metrics

- **MCP Error Handling**:
  - `toMcpError()`: Convert application errors to MCP SDK error format
  - Error code mapping to MCP `ErrorCode` enum
  - Integrated with `@modelcontextprotocol/sdk/types.js`

- **Configuration**:
  - `mcp.serverName`: MCP server name configuration (default: flowyprompt-mcp-server)
  - `mcp.serverVersion`: MCP server version configuration
  - Joi schema validation for MCP config fields

### Changed

- **Cache TTL**: Increased from 5 minutes (300000ms) to 15 minutes (900000ms)
  - Rationale: Reduced GitHub API calls for template listing operations
  - Benefit: Improved performance and rate limit management

- **Max File Size**: Decreased from 10MB (10485760 bytes) to 100KB (102400 bytes)
  - Rationale: Prompt templates are typically small JSON files
  - Benefit: Faster validation and reduced memory usage

- **Entry Point** (`index.js`):
  - Replaced Express HTTP server with MCP stdio server
  - Async main function for proper MCP server initialization
  - Graceful shutdown handling for SIGTERM and SIGINT

### Deprecated

- **Express HTTP Server**: Removed in favor of MCP stdio transport
  - `src/server.js`: Express application (deprecated)
  - `src/routes/`: HTTP route handlers (deprecated)
  - `src/controllers/`: HTTP controllers (deprecated)
  - `src/middleware/`: HTTP middleware (deprecated)

### Removed

- HTTP server dependencies (Express, middleware)
- REST API endpoints (`/api/prompts/*`)
- HTTP-based authentication middleware

### Migration Guide

#### For Users

**Before (HTTP API)**:
```bash
# Start HTTP server
npm start

# Fetch template via HTTP
curl http://localhost:3000/api/prompts/template-name
```

**After (MCP Server)**:
```bash
# Configure Claude Desktop
# Add to ~/Library/Application Support/Claude/claude_desktop_config.json:
{
  "mcpServers": {
    "flowyprompt": {
      "command": "node",
      "args": ["/path/to/flowyprompt_mcp/index.js"],
      "env": {
        "GITHUB_PAT": "your_github_pat",
        "GITHUB_REPO_URL": "https://github.com/owner/repo"
      }
    }
  }
}

# Use prompts in Claude Desktop
# Templates appear automatically in Claude Desktop's prompt menu
```

#### For Developers

**Configuration Changes** (`.env` file):
```bash
# NEW: MCP Server Configuration
MCP_SERVER_NAME=flowyprompt-mcp-server
MCP_SERVER_VERSION=1.0.0

# CHANGED: Cache TTL (5min → 15min)
CACHE_TTL_MS=900000

# CHANGED: Max file size (10MB → 100KB)
MAX_FILE_SIZE=102400
```

**Code Reuse**:
- ✅ 65% of existing code reusable (services, schemas, utilities)
- ✅ GitHub service, cache service, validation service unchanged
- ✅ Logger, metrics, error handling adapted for MCP

**Breaking Changes**:
- No HTTP endpoints available
- No REST API responses
- MCP-only communication via stdio

### Performance

- **Cold template fetch**: ≤2s (includes GitHub API roundtrip)
- **Cached template fetch**: ≤300ms (memory cache hit)
- **Prompt generation**: <100ms (variable substitution + formatting)
- **Cache hit rate**: Improved with 15-minute TTL

### Security

- GitHub PAT authentication maintained
- No exposed HTTP ports (stdio only)
- Input validation via existing schema validation
- Error sanitization for MCP responses

### Testing

- Test-Driven Development approach followed
- Contract tests for MCP protocol compliance
- Unit tests for prompt service (100% coverage)
- Integration tests for stdio transport
- Quickstart validation checklist (25 test cases)

### Documentation

- JSDoc comments on all new MCP code
- README updated with MCP setup instructions
- Quickstart guide for Claude Desktop configuration
- API contracts documented in `specs/002-mcp-claude-desktop/contracts/`

### Technical Details

**Dependencies**:
- Added: `@modelcontextprotocol/sdk@^1.0.0`

**File Structure**:
```
src/
├── mcp/
│   ├── server.js              # MCP server initialization
│   ├── tools/
│   │   ├── promptsList.js     # prompts/list tool
│   │   └── promptsGet.js      # prompts/get tool
│   └── formatters/
│       └── promptFormatter.js # MCP message formatting
├── services/
│   ├── promptService.js       # NEW: Prompt generation
│   ├── githubService.js       # ENHANCED: listTemplates()
│   └── metricsService.js      # ENHANCED: MCP metrics
└── utils/
    └── errorHandler.js        # ENHANCED: MCP error mapping
```

**Constitutional Compliance**:
- ✅ Modularity: MCP layer separated from services
- ✅ Schema-First: Existing schemas reused 100%
- ✅ TDD: Tests before implementation
- ✅ Security: PAT sanitization maintained
- ✅ Performance: Caching and async I/O throughout
- ✅ UX: MCP protocol standard compliance
- ✅ Quality: ESLint, Prettier, JSDoc

### Known Issues

- None at release

### Future Enhancements

- Support for flow templates (multi-step workflows)
- Real-time template validation
- Advanced caching strategies (Redis)
- Telemetry and observability improvements

---

## [1.0.0] - 2024-12-XX

### Initial Release

- HTTP REST API for prompt template management
- GitHub repository integration
- Template caching with ETag support
- Schema validation
- Comprehensive logging and metrics

---

**Legend**:
- 🎉 Major feature
- ✅ Completed
- ⚠️ Breaking change
- 🔒 Security
- ⚡ Performance

[2.0.0]: https://github.com/owner/repo/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/owner/repo/releases/tag/v1.0.0
