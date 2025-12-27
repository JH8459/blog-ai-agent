import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { GenerateService } from './generate.service';

const basePayload = {
  emoji: '📚',
  title: 'NestJS Kafka emit(), 어디까지 성공했다고 말할 수 있을까?',
  brief: '대상 독자와 핵심 메시지, 논점을 포함한 테스트 brief입니다.',
  outline: ['문제 제기', '해결 전략', '적용 사례'],
  categories: 'Backend',
  date: '2025-12-20'
};

test('generateDraft: 동일 date/categories/title 재요청 시 버전 파일 생성', async () => {
  const prevWorkspace = process.env.WORKSPACE_DIR;
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'agent-server-'));
  process.env.WORKSPACE_DIR = workspaceRoot;
  const service = new GenerateService();

  try {
    const first = await service.generateDraft(basePayload);
    const second = await service.generateDraft(basePayload);
    const baseName = first.fileName.replace(/\.md$/, '');
    assert.notEqual(second.filePath, first.filePath);
    assert.equal(second.fileName, `${baseName}_1.md`);
  } finally {
    process.env.WORKSPACE_DIR = prevWorkspace;
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test('generateDraft: path traversal 입력 차단', async () => {
  const prevWorkspace = process.env.WORKSPACE_DIR;
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'agent-server-'));
  process.env.WORKSPACE_DIR = workspaceRoot;
  const service = new GenerateService();

  try {
    await assert.rejects(
      () =>
        service.generateDraft({
          ...basePayload,
          title: '../evil'
        }),
      (err) => err instanceof BadRequestException
    );
  } finally {
    process.env.WORKSPACE_DIR = prevWorkspace;
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
