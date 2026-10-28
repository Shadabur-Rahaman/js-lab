import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const code = 'JSLAB-' + randomBytes(12).toString('hex').toUpperCase().match(/.{1,6}/g).join('-');
const hash = createHash('sha256').update(code).digest('hex');
await mkdir(new URL('../.deployment/', import.meta.url), { recursive: true });
await writeFile(new URL('../src/config/teacher.ts', import.meta.url), '// Classroom access lock only. Never treat a client-side verifier as server authorization.\nexport const TEACHER_CODE_HASH = ' + JSON.stringify(hash) + ';\n');
await writeFile(new URL('../.deployment/teacher-access.txt', import.meta.url), 'Teacher access code: ' + code + '\n\nKeep this code private. This is a classroom UI lock, not server-enforced authentication.\n');
console.log('New teacher code: ' + code);
console.log('Saved privately in .deployment/teacher-access.txt. Publish the updated src/config/teacher.ts to activate it online.');
