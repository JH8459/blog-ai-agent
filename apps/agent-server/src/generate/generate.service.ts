import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException
} from '@nestjs/common';
import { promises as fs } from 'fs';
import { resolve, sep } from 'path';
import { GenerateRequestDto } from './dto/generate-request.dto';
import { getTodayDate } from '../utils/date';
import { hasPathTraversal, normalizeFileName, normalizeSlug } from '../utils/normalize';
import { buildVersionedFileName } from '../utils/versioned-file';

export interface GenerateResponse {
  slug: string;
  date: string;
  categories: string;
  filePath: string;
  fileName: string;
  brief: string;
  outline: string[];
}

@Injectable()
export class GenerateService {
  async generateDraft(payload: GenerateRequestDto): Promise<GenerateResponse> {
    const date = payload.date ?? getTodayDate();
    this.assertSafeInput(payload.title, 'title');
    this.assertSafeInput(payload.categories, 'categories');
    if (payload.slug) {
      this.assertSafeInput(payload.slug, 'slug');
    }

    const workspaceRoot = process.env.WORKSPACE_DIR || '/data/workspace';
    const fileNameBase = normalizeFileName(payload.title);
    if (!fileNameBase) {
      throw new BadRequestException('fileName could not be generated');
    }
    const slugSource =
      payload.slug && payload.slug.trim().length > 0
        ? payload.slug
        : `${payload.title}-${payload.categories}`;
    const slug = normalizeSlug(slugSource);
    if (!slug) {
      throw new BadRequestException('slug could not be generated');
    }

    const dirPath = resolve(workspaceRoot, date, payload.categories);
    this.assertWithinWorkspace(workspaceRoot, dirPath);
    const markdown = this.buildMarkdown({
      emoji: payload.emoji,
      title: payload.title,
      date,
      categories: payload.categories,
      brief: payload.brief,
      outline: payload.outline
    });

    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed to create directory';
      throw new InternalServerErrorException(message);
    }

    const maxAttempts = 1000;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const versionedFileName = buildVersionedFileName(fileNameBase, attempt);
      const filePath = resolve(dirPath, versionedFileName);
      this.assertWithinWorkspace(workspaceRoot, filePath);

      try {
        await fs.writeFile(filePath, markdown, { flag: 'wx' });
        return {
          slug,
          date,
          categories: payload.categories,
          filePath,
          fileName: versionedFileName,
          brief: payload.brief,
          outline: payload.outline
        };
      } catch (error) {
        const code = (error as NodeJS.ErrnoException | undefined)?.code;
        if (code === 'EEXIST') {
          continue;
        }
        const message = error instanceof Error ? error.message : 'failed to create markdown file';
        throw new InternalServerErrorException(message);
      }
    }

    throw new ConflictException('file already exists');
  }

  private buildMarkdown(input: {
    emoji: string;
    title: string;
    date: string;
    categories: string;
    brief: string;
    outline: string[];
  }): string {
    const { emoji, title, date, categories, brief, outline } = input;

    return [
      '---',
      `emoji: ${emoji}`,
      `title: ${title}`,
      `date: '${date}'`,
      'author: JH8459',
      `categories: ${categories}`,
      `thumbnail: https://jh8459.s3.ap-northeast-2.amazonaws.com/blog/${date}/${categories}/thumbnail.png`,
      '---',
      '',
      '<!-- AI_BRIEF_START',
      brief,
      'AI_BRIEF_END -->',
      '',
      '<!-- AI_OUTLINE_START',
      ...outline,
      'AI_OUTLINE_END -->',
      '',
      `<img src="https://jh8459.s3.ap-northeast-2.amazonaws.com/blog/${date}/${categories}/banner.png"/>`,
      '',
      `## ${emoji} Overview`,
      '',
      '<!-- TODO: n8n에서 섹션/본문 자동 생성 -->',
      ''
    ].join('\n');
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
