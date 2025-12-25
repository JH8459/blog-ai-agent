import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { promises as fs } from 'fs';
import { resolve, sep } from 'path';
import { hasPathTraversal, normalizeFileName } from '../utils/normalize';
import { PatchMode, PatchRequestDto } from './dto/patch-request.dto';

const DEFAULT_PLACEHOLDER = '<!-- TODO: n8n에서 섹션/본문 자동 생성 -->';

interface PatchResponse {
  ok: true;
  filePath: string;
  mode: PatchMode;
  patched: true;
}

@Injectable()
export class PatchService {
  async patchPost(payload: PatchRequestDto): Promise<PatchResponse> {
    this.assertSafeInput(payload.date, 'date');
    this.assertSafeInput(payload.categories, 'categories');
    this.assertSafeInput(payload.title, 'title');

    if (!payload.bodyMarkdown || payload.bodyMarkdown.trim().length === 0) {
      throw new BadRequestException('bodyMarkdown must not be empty');
    }

    const workspaceRoot = process.env.WORKSPACE_DIR || '/data/workspace';
    const placeholder = payload.placeholder ?? DEFAULT_PLACEHOLDER;
    const mode = payload.mode ?? PatchMode.ReplacePlaceholder;

    const fileNameBase = normalizeFileName(payload.title);
    if (!fileNameBase) {
      throw new BadRequestException('fileName could not be generated');
    }
    const fileName = `${fileNameBase}.md`;

    const dirPath = resolve(workspaceRoot, payload.date, payload.categories);
    const filePath = resolve(dirPath, fileName);
    this.assertWithinWorkspace(workspaceRoot, dirPath);
    this.assertWithinWorkspace(workspaceRoot, filePath);

    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (code === 'ENOENT') {
        throw new NotFoundException('file not found');
      }
      const message = error instanceof Error ? error.message : 'failed to read markdown file';
      throw new InternalServerErrorException(message);
    }

    const patchedContent =
      mode === PatchMode.Append
        ? this.appendBody(content, payload.bodyMarkdown)
        : this.replacePlaceholder(content, placeholder, payload.bodyMarkdown);

    try {
      await fs.writeFile(filePath, patchedContent, { encoding: 'utf8' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed to write markdown file';
      throw new InternalServerErrorException(message);
    }

    return {
      ok: true,
      filePath,
      mode,
      patched: true
    };
  }

  private replacePlaceholder(content: string, placeholder: string, bodyMarkdown: string): string {
    if (!content.includes(placeholder)) {
      throw new ConflictException('placeholder not found');
    }
    return content.replace(placeholder, bodyMarkdown);
  }

  private appendBody(content: string, bodyMarkdown: string): string {
    return `${content}\n\n${bodyMarkdown}`;
  }

  private assertSafeInput(value: string, field: string): void {
    if (hasPathTraversal(value)) {
      throw new BadRequestException(`${field} contains invalid path characters`);
    }
  }

  private assertWithinWorkspace(workspaceRoot: string, targetPath: string): void {
    const root = resolve(workspaceRoot);
    if (targetPath !== root && !targetPath.startsWith(root + sep)) {
      throw new BadRequestException('invalid workspace path');
    }
  }
}
