import { Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { dirname, resolve } from 'path';

export class GitCommandError extends Error {
  constructor(
    message: string,
    readonly args: string[],
    readonly code: number | null,
    readonly stdout: string,
    readonly stderr: string
  ) {
    super(message);
  }
}

export async function runGit(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('git', args, { cwd });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    child.on('error', (error) => {
      reject(
        new GitCommandError(
          error.message,
          args,
          null,
          stdout.trim(),
          stderr.trim()
        )
      );
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise({ stdout: stdout.trim(), stderr: stderr.trim() });
        return;
      }
      reject(
        new GitCommandError(
          `git ${args.join(' ')} failed`,
          args,
          code,
          stdout.trim(),
          stderr.trim()
        )
      );
    });
  });
}

export async function findGitRepoRoot(startDir: string): Promise<string> {
  let current = resolve(startDir);
  const logger = new Logger('GitRepoRoot');

  while (true) {
    const gitPath = resolve(current, '.git');
    try {
      const stat = await fs.stat(gitPath);
      if (stat.isDirectory()) {
        return current;
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (code && code !== 'ENOENT') {
        logger.warn(`Failed to inspect ${gitPath}: ${code}`);
      }
    }

    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  throw new Error('git repository root not found');
}
