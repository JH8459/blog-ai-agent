import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from './slugify';

test('slugify: 공백/특수문자 정리 후 하이픈 처리', () => {
  assert.equal(slugify('NestJS Kafka emit(), 어디까지 성공?'), 'nestjs-kafka-emit-어디까지-성공');
  assert.equal(slugify('테스트_글 2025!!'), '테스트-글-2025');
});
