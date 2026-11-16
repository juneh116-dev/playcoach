import {test, expect} from '@playwright/test';
import {X509Certificate} from 'node:crypto';
import {postgresOptions} from '../lib/postgres-options.mjs';
import supabaseCA from '../lib/supabase-ca.json';

test('Supabase CA는 인증서 검증을 유지하고 연결 문자열의 SSL 덮어쓰기를 제거한다', () => {
  const options = postgresOptions('postgresql://user:password@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?sslmode=disable&ssl=false&pgbouncer=true');
  expect(options.ssl?.rejectUnauthorized).toBe(true);
  expect(options.ssl?.ca).toContain(supabaseCA);
  const url = new URL(options.connectionString);
  expect(url.searchParams.has('sslmode')).toBe(false);
  expect(url.searchParams.has('ssl')).toBe(false);
  expect(url.searchParams.get('pgbouncer')).toBe('true');
  expect(new X509Certificate(supabaseCA).fingerprint256).toBe('80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA');
  const other = 'postgresql://user:password@database.example:5432/app?sslmode=verify-full';
  expect(postgresOptions(other)).toEqual({connectionString: other});
});
