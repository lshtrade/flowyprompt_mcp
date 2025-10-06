# MCP 프롬프트 템플릿 시스템 - 빠른 시작 가이드

**Feature**: 002-mcp-claude-desktop
**Version**: 1.0.0
**Last Updated**: 2025-01-06

---

## 📋 목차

1. [필수 요구사항](#필수-요구사항)
2. [MCP 서버 설치](#1-mcp-서버-설치)
3. [GitHub 설정](#2-github-설정)
4. [Claude Desktop 설정](#3-claude-desktop-설정)
5. [서버 실행 및 검증](#4-서버-실행-및-검증)
6. [사용 방법](#5-사용-방법)
7. [문제 해결](#6-문제-해결)
8. [검증 테스트 체크리스트](#7-검증-테스트-체크리스트)

---

## 필수 요구사항

### 소프트웨어 요구사항
- **Node.js**: 18.0.0 이상 (확인: `node --version`)
- **npm**: 9.0.0 이상 (확인: `npm --version`)
- **Claude Desktop**: 최신 버전
- **Git**: (선택사항) 저장소 클론용

### GitHub 요구사항
- **GitHub 계정**: 템플릿 저장소 접근 권한
- **Personal Access Token (PAT)**:
  - Scope: `repo` (전체 저장소 접근) 또는 `public_repo` (공개 저장소만)
  - 생성 방법: GitHub → Settings → Developer settings → Personal access tokens → Generate new token

### 네트워크 요구사항
- **인터넷 연결**: GitHub API 접근 필요
- **방화벽**: `api.github.com` (HTTPS/443) 접근 허용

---

## 1. MCP 서버 설치

### 1.1 프로젝트 클론 (Git 사용 시)
```bash
cd ~/projects
git clone https://github.com/your-org/flowyprompt_mcp.git
cd flowyprompt_mcp
```

### 1.2 의존성 설치
```bash
# npm 사용
npm install

# yarn 사용 (선택사항)
yarn install
```

**예상 출력**:
```
added 45 packages, and audited 46 packages in 5s
```

### 1.3 설치 확인
```bash
# MCP SDK 설치 확인
npm list @modelcontextprotocol/sdk

# 예상 출력: @modelcontextprotocol/sdk@1.0.0
```

---

## 2. GitHub 설정

### 2.1 Personal Access Token (PAT) 생성

1. GitHub에 로그인
2. **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **Generate new token** 클릭
4. 설정:
   - **Note**: "FlowyPrompt MCP Server"
   - **Expiration**: 90 days (또는 원하는 기간)
   - **Scopes**: ✅ `repo` (전체 저장소) 또는 ✅ `public_repo` (공개 저장소만)
5. **Generate token** 클릭
6. 생성된 토큰 복사 (한 번만 표시됨!) → 안전한 곳에 저장

**토큰 형식 예시**: `ghp_1234567890abcdefghijklmnopqrstuvwxyz`

### 2.2 환경 변수 설정

```bash
# .env.example 파일 복사
cp .env.example .env

# .env 파일 편집
nano .env
# 또는
code .env
# 또는
vim .env
```

**.env 파일 내용**:
```bash
# GitHub Repository Configuration
GITHUB_REPO_URL=https://github.com/flowyprompt/templates
GITHUB_PAT=ghp_your_personal_access_token_here
GITHUB_REF=main

# MCP Server Configuration
MCP_SERVER_NAME=flowyprompt-mcp-server
MCP_SERVER_VERSION=1.0.0

# Cache Configuration
CACHE_TTL_MS=900000
CACHE_TYPE=memory

# File Size Limits
MAX_FILE_SIZE=102400

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

**설정 가이드**:
- `GITHUB_REPO_URL`: 템플릿 저장소 URL (예: https://github.com/your-org/templates)
- `GITHUB_PAT`: 위에서 생성한 Personal Access Token
- `GITHUB_REF`: 사용할 브랜치명 (기본값: main), 태그나 커밋 해시도 가능
- `CACHE_TTL_MS`: 캐시 유효 기간 (밀리초, 기본값: 15분)
- `MAX_FILE_SIZE`: 최대 템플릿 파일 크기 (바이트, 기본값: 100KB)

### 2.3 설정 검증

```bash
# 환경 변수 로드 확인
node -e "require('dotenv').config(); console.log('GITHUB_REPO_URL:', process.env.GITHUB_REPO_URL)"

# 예상 출력: GITHUB_REPO_URL: https://github.com/flowyprompt/templates
```

---

## 3. Claude Desktop 설정

### 3.1 Claude Desktop 설정 파일 위치

| OS | 설정 파일 경로 |
|----|--------------|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

### 3.2 설정 파일 편집

**macOS 예시**:
```bash
# 디렉토리 생성 (없는 경우)
mkdir -p ~/Library/Application\ Support/Claude

# 설정 파일 편집
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**설정 파일 내용** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "flowyprompt": {
      "command": "node",
      "args": [
        "/Users/your-username/projects/flowyprompt_mcp/index.js"
      ],
      "env": {
        "GITHUB_REPO_URL": "https://github.com/flowyprompt/templates",
        "GITHUB_PAT": "ghp_your_personal_access_token_here",
        "GITHUB_REF": "main",
        "CACHE_TTL_MS": "900000",
        "MAX_FILE_SIZE": "102400",
        "LOG_LEVEL": "info",
        "NODE_ENV": "production"
      }
    }
  }
}
```

**⚠️ 중요**:
- `args` 배열의 경로를 **실제 프로젝트 절대 경로**로 변경
- `env` 객체의 `GITHUB_PAT`을 **실제 토큰**으로 변경
- `GITHUB_REPO_URL`을 **실제 템플릿 저장소 URL**로 변경

**절대 경로 확인 방법**:
```bash
cd ~/projects/flowyprompt_mcp
pwd
# 출력 예시: /Users/your-username/projects/flowyprompt_mcp
```

### 3.3 설정 파일 검증

```bash
# JSON 유효성 검사
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .

# 예상: JSON이 올바르게 파싱되어 출력됨
```

---

## 4. 서버 실행 및 검증

### 4.1 독립 실행 모드 테스트 (선택사항)

Claude Desktop에 등록하기 전에 서버를 직접 실행하여 설정을 검증할 수 있습니다.

```bash
# 프로젝트 디렉토리에서
npm start

# 또는 개발 모드 (자동 재시작)
npm run dev
```

**예상 출력**:
```
[INFO] MCP Server starting...
[INFO] Server name: flowyprompt-mcp-server
[INFO] Server version: 1.0.0
[INFO] GitHub Repo: https://github.com/flowyprompt/templates (ref: main)
[INFO] Cache Type: memory (TTL: 15min)
[INFO] MCP Server ready on stdio transport
```

**중단 방법**: `Ctrl + C`

### 4.2 Claude Desktop 재시작

1. Claude Desktop이 실행 중이면 완전히 종료
2. Claude Desktop 재시작
3. 로그 확인 (선택사항):
   - macOS: `tail -f ~/Library/Logs/Claude/mcp-server-flowyprompt.log`
   - Windows: `%LOCALAPPDATA%\Claude\Logs\mcp-server-flowyprompt.log`

### 4.3 MCP 서버 연결 확인

Claude Desktop에서:
1. 새 대화 시작
2. `/` 키 입력
3. MCP 서버 메뉴에서 **"flowyprompt"** 확인

**예상 결과**:
- MCP 서버 목록에 "flowyprompt" 표시
- 클릭 시 사용 가능한 템플릿 목록 표시

---

## 5. 사용 방법

### 5.1 템플릿 목록 보기

**단계**:
1. Claude Desktop에서 `/` 키 입력
2. "flowyprompt" 선택
3. 템플릿 목록 확인

**예상 화면**:
```
📋 FlowPrompt Templates

1. Brand_Positioning_Strategy
   브랜드 포지셔닝 전략 수립
   Variables: company_name (required), industry (required), target_audience (optional)

2. AI_Analysis_Report
   AI 기술 분석 보고서 생성
   Variables: technology (required), use_case (optional)

...
```

### 5.2 템플릿 실행 (변수 입력)

**단계**:
1. 템플릿 선택 (예: "Brand_Positioning_Strategy")
2. 변수 값 입력 프롬프트 응답:
   ```
   User: company_name?
   Assistant: 테크스타트업

   User: industry?
   Assistant: AI

   User: target_audience? (optional, press Enter to skip)
   Assistant: B2B SaaS 기업
   ```
3. 자동으로 프롬프트 생성 및 실행

**생성된 프롬프트 예시**:
```markdown
# 브랜드 포지셔닝 전략

브랜드 포지셔닝 전략 수립

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

### 5.3 캐시 동작 확인

**첫 번째 요청** (Cold Fetch):
- GitHub API 호출
- 응답 시간: ~1-2초

**두 번째 요청** (Cached, 15분 이내):
- 캐시에서 즉시 반환
- 응답 시간: ~100-300ms

---

## 6. 문제 해결

### 6.1 MCP 서버가 목록에 나타나지 않음

**원인**: Claude Desktop 설정 파일 오류

**해결 방법**:
1. 설정 파일 경로 확인:
   ```bash
   ls -la ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
2. JSON 문법 확인:
   ```bash
   jq . < ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
3. 절대 경로 확인:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq '.mcpServers.flowyprompt.args'
   ```
4. Claude Desktop 완전히 종료 후 재시작

### 6.2 "GitHub authentication failed" 에러

**원인**: PAT이 유효하지 않거나 권한 부족

**해결 방법**:
1. PAT 형식 확인 (`ghp_`로 시작하는지)
2. PAT 권한 확인 (최소한 `public_repo` 필요)
3. PAT 만료 여부 확인 (GitHub Settings에서)
4. `.env` 파일 또는 `claude_desktop_config.json`에서 PAT 업데이트

**테스트 명령**:
```bash
curl -H "Authorization: token YOUR_PAT_HERE" https://api.github.com/user
# 성공 시 사용자 정보 반환
```

### 6.3 "Template not found" 에러

**원인**: 템플릿 이름 오류 또는 저장소 구조 문제

**해결 방법**:
1. 저장소에 `templates/` 폴더 확인
2. 템플릿 파일명 확인 (예: `Brand_Positioning_Strategy.json`)
3. GitHub 저장소 URL 확인 (`GITHUB_REPO_URL`)
4. 브랜치/태그 확인 (`GITHUB_REF`)

**테스트 명령**:
```bash
# 템플릿 목록 확인
curl -H "Authorization: token YOUR_PAT_HERE" \
  "https://api.github.com/repos/OWNER/REPO/contents/templates?ref=main"
```

### 6.4 "Template schema validation failed" 에러

**원인**: 템플릿 JSON 파일이 스키마를 준수하지 않음

**해결 방법**:
1. 템플릿 파일 JSON 유효성 확인:
   ```bash
   jq . < templates/Your_Template.json
   ```
2. 필수 필드 확인:
   - `metadata.name`
   - `metadata.description`
   - `metadata.version`
   - `variables` (배열, 비어있어도 됨)
   - `results` (배열, 최소 1개 이상)
3. 버전 형식 확인 (예: "1.0.0", semver 준수)

### 6.5 성능 문제 (느린 응답)

**원인**: 네트워크 지연 또는 캐시 미작동

**해결 방법**:
1. 캐시 TTL 확인 (`CACHE_TTL_MS`, 기본값: 900000 = 15분)
2. GitHub API 상태 확인: https://www.githubstatus.com/
3. 로그 레벨을 `debug`로 변경하여 상세 정보 확인:
   ```json
   "env": {
     "LOG_LEVEL": "debug"
   }
   ```
4. 템플릿 파일 크기 확인 (100KB 이하 권장)

---

## 7. 검증 테스트 체크리스트

아래 체크리스트를 모두 통과하면 설정이 올바르게 완료된 것입니다.

### 7.1 MCP 서버 초기화
- [ ] **TC-INIT-001**: Claude Desktop에서 `/` 입력 시 "flowyprompt" MCP 서버가 목록에 표시됨
- [ ] **TC-INIT-002**: MCP 서버 로그에 "MCP Server ready on stdio transport" 메시지 확인

### 7.2 템플릿 목록 로드
- [ ] **TC-LIST-001**: 템플릿 목록이 최소 1개 이상 표시됨
- [ ] **TC-LIST-002**: 각 템플릿의 name, description이 올바르게 표시됨
- [ ] **TC-LIST-003**: 변수 정보(name, required 여부)가 올바르게 표시됨

### 7.3 변수 추출 정확성
- [ ] **TC-VAR-001**: 템플릿의 모든 {{variable}} 플레이스홀더가 감지됨
- [ ] **TC-VAR-002**: 필수 변수(required: true)가 올바르게 표시됨
- [ ] **TC-VAR-003**: 선택적 변수(required: false)가 올바르게 표시됨

### 7.4 프롬프트 생성 및 실행
- [ ] **TC-GEN-001**: 모든 필수 변수 값 입력 시 프롬프트가 성공적으로 생성됨
- [ ] **TC-GEN-002**: 생성된 프롬프트에 변수 값이 올바르게 치환됨
- [ ] **TC-GEN-003**: 프롬프트가 Claude에게 전달되어 즉시 실행됨
- [ ] **TC-GEN-004**: Claude의 응답이 프롬프트 내용에 적합함

### 7.5 캐시 동작 확인
- [ ] **TC-CACHE-001**: 첫 번째 템플릿 요청 시간이 ~1-2초 이내임
- [ ] **TC-CACHE-002**: 두 번째 요청 시간(15분 이내)이 ~100-300ms 이내임
- [ ] **TC-CACHE-003**: 15분 후 재요청 시 ETag 재검증이 수행됨 (로그 확인)

### 7.6 에러 처리
- [ ] **TC-ERR-001**: 잘못된 PAT 입력 시 "GitHub authentication failed" 에러 표시
- [ ] **TC-ERR-002**: 존재하지 않는 템플릿 요청 시 "Template not found" 에러 표시
- [ ] **TC-ERR-003**: 필수 변수 누락 시 "Required variable not provided" 에러 표시
- [ ] **TC-ERR-004**: 네트워크 오류 시 "Cannot connect to GitHub" 에러 표시

---

## 8. 추가 리소스

### 문서
- [Feature Specification](./spec.md) - 기능 요구사항 및 시나리오
- [Implementation Plan](./plan.md) - 구현 계획 및 아키텍처
- [Data Model](./data-model.md) - 엔티티 및 관계
- [API Contracts](./contracts/) - MCP 툴 계약서

### 저장소
- **프로젝트 저장소**: https://github.com/your-org/flowyprompt_mcp
- **템플릿 예시 저장소**: https://github.com/flowyprompt/templates

### 지원
- **이슈 리포트**: GitHub Issues
- **문서 업데이트**: Pull Requests 환영

---

## 9. 고급 설정 (선택사항)

### 9.1 개발 모드 실행

```bash
# 파일 변경 시 자동 재시작
npm run dev

# 디버그 로그 활성화
LOG_LEVEL=debug npm run dev
```

### 9.2 여러 저장소 사용 (미래 기능)

현재는 하나의 저장소만 지원하지만, 향후 다음과 같이 여러 저장소를 설정할 수 있습니다:

```json
{
  "mcpServers": {
    "flowyprompt-marketing": {
      "command": "node",
      "args": ["/path/to/flowyprompt_mcp/index.js"],
      "env": {
        "GITHUB_REPO_URL": "https://github.com/your-org/marketing-templates",
        "GITHUB_PAT": "ghp_token1"
      }
    },
    "flowyprompt-engineering": {
      "command": "node",
      "args": ["/path/to/flowyprompt_mcp/index.js"],
      "env": {
        "GITHUB_REPO_URL": "https://github.com/your-org/engineering-templates",
        "GITHUB_PAT": "ghp_token2"
      }
    }
  }
}
```

---

**설정 완료!** 🎉

이제 Claude Desktop에서 프롬프트 템플릿을 효율적으로 사용할 수 있습니다.

문제가 발생하면 [문제 해결](#6-문제-해결) 섹션을 참고하세요.
