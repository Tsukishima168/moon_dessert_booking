import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../lib/email/resend.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
async function check(env, response, expected, called = true) {
  const requests = [];
  class Resend {
    emails = { send: async (request) => { requests.push(request); if (response instanceof Error) throw response; return response; } };
  }
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports,
    require: name => { assert.equal(name, 'resend'); return { Resend }; },
    process: { env }, console: { warn() {}, error() {} } });
  const result = await module.exports.sendEmailDetailed('qa@example.invalid', 'Test', '<p>Test</p>');
  assert.equal(result.ok, expected);
  assert.equal(requests.length, called ? 1 : 0);
  if (expected) assert.equal(result.id, 'mock-message');
}

const env = { RESEND_API_KEY: 'mock-key', RESEND_FROM_EMAIL: 'sender@example.invalid', RESEND_FROM_NAME: 'Test' };
await check({}, { data: { id: 'mock-message' }, error: null }, false, false);
await check({ RESEND_API_KEY: 'mock-key' }, { data: { id: 'mock-message' }, error: null }, false, false);
await check(env, { data: null, error: { message: 'Rejected sender' } }, false);
await check(env, new Error('Network failure'), false);
await check(env, { data: null, error: null }, false);
await check(env, { data: { id: 'mock-message' }, error: null }, true);
console.log('Resend: missing configuration, provider rejection, network error, missing acknowledgment and success passed without sending mail.');
