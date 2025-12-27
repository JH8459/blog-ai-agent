# blog-ai-agent

AI content agent that generates Gatsby-ready Markdown drafts and opens pull requests to a separate blog repository using a human-in-the-loop publishing flow.

## Components

- agent-server (NestJS API) - handles topic intake and draft generation
- workflows/n8n (planned)
- RAG pipeline (planned)

## Local development

```bash
pnpm install
pnpm -w dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Example response:

```json
{ "ok": true, "name": "agent-server", "version": "0.1.0" }
```

Generate draft:

```bash
curl -X POST http://localhost:3000/generate \\
  -H 'Content-Type: application/json' \\
  -d '{\"emoji\":\"📚\",\"title\":\"테스트 글\",\"categories\":\"Backend\",\"brief\":\"대상 독자, 핵심 메시지, 논점을 포함한 brief를 입력합니다.\",\"outline\":[\"문제 제기\",\"해결 전략\",\"적용 사례\"]}'
```

Patch generated body (replaces the placeholder or appends to the end):

```bash
curl -X POST http://localhost:3000/patch \
  -H 'Content-Type: application/json' \
  -d '{
    "date":"2025-12-24",
    "categories":"Backend",
    "fileName":"patch-테스트-글.md",
    "bodyMarkdown":"## 본문 섹션\n\nn8n이 생성한 본문 내용입니다.\n"
  }'
```

Example response:

```json
{ "ok": true, "filePath": "/data/workspace/2025-12-24/Backend/patch-테스트-글.md", "mode": "replacePlaceholder", "patched": true }
```

Apply images (replace slots, insert slots, or return URLs only):

```bash
curl -X POST http://localhost:3000/images \
  -H 'Content-Type: application/json' \
  -d '{
    "date":"2025-12-24",
    "categories":"Backend",
    "title":"Patch 테스트 글",
    "targets":["thumbnail","flow","observable"],
    "mode":"replaceSlots",
    "updateFrontmatterThumbnail": true
  }'
```

Example response:

```json
{
  "ok": true,
  "filePath": "/data/workspace/2025-12-24/Backend/patch-테스트-글.md",
  "mode": "replaceSlots",
  "updatedFrontmatterThumbnail": true,
  "applied": {
    "thumbnail": "https://jh8459.s3.ap-northeast-2.amazonaws.com/blog/2025-12-24/Backend/thumbnail.png",
    "flow": "https://jh8459.s3.ap-northeast-2.amazonaws.com/blog/2025-12-24/Backend/flow.png",
    "observable": "https://jh8459.s3.ap-northeast-2.amazonaws.com/blog/2025-12-24/Backend/observable.png"
  }
}
```

Modes:

- `replaceSlots` (default): replace `<!-- ILLUSTRATION: target -->` with `<img src="..."/>`, returns 409 if a slot is missing.
- `insertSlots`: inserts missing banners at the top and appends other images to the end.
- `noPatch`: returns URL mappings only (no file changes).

Storage rule:

- `<WORKSPACE_DIR>/<date>/<categories>/<fileName>.md`
- `fileName` = normalize(title) + `.md`
  - lowercase
  - spaces/underscores -> `-`
- remove special characters
  - collapse multiple `-` and trim edges
- `slug` is an internal identifier (not the file name), derived from `slug` input or `title-categories`

Example response:

```json
{
  "slug": "테스트-글-backend",
  "date": "2025-01-01",
  "categories": "Backend",
  "filePath": "/data/workspace/2025-01-01/Backend/테스트-글.md",
  "fileName": "테스트-글.md",
  "brief": "대상 독자, 핵심 메시지, 논점을 포함한 brief를 입력합니다.",
  "outline": ["문제 제기", "해결 전략", "적용 사례"]
}
```

Generate → Patch flow:

- `/generate` creates the Markdown skeleton with a placeholder `<!-- TODO: n8n에서 섹션/본문 자동 생성 -->`.
- `/generate` stores the brief and outline in comment blocks (`<!-- AI_BRIEF_START ... -->`, `<!-- AI_OUTLINE_START ... -->`) near the top of the body.
- `/patch` locates the same file via `date/categories/fileName`, then replaces that placeholder by default or appends content when `mode` is `append`.
- `/images` updates image slots and (optionally) frontmatter thumbnail, or returns URL mappings when `mode` is `noPatch`.

## Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

## Environment

- `apps/agent-server/.env.example`
- `PORT` defaults to `3000`
- `WORKSPACE_DIR` defaults to `/data/workspace`
- `IMAGE_BASE_URL` defaults to `https://jh8459.s3.ap-northeast-2.amazonaws.com/blog`

## Roadmap (next steps)

- RAG for context-aware drafts
- n8n workflow automation
- Git clone / branch / PR creation
- Image generation for posts
