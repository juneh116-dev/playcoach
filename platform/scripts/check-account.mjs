import assert from 'node:assert/strict';
import {createHash, randomBytes} from 'node:crypto';
import pg from 'pg';
import {postgresOptions} from '../lib/postgres-options.mjs';

const origin = new URL(process.argv[2] || process.env.APP_URL).origin;
assert.equal(origin, new URL(process.env.APP_URL).origin, 'Use the configured APP_URL');
assert(process.env.DATABASE_URL, 'Database access is required to clean up the test account');
const db = new pg.Client({...postgresOptions(process.env.DATABASE_URL), connectionTimeoutMillis:10000});
await db.connect(); // Ensure cleanup is available before creating an account.
const email = `deploy-smoke-${randomBytes(12).toString('hex')}@example.invalid`;
const password = randomBytes(32).toString('hex');
const request = (path, options = {}) => fetch(origin + '/api/platform/' + path, {
  redirect:'manual', signal:AbortSignal.timeout(30000), ...options,
});
const post = (path, body, cookie) => request(path, {method:'POST', headers:{
  'Content-Type':'application/json', Origin:origin, ...(cookie ? {Cookie:cookie} : {}),
}, body:JSON.stringify(body)});
try {
  assert.equal((await post('register', {name:'Deployment smoke test', email, password, consent:true})).status, 201, 'Registration');
  assert.equal((await post('login', {email, password:'incorrect-test-password'})).status, 401, 'Incorrect password');
  const login = await post('login', {email, password});
  assert.equal(login.status, 200, 'Login');
  const session = login.headers.get('set-cookie') || '';
  assert(session.includes('HttpOnly') && session.includes('Secure') && session.includes('SameSite=Lax'), 'Secure session cookie');
  const cookie = session.split(';')[0];
  const me = await request('me', {headers:{Cookie:cookie}});
  assert.equal(me.status, 200, 'Session');
  assert.equal((await me.json()).user?.name, 'Deployment smoke test', 'Authenticated member');
  assert.equal((await request('inbox', {headers:{Cookie:cookie}})).status, 200, 'Private inbox');
  assert.equal((await post('logout', {}, cookie)).status, 200, 'Logout');
  assert.equal((await (await request('me', {headers:{Cookie:cookie}})).json()).user, null, 'Session revoked');
  // Supabase Data API must not expose application credentials to browser keys.
  const forbidden = await fetch(process.env.SUPABASE_URL + '/rest/v1/pc_credentials?select=email&limit=1', {
    headers:{apikey:process.env.SUPABASE_ANON_KEY, Authorization:'Bearer ' + process.env.SUPABASE_ANON_KEY},
    signal:AbortSignal.timeout(30000),
  });
  assert([401,403].includes(forbidden.status), 'Anonymous Supabase Data API must be denied');
  console.log('PASS production signup, password check, login, session, inbox, logout, private Data API');
} finally {
  await db.query('BEGIN');
  try {
    const row = await db.query('SELECT member_id FROM pc_credentials WHERE email=$1', [email]);
    if (row.rows[0]) {
      const id = row.rows[0].member_id;
      await db.query('DELETE FROM pc_sessions WHERE member_id=$1', [id]);
      await db.query('DELETE FROM pc_credentials WHERE email=$1', [email]);
      await db.query("DELETE FROM pc_members WHERE id=$1 AND provider='email' AND subject=$2", [id,email]);
    }
    const keys = ['register','login'].map(mode => createHash('sha256').update(mode+':email:'+email).digest('hex'));
    await db.query('DELETE FROM pc_auth_limits WHERE key=ANY($1::text[])', [keys]);
    await db.query('COMMIT');
    console.log('Removed temporary production test account');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    await db.end();
  }
}
