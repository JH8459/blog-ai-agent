import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { promises as fs } from 'fs';
import { basename, resolve } from 'path';
import { GitPushRequestDto } from './dto/git-push-request.dto';
import { findGitRepoRoot, GitCommandError, runGit } from '../utils/git';
import { normalizeSlug } from '../utils/normalize';
import { resolveRepoPath } from '../utils/git-path';

interface GitPushResponse {
  branch: string | null;
  pushed: boolean;
  commitSha: string | null;
  changedFiles: string[];
}

@Injectable()
export class GitService {
  private readonly logger = new Logger(GitService.name);

  async pushChanges(payload: GitPushRequestDto): Promise<GitPushResponse> {
    const repoRoot = await this.resolveRepoRoot();
    const paths = this.resolvePaths(repoRoot, payload.paths);
    const branchPrefix = payload.branchPrefix?.trim() || 'draft';

    const status = await this.runGitLogged(
      ['status', '--porcelain', '--', ...paths],
      repoRoot
    );
    const changedFiles = this.parseStatusOutput(status.stdout);
    if (changedFiles.length === 0) {
      return {
        branch: null,
        pushed: false,
        commitSha: null,
        changedFiles: []
      };
    }

    const baseBranch = this.buildBranchName(branchPrefix, paths);
    const branch = await this.ensureUniqueBranchName(repoRoot, baseBranch);

    await this.runGitLogged(['checkout', '-b', branch], repoRoot);
    await this.runGitLogged(['add', '--', ...paths], repoRoot);

    const staged = await this.runGitLogged(
      ['diff', '--cached', '--name-only', '--', ...paths],
      repoRoot
    );
    const stagedFiles = staged.stdout ? staged.stdout.split('\n').filter(Boolean) : [];
    if (stagedFiles.length === 0) {
      return {
        branch,
        pushed: false,
        commitSha: null,
        changedFiles: []
      };
    }

    await this.runGitLogged(['commit', '-m', payload.commitMessage], repoRoot);
    const commitSha = (await this.runGitLogged(['rev-parse', 'HEAD'], repoRoot)).stdout;
    await this.runGitLogged(['push', '-u', 'origin', branch], repoRoot);

    return {
      branch,
      pushed: true,
      commitSha,
      changedFiles: stagedFiles
    };
  }

  private async resolveRepoRoot(): Promise<string> {
    const configuredRoot = process.env.GIT_REPO_ROOT;
    if (configuredRoot) {
      const repoRoot = resolve(configuredRoot);
      const gitPath = resolve(repoRoot, '.git');
      try {
        const stat = await fs.stat(gitPath);
        if (!stat.isDirectory()) {
          throw new Error('not a git directory');
        }
      } catch (error) {
        throw new BadRequestException('invalid GIT_REPO_ROOT');
      }
      return repoRoot;
    }

    try {
      return await findGitRepoRoot(process.cwd());
    } catch (error) {
      throw new InternalServerErrorException('git repository root not found');
    }
  }

  private resolvePaths(repoRoot: string, paths: string[]): string[] {
    const normalized: string[] = [];
    for (const inputPath of paths) {
      try {
        const result = resolveRepoPath(repoRoot, inputPath);
        normalized.push(result.relative);
      } catch (error) {
        throw new BadRequestException('paths must be inside the git repository');
      }
    }

    return Array.from(new Set(normalized));
  }

  private buildBranchName(branchPrefix: string, paths: string[]): string {
    const timestamp = this.buildTimestamp();
    const slug = this.buildSlugFromPath(paths[0]);
    return slug ? `${branchPrefix}/${timestamp}-${slug}` : `${branchPrefix}/${timestamp}`;
  }

  private buildSlugFromPath(pathValue: string): string | null {
    const base = basename(pathValue);
    const noExt = base.replace(/\.[^.]+$/, '');
    const slug = normalizeSlug(noExt);
    return slug || null;
  }

  private buildTimestamp(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return (
      `${now.getFullYear()}` +
      `${pad(now.getMonth() + 1)}` +
      `${pad(now.getDate())}` +
      `${pad(now.getHours())}` +
      `${pad(now.getMinutes())}` +
      `${pad(now.getSeconds())}`
    );
  }

  private async ensureUniqueBranchName(repoRoot: string, baseBranch: string): Promise<string> {
    let candidate = baseBranch;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const exists = await this.branchExists(repoRoot, candidate);
      if (!exists) {
        return candidate;
      }
      candidate = `${baseBranch}-${attempt + 1}`;
    }
    throw new InternalServerErrorException('branch name collision');
  }

  private async branchExists(repoRoot: string, branch: string): Promise<boolean> {
    try {
      await runGit(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], repoRoot);
      return true;
    } catch (error) {
      if (error instanceof GitCommandError && error.code === 1) {
        return false;
      }
      throw error;
    }
  }

  private parseStatusOutput(output: string): string[] {
    if (!output) {
      return [];
    }
    const files: string[] = [];
    for (const line of output.split('\n')) {
      if (!line.trim()) {
        continue;
      }
      let filePart = line.slice(3).trim();
      const arrowIndex = filePart.lastIndexOf('->');
      if (arrowIndex !== -1) {
        filePart = filePart.slice(arrowIndex + 2).trim();
      }
      if (filePart) {
        files.push(filePart);
      }
    }
    return Array.from(new Set(files));
  }

  private async runGitLogged(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const result = await runGit(args, cwd);
      if (result.stdout) {
        this.logger.debug(`[git] ${args.join(' ')}: ${result.stdout}`);
      }
      if (result.stderr) {
        this.logger.warn(`[git] ${args.join(' ')} stderr: ${result.stderr}`);
      }
      return result;
    } catch (error) {
      if (error instanceof GitCommandError) {
        this.logger.error(
          `[git] ${args.join(' ')} failed: ${error.stderr || error.stdout || error.message}`
        );
      } else if (error instanceof Error) {
        this.logger.error(`[git] ${args.join(' ')} failed: ${error.message}`);
      }
      throw new InternalServerErrorException('git command failed');
    }
  }
}
