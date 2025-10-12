# FlowyPrompt MCP Server

**Version**: 2.0.0 (MCP Transformation Complete)
**Status**: Production Ready - Full MCP Protocol Support

Model Context Protocol (MCP) server for Claude Desktop integration, providing prompt template management with automatic variable extraction, substitution, and GitHub repository synchronization.

🌐 **Web App**: [flowyprompt.com](https://flowyprompt.com) - Create and manage prompt templates online

## 🎯 Features

- **🤖 Claude Desktop Integration**: Native MCP protocol support via stdio transport
- **📝 Automatic Variable Extraction**: Detects `{variable}` placeholders in templates (FlowyPrompt format)
- **🔄 Smart Caching**: 15-minute TTL with ETag revalidation from GitHub
- **⚡ High Performance**: <100ms prompt generation, <300ms cached fetches
- **🔐 Secure**: GitHub PAT authentication, input validation, no exposed ports
- **📊 Observable**: Built-in metrics and health check tools
- **✅ Test-Driven**: Comprehensive test coverage with TDD methodology

## 🚀 Quick Start

### Prerequisites

- Node.js ≥18.0.0
- npm or yarn
- GitHub Personal Access Token (PAT) with repository read access
- Claude Desktop app

#### GitHub PAT Token Permissions

When creating your GitHub Personal Access Token, ensure it has the following permissions:

**Required Scopes:**
- `repo` - Full control of private repositories
  - `repo:status` - Access commit status
  - `repo_deployment` - Access deployment status
  - `public_repo` - Access public repositories
  - `repo:invite` - Access repository invitations
  - `security_events` - Read and write security events

**Alternative (Minimal) Scopes:**
If you only need to access public repositories, you can use:
- `public_repo` - Access public repositories only

**Token Creation Steps:**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select the `repo` scope (or `public_repo` for public repos only)
4. Copy the generated token (starts with `ghp_`)
5. Use this token as the `GITHUB_PAT` value in your Claude Desktop configuration

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/flowyprompt_mcp.git
cd flowyprompt_mcp

# Install dependencies
npm install

# That's it! No .env file needed (and should NOT be created).
# All configuration MUST be done in Claude Desktop's config file.
# Creating .env will break MCP protocol (stdout pollution).
```

### Claude Desktop Configuration

**No .env file needed!** All configuration is done through Claude Desktop's config file.

Add the MCP server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "flowyprompt": {
      "command": "node",
      "args": ["/absolute/path/to/flowyprompt_mcp/index.js"],
      "env": {
        "GITHUB_PAT": "ghp_your_github_personal_access_token",
        "GITHUB_REPO_URL": "https://github.com/your-org/your-templates-repo",
        "GITHUB_REF": "main",
        "MCP_SERVER_NAME": "flowyprompt-mcp-server",
        "MCP_SERVER_VERSION": "1.0.0",
        "CACHE_TTL_MS": "900000",
        "MAX_FILE_SIZE": "102400",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Configuration Notes**:
- ✅ All environment variables are set in `claude_desktop_config.json`
- ✅ No `.env` file needed in the project directory
- ⚠️ Use absolute paths for `args` (e.g., `/Users/name/flowyprompt_mcp/index.js`)
- ⚠️ `GITHUB_PAT` and `GITHUB_REPO_URL` are required
- 💡 Example config file: See [`claude_desktop_config.example.json`](./claude_desktop_config.example.json) in the repository

### Verify Installation

1. **Restart Claude Desktop** after updating the config
2. **Check MCP connection**: Look for the 🔌 icon in Claude Desktop
3. **List prompts**: Click "+" button to see available templates
4. **Use health check**: Run the `health_check` tool to verify configuration

## 📡 MCP Features

**Note**: HTTP Streamable MCP is not yet supported. This server currently only supports stdio transport for Claude Desktop integration.

### ➕ Prompts (Quick Template Access)

Use the "+" button in Claude Desktop to access prompt templates with variable set support.

**How to use:**
1. Click the "+" button in Claude Desktop
2. Select a template from the list
3. Choose a pre-filled variable set by entering "X" in the `_useSet_XXX` field
4. Or manually enter individual variable values

**Variable Sets:**
- Templates can include pre-defined variable sets
- Each set shows a preview: `target=q, audience=w, requirements=d`
- Enter "X" in the `_useSet_var1` field to use that variable set
- All variables are automatically filled

**Benefits:**
- ✅ Quick access to templates via UI
- ✅ Pre-filled variable sets for common use cases
- ✅ Visual argument list with descriptions

---

## 🔨 MCP Tools

### prompts/list

List all available prompt templates from your GitHub repository.

**Parameters**: None (optional `ref` for git branch/tag)

**Example**:
```
Tool: prompts/list
```

**Returns**:
```json
{
  "prompts": [
    {
      "name": "Brand_Positioning_Strategy",
      "description": "Develop comprehensive brand positioning strategy",
      "arguments": [
        {"name": "company_name", "description": "Your company name", "required": true},
        {"name": "industry", "description": "Your industry", "required": true}
      ]
    }
  ]
}
```

### prompts/get

Get a specific prompt template with automatic variable substitution.

**Parameters**:
- `name` (required): Template name (without .json extension)
- `variables` (optional): Object with variable values for substitution
- `ref` (optional): Git reference (branch/tag/commit)

**Example**:
```
Tool: prompts/get
{
  "name": "Brand_Positioning_Strategy",
  "variables": {
    "company_name": "Acme Corp",
    "industry": "Technology"
  }
}
```

**Returns**:
```json
{
  "description": "Develop Solution Template",
  "content": "develop a template for Acme Corp targeting Technology with Strict requirements.",
  "arguments": [
    {"name": "_variableSet", "description": "Select a pre-filled variable set", "required": false},
    {"name": "_useSet_var1", "description": "Use \"var1\" (enter X to use): target=q, audience=w, requirements=d", "required": false},
    {"name": "target", "description": "Value for target", "required": false},
    {"name": "audience", "description": "Value for audience", "required": false},
    {"name": "requirements", "description": "Value for requirements", "required": false}
  ],
  "isError": false
}
```

### health_check

Check MCP server health and configuration status.

**Parameters**: None

**Example**:
```
Tool: health_check
```

**Returns**:
```json
{
  "status": "healthy",
  "server": {
    "name": "flowyprompt-mcp-server",
    "version": "1.0.0"
  },
  "config": {
    "githubRepo": "https://github.com/owner/repo",
    "githubRef": "main",
    "cacheType": "memory",
    "cacheTtlMs": 900000
  },
  "uptime": 3600,
  "timestamp": "2025-01-06T10:30:00.000Z"
}
```

### get_metrics

Get server performance and usage metrics.

**Parameters**: None

**Example**:
```
Tool: get_metrics
```

**Returns**:
```json
{
  "requests": {
    "total": 42,
    "success": 40,
    "errors": 2,
    "byType": {"template": 42, "flow": 0}
  },
  "cache": {
    "hits": 30,
    "misses": 12,
    "hitRate": 71
  },
  "latency": {
    "min": 45,
    "max": 1850,
    "avg": 180,
    "p50": 120,
    "p95": 850,
    "p99": 1600
  },
  "mcp": {
    "promptGeneration": {
      "count": 40,
      "latencyMs": {"min": 12, "max": 95, "avg": 35}
    },
    "tools": {
      "prompts_list": {"count": 5, "errors": 0},
      "prompts_get": {"count": 40, "errors": 2}
    }
  }
}
```

### get_variable_sets

Get pre-filled variable value sets for a template.

**Parameters**:
- `name` (required): Template name (without .json extension)
- `setName` (optional): Specific variable set name to get filled template
- `ref` (optional): Git reference (branch/tag/commit)

**Example 1 - List all variable sets**:
```
Tool: get_variable_sets
{
  "name": "Develop_Solution_Template"
}
```

**Returns**:
```json
{
  "template": "Develop_Solution_Template",
  "sets": [
    {
      "id": "77eae1c3-67ef-4124-8eb1-02e129709a07",
      "name": "var1",
      "description": "",
      "variables": {
        "target": "q",
        "audience": "w",
        "requirements": "d"
      },
      "variableCount": 3
    }
  ],
  "totalSets": 1
}
```

**Example 2 - Get specific variable set with filled template**:
```
Tool: get_variable_sets
{
  "name": "Develop_Solution_Template",
  "setName": "var1"
}
```

**Returns**:
```json
{
  "template": "Develop_Solution_Template",
  "setName": "var1",
  "description": "",
  "variables": {
    "target": "q",
    "audience": "w",
    "requirements": "d"
  },
  "filledTemplate": "develop a template for q targeting w with d."
}
```

---

## 🔗 Flow Execution

Execute multi-step template chains where the output of one template automatically flows into the input variables of subsequent templates.

### flows/list

List all available flow templates from your GitHub repository.

**Parameters**:
- `includeMetadata` (optional): Include created/updated timestamps. Default: true
- `ref` (optional): Git reference (branch/tag/commit)

**Example**:
```
Tool: flows/list
```

**Returns**:
```json
{
  "flows": [
    {
      "name": "Marketing_Strategy",
      "description": "Generate comprehensive marketing strategy with market analysis and content plan",
      "version": "1.0.0",
      "nodeCount": 3,
      "created": "2025-01-06T10:00:00.000Z",
      "updated": "2025-01-06T10:00:00.000Z"
    }
  ],
  "cached": false
}
```

### flows/execute

Execute a multi-step flow where template outputs feed into subsequent template inputs.

**Parameters**:
- `flowName` (required): Flow name (without .json extension)
- `initialVariables` (required): Initial variable values for the flow
- `ref` (optional): Git reference (branch/tag/commit)

**Example**:
```
Tool: flows/execute
{
  "flowName": "Simple_Chain",
  "initialVariables": {
    "topic": "Artificial Intelligence in Healthcare"
  }
}
```

**Returns**:
```json
{
  "flowName": "Simple_Chain",
  "executionId": "Simple_Chain_1704539400000",
  "intermediateResults": [
    {
      "nodeId": "node-1",
      "templateName": "Topic_Analysis",
      "inputVariables": {
        "topic": "Artificial Intelligence in Healthcare"
      },
      "output": "AI in healthcare analysis...",
      "executionTimeMs": 450,
      "timestamp": "2025-01-06T10:30:00.000Z"
    },
    {
      "nodeId": "node-2",
      "templateName": "Content_Summarizer",
      "inputVariables": {
        "topic": "Artificial Intelligence in Healthcare",
        "node1_result": "AI in healthcare analysis..."
      },
      "output": "Summary of AI in healthcare...",
      "executionTimeMs": 380,
      "timestamp": "2025-01-06T10:30:01.000Z"
    }
  ],
  "finalResult": "Summary of AI in healthcare...",
  "totalExecutionTimeMs": 830,
  "status": "success"
}
```

**Variable Mapping**:
- Previous node outputs are automatically available as `{nodeX_result}` variables
- Example: node-1's output becomes `{node1_result}` for subsequent nodes
- Initial variables remain available throughout the flow

**Error Handling**:
- If a template execution fails, partial results are returned
- The `failedAt` field indicates which node failed
- Example error response:
```json
{
  "code": "TEMPLATE_NOT_FOUND",
  "message": "Template not found: InvalidTemplate",
  "partialResults": [
    {
      "nodeId": "node-1",
      "templateName": "Topic_Analysis",
      "output": "AI in healthcare analysis...",
      "executionTimeMs": 450
    }
  ],
  "failedAt": {
    "nodeId": "node-2",
    "templateName": "InvalidTemplate",
    "error": "Template not found"
  }
}
```

**Flow Definition Example**:

Flows are JSON files stored under `flows/` in your GitHub repository, named as `flows/<Flow_Name>.json`.

```json
{
  "metadata": {
    "name": "Simple_Chain",
    "description": "Two-step content analysis flow",
    "version": "1.0.0"
  },
  "nodes": [
    {
      "id": "node-1",
      "type": "template",
      "data": {
        "label": "Topic Analysis",
        "selectedTemplateId": "Topic_Analysis",
        "variables": ["topic"]
      }
    },
    {
      "id": "node-2",
      "type": "template",
      "data": {
        "label": "Summarizer",
        "selectedTemplateId": "Content_Summarizer",
        "variables": ["topic", "node1_result"]
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "node-1",
      "target": "node-2",
      "type": "chain"
    }
  ]
}
```

**Key Features**:
- ✅ Topological sort ensures correct execution order
- ✅ Circular dependency detection prevents infinite loops
- ✅ Partial results returned on failure for debugging
- ✅ Performance target: <5s for 3-node chains

---

## 🏗️ Template Format

Templates are JSON files stored under `templates/` in your GitHub repository, named as `templates/<Template_Name>.json`.

This server supports the FlowyPrompt export structure. At minimum, place a top-level object with a `templates` array and store your prompt in the first element using `{variable}` placeholders and optional `variableValueSets`.

**Example Template**: `templates/Develop_Solution_Template.json`

```json
{
  "metadata": {
    "version": "2.0",
    "exportDate": "2025-10-06T06:21:00.659Z",
    "templateCount": 1,
    "includeImages": false,
    "imageCount": 0,
    "fileName": "Develop_Solution_Template.json",
    "source": "FlowyPrompt Web App"
  },
  "templates": [
    {
      "id": "1758694568593",
      "title": "Develop Solution Template",
      "template": "develop a template for {target} targeting {audience} with {requirements}.",
      "variables": ["target", "audience", "requirements"],
      "createdAt": "2025-09-24T06:16:08.593Z",
      "updatedAt": "2025-10-06T06:20:26.966Z",
      "version": 2,
      "variableValueSets": [
        {
          "id": "77eae1c3-67ef-4124-8eb1-02e129709a07",
          "name": "var1",
          "description": "",
          "values": {"target": "q", "audience": "w", "requirements": "d"},
          "images": [],
          "result": "",
          "createdAt": "2025-10-06T06:20:26.962Z",
          "updatedAt": "2025-10-06T06:20:26.962Z"
        }
      ]
    }
  ]
}
```

**Variable Syntax**: Use `{variable}` placeholders
**Variable Sets**: Select via `_variableSet` or `_useSet_<name>` in tool inputs
**Caching**: Templates are cached with ETag-based revalidation

## 🏗️ Architecture

### System Architecture

```
┌─────────────────┐
│  Claude Desktop │
└────────┬────────┘
         │ stdio
         ↓
┌─────────────────────────────────────┐
│     FlowyPrompt MCP Server          │
│  ┌──────────────────────────────┐   │
│  │   MCP Protocol Layer         │   │
│  │  - prompts/list handler      │   │
│  │  - prompts/get handler       │   │
│  │  - health/metrics tools      │   │
│  └──────────────┬───────────────┘   │
│                 │                    │
│  ┌──────────────▼───────────────┐   │
│  │   Service Layer              │   │
│  │  - promptService             │   │
│  │  - githubService             │   │
│  │  - cacheService              │   │
│  │  - metricsService            │   │
│  └──────────────┬───────────────┘   │
│                 │                    │
│  ┌──────────────▼───────────────┐   │
│  │   Utilities                  │   │
│  │  - logger, error handler     │   │
│  │  - config, validation        │   │
│  └──────────────────────────────┘   │
└──────────────┬──────────────────────┘
               │ HTTPS
               ↓
        ┌─────────────┐
        │ GitHub API  │
        │  (templates)│
        └─────────────┘
```

### Directory Structure

```
flowyprompt_mcp/
├── src/
│   ├── mcp/
│   │   ├── server.js              # MCP server initialization
│   │   ├── tools/
│   │   │   ├── promptsList.js     # prompts/list tool
│   │   │   └── promptsGet.js      # prompts/get tool
│   │   └── formatters/
│   │       └── promptFormatter.js # MCP message formatting
│   ├── services/
│   │   ├── promptService.js       # Variable extraction & substitution
│   │   ├── githubService.js       # GitHub API integration
│   │   ├── cacheService.js        # Template caching
│   │   ├── metricsService.js      # Performance metrics
│   │   └── validationService.js   # Schema validation
│   ├── utils/
│   │   ├── logger.js              # Structured logging
│   │   └── errorHandler.js        # Error management
│   └── config/
│       └── index.js               # Configuration loader
├── tests/
│   ├── unit/                      # Unit tests
│   ├── mcp/                       # MCP integration tests
│   └── contract/                  # Contract tests
├── specs/
│   └── 002-mcp-claude-desktop/    # Design documents
├── index.js                       # Entry point
├── package.json
└── .env.example
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| MCP SDK | `@modelcontextprotocol/sdk` v1.19.1 | MCP protocol implementation |
| Runtime | Node.js v18+ | ES modules, native fetch API |
| Transport | stdio | Claude Desktop communication |
| Caching | In-memory | Template caching (15min TTL) |
| Validation | AJV | JSON schema validation |
| Testing | Jest | Unit and integration testing |
| Logging | Winston | Structured JSON logging |
| HTTP Client | Native fetch | GitHub API requests |

## ⚙️ Configuration

### Environment Variables

All environment variables are configured in `claude_desktop_config.json` under the `env` section. No `.env` file is needed.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_REPO_URL` | ✅ | - | GitHub repository URL (e.g., `https://github.com/owner/repo`) |
| `GITHUB_PAT` | ✅ | - | Personal Access Token for GitHub API |
| `GITHUB_REF` | | `main` | Branch/tag/commit reference |
| `MCP_SERVER_NAME` | | `flowyprompt-mcp-server` | MCP server identifier |
| `MCP_SERVER_VERSION` | | `1.0.0` | MCP server version |
| `CACHE_TTL_MS` | | `900000` | Cache TTL in milliseconds (15 minutes) |
| `MAX_FILE_SIZE` | | `102400` | Max template size in bytes (100KB) |
| `LOG_LEVEL` | | `info` | Logging level (debug/info/warn/error) |
| `RETRY_ATTEMPTS` | | `3` | GitHub API retry attempts |
| `MAX_CONCURRENT_REQUESTS` | | `20` | Concurrent request limit |

**Note**: For local development/testing, you can optionally create a `.env` file, but it's not required for Claude Desktop usage.

### Cache Configuration

The MCP server uses in-memory caching with ETag-based revalidation:

- **TTL**: 15 minutes (configurable via `CACHE_TTL_MS`)
- **Strategy**: Cache-aside with automatic revalidation
- **Invalidation**: ETag-based, sends `If-None-Match` header
- **Performance**: 304 responses return cached content instantly

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Specific test file
npm test tests/unit/promptService.test.js

# Watch mode
npm run test:watch
```

### Test Coverage

- **Unit Tests**: promptService (100% coverage)
- **Contract Tests**: MCP protocol compliance
- **Integration Tests**: stdio transport, cache revalidation
- **Performance Tests**: Prompt generation <100ms

**Target Coverage**: ≥85% (per project constitution)

## 📊 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Cold template fetch | ≤2s | ✅ Achieved |
| Cached template fetch | ≤300ms | ✅ Achieved |
| Prompt generation | <100ms | ✅ Achieved |
| Concurrent requests | ≥20 | ✅ Supported |
| Cache hit rate | ≥70% | ✅ Typical: 70-80% |

## 🔐 Security

- **GitHub PAT Protection**: PAT automatically sanitized in all logs
- **Input Validation**: All inputs validated against JSON schemas
- **No Network Exposure**: stdio-only, no HTTP ports opened
- **Path Traversal Prevention**: Template names validated with regex
- **Error Sanitization**: Sensitive details removed from error messages

## 🐛 Troubleshooting

### MCP Server Not Appearing in Claude Desktop

1. **Check config file path**:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Verify absolute paths**: Use full paths, not relative (e.g., `/Users/name/project/index.js`)

3. **Check logs**:
   ```bash
   tail -f ~/.local/state/claude/logs/mcp*.log
   ```

4. **Test manually**:
   ```bash
   node index.js
   # Should start without errors
   ```

### Templates Not Loading

1. **Verify GitHub credentials**:
   ```bash
   # Test GitHub access
   curl -H "Authorization: token $GITHUB_PAT" \
        https://api.github.com/repos/owner/repo/contents/templates
   ```

2. **Check template format**: Ensure JSON is valid and follows schema

3. **Use health_check tool**: Verify GitHub connectivity in Claude Desktop

### Performance Issues

1. **Check cache hit rate**: Use `get_metrics` tool
2. **Verify network latency**: Test GitHub API response times
3. **Review logs**: Check for retry attempts or errors

## 📚 Related Documentation

- **Implementation Plan**: `specs/002-mcp-claude-desktop/plan.md`
- **Task Breakdown**: `specs/002-mcp-claude-desktop/tasks.md`
- **Data Model**: `specs/002-mcp-claude-desktop/data-model.md`
- **API Contracts**: `specs/002-mcp-claude-desktop/contracts/`
- **Research Decisions**: `specs/002-mcp-claude-desktop/research.md`
- **Quickstart Guide**: `specs/002-mcp-claude-desktop/quickstart.md`
- **CHANGELOG**: `CHANGELOG.md`

## 🤝 Contributing

This project follows **Test-Driven Development** principles:

1. Write failing tests first (RED)
2. Implement minimal code to pass (GREEN)
3. Refactor for quality (REFACTOR)

All contributions must:
- Include comprehensive tests
- Maintain ≥85% code coverage
- Follow ESLint and Prettier conventions
- Include JSDoc comments
- Update CHANGELOG.md

## 📜 Constitutional Compliance

This implementation adheres to the FlowyPrompt MCP Constitution v1.0.0:

- ✅ **I. Modularity & Isolation**: Layered architecture (MCP/Service/Utility)
- ✅ **II. Schema-First Validation**: AJV validation for all templates
- ✅ **III. Test-Driven Development**: Tests written before implementation
- ✅ **IV. Security-First Design**: PAT protection, input validation, no exposed ports
- ✅ **V. Performance & Efficiency**: Caching, async I/O, <100ms prompt generation
- ✅ **VI. UX Consistency**: Standardized MCP protocol, clear error messages
- ✅ **VII. Code Quality**: ESLint, Prettier, JSDoc, 100% test coverage for core services

## 📄 License

MIT License - FlowyPrompt Team

## 🙏 Acknowledgments

- Built with [MCP SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- Designed for [Claude Desktop](https://claude.ai/desktop)
- Follows [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

---

**Built with Claude Code** using Test-Driven Development and constitutional governance principles.

**Version 2.0.0** - Complete MCP transformation from HTTP REST API
