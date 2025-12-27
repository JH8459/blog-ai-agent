import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRepoPath } from './git-path';

test('resolveRepoPath: rejects path traversal', () => {
  assert.throws(() => resolveRepoPath('/repo', '../evil'));
});

test('resolveRepoPath: rejects outside repo root', () => {
  assert.throws(() => resolveRepoPath('/repo', '/etc/passwd'));
});

test('resolveRepoPath: returns relative path inside repo', () => {
  const result = resolveRepoPath('/repo', '2025-12-27/Backend/post.md');
  assert.equal(result.relative, '2025-12-27/Backend/post.md');
});
