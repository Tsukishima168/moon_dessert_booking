import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Run the real client helper with provider responses; no account or network access.
const source = ts.transpileModule(fs.readFileSync('lib/client-auth.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
for (const [name, fetchResult, expected] of [
  ['success', async () => ({ ok: true }), true],
  ['HTTP failure', async () => ({ ok: false }), false],
  ['network failure', async () => { throw new Error('offline'); }, false],
]) {
  const exports = {};
  const calls = [];
  vm.runInNewContext(source, {
    exports,
    require: () => ({ supabase: {} }),
    console: { error() {} },
    fetch: async (...args) => { calls.push(args); return fetchResult(); },
  });
  assert.equal(await exports.clearServerSession(), expected, name);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['/api/auth/set-session', { method: 'DELETE' }]]);
}
console.log('Logout: success, HTTP rejection and network failure passed without accessing an account.');
