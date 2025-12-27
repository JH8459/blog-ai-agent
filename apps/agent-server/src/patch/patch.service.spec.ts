import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { GenerateService } from '../generate/generate.service';
import { PatchMode } from './dto/patch-request.dto';
import { PatchService } from './patch.service';

const baseGeneratePayload = {
  emoji: '📚',
  title: 'Patch 테스트 글',
  brief: '대상 독자와 핵심 메시지, 논점을 포함한 테스트 brief입니다.',
  categories: 'Backend',
  date: '2025-12-24'
};

const bodyMarkdown = '## 본문 섹션\n\nn8n이 생성한 본문 내용입니다.\n';

test('patchPost: placeholder replace success', async () => {
  const prevWorkspace = process.env.WORKSPACE_DIR;
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'agent-server-'));
  process.env.WORKSPACE_DIR = workspaceRoot;
  const generateService = new GenerateService();
  const patchService = new PatchService();

  try {
    const generateResult = await generateService.generateDraft(baseGeneratePayload);

    const response = await patchService.patchPost({
      date: baseGeneratePayload.date,
      categories: baseGeneratePayload.categories,
      title: baseGeneratePayload.title,
      bodyMarkdown
    });

    assert.equal(response.ok, true);
    assert.equal(response.mode, PatchMode.ReplacePlaceholder);
    assert.equal(response.filePath, generateResult.filePath);

    const patched = await readFile(generateResult.filePath, 'utf8');
    assert.ok(patched.includes(bodyMarkdown));
    assert.ok(!patched.includes('<!-- TODO: n8n에서 섹션/본문 자동 생성 -->'));
  } finally {
    process.env.WORKSPACE_DIR = prevWorkspace;
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test('patchPost: placeholder missing returns 409 Conflict', async () => {
  const prevWorkspace = process.env.WORKSPACE_DIR;
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'agent-server-'));
  process.env.WORKSPACE_DIR = workspaceRoot;
  const generateService = new GenerateService();
  const patchService = new PatchService();

  try {
    await generateService.generateDraft(baseGeneratePayload);
    await patchService.patchPost({
      date: baseGeneratePayload.date,
      categories: baseGeneratePayload.categories,
      title: baseGeneratePayload.title,
      bodyMarkdown
    });

    await assert.rejects(
      () =>
        patchService.patchPost({
          date: baseGeneratePayload.date,
          categories: baseGeneratePayload.categories,
          title: baseGeneratePayload.title,
          bodyMarkdown
        }),
      (err) => err instanceof ConflictException
    );
  } finally {
    process.env.WORKSPACE_DIR = prevWorkspace;
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test('patchPost: path traversal input is blocked', async () => {
  const prevWorkspace = process.env.WORKSPACE_DIR;
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'agent-server-'));
  process.env.WORKSPACE_DIR = workspaceRoot;
  const patchService = new PatchService();

  try {
    await assert.rejects(
      () =>
        patchService.patchPost({
          date: '../2025-12-24',
          categories: 'Backend',
          title: 'Patch 테스트 글',
          bodyMarkdown
        }),
      (err) => err instanceof BadRequestException
    );
  } finally {
    process.env.WORKSPACE_DIR = prevWorkspace;
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
