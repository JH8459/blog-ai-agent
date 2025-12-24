# blog-ai-agent

AI content agent that generates Gatsby-ready Markdown drafts and opens pull requests to a separate blog repository using a human-in-the-loop publishing flow.

## Components

- agent-server (NestJS API) - handles topic intake and draft generation (MVP: health only)
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

## Docker

```bash
docker compose -f docker/docker-compose.yml up --build
```

## Environment

- `apps/agent-server/.env.example`
- `PORT` defaults to `3000`

## Roadmap (next steps)

- RAG for context-aware drafts
- n8n workflow automation
- Git clone / branch / PR creation
- Image generation for posts
