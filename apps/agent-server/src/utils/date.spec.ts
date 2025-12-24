import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTodayDate } from './date';

test('getTodayDate: KST 기준 YYYY-MM-DD 포맷', () => {
  const fixed = new Date('2025-12-20T00:00:00+09:00');
  assert.equal(getTodayDate(fixed), '2025-12-20');
});
