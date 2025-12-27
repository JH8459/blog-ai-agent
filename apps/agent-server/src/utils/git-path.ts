import { isAbsolute, relative, resolve, sep } from 'path';

const PATH_TRAVERSAL_PATTERN = /(^|[\\/])\.\.(?:[\\/]|$)/;

export function resolveRepoPath(repoRoot: string, inputPath: string): {
  absolute: string;
  relative: string;
} {
  const trimmed = inputPath.trim();
  if (!trimmed) {
    throw new Error('path is empty');
  }
  if (PATH_TRAVERSAL_PATTERN.test(trimmed)) {
    throw new Error('path traversal detected');
  }

  const absolute = isAbsolute(trimmed) ? resolve(trimmed) : resolve(repoRoot, trimmed);
  const relativePath = relative(repoRoot, absolute);

  if (!relativePath || relativePath === '.' || relativePath.startsWith('..' + sep) || relativePath === '..') {
    throw new Error('path is outside repo root');
  }
  if (isAbsolute(relativePath)) {
    throw new Error('path is outside repo root');
  }

  return {
    absolute,
    relative: relativePath.split(sep).join('/')
  };
}
