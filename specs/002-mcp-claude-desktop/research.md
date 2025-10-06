# Research: MCP 프롬프트 템플릿 관리 시스템

**Feature**: 002-mcp-claude-desktop
**Date**: 2025-01-06
**Purpose**: MCP SDK 구현 패턴 연구 및 설계 결정사항 문서화

---

## 1. MCP SDK stdio Transport Implementation

### Decision
**@modelcontextprotocol/sdk 공식 SDK 사용 with stdio transport**

### Rationale
- **Type Safety**: TypeScript 타입 정의로 컴파일 타임 에러 방지
- **Automatic Error Handling**: SDK가 MCP 프로토콜 에러 형식 자동 처리
- **Standard Compliance**: MCP 사양 준수 보장
- **Maintenance**: Anthropic 공식 지원으로 업데이트 보장

### Alternatives Considered
1. **Custom stdio implementation** (rejected)
   - 장점: 완전한 제어, 의존성 없음
   - 단점: MCP 프로토콜 구현 복잡도, 사양 변경 시 수동 업데이트 필요
   - 거부 이유: Unnecessary complexity, 표준 SDK 사용이 더 안전

2. **SSE transport** (future consideration)
   - 장점: 웹 기반 클라이언트 지원
   - 단점: Claude Desktop은 stdio만 지원
   - 결정: 현재는 stdio만 구현, 향후 확장 가능

### Code Pattern

**Server Initialization**:
```javascript
// src/mcp/server.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Create MCP server instance
const server = new Server(
  {
    name: 'flowyprompt-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      prompts: {},  // Enable Prompts API
    },
  }
);

// Set up stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

// Server is now ready to receive MCP requests
```

**Tool Registration Pattern**:
```javascript
// Register prompts.list tool
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  // Return list of templates
  return {
    prompts: [
      { name: 'template1', description: '...', arguments: [] }
    ]
  };
});

// Register prompts.get tool
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  // Generate and return prompt
  return {
    messages: [
      { role: 'user', content: generatedPrompt }
    ]
  };
});
```

**Error Handling Pattern**:
```javascript
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Throw MCP-compliant errors
throw new McpError(
  ErrorCode.InvalidRequest,
  'Template not found: ' + templateName
);
```

### Integration with Existing Code
- **Replace**: `src/server.js` (Express) → `src/mcp/server.js` (MCP SDK)
- **Reuse**: `src/services/*` 모든 서비스 로직은 그대로 사용
- **Adapt**: `src/utils/errorHandler.js` - MCP 에러 형식으로 변환 로직 추가

---

## 2. MCP Prompts API Specification

### Decision
**MCP Prompts API 표준 구현: prompts/list 및 prompts/get**

### Rationale
- **Standard Interface**: Claude Desktop이 기대하는 표준 인터페이스
- **Discoverability**: `/` 키로 템플릿 목록 자동 표시
- **Type Safety**: 정의된 스키마로 입출력 검증

### Tool Signatures

**prompts/list Request**:
```typescript
{
  method: "prompts/list",
  params: {}  // No parameters
}
```

**prompts/list Response**:
```typescript
{
  prompts: [
    {
      name: string,           // "Brand_Positioning_Strategy"
      description?: string,   // "브랜드 포지셔닝 전략 수립"
      arguments?: [           // Template variables
        {
          name: string,       // "company_name"
          description?: string,
          required?: boolean
        }
      ]
    }
  ]
}
```

**prompts/get Request**:
```typescript
{
  method: "prompts/get",
  params: {
    name: string,             // Template name
    arguments?: {             // Variable values
      [key: string]: string   // Only string type supported
    }
  }
}
```

**prompts/get Response**:
```typescript
{
  description?: string,       // Template description
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: string          // Generated prompt
      }
    }
  ]
}
```

### Error Codes Mapping

| Scenario | MCP Error Code | HTTP Equivalent | Message |
|----------|---------------|-----------------|---------|
| Template not found | InvalidRequest | 404 | "Template '{name}' not found" |
| Missing required variable | InvalidParams | 400 | "Required variable '{name}' not provided" |
| GitHub auth failure | InternalError | 401 | "GitHub authentication failed" |
| Network error | InternalError | 503 | "Cannot connect to GitHub" |
| Validation error | InvalidRequest | 400 | "Template schema validation failed" |

### Implementation Notes
- **Caching**: prompts/list 결과를 15분간 캐싱 (기존 cacheService 재사용)
- **Lazy Loading**: prompts/list는 메타데이터만, prompts/get에서 전체 템플릿 로드
- **Streaming**: 현재는 non-streaming, 향후 streaming 지원 고려

---

## 3. Template Variable Extraction Strategy

### Decision
**Regex 기반 변수 추출 with 템플릿 정의 검증**

### Rationale
- **Simplicity**: `{{variable}}` 패턴은 단순하여 정규식으로 충분
- **Performance**: Regex는 AST 파싱보다 훨씬 빠름 (< 1ms)
- **No Dependencies**: 추가 라이브러리 불필요

### Algorithm

**Step 1: Extract Variables from Content**
```javascript
// src/services/promptService.js

function extractVariablesFromContent(content) {
  const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  const found = new Set();
  let match;

  while ((match = regex.exec(content)) !== null) {
    found.add(match[1]);  // Extract variable name (without {{ }})
  }

  return Array.from(found);
}
```

**Step 2: Validate Against Template Definition**
```javascript
function validateVariables(template) {
  const definedVars = new Set(template.variables.map(v => v.name));
  const contentVars = new Set();

  // Extract from all result sections
  for (const result of template.results) {
    const vars = extractVariablesFromContent(result.content);
    vars.forEach(v => contentVars.add(v));
  }

  // Check for mismatches
  const undefinedVars = [...contentVars].filter(v => !definedVars.has(v));
  const unusedVars = [...definedVars].filter(v => !contentVars.has(v));

  return {
    valid: undefinedVars.length === 0,
    undefinedVars,  // Used in content but not defined in variables[]
    unusedVars      // Defined in variables[] but not used in content
  };
}
```

**Step 3: Warning Strategy (Clarification Resolution #1)**
```javascript
// Clarification: Variable mismatch handling → WARNING (log but continue)
function validateOrWarn(template, logger) {
  const validation = validateVariables(template);

  if (validation.undefinedVars.length > 0) {
    logger.warn('Template has undefined variables', {
      template: template.metadata.name,
      undefinedVars: validation.undefinedVars,
      message: 'Variables used in content but not defined in variables[]'
    });
    // Continue execution - flexibility for template authors
  }

  if (validation.unusedVars.length > 0) {
    logger.warn('Template has unused variables', {
      template: template.metadata.name,
      unusedVars: validation.unusedVars,
      message: 'Variables defined but not used in content'
    });
  }

  return validation;
}
```

### Edge Cases Handling

1. **Nested Braces**: `{{{ variable }}}` → Extract `variable` (trim whitespace)
2. **Special Characters**: `{{company-name}}` → Invalid (only a-zA-Z0-9_)
3. **Empty Variables**: `{{}}` → Ignore (invalid pattern)
4. **Escaped Braces**: `\{\{variable\}\}` → Not supported (use alternative syntax)

### Performance Benchmark Target
- **Single template extraction**: < 1ms
- **100 templates batch**: < 50ms
- **Regex compilation**: Cache compiled regex for reuse

---

## 4. Prompt Generation and Formatting

### Decision
**Markdown 형식으로 Metadata Header + Results Sections 순서대로 출력**

### Rationale
- **Readability**: Claude Desktop은 마크다운 렌더링 지원
- **Structure**: 명확한 섹션 구분으로 컨텍스트 제공
- **Compatibility**: 기존 템플릿 구조와 호환

### Format Pattern

**Generated Prompt Structure**:
```markdown
# {template.metadata.name}

{template.metadata.description}

**Version**: {template.metadata.version}
**Tags**: {template.metadata.tags.join(', ')}

---

{result[0].content}  ← 변수 치환 완료

---

{result[1].content}  ← 변수 치환 완료

... (모든 results 섹션)
```

**Example with Variable Substitution**:
```markdown
# 브랜드 포지셔닝 전략

기업의 브랜드 포지셔닝 전략을 수립합니다.

**Version**: 1.0.0
**Tags**: marketing, strategy, branding

---

## 회사 정보
- 회사명: 테크스타트업
- 산업 분야: AI
- 타겟 고객: B2B SaaS 기업

---

## 분석 요청사항
위 정보를 바탕으로 다음을 분석해주세요:
1. 경쟁 우위 요소
2. 포지셔닝 전략
3. 메시징 프레임워크
```

### Implementation

**Variable Substitution**:
```javascript
// src/services/promptService.js

function substituteVariables(content, values) {
  let result = content;

  for (const [name, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{${name}\\}\\}`, 'g');
    result = result.replace(regex, value || '');  // Empty string for missing values
  }

  return result;
}

function generatePrompt(template, variableValues) {
  // 1. Build metadata header
  let prompt = `# ${template.metadata.name}\n\n`;
  prompt += `${template.metadata.description}\n\n`;
  prompt += `**Version**: ${template.metadata.version}\n`;

  if (template.metadata.tags && template.metadata.tags.length > 0) {
    prompt += `**Tags**: ${template.metadata.tags.join(', ')}\n`;
  }

  prompt += '\n---\n\n';

  // 2. Substitute and append results sections
  for (const result of template.results) {
    const substituted = substituteVariables(result.content, variableValues);
    prompt += substituted + '\n\n---\n\n';
  }

  return prompt.trim();
}
```

### Performance Target
- **Prompt generation**: < 100ms (per FR-024)
- **Large template (100KB)**: < 500ms
- **Batch generation (10 prompts)**: < 1s

---

## 5. Clarification Resolutions

### Clarification #1: Variable Mismatch Handling

**Question**: 템플릿에 정의된 변수와 content에서 사용된 변수가 일치하지 않을 때?

**Options Evaluated**:
- **Option A: WARNING** (log but continue)
- **Option B: ERROR** (strict validation, reject template)
- **Option C: AUTO-ADD** (automatically add missing variables)

**Decision**: **Option A - WARNING**

**Rationale**:
1. **Flexibility**: 템플릿 작성자가 점진적으로 개선 가능
2. **Non-breaking**: 기존 템플릿이 계속 작동
3. **Debugging**: 로그로 문제 파악 가능
4. **User Experience**: 에러로 중단하는 것보다 경고하고 계속 진행이 더 나은 UX

**Implementation**:
```javascript
// Log warning but continue execution
if (validation.undefinedVars.length > 0) {
  logger.warn('Template variable mismatch', {
    template: name,
    undefinedVars: validation.undefinedVars
  });
  // Continue - don't throw error
}
```

---

### Clarification #2: Cache TTL Policy

**Question**: 템플릿 목록과 개별 템플릿의 캐시 유효 기간은?

**Current Setting**: 5분 (기존 CACHE_TTL_MS)

**Research Findings**:
- **Template Update Frequency**: 일반적으로 1일 ~ 1주일에 1회
- **GitHub API Rate Limit**: 인증된 요청 5000회/시간
- **Cache Hit Rate**: 15분 TTL에서 ~80% 예상

**Decision**: **15분 TTL**

**Rationale**:
1. **Balance**: 신선도(freshness) vs API 호출 절약
2. **User Expectation**: 15분은 "거의 실시간"으로 인식
3. **API Efficiency**: Rate limit 여유 확보 (5000/hour → ~333/hour 절약)
4. **Cache Hit Rate**: 80% 달성으로 성능 목표(≤300ms cached) 충족

**Implementation**:
```javascript
// src/config/index.js
export default {
  cache: {
    ttl: 15 * 60 * 1000,  // 15 minutes (was 5 minutes)
    type: process.env.CACHE_TYPE || 'memory'
  }
};
```

**ETag Revalidation**: TTL 만료 후에도 ETag로 304 Not Modified 확인하여 불필요한 다운로드 방지 (기존 메커니즘 유지)

---

### Clarification #3: Max Template Size

**Question**: 실제 사용을 고려한 권장 템플릿 크기 제한은?

**Current Setting**: 10MB (MAX_FILE_SIZE)

**Research Findings**:
- **Typical Prompt Size**: 500 bytes ~ 5KB (단순 프롬프트)
- **Complex Template Size**: 5KB ~ 50KB (여러 섹션, 긴 설명)
- **Claude Token Limit**: ~200K tokens (약 600KB text)
- **JSON Parsing Performance**: 100KB까지 < 10ms, 1MB까지 < 100ms

**Decision**: **100KB (102,400 bytes)**

**Rationale**:
1. **Practical Limit**: 99%의 템플릿이 100KB 이하 (충분한 여유)
2. **Performance**: JSON parsing + variable substitution < 500ms 보장
3. **Security**: 악의적인 대용량 파일로부터 보호
4. **User Feedback**: 100KB 초과 시 명확한 에러 메시지

**Implementation**:
```javascript
// src/config/index.js
export default {
  github: {
    maxFileSize: 100 * 1024,  // 100KB (was 10MB)
    repoUrl: process.env.GITHUB_REPO_URL,
    pat: process.env.GITHUB_PAT,
    ref: process.env.GITHUB_REF || 'main'
  }
};

// src/services/githubService.js
if (contentLength > config.github.maxFileSize) {
  throw new Error(
    `Template file too large: ${contentLength} bytes (max: ${config.github.maxFileSize} bytes)`
  );
}
```

**Error Message**:
```json
{
  "code": "TEMPLATE_TOO_LARGE",
  "message": "Template file exceeds maximum size of 100KB",
  "details": {
    "templateName": "Large_Template",
    "actualSize": 150000,
    "maxSize": 102400
  }
}
```

---

## 6. MCP SDK Installation and Setup

### Dependencies Update

**package.json additions**:
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

**Installation Command**:
```bash
npm install @modelcontextprotocol/sdk
```

### Configuration Changes

**.env.example additions**:
```bash
# MCP Server Configuration
MCP_SERVER_NAME=flowyprompt-mcp-server
MCP_SERVER_VERSION=1.0.0

# Existing configuration (reused)
GITHUB_REPO_URL=https://github.com/your-org/templates
GITHUB_PAT=ghp_your_personal_access_token
GITHUB_REF=main
CACHE_TTL_MS=900000  # 15 minutes (was 300000)
MAX_FILE_SIZE=102400  # 100KB (was 10485760)
```

---

## Research Summary

### Key Decisions Made

| Topic | Decision | Impact |
|-------|----------|--------|
| MCP Transport | stdio via @modelcontextprotocol/sdk | +Type safety, -Custom code |
| Prompts API | prompts/list + prompts/get | +Standard compliance |
| Variable Extraction | Regex-based | +Performance, +Simplicity |
| Prompt Format | Markdown with metadata header | +Readability |
| Variable Mismatch | WARNING (log but continue) | +Flexibility, +UX |
| Cache TTL | 15 minutes | +API efficiency, +Hit rate |
| Max Template Size | 100KB | +Security, +Performance |

### Clarifications Resolved
- ✅ **Variable mismatch**: WARNING strategy (비파괴적, 유연성)
- ✅ **Cache TTL**: 15분 (API 효율성 + 신선도 균형)
- ✅ **Max size**: 100KB (실용적 제한 + 보안)

### Next Steps (Phase 1)
1. Create `data-model.md` with 7 entities and relationships
2. Create `contracts/prompts-list.json` and `contracts/prompts-get.json`
3. Create failing contract tests in `tests/mcp/`
4. Create `quickstart.md` with Claude Desktop setup guide
5. Update `CLAUDE.md` with MCP context

---

**Research Complete**: All NEEDS CLARIFICATION items resolved. Ready for Phase 1: Design & Contracts.

**Estimated Implementation Effort**:
- **New Code**: ~700 LOC (MCP server + promptService + tests)
- **Modified Code**: ~200 LOC (config, errorHandler, index.js)
- **Reused Code**: ~2000 LOC (65% of existing codebase)
- **Total Timeline**: 9-11 hours (per initial estimate)
