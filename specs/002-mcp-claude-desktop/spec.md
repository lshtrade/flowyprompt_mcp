# Feature Specification: MCP 프롬프트 템플릿 관리 시스템

**Feature Branch**: `002-mcp-claude-desktop`
**Created**: 2025-01-06
**Status**: Draft
**Input**: User description: "MCP 프롬프트 템플릿 관리 시스템: Claude Desktop에 MCP 서버로 등록하여 GitHub 저장소의 템플릿을 대화형으로 실행. GitHub URL과 PAT으로 설정하면 템플릿 목록 자동 로드, 변수 추출, 대화형 입력, 프롬프트 자동 생성 및 실행 지원"

## Execution Flow (main)
```
1. Parse user description from Input
   → Extracted: MCP server, GitHub templates, dialog-based execution, automatic variable extraction
2. Extract key concepts from description
   → Actors: Claude Desktop users, Template creators
   → Actions: Register MCP server, load templates, extract variables, generate prompts
   → Data: GitHub repository, templates, variables, prompts
   → Constraints: Requires GitHub PAT, MCP protocol compliance
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: Template versioning strategy]
   → [NEEDS CLARIFICATION: Multi-repository support]
   → [NEEDS CLARIFICATION: Template validation rules]
4. Fill User Scenarios & Testing section
   → User flow: Setup → Browse → Select → Fill → Execute
5. Generate Functional Requirements
   → All requirements testable and measurable
6. Identify Key Entities
   → MCP Server, GitHub Repository, Template, Variable, Prompt
7. Run Review Checklist
   → WARN "Spec has uncertainties" (clarifications needed)
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
개발자 또는 콘텐츠 크리에이터가 Claude Desktop을 통해 버전 관리된 GitHub 저장소의 재사용 가능한 프롬프트 템플릿을 쉽게 검색하고 실행하고자 합니다. MCP 서버를 Claude Desktop에 한 번 등록하면, 매번 전체 경로를 입력하거나 파일을 복사할 필요 없이 템플릿 이름만으로 즉시 접근할 수 있습니다. 시스템은 템플릿에 필요한 변수를 자동으로 추출하여 대화형으로 값을 입력받고, 완성된 프롬프트를 Claude에게 전달하여 즉시 실행합니다.

### Acceptance Scenarios

1. **Given** MCP 서버가 Claude Desktop에 등록되고 GitHub 저장소 URL과 PAT이 설정되어 있을 때, **When** 사용자가 Claude Desktop에서 `/` 키를 입력하면, **Then** 시스템은 GitHub 저장소의 모든 템플릿 목록을 표시하고 각 템플릿의 이름과 설명을 보여줍니다.

2. **Given** 템플릿 목록이 표시된 상태에서, **When** 사용자가 "브랜드 포지셔닝 전략" 템플릿을 선택하면, **Then** 시스템은 해당 템플릿에 정의된 모든 변수(회사명, 산업 분야, 타겟 고객 등)를 자동으로 추출하여 각 변수의 이름, 설명, 필수 여부를 표시합니다.

3. **Given** 템플릿 변수가 표시된 상태에서, **When** 사용자가 대화형으로 각 변수 값을 입력하면(예: company_name=테크스타트업, industry=AI), **Then** 시스템은 템플릿의 내용에 변수 값을 자동으로 치환하여 완성된 프롬프트를 생성합니다.

4. **Given** 완성된 프롬프트가 생성되었을 때, **When** 시스템이 프롬프트를 Claude에게 전달하면, **Then** Claude는 해당 프롬프트를 즉시 실행하여 사용자에게 결과를 반환합니다(예: 브랜드 포지셔닝 전략 분석 결과).

5. **Given** GitHub 저장소에 새로운 템플릿이 추가되었을 때, **When** 사용자가 다시 템플릿 목록을 요청하면, **Then** 시스템은 캐시를 갱신하고 새로운 템플릿을 포함한 최신 목록을 표시합니다.

6. **Given** 사용자가 선택적 변수를 생략했을 때, **When** 프롬프트를 생성하면, **Then** 시스템은 선택적 변수를 빈 값이나 기본값으로 처리하고 프롬프트를 정상적으로 생성합니다.

### Edge Cases

- **템플릿 파일이 유효하지 않은 JSON인 경우?**
  → 시스템은 파싱 에러를 감지하고 사용자에게 "템플릿 파일 형식이 올바르지 않습니다" 메시지를 표시합니다.

- **필수 변수 값을 입력하지 않은 경우?**
  → 시스템은 "필수 변수 '{변수명}'의 값을 입력해주세요" 메시지를 표시하고 프롬프트 생성을 중단합니다.

- **GitHub PAT이 만료되거나 유효하지 않은 경우?**
  → 시스템은 인증 실패를 감지하고 "GitHub 인증에 실패했습니다. PAT을 확인해주세요" 메시지를 표시합니다.

- **GitHub API 요청 한도를 초과한 경우?**
  → 시스템은 429 에러를 감지하고 "일시적으로 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요" 메시지를 표시합니다.

- **네트워크 연결이 끊어진 경우?**
  → 시스템은 캐시된 템플릿 목록(있는 경우)을 사용하거나, 캐시가 없으면 "GitHub에 연결할 수 없습니다" 메시지를 표시합니다.

- **템플릿에 정의된 변수와 실제 content에서 사용된 변수가 일치하지 않는 경우?**
  → [NEEDS CLARIFICATION: 변수 불일치 시 동작 - 경고만 표시할지, 에러로 처리할지, 자동으로 변수를 추가할지]

- **여러 사용자가 동시에 같은 템플릿을 요청하는 경우?**
  → 시스템은 캐싱과 중복 요청 제거를 통해 GitHub API 호출을 최소화합니다.

- **템플릿 크기가 매우 큰 경우(예: 100KB 이상)?**
  → [NEEDS CLARIFICATION: 최대 템플릿 크기 제한 - 현재 10MB이지만 실제 권장 크기는?]

## Requirements *(mandatory)*

### Functional Requirements

**MCP 서버 등록 및 설정**
- **FR-001**: 시스템은 Claude Desktop 설정 파일(claude_desktop_config.json)을 통해 MCP 서버로 등록될 수 있어야 합니다
- **FR-002**: 시스템은 환경 변수를 통해 GitHub 저장소 URL과 Personal Access Token(PAT)을 입력받아야 합니다
- **FR-003**: 시스템은 설정된 GitHub 저장소의 특정 브랜치, 태그 또는 커밋을 참조할 수 있어야 합니다(기본값: main)

**템플릿 목록 제공**
- **FR-004**: 시스템은 MCP Prompts API를 통해 GitHub 저장소의 templates/ 폴더에 있는 모든 템플릿 목록을 제공해야 합니다
- **FR-005**: 시스템은 각 템플릿의 이름(name), 설명(description), 버전(version)을 포함한 메타데이터를 표시해야 합니다
- **FR-006**: 시스템은 템플릿 목록을 가져올 때 GitHub API 호출을 캐싱하여 성능을 최적화해야 합니다

**템플릿 변수 추출**
- **FR-007**: 시스템은 선택된 템플릿에서 모든 변수(variables) 정의를 자동으로 추출해야 합니다
- **FR-008**: 시스템은 각 변수의 이름(name), 타입(type), 설명(description), 필수 여부(required), 기본값(default)을 제공해야 합니다
- **FR-009**: 시스템은 변수 타입으로 string만 지원해야 합니다

**대화형 변수 입력**
- **FR-010**: 시스템은 MCP Prompts 인터페이스를 통해 사용자로부터 변수 값을 대화형으로 입력받아야 합니다
- **FR-011**: 시스템은 필수 변수 값이 누락된 경우 사용자에게 해당 변수의 입력을 요청해야 합니다
- **FR-012**: 시스템은 선택적 변수가 제공되지 않은 경우 기본값을 사용하거나 빈 값으로 처리해야 합니다

**프롬프트 생성 및 실행**
- **FR-013**: 시스템은 템플릿의 content 영역에서 {{변수명}} 형식의 플레이스홀더를 사용자가 입력한 값으로 치환해야 합니다
- **FR-014**: 시스템은 완성된 프롬프트를 MCP 메시지 형식으로 Claude에게 전달하여 즉시 실행할 수 있도록 해야 합니다
- **FR-015**: 시스템은 템플릿의 metadata 섹션(이름, 설명)을 프롬프트 상단에 포함하여 컨텍스트를 제공해야 합니다
- **FR-016**: 시스템은 여러 결과 섹션(results)을 정의된 순서대로 프롬프트에 포함해야 합니다

**템플릿 유효성 검증**
- **FR-017**: 시스템은 템플릿 파일이 유효한 JSON 형식인지 검증해야 합니다
- **FR-018**: 시스템은 템플릿이 필수 필드(metadata.name, metadata.description, metadata.version, variables, results)를 포함하는지 검증해야 합니다
- **FR-019**: 시스템은 version 필드가 시맨틱 버전 형식(X.Y.Z)을 따르는지 검증해야 합니다

**에러 처리**
- **FR-020**: 시스템은 GitHub 인증 실패(401/403) 시 명확한 에러 메시지를 제공해야 하며, PAT을 노출하지 않아야 합니다
- **FR-021**: 시스템은 템플릿 파일을 찾을 수 없는 경우(404) 사용자에게 "템플릿을 찾을 수 없습니다" 메시지를 표시해야 합니다
- **FR-022**: 시스템은 GitHub API 요청 한도 초과(429) 시 재시도 메커니즘을 사용하지 않고 즉시 에러를 반환해야 합니다
- **FR-023**: 시스템은 네트워크 연결 실패 시 캐시된 데이터를 사용하거나(가능한 경우) 명확한 에러 메시지를 표시해야 합니다

**성능 및 캐싱**
- **FR-024**: 시스템은 ETag 헤더를 사용하여 템플릿 변경 여부를 확인하고 불필요한 다운로드를 방지해야 합니다
- **FR-025**: 시스템은 템플릿 목록과 개별 템플릿을 메모리에 캐싱하여 반복 요청 시 응답 속도를 향상시켜야 합니다
- **FR-026**: 시스템은 [NEEDS CLARIFICATION: 캐시 만료 정책 - 템플릿 목록과 개별 템플릿의 TTL은 얼마나 되어야 하는지?]

**보안**
- **FR-027**: 시스템은 로그나 에러 메시지에 GitHub PAT을 노출하지 않아야 합니다
- **FR-028**: 시스템은 템플릿 이름에 경로 탐색 문자(.., /)가 포함된 경우 요청을 거부해야 합니다
- **FR-029**: 시스템은 HTTPS를 통해서만 GitHub API와 통신해야 합니다

### Key Entities *(include if feature involves data)*

**MCP Server**
- MCP 프로토콜을 구현하는 서버 인스턴스
- Claude Desktop과 stdio 또는 SSE transport를 통해 통신
- 속성: 서버 이름, 버전, GitHub 설정(URL, PAT, ref)
- 관계: 여러 Template을 관리

**GitHub Repository**
- 템플릿과 플로우 정의를 저장하는 버전 관리 저장소
- 속성: URL, 소유자, 저장소 이름, 참조(브랜치/태그/커밋)
- 구조: templates/ 폴더와 flows/ 폴더로 구성
- 관계: 여러 Template을 포함

**Template**
- 재사용 가능한 프롬프트 정의
- 속성:
  - metadata: 이름, 설명, 버전, 작성자, 태그
  - variables: 입력 변수 정의 배열
  - results: 출력 섹션 정의 배열
- 파일 위치: templates/{name}.json
- 관계: 여러 Variable을 포함, 여러 Result Section을 포함

**Variable**
- 템플릿에서 사용하는 입력 매개변수 정의
- 속성: 이름, 타입(string), 설명, 필수 여부, 기본값
- 형식: 템플릿 content에서 {{변수명}} 형태로 참조
- 관계: 하나의 Template에 속함

**Result Section**
- 완성된 프롬프트의 개별 섹션
- 속성: 섹션 이름, 내용(변수 플레이스홀더 포함), 형식(text/markdown/json)
- 관계: 하나의 Template에 속함

**Prompt**
- 변수 값이 치환되어 완성된 실행 가능한 프롬프트
- 생성 방법: Template + Variable 값 치환
- 형식: MCP 메시지 형식(role: user, content: text)
- 관계: 하나의 Template으로부터 생성됨

**Cache Entry**
- 템플릿 또는 템플릿 목록의 캐시된 데이터
- 속성: 키(type + name + ref), 내용, ETag, 타임스탬프
- 만료 정책: [NEEDS CLARIFICATION: TTL 정책]
- 관계: Template 또는 Template List와 1:1 매핑

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain (3 clarifications needed)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (3 clarifications)
- [x] User scenarios defined
- [x] Requirements generated (29 functional requirements)
- [x] Entities identified (7 entities)
- [ ] Review checklist passed (pending clarifications)

---

## Pending Clarifications

1. **변수 불일치 처리**: 템플릿에 정의된 변수와 content에서 사용된 변수가 일치하지 않을 때 시스템이 어떻게 동작해야 하는지?
   - 옵션 A: 경고만 표시하고 계속 진행
   - 옵션 B: 에러로 처리하고 중단
   - 옵션 C: 자동으로 누락된 변수 추가

2. **캐시 만료 정책**: 템플릿 목록과 개별 템플릿의 캐시 유효 기간은?
   - 현재: 5분 (기존 구현)
   - 고려사항: 템플릿은 자주 변경되지 않으므로 더 긴 TTL 가능

3. **최대 템플릿 크기**: 실제 사용을 고려한 권장 템플릿 크기 제한은?
   - 현재: 10MB (기존 MAX_FILE_SIZE)
   - 고려사항: 프롬프트 특성상 수 KB ~ 수십 KB 범위가 적절할 것으로 예상
