import assert from 'node:assert/strict';

const input = process.argv[2] || process.env.APP_URL;
assert(input, 'Usage: npm run check:public -- https://your-production-domain');
const origin = new URL(input).origin;
assert(['http:', 'https:'].includes(new URL(origin).protocol), 'HTTP(S) URL required');

// Fresh requests carry no cookies, authorization, or deployment-protection bypass.
for (const path of ['/', '/login', '/signup']) {
  const response = await fetch(origin + path, {redirect: 'manual', signal: AbortSignal.timeout(30000)});
  assert.equal(response.status, 200, `${path}: expected public HTTP 200, got ${response.status}`);
  assert.match(response.headers.get('content-type') || '', /text\/html/, `${path}: expected HTML`);
  assert.match(await response.text(), /PLAYCOACH/, `${path}: expected PLAYCOACH page`);
  console.log(`PASS anonymous ${path}: HTTP 200, no redirect`);
}
const response = await fetch(origin + '/api/platform/me', {redirect: 'manual', signal: AbortSignal.timeout(30000)});
assert.equal(response.status, 200, 'Anonymous session endpoint must be public');
assert.equal((await response.json()).user, null, 'Fresh visitor must not have a session');
console.log('PASS anonymous session: user=null');
