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
  -d '{\"emoji\":\"📚\",\"title\":\"테스트 글\",\"categories\":\"Backend\"}'
```

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
{ "slug": "테스트-글-backend", "date": "2025-01-01", "categories": "Backend", "filePath": "/data/workspace/2025-01-01/Backend/테스트-글.md", "fileName": "테스트-글.md" }
```

## Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

## Environment

- `apps/agent-server/.env.example`
- `PORT` defaults to `3000`
- `WORKSPACE_DIR` defaults to `/data/workspace`

## Roadmap (next steps)

- RAG for context-aware drafts
- n8n workflow automation
- Git clone / branch / PR creation
- Image generation for posts
