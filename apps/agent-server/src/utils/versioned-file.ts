import { promises as fs } from 'fs';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildVersionedFileName(baseName: string, attempt: number): string {
  return attempt === 0 ? `${baseName}.md` : `${baseName}_${attempt}.md`;
}

export async function findLatestVersionedFileName(
  dirPath: string,
  baseName: string
): Promise<string | null> {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  const pattern = new RegExp(`^${escapeRegExp(baseName)}(?:_(\\d+))?\\.md$`);
  let bestName: string | null = null;
  let bestSuffix = -1;

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const match = entry.name.match(pattern);
    if (!match) {
      continue;
    }
    const suffix = match[1] ? Number(match[1]) : 0;
    if (!Number.isInteger(suffix)) {
      continue;
    }
    if (suffix > bestSuffix) {
      bestSuffix = suffix;
      bestName = entry.name;
    }
  }

  return bestName;
}
