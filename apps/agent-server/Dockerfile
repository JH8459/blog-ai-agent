FROM node:20-alpine AS base

RUN apk add --no-cache git openssh-client
RUN git config --global --add safe.directory /repo
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY apps/agent-server/package.json apps/agent-server/package.json

RUN pnpm install --frozen-lockfile

FROM base AS dev

COPY apps/agent-server apps/agent-server
WORKDIR /app/apps/agent-server
EXPOSE 3000
CMD ["pnpm", "dev"]

FROM base AS build

COPY apps/agent-server apps/agent-server
RUN pnpm --filter agent-server build

FROM node:20-alpine AS runner

RUN apk add --no-cache git openssh-client
RUN git config --global --add safe.directory /repo
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/agent-server/package.json apps/agent-server/package.json

RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/apps/agent-server/dist /app/apps/agent-server/dist

WORKDIR /app/apps/agent-server
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
