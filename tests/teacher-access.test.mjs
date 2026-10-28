import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { matchesTeacherCode, teacherSessionExpired, TEACHER_IDLE_MS } from '../src/utils/teacherAccess.mjs';

test('teacher code verifier accepts the code and rejects wrong, missing, or excessive input', async () => {
  const code = 'TEST-Only-Not-A-Real-Code';
  const digest = createHash('sha256').update(code).digest('hex');
  assert.equal(await matchesTeacherCode(code, digest, webcrypto), true);
  assert.equal(await matchesTeacherCode('  '+code+'  ', digest, webcrypto), true);
  assert.equal(await matchesTeacherCode('wrong-code', digest, webcrypto), false);
  assert.equal(await matchesTeacherCode(code.toLowerCase(), digest, webcrypto), false);
  assert.equal(await matchesTeacherCode('', digest, webcrypto), false);
  assert.equal(await matchesTeacherCode(' ', digest, webcrypto), false);
  assert.equal(await matchesTeacherCode('x'.repeat(201), digest, webcrypto), false);
  await assert.rejects(() => matchesTeacherCode(code, digest, {}), /unavailable/);
});

test('teacher inactivity expiration uses the exact 15-minute boundary, including a sleeping tab', () => {
  const last = 1000;
  assert.equal(teacherSessionExpired(last, last), false);
  assert.equal(teacherSessionExpired(last, last+TEACHER_IDLE_MS-1), false);
  assert.equal(teacherSessionExpired(last, last+TEACHER_IDLE_MS), true);
  assert.equal(teacherSessionExpired(last, last+60*60*1000), true);
});

