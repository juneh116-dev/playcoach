import {test,expect} from '@playwright/test';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {localAuth} from '../lib/local-auth';
import {postgresSQL} from '../lib/platform-bindings';
import {verifyPassword} from '../lib/password';

test('자체 가입·비밀번호 로그인·세션 발급과 중복·오류·횟수 제한',async()=>{
 const pg=new PGlite();
 try{
 await pg.exec(await readFile('db/002-platform.sql','utf8'));
 await pg.exec(await readFile('db/003-local-auth.sql','utf8'));
 function prepare(sql:string,values:any[]=[]):any{return {bind:(...args:any[])=>prepare(sql,args),first:async()=> (await pg.query(postgresSQL(sql),values)).rows[0]||null,run:async()=>({meta:{changes:(await pg.query(postgresSQL(sql),values)).affectedRows}}),sql,values};}
 const db={prepare,batch:async(statements:any[])=>{await pg.exec('BEGIN');try{const r=[];for(const s of statements)r.push(await s.run());await pg.exec('COMMIT');return r;}catch(e){await pg.exec('ROLLBACK');throw e;}}};
 const send=(mode:'login'|'register',data:unknown)=>localAuth(new Request('https://playcoach.example/api/platform/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),mode,db as any);
 const credentials={name:'플레이어',email:'Player@Example.com',password:'a-secure-long-password',consent:true};
 expect((await send('register',{...credentials,password:'short'})).status).toBe(400);
 expect((await send('register',{...credentials,consent:false})).status).toBe(400);
 expect((await send('register',credentials)).status).toBe(201);
 const rows=await pg.query<{email:string;password_hash:string}>('SELECT email,password_hash FROM pc_credentials');
 expect(rows.rows[0].email).toBe('player@example.com');
 expect(rows.rows[0].password_hash).not.toContain(credentials.password);
 expect(await verifyPassword(credentials.password,rows.rows[0].password_hash)).toBe(true);
 expect((await send('register',credentials)).status).toBe(409);
 expect((await pg.query('SELECT * FROM pc_members')).rows).toHaveLength(1);
 expect((await send('login',{...credentials,password:'wrong-long-password'})).status).toBe(401);
 const success=await send('login',credentials);expect(success.status).toBe(200);
 const cookie=success.headers.get('Set-Cookie')!;expect(cookie).toContain('HttpOnly');expect(cookie).toContain('Secure');expect(cookie).toContain('SameSite=Lax');
 const token=cookie.split(';')[0].split('=')[1];
 const sessions=await pg.query<{hash:string;expires:string}>('SELECT hash,expires FROM pc_sessions');expect(sessions.rows).toHaveLength(1);expect(sessions.rows[0].hash).not.toBe(token);expect(Number(sessions.rows[0].expires)).toBeGreaterThan(Date.now());
 for(let i=0;i<8;i++)await send('login',{...credentials,password:'wrong-long-password'});
 expect((await send('login',credentials)).status).toBe(429);
 }finally{await pg.close();}
});

test('로그인에서 자체 가입이 기본이며 소셜 로그인은 선택 항목이다',async({page})=>{
 await page.goto('/login');
 await expect(page.getByRole('button',{name:'이메일로 로그인',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'회원가입',exact:true}).click();
 await page.getByLabel('이름',{exact:true}).fill('새 사용자');
 await page.getByLabel('이메일',{exact:true}).fill('new@example.com');
 await page.getByLabel('비밀번호',{exact:true}).fill('secure-password-123');
 await page.getByLabel('비밀번호 확인',{exact:true}).fill('different-password-123');
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'이메일로 회원가입'}).click();
 await expect(page.getByRole('alert').filter({hasText:'일치하지 않습니다'})).toContainText('일치하지 않습니다');
});
