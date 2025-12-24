import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException
} from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { GenerateRequestDto } from './dto/generate-request.dto';
import { getTodayDate } from '../utils/date';
import { slugify } from '../utils/slugify';

interface GenerateResponse {
  slug: string;
  date: string;
  workspaceDir: string;
  file: string;
}

@Injectable()
export class GenerateService {
  async generateDraft(payload: GenerateRequestDto): Promise<GenerateResponse> {
    const date = payload.date ?? getTodayDate();
    const slugInput = payload.slug && payload.slug.trim().length > 0 ? payload.slug : payload.title;
    const slug = slugify(slugInput);

    if (!slug) {
      throw new BadRequestException('slug could not be generated');
    }

    const workspaceRoot = process.env.WORKSPACE_DIR || '/data/workspace';
    const workspaceDir = join(workspaceRoot, slug);
    const filePath = join(workspaceDir, 'index.md');
    const markdown = this.buildMarkdown({
      emoji: payload.emoji,
      title: payload.title,
      date,
      categories: payload.categories
    });

    try {
      await fs.mkdir(workspaceDir, { recursive: true });
      await fs.writeFile(filePath, markdown, { flag: 'wx' });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (code === 'EEXIST') {
        throw new ConflictException('index.md already exists');
      }
      const message = error instanceof Error ? error.message : 'failed to create index.md';
      throw new InternalServerErrorException(message);
    }

    return {
      slug,
      date,
      workspaceDir,
      file: 'index.md'
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
}
