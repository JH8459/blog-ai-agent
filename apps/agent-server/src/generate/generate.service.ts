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

interface GenerateResponse {
  slug: string;
  date: string;
  categories: string;
  filePath: string;
  fileName: string;
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
    const fileName = `${fileNameBase}.md`;

    const slugSource =
      payload.slug && payload.slug.trim().length > 0
        ? payload.slug
        : `${payload.title}-${payload.categories}`;
    const slug = normalizeSlug(slugSource);
    if (!slug) {
      throw new BadRequestException('slug could not be generated');
    }

    const dirPath = resolve(workspaceRoot, date, payload.categories);
    const filePath = resolve(workspaceRoot, date, payload.categories, fileName);
    this.assertWithinWorkspace(workspaceRoot, dirPath);
    this.assertWithinWorkspace(workspaceRoot, filePath);
    const markdown = this.buildMarkdown({
      emoji: payload.emoji,
      title: payload.title,
      date,
      categories: payload.categories
    });

    try {
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, markdown, { flag: 'wx' });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (code === 'EEXIST') {
        throw new ConflictException('file already exists');
      }
      const message = error instanceof Error ? error.message : 'failed to create markdown file';
      throw new InternalServerErrorException(message);
    }

    return {
      slug,
      date,
      categories: payload.categories,
      filePath,
      fileName
    };
  }

  private buildMarkdown(input: {
    emoji: string;
    title: string;
    date: string;
    categories: string;
  }): string {
    const { emoji, title, date, categories } = input;

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
