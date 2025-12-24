# Architecture

## End-to-end flow

[Topic Input]
  -> [Agent Server]
  -> [Markdown Draft]
  -> [Blog Repo Branch]
  -> [Pull Request]
  -> [Human Review]
  -> [Merge]
  -> [Publish]

## MVP scope (this PR)

- Monorepo scaffolding with pnpm workspaces
- NestJS agent-server boot + GET /health
- Docker Compose for local dev
- Docs and env samples

## Next steps

- RAG integration
- n8n workflow orchestration
- Blog repo cloning + PR automation
- Image generation
