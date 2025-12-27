import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConflictException } from '@nestjs/common';
import { GenerateService } from '../generate/generate.service';
import { PatchService } from '../patch/patch.service';
import { ImageExtension, ImagesMode } from './dto/images-request.dto';
import { ImagesService } from './images.service';

const baseGeneratePayload = {
  emoji: '📚',
  title: 'Patch 테스트 글',
  brief: '대상 독자와 핵심 메시지, 논점을 포함한 테스트 brief입니다.',
  categories: 'Backend',
  date: '2025-12-24'
};

const baseUrl = 'https://jh8459.s3.ap-northeast-2.amazonaws.com/blog';

test('applyImages: noPatch returns url map', async () => {
  const prevWorkspace = process.env.WORKSPACE_DIR;
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'agent-server-'));
  process.env.WORKSPACE_DIR = workspaceRoot;
  const generateService = new GenerateService();
  const imagesService = new ImagesService();

  try {
    const generateResult = await generateService.generateDraft(baseGeneratePayload);

    const response = await imagesService.applyImages({
      date: baseGeneratePayload.date,
      categories: baseGeneratePayload.categories,
      title: baseGeneratePayload.title,
      targets: ['thumbnail', 'flow', 'observable'],
      mode: ImagesMode.NoPatch
    });

    assert.equal(response.mode, ImagesMode.NoPatch);
    assert.equal(response.filePath, generateResult.filePath);
    assert.equal(response.updatedFrontmatterThumbnail, false);
    assert.equal(
      response.applied.thumbnail,
      `${baseUrl}/${baseGeneratePayload.date}/${baseGeneratePayload.categories}/thumbnail.png`
    );
    assert.equal(
      response.applied.flow,
      `${baseUrl}/${baseGeneratePayload.date}/${baseGeneratePayload.categories}/flow.png`
    );
    assert.equal(
      response.applied.observable,
      `${baseUrl}/${baseGeneratePayload.date}/${baseGeneratePayload.categories}/observable.png`
    );
  } finally {
    process.env.WORKSPACE_DIR = prevWorkspace;
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test('applyImages: replaceSlots replaces slots with image tags', async () => {
  const prevWorkspace = process.env.WORKSPACE_DIR;
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'agent-server-'));
  process.env.WORKSPACE_DIR = workspaceRoot;
  const generateService = new GenerateService();
  const patchService = new PatchService();
  const imagesService = new ImagesService();

  try {
    const generateResult = await generateService.generateDraft(baseGeneratePayload);
    await patchService.patchPost({
      date: baseGeneratePayload.date,
      categories: baseGeneratePayload.categories,
      title: baseGeneratePayload.title,
      bodyMarkdown: '## 본문\n\n<!-- ILLUSTRATION: flow -->\n'
    });

    await imagesService.applyImages({
      date: baseGeneratePayload.date,
      categories: baseGeneratePayload.categories,
      title: baseGeneratePayload.title,
      targets: ['flow'],
      mode: ImagesMode.ReplaceSlots
    });

    const patched = await readFile(generateResult.filePath, 'utf8');
    const expectedTag = `<img src="${baseUrl}/${baseGeneratePayload.date}/${baseGeneratePayload.categories}/flow.png"/>`;
    assert.ok(patched.includes(expectedTag));
    assert.ok(!patched.includes('<!-- ILLUSTRATION: flow -->'));
  } finally {
    process.env.WORKSPACE_DIR = prevWorkspace;
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test('applyImages: replaceSlots returns 409 when slot missing', async () => {
  const prevWorkspace = process.env.WORKSPACE_DIR;
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'agent-server-'));
  process.env.WORKSPACE_DIR = workspaceRoot;
  const generateService = new GenerateService();
  const patchService = new PatchService();
  const imagesService = new ImagesService();

  try {
    await generateService.generateDraft(baseGeneratePayload);
    await patchService.patchPost({
      date: baseGeneratePayload.date,
      categories: baseGeneratePayload.categories,
      title: baseGeneratePayload.title,
      bodyMarkdown: '## 본문\n\n본문 내용입니다.\n'
    });

    await assert.rejects(
      () =>
        imagesService.applyImages({
          date: baseGeneratePayload.date,
          categories: baseGeneratePayload.categories,
          title: baseGeneratePayload.title,
          targets: ['flow'],
          mode: ImagesMode.ReplaceSlots
        }),
      (err) => err instanceof ConflictException
    );
  } finally {
    process.env.WORKSPACE_DIR = prevWorkspace;
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test('applyImages: updates frontmatter thumbnail line', async () => {
  const prevWorkspace = process.env.WORKSPACE_DIR;
  const workspaceRoot = await mkdtemp(join(tmpdir(), 'agent-server-'));
  process.env.WORKSPACE_DIR = workspaceRoot;
  const generateService = new GenerateService();
  const imagesService = new ImagesService();

  try {
    const generateResult = await generateService.generateDraft(baseGeneratePayload);

    await imagesService.applyImages({
      date: baseGeneratePayload.date,
      categories: baseGeneratePayload.categories,
      title: baseGeneratePayload.title,
      targets: ['thumbnail'],
      imageExt: ImageExtension.Jpg,
      updateFrontmatterThumbnail: true
    });

    const patched = await readFile(generateResult.filePath, 'utf8');
    const expectedThumbnail = `thumbnail: ${baseUrl}/${baseGeneratePayload.date}/${baseGeneratePayload.categories}/thumbnail.jpg`;
    assert.ok(patched.includes(expectedThumbnail));
  } finally {
    process.env.WORKSPACE_DIR = prevWorkspace;
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
