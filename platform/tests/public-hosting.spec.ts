import {test,expect} from '@playwright/test';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {postgresSQL} from '../lib/platform-bindings';

test('독립 홈페이지는 쿠키 없이 열리고 호스팅 로그인으로 이동하지 않는다',async({page,request})=>{
 const res=await request.get('/');expect(res.status()).toBe(200);expect(res.url()).toBe('http://127.0.0.1:3100/');
 await page.goto('/');await expect(page.getByRole('heading',{level:1})).toContainText('피드백부터');
 await page.getByLabel('관심 종목',{exact:true}).selectOption('야구');
 await page.getByLabel('희망 지역',{exact:true}).selectOption('서울 성동구');
 await page.getByRole('link',{name:'내 지역에 물어보기'}).click();
 await expect(page.getByRole('button',{name:'야구',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByLabel('시·군·구',{exact:true})).toHaveValue('서울 성동구');
 const me=await request.get('/api/platform/me');expect(me.status()).toBe(200);expect((await me.json()).user).toBeNull();
 expect((await request.post('/api/platform/requests',{headers:{origin:'http://127.0.0.1:3100'},data:{}})).status()).toBe(401);
 expect((await request.post('/api/platform/requests',{headers:{origin:'https://example.com'},data:{}})).status()).toBe(403);
});

test('이전한 실제 SQL은 PostgreSQL에서 지역 전달과 답변·후기 권한을 유지한다',async()=>{
 const db=new PGlite();try{
 await db.exec(await readFile('db/002-platform.sql','utf8'));
 const source=await readFile('lib/pc-api.ts','utf8');
 const queries=[...source.matchAll(/db\.prepare\((['"])(.*?)\1\)/g)].map(m=>m[2]);
 const find=(prefix:string)=>{const q=queries.find(s=>s.startsWith(prefix));expect(q).toBeTruthy();return postgresSQL(q!);};
 await db.exec("INSERT INTO pc_coaches VALUES('yes','c1','match','bio','러닝','서울 성동구','coach',1),('other','c2','other','bio','야구','서울 성동구','coach',1),('pending','c3','pending','bio','러닝','서울 성동구','coach',0);INSERT INTO pc_requests(id,member_id,sport,region,concern,created) VALUES('q','player','러닝','서울 성동구','자세 고민',1794740000000);");
 await db.query(find('INSERT INTO pc_recipients'),['q','러닝','서울 성동구','player']);
 expect((await db.query('SELECT coach_id FROM pc_recipients')).rows).toEqual([{coach_id:'yes'}]);
 const feedback=find('INSERT OR IGNORE INTO pc_feedback');
 expect((await db.query(feedback,['f1','other','답변',1,'q','other'])).affectedRows).toBe(0);
 expect((await db.query(feedback,['f2','yes','답변',1,'q','yes'])).affectedRows).toBe(1);
 expect((await db.query(feedback,['f3','yes','중복',1,'q','yes'])).affectedRows).toBe(0);
 await db.exec("INSERT INTO pc_lessons VALUES('l','q','yes','player','accepted',1)");
 const review=find('INSERT OR IGNORE INTO pc_reviews');
 expect((await db.query(review,['r1','player',5,'후기',1,'l','player'])).affectedRows).toBe(0);
 await db.exec("UPDATE pc_lessons SET status='completed' WHERE id='l'");
 expect((await db.query(review,['r2','other',5,'후기',1,'l','other'])).affectedRows).toBe(0);
 expect((await db.query(review,['r3','player',5,'후기',1,'l','player'])).affectedRows).toBe(1);
 expect((await db.query(review,['r4','player',5,'중복',1,'l','player'])).affectedRows).toBe(0);
 }finally{await db.close();}
});
