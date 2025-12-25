# 📘 blog-ai-agent — 컨텍스트 문서

## 1. 프로젝트 개요

이 저장소는 **기술 블로그 글 작성을 보조하는 AI Agent 서버**를 구현한다.

목표는 다음과 같다.

- 사람이 **블로그 주제(메타데이터)**를 입력한다.
- AI가 **Gatsby 블로그에 바로 사용할 수 있는 Markdown 초안**을 생성한다.
- AI가 생성한 본문을 **기존 초안 파일에 patch(삽입)** 한다.
- (추후) 생성된 파일을 **별도의 블로그 저장소에 커밋하고 PR을 생성**한다.
- 실제 게시(발행)는 **항상 사람이 PR을 승인해서 이루어진다.**

⚠️ 이 저장소에는 **실제 Gatsby 블로그 코드나 글이 포함되지 않는다.**  
이 저장소는 **글 생성·편집·자동화 도구 역할만 수행**한다.

---

## 2. 전체 아키텍처 개요

### 구성 요소 역할

- **agent-server (NestJS)**
  - Markdown 파일 생성 및 수정 책임
  - 파일 시스템 접근을 독점적으로 담당
  - (추가) 이미지 생성 요청을 받아 업로드/삽입까지의 흐름을 지원
- **n8n**
  - 워크플로우 오케스트레이터
  - AI(LLM)를 사용해 본문/섹션 생성
  - agent-server API 호출만 수행
- **블로그 저장소 (별도 repo)**
  - 실제 블로그 글이 존재하는 저장소
  - (추후) agent-server가 PR을 생성하는 대상

🚫 **n8n은 파일을 직접 수정하지 않는다.**  
📌 **모든 파일 생성/수정은 agent-server API를 통해서만 이루어진다.**

---

## 3. 블로그 파일 구조 규칙 (가장 중요)

### 핵심 원칙

- ❌ 게시글 = 디렉토리  
- ✅ **게시글 = 하나의 Markdown 파일**

### 실제 파일 저장 규칙

/<yyyy-mm-dd>/<categories>/<fileName>.md

### 예시

/2025-12-20/Backend/nestjs-kafka-emit.md

- 날짜(date)는 경로의 일부다.
- categories는 문자열 하나다. (예: Backend)
- 파일명(fileName)은 **title을 기반으로 생성**된다.

📌 이 규칙은 **현재 운영 중인 블로그 구조와 완전히 동일**해야 한다.

---

## 4. 용어 정리 (매우 중요)

### title
- 사람이 보는 글 제목
- Markdown frontmatter의 `title`

### categories
- 글 분류 (예: Backend, Frontend)
- 경로 + frontmatter 모두에 사용됨

### fileName
- 실제 Markdown 파일 이름
- **title 기반으로 생성**
- 파일 경로 계산에만 사용됨

### slug
- **내부 식별자**
- API 간(`/generate` → `/patch` → 이미지 단계 → PR 단계) 글을 식별하는 용도
- ❌ 파일명 아님  
- ❌ 디렉토리명 아님  

👉 **slug와 파일 경로를 절대 혼동하지 않는다.**

---

## 5. agent-server API 개요

### POST /generate

Markdown 초안 파일을 생성한다.

#### 입력
- 필수
  - emoji
  - title
  - categories
- 선택
  - date (YYYY-MM-DD)
  - slug (내부 식별자)

#### 동작
- date가 없으면 오늘 날짜 사용
- slug가 없으면 `title + categories` 기반으로 자동 생성
- 파일 생성 위치:

<WORKSPACE_DIR>/<date>/<categories>/<fileName>.md

- 생성되는 Markdown 파일에는 반드시 아래 placeholder가 포함된다.

<!-- TODO: n8n에서 섹션/본문 자동 생성 -->

---

### POST /patch

n8n이 생성한 본문을 기존 Markdown 파일에 삽입한다.

#### 입력(권장)
- date (YYYY-MM-DD)
- categories
- title
- bodyMarkdown
- (선택) mode: replacePlaceholder | append
- (선택) placeholder: 기본 placeholder 문자열

#### 동작
- `date + categories + title 기반 fileName` 규칙으로 파일 탐색
- placeholder를 bodyMarkdown으로 치환
- n8n은 파일 시스템에 직접 접근하지 않는다.

---

### (추가 예정) POST /images (또는 /illustrations)

게시글에 들어갈 **이미지(썸네일/배너/삽화)** 는 **별도 단계**로 생성/업로드한다.  
(텍스트 생성과 비용/실패/재시도 전략이 달라 분리 운영한다.)

#### 목적
- 썸네일/배너/삽화 생성 요청을 받아
- (선택) 외부 이미지 생성 모델 호출
- (선택) S3 업로드
- (선택) Markdown에 `<img>` 태그로 삽입하기 위한 URL/치환 정보를 반환

#### 권장 흐름
- n8n이 “이미지 필요 슬롯(예: <!-- ILLUSTRATION: flow -->)”을 본문에 넣는다.
- 이미지 단계에서 슬롯을 URL로 치환한다(별도 patch 또는 전용 API).

> 실제 엔드포인트 명(/images vs /illustrations)과 입력 스펙은 구현 단계에서 확정한다.

---

## 6. n8n 워크플로우 설계 원칙

권장 파이프라인(순서):

1) Form 입력  
2) POST /generate (초안 파일 생성)  
3) LLM 호출 (본문/섹션 생성)  
4) POST /patch (본문 삽입)  
5) (선택) 이미지 생성 단계 실행  
6) (선택) 이미지 URL 삽입(추가 patch 또는 전용 API)  
7) (추후) 블로그 repo 브랜치/커밋/PR 생성

---

## 7. 이번 단계에서 하지 않는 것 (중요)

다음 기능들은 **이번 단계에서 구현하지 않는다.** (추후 확장)

- GitHub PR 생성
- RAG
- n8n의 파일 직접 수정

> 단, 이미지 생성 API는 “추가 예정”으로 컨텍스트에 포함한다.

---

## 8. 기술 제약 사항

- Node.js + NestJS
- pnpm workspace 사용
- Docker / NAS 환경 고려
- 민감 정보(.env, 토큰 등) 커밋 금지

---

## 9. 작업 지시 규칙

작업을 요청할 때는 항상 다음 규칙을 따른다.

- 이 프로젝트에는 **context.md**가 있다. (파일명 고정)
- 작업 시작 전에 **반드시 context.md를 먼저 읽는다.**
- **리뷰 포인트/피드백은 한글로 답변**한다.
- 파일 구조 규칙과 API 책임 분리를 절대 변경하지 말 것.

📌 이 문서를 기준으로 `/generate`, `/patch`, n8n workflow, 이미지 단계, PR 생성 단계가 확장된다.

---

## 10. 요약 (한 줄)

> 이 프로젝트는  
> **“사람이 승인하는 구조를 전제로, AI가 기술 블로그 초안을 만들어주는 Agent 서버”**다.
