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
import { ImageExtension, ImagesMode, ImagesRequestDto } from './dto/images-request.dto';

const DEFAULT_BASE_URL = 'https://jh8459.s3.ap-northeast-2.amazonaws.com/blog';
const DEFAULT_SLOT_PREFIX = 'ILLUSTRATION';

export interface ImagesResponse {
  ok: true;
  filePath: string;
  mode: ImagesMode;
  updatedFrontmatterThumbnail: boolean;
  applied: Record<string, string>;
}

@Injectable()
export class ImagesService {
  async applyImages(payload: ImagesRequestDto): Promise<ImagesResponse> {
    this.assertSafeInput(payload.date, 'date');
    this.assertSafeInput(payload.categories, 'categories');
    this.assertSafeInput(payload.title, 'title');

    const workspaceRoot = process.env.WORKSPACE_DIR || '/data/workspace';
    const baseUrl =
      payload.baseUrl ?? process.env.IMAGE_BASE_URL ?? DEFAULT_BASE_URL;
    const imageExt = payload.imageExt ?? ImageExtension.Png;
    const mode = payload.mode ?? ImagesMode.ReplaceSlots;
    const slotPrefix = payload.slotPrefix ?? DEFAULT_SLOT_PREFIX;
    const updateFrontmatterThumbnail = payload.updateFrontmatterThumbnail ?? true;

    const fileNameBase = normalizeFileName(payload.title);
    if (!fileNameBase) {
      throw new BadRequestException('fileName could not be generated');
    }
    const fileName = `${fileNameBase}.md`;

    const filePath = resolve(workspaceRoot, payload.date, payload.categories, fileName);
    this.assertWithinWorkspace(workspaceRoot, filePath);

    const targets = this.normalizeTargets(payload.targets);
    const applied = this.buildUrlMap({
      baseUrl,
      date: payload.date,
      categories: payload.categories,
      targets,
      imageExt
    });

    if (mode === ImagesMode.NoPatch) {
      await this.assertFileExists(filePath);
      return {
        ok: true,
        filePath,
        mode,
        updatedFrontmatterThumbnail: false,
        applied
      };
    }

    let content = await this.readFile(filePath);
    let updatedFrontmatterThumbnail = false;

    const thumbnailUrl = applied.thumbnail;
    if (updateFrontmatterThumbnail && thumbnailUrl) {
      const result = this.updateFrontmatterThumbnail(content, thumbnailUrl);
      if (result.updated) {
        content = result.content;
        updatedFrontmatterThumbnail = true;
      }
    }

    const slotTargets = targets.filter((target) => target !== 'thumbnail');
    for (const target of slotTargets) {
      const slot = this.buildSlot(slotPrefix, target);
      const imageTag = `<img src="${applied[target]}"/>`;

      if (content.includes(slot)) {
        content = content.split(slot).join(imageTag);
        continue;
      }

      if (mode === ImagesMode.ReplaceSlots) {
        throw new ConflictException('slot not found');
      }

      if (target === 'banner') {
        content = this.insertBannerImage(content, imageTag);
        continue;
      }

      content = this.appendIllustration(content, imageTag);
    }

    await this.writeFile(filePath, content);

    return {
      ok: true,
      filePath,
      mode,
      updatedFrontmatterThumbnail,
      applied
    };
  }

  private buildUrlMap(input: {
    baseUrl: string;
    date: string;
    categories: string;
    targets: string[];
    imageExt: ImageExtension;
  }): Record<string, string> {
    const { date, categories, targets, imageExt } = input;
    const baseUrl = input.baseUrl.replace(/\/+$/, '');
    const applied: Record<string, string> = {};

    for (const target of targets) {
      applied[target] = `${baseUrl}/${date}/${categories}/${target}.${imageExt}`;
    }

    return applied;
  }

  private normalizeTargets(targets: string[]): string[] {
    return Array.from(new Set(targets));
  }

  private buildSlot(prefix: string, target: string): string {
    return `<!-- ${prefix}: ${target} -->`;
  }

  private appendIllustration(content: string, imageTag: string): string {
    return `${content}\n\n${imageTag}`;
  }

  private insertBannerImage(content: string, imageTag: string): string {
    if (content.includes('/banner.')) {
      return content;
    }

    const frontmatterMatch = content.match(/^---\s*\n[\s\S]*?\n---\s*\n?/);
    if (frontmatterMatch) {
      const block = frontmatterMatch[0];
      const insertPosition = block.length;
      return `${content.slice(0, insertPosition)}\n${imageTag}\n\n${content.slice(
        insertPosition
      )}`;
    }

    return `${imageTag}\n\n${content}`;
  }

  private updateFrontmatterThumbnail(
    content: string,
    thumbnailUrl: string
  ): { content: string; updated: boolean } {
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (!frontmatterMatch) {
      return { content, updated: false };
    }

    const [block, body] = frontmatterMatch;
    const lines = body.split('\n');
    let found = false;
    const updatedLines = lines.map((line) => {
      if (line.trim().startsWith('thumbnail:')) {
        found = true;
        return `thumbnail: ${thumbnailUrl}`;
      }
      return line;
    });

    if (!found) {
      updatedLines.push(`thumbnail: ${thumbnailUrl}`);
    }

    const trailingNewline = block.endsWith('\n') ? '\n' : '';
    const updatedBlock = `---\n${updatedLines.join('\n')}\n---${trailingNewline}`;
    return {
      content: content.replace(block, updatedBlock),
      updated: true
    };
  }

  private async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (code === 'ENOENT') {
        throw new NotFoundException('file not found');
      }
      const message = error instanceof Error ? error.message : 'failed to read markdown file';
      throw new InternalServerErrorException(message);
    }
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, { encoding: 'utf8' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed to write markdown file';
      throw new InternalServerErrorException(message);
    }
  }

  private async assertFileExists(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (code === 'ENOENT') {
        throw new NotFoundException('file not found');
      }
      const message = error instanceof Error ? error.message : 'failed to access markdown file';
      throw new InternalServerErrorException(message);
    }
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
