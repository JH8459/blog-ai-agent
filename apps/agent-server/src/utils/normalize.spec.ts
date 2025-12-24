import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFileName } from './normalize';

test('normalizeFileName: title -> fileName base', () => {
  const base = normalizeFileName('NestJS Kafka emit(), 어디까지 성공했다고 말할 수 있을까?');
  assert.equal(base, 'nestjs-kafka-emit-어디까지-성공했다고-말할-수-있을까');
  assert.equal(`${base}.md`, 'nestjs-kafka-emit-어디까지-성공했다고-말할-수-있을까.md');
});
