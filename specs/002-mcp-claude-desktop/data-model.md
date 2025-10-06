# Data Model: MCP 프롬프트 템플릿 관리 시스템

**Feature**: 002-mcp-claude-desktop
**Date**: 2025-01-06
**Purpose**: 엔티티 정의, 관계, 상태 전이 및 검증 규칙

---

## Entity Definitions

### 1. MCP Server

**Purpose**: MCP 프로토콜을 구현하는 서버 인스턴스, Claude Desktop과 통신

**Attributes**:
```typescript
{
  name: string              // "flowyprompt-mcp-server"
  version: string           // "1.0.0" (semver)
  transport: "stdio"        // Communication method
  capabilities: {
    prompts: {}             // Prompts API support
  }
  config: {
    githubUrl: string       // GitHub repository URL
    githubPat: string       // Personal Access Token (SENSITIVE)
    githubRef: string       // Branch/tag/commit (default: "main")
    cacheTtl: number        // 900000 (15 minutes)
    maxFileSize: number     // 102400 (100KB)
  }
}
```

**Lifecycle**:
- **Initialization**: Load config from environment variables, validate
- **Connection**: Establish stdio transport with Claude Desktop
- **Running**: Handle incoming MCP requests (prompts/list, prompts/get)
- **Shutdown**: Close transport, cleanup resources

**Validation Rules**:
- `name`: Required, non-empty string
- `version`: Required, valid semver (X.Y.Z)
- `config.githubUrl`: Required, valid HTTPS URL
- `config.githubPat`: Required, starts with "ghp_" or "github_pat_"
- `config.cacheTtl`: Positive integer (ms)
- `config.maxFileSize`: Positive integer (bytes)

---

### 2. GitHub Repository

**Purpose**: 템플릿과 플로우 정의를 저장하는 버전 관리 저장소

**Attributes**:
```typescript
{
  url: string               // "https://github.com/owner/repo"
  owner: string             // "flowyprompt" (extracted from URL)
  repo: string              // "templates" (extracted from URL)
  ref: string               // "main" | "v1.0.0" | "abc123" (branch/tag/commit)
  structure: {
    templates: string       // "templates/" folder path
    flows: string           // "flows/" folder path (future)
  }
  apiBaseUrl: string        // "https://api.github.com"
}
```

**Relationships**:
- **1:1 with MCP Server**: 하나의 서버는 하나의 저장소만 관리
- **1:N with Template**: 하나의 저장소는 여러 템플릿 포함

**Operations**:
- `listTemplates()`: templates/ 폴더의 모든 .json 파일 목록 반환
- `fetchTemplate(name)`: 특정 템플릿 파일 내용 가져오기
- `validateConnection()`: GitHub API 연결 테스트 (health check)

**Validation Rules**:
- `url`: Must be valid HTTPS GitHub URL pattern
- `owner` + `repo`: Must exist and be accessible with PAT
- `ref`: Must exist in repository (branch/tag/commit)

---

### 3. Template

**Purpose**: 재사용 가능한 프롬프트 정의 (JSON 형식)

**Attributes**:
```typescript
{
  // Metadata section (required)
  metadata: {
    name: string            // "Brand_Positioning_Strategy"
    description: string     // "브랜드 포지셔닝 전략 수립"
    version: string         // "1.0.0" (semver)
    author?: string         // "FlowyPrompt Team"
    tags?: string[]         // ["marketing", "strategy", "branding"]
    category?: string       // "Business"
    lastUpdated?: string    // ISO 8601 timestamp
  }

  // Variables section (required, can be empty array)
  variables: Variable[]     // See Variable entity below

  // Results section (required, min 1 item)
  results: ResultSection[]  // See ResultSection entity below
}
```

**File Location**: `templates/{name}.json`

**JSON Schema**: Validated against `src/schemas/templateSchema.json` (existing)

**Relationships**:
- **N:1 with GitHub Repository**: 여러 템플릿은 하나의 저장소에 속함
- **1:N with Variable**: 하나의 템플릿은 여러 변수 포함
- **1:N with ResultSection**: 하나의 템플릿은 여러 결과 섹션 포함
- **1:N with Prompt**: 하나의 템플릿으로부터 여러 프롬프트 생성 가능
- **1:1 with CacheEntry**: 하나의 템플릿은 하나의 캐시 엔트리와 매핑

**Validation Rules** (enforced by templateSchema.json + code):
- `metadata.name`: Required, matches [a-zA-Z0-9_-]+ pattern
- `metadata.version`: Required, valid semver
- `variables`: Required array (can be empty)
- `results`: Required array, minimum 1 item
- Total file size ≤ 100KB

**Variable Consistency Check** (warning, not error):
- Variables defined in `variables[]` should be used in `results[].content`
- Variables used in content should be defined in `variables[]`
- Mismatch → Log warning, continue execution

---

### 4. Variable

**Purpose**: 템플릿에서 사용하는 입력 매개변수 정의

**Attributes**:
```typescript
{
  name: string              // "company_name"
  type: "string"            // ONLY string type supported (FR-009)
  description: string       // "회사 또는 브랜드 이름"
  required: boolean         // true (default: false)
  default?: string          // "My Company" (optional default value)
}
```

**Usage in Content**: `{{variable_name}}` placeholder format

**Relationships**:
- **N:1 with Template**: 여러 변수는 하나의 템플릿에 속함

**Validation Rules**:
- `name`: Required, matches [a-zA-Z0-9_]+ pattern (no spaces, hyphens)
- `type`: Required, must be exactly "string"
- `description`: Required, non-empty string
- `required`: Boolean (default: false if not specified)
- `default`: Optional, must be string if provided

**Extraction Pattern**:
```javascript
// Regex for extracting variables from content
const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;

// Valid examples:
// {{company_name}} → "company_name"
// {{target_audience}} → "target_audience"

// Invalid examples:
// {{company-name}} → Invalid (hyphen not allowed)
// {{ company_name }} → "company_name" (whitespace trimmed)
// {{{variable}}} → "variable" (extra braces ignored)
```

---

### 5. Result Section

**Purpose**: 완성된 프롬프트의 개별 섹션 (변수 플레이스홀더 포함)

**Attributes**:
```typescript
{
  name: string              // "Company Information"
  content: string           // "회사명: {{company_name}}\n산업: {{industry}}"
  format?: "text" | "markdown" | "json"  // Default: "text"
  order?: number            // Display order (default: array index)
}
```

**Content Rules**:
- Can contain multiple `{{variable}}` placeholders
- Multiline strings supported (JSON string with \n)
- Markdown formatting allowed

**Relationships**:
- **N:1 with Template**: 여러 섹션은 하나의 템플릿에 속함

**Validation Rules**:
- `name`: Required, non-empty string
- `content`: Required, non-empty string
- `format`: Optional, must be one of ["text", "markdown", "json"]
- Variables in content should be defined in template's `variables[]` (warning if not)

**Processing**:
```javascript
// Variable substitution example
const content = "회사명: {{company_name}}\n산업: {{industry}}";
const values = { company_name: "테크스타트업", industry: "AI" };

// After substitution:
// "회사명: 테크스타트업\n산업: AI"
```

---

### 6. Prompt

**Purpose**: 변수 값이 치환되어 완성된 실행 가능한 프롬프트

**Attributes**:
```typescript
{
  templateName: string      // Source template
  generatedAt: number       // Timestamp (ms)
  messages: [
    {
      role: "user"
      content: {
        type: "text"
        text: string        // Fully substituted prompt text
      }
    }
  ]
}
```

**Generation Process**:
```
1. Load Template from GitHub/Cache
2. Extract Variables from template.variables[]
3. Receive Variable Values from user (via prompts/get arguments)
4. Validate Required Variables (error if missing)
5. Substitute Variables in each ResultSection.content
6. Format as Markdown (metadata header + sections)
7. Return as MCP message
```

**Format Structure**:
```markdown
# {template.metadata.name}

{template.metadata.description}

**Version**: {template.metadata.version}
**Tags**: {template.metadata.tags.join(', ')}

---

{result[0].content (substituted)}

---

{result[1].content (substituted)}

...
```

**Relationships**:
- **N:1 with Template**: 여러 프롬프트는 하나의 템플릿으로부터 생성
- **Ephemeral**: 프롬프트는 저장되지 않음 (매번 동적 생성)

**Performance Target**:
- Generation time: < 100ms (per FR-024)
- Max prompt size: ~600KB (Claude token limit)

---

### 7. Cache Entry

**Purpose**: 템플릿 또는 템플릿 목록의 캐시된 데이터

**Attributes**:
```typescript
{
  key: string               // "template:Brand_Positioning_Strategy:main"
  content: any              // Template object or template list array
  etag: string              // GitHub ETag header for revalidation
  cachedAt: number          // Timestamp (ms)
  ttl: number               // 900000 (15 minutes)
  expiresAt: number         // cachedAt + ttl
}
```

**Key Format**:
- Template: `"template:{name}:{ref}"`
- Template list: `"template-list:{ref}"`

**Relationships**:
- **1:1 with Template**: 하나의 캐시 엔트리는 하나의 템플릿과 매핑

**Operations**:
- `get(key)`: Retrieve cached entry if not expired
- `set(key, content, etag)`: Store entry with TTL
- `invalidate(key)`: Remove specific entry
- `clear()`: Remove all entries (for testing)

**Validation Rules**:
- `key`: Required, non-empty string
- `etag`: Required, GitHub ETag format (e.g., "W/\"abc123\"")
- `ttl`: 900000ms (15 minutes, configurable)

**Expiration Strategy**:
```javascript
// Check if expired
if (Date.now() > entry.expiresAt) {
  // Revalidate with GitHub using ETag
  const response = await githubService.fetchWithETag(name, entry.etag);

  if (response.status === 304) {
    // Not Modified - refresh TTL
    entry.expiresAt = Date.now() + entry.ttl;
    return entry.content;
  } else {
    // Modified - update cache
    return response.content;
  }
}
```

---

## Entity Relationships Diagram

```
┌─────────────┐
│ MCP Server  │ 1
└──────┬──────┘
       │ owns
       │ 1
┌──────▼──────────┐
│ GitHub Repo     │ 1
└──────┬──────────┘
       │ contains
       │ N
┌──────▼──────────┐           ┌──────────────┐
│ Template        │◄──────────│ Cache Entry  │
└──────┬──────────┘ 1      1  └──────────────┘
       │
       ├─── has ───┐
       │           │
       │ N         │ N
┌──────▼──────┐ ┌─▼────────────┐
│ Variable    │ │ ResultSection│
└─────────────┘ └───────────────┘
       │              │
       │              │ used in
       │              │ N
       └──────┬───────┘
              │
              │ generates
              │ N
       ┌──────▼──────┐
       │   Prompt    │
       └─────────────┘
```

---

## State Transitions

### Template State Machine

```
┌──────────┐
│ UNCACHED │ Initial state
└────┬─────┘
     │ First fetch
     ▼
┌──────────┐
│  CACHED  │ Stored in cache with ETag
└────┬─────┘
     │ TTL expires
     ▼
┌──────────┐
│  STALE   │ Expired but ETag available
└────┬─────┘
     │ ETag revalidation
     ├─────► (304) REVALIDATED ──► CACHED (refresh TTL)
     │
     └─────► (200) MODIFIED ──► CACHED (update content + ETag)
```

### Prompt Generation State Machine

```
┌─────────────────┐
│ TEMPLATE_LOADED │ Template fetched from GitHub/Cache
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ VARIABLES_EXTRACTED  │ Parse template.variables[]
└────────┬─────────────┘
         │
         ▼
┌───────────────────┐
│ VALUES_PROVIDED   │ User inputs via prompts/get arguments
└────────┬──────────┘
         │
         │ Validate required variables
         ├─────► (missing) ERROR: MISSING_REQUIRED_VARIABLE
         │
         ▼
┌──────────────────┐
│ SUBSTITUTION     │ Replace {{placeholders}} with values
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ FORMATTED        │ Build markdown prompt
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ GENERATED        │ Return MCP message
└──────────────────┘
```

---

## Data Validation Matrix

| Entity | Field | Type | Required | Validation Rule | Error Code |
|--------|-------|------|----------|-----------------|------------|
| Template | metadata.name | string | ✅ | [a-zA-Z0-9_-]+ | INVALID_TEMPLATE |
| Template | metadata.version | string | ✅ | Semver (X.Y.Z) | INVALID_VERSION |
| Template | variables | array | ✅ | Can be empty | INVALID_TEMPLATE |
| Template | results | array | ✅ | Min 1 item | INVALID_TEMPLATE |
| Variable | name | string | ✅ | [a-zA-Z0-9_]+ | INVALID_VARIABLE |
| Variable | type | string | ✅ | Must be "string" | INVALID_TYPE |
| Variable | required | boolean | ❌ | Default: false | - |
| ResultSection | name | string | ✅ | Non-empty | INVALID_RESULT |
| ResultSection | content | string | ✅ | Non-empty | INVALID_RESULT |
| Prompt (input) | name | string | ✅ | Template exists | TEMPLATE_NOT_FOUND |
| Prompt (input) | arguments | object | ❌ | Required vars must exist | MISSING_REQUIRED_VARIABLE |

---

## Performance Constraints

| Operation | Target | Metric |
|-----------|--------|--------|
| Template fetch (cold) | ≤ 2s | GitHub API latency |
| Template fetch (cached) | ≤ 300ms | Cache lookup + validation |
| Variable extraction | < 1ms | Regex execution |
| Prompt generation | < 100ms | String substitution + formatting |
| Template validation | < 50ms | JSON schema validation |
| Cache lookup | < 5ms | In-memory hash table access |

---

## Security Considerations

### Sensitive Data

**GitHub PAT (Personal Access Token)**:
- **Storage**: Environment variable only
- **Logging**: NEVER log PAT (sanitized by logger.js)
- **Transmission**: HTTPS only, Authorization header
- **Validation**: Starts with "ghp_" or "github_pat_"

**Template Content**:
- **Sanitization**: Validate against JSON schema before storage
- **Path Traversal**: Reject template names with ".." or "/"
- **Size Limit**: Max 100KB to prevent DoS

### Input Validation

**Template Name** (from prompts/get):
```javascript
// Allowed: "Brand_Positioning_Strategy", "AI_Analysis_2024"
// Blocked: "../secrets", "/etc/passwd", "../../config"
const namePattern = /^[a-zA-Z0-9_-]+$/;
```

**Variable Values** (from prompts/get arguments):
```javascript
// All values must be strings (FR-009)
// No executable code validation needed (rendered as text)
// Max length: 10,000 characters per variable
```

---

## Data Migration Notes

**From HTTP REST API to MCP**:
- **No schema changes**: Template JSON format unchanged
- **Endpoint mapping**:
  - `POST /fetch` → `prompts/get` (MCP tool)
  - Internal: Template listing → `prompts/list` (new functionality)
- **Cache compatibility**: Existing cache entries remain valid
- **Test data**: 70 existing tests provide validation data

---

## Future Extensibility

**Flow Support** (not in current scope):
- Add `Flow` entity (similar structure to Template)
- Add `flows/` folder in GitHub repository
- Implement `flows/list` and `flows/get` tools
- Extend cache to support flow entries

**Multi-Repository Support** (future consideration):
- Change MCP Server → GitHub Repo relationship to 1:N
- Add repository selection parameter to prompts/list
- Separate cache namespaces per repository

---

**Data Model Complete**: 7 entities defined with relationships, validation rules, and state machines. Ready for contract generation and implementation.
