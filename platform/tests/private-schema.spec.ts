import {test, expect} from '@playwright/test';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';

test('Supabase 클라이언트 역할은 계정·세션 등 서버 전용 테이블에 접근할 수 없다', async () => {
  const db = new PGlite();
  try {
    for (const file of ['002-platform.sql', '003-local-auth.sql']) {
      await db.exec(await readFile('db/' + file, 'utf8'));
    }
    // Reproduce Supabase's public-schema default grants before hardening.
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO anon, authenticated, PUBLIC;');
    const migration = await readFile('db/004-private-platform.sql', 'utf8');
    await db.exec(migration);
    await db.exec(migration); // Safe to rerun on deploy.
    const tables = await db.query<{name:string;rls:boolean;anon:boolean;authenticated:boolean}>(`
      SELECT c.relname AS name, c.relrowsecurity AS rls,
        has_table_privilege('anon',c.oid,'SELECT') AS anon,
        has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated
      FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
      WHERE n.nspname='public' AND c.relkind='r' AND left(c.relname,3)='pc_'
    `);
    expect(tables.rows).toHaveLength(12);
    for (const table of tables.rows) {
      expect(table.rls, table.name).toBe(true);
      expect(table.anon, table.name).toBe(false);
      expect(table.authenticated, table.name).toBe(false);
    }
    await db.exec("INSERT INTO pc_members VALUES('server-only','player','email','player@example.invalid'); SET ROLE anon;");
    await expect(db.query('SELECT * FROM pc_members')).rejects.toThrow(/permission denied/);
    await db.exec('RESET ROLE; GRANT SELECT ON pc_members TO anon; SET ROLE anon;');
    expect((await db.query('SELECT * FROM pc_members')).rows).toHaveLength(0);
    await db.exec('RESET ROLE;');
    expect((await db.query('SELECT * FROM pc_members')).rows).toHaveLength(1);
  } finally {
    await db.close();
  }
});
