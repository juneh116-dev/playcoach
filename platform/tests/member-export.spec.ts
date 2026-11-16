import {test,expect} from '@playwright/test';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {memberExport,memberExportSQL,MemberExportRow} from '../lib/member-export';

const token='test-export-token-with-at-least-32-characters';
const request=(suffix='',authorization='Bearer '+token)=>new Request('https://playcoach.example/api/internal/members-export'+suffix,{headers:{authorization}});

test('가입자 내보내기는 별도 비밀키로 보호하고 비밀번호·세션을 포함하지 않는다',async()=>{
 let reads=0;
 const read=async()=>{reads++;return [] as MemberExportRow[];};
 expect((await memberExport(request(),undefined,read)).status).toBe(503);
 expect((await memberExport(request('',''),token,read)).status).toBe(401);
 expect((await memberExport(request('','Bearer wrong-key'),token,read)).status).toBe(401);
 expect(reads).toBe(0);
 expect((await memberExport(request('?after=invalid%27cursor'),token,read)).status).toBe(400);
 const db=new PGlite();
 try{
  await db.exec(await readFile('db/002-platform.sql','utf8'));
  await db.exec(await readFile('db/003-local-auth.sql','utf8'));
  await db.exec("INSERT INTO pc_members VALUES('a','회원','email','player@example.invalid'),('b','소셜회원','kakao','provider-subject'); INSERT INTO pc_credentials VALUES('player@example.invalid','a','secret-password-hash',1794790000000); INSERT INTO pc_sessions VALUES('secret-session-hash','a',9999999999999);");
  const response=await memberExport(request(),token,async(after,limit)=>(await db.query<MemberExportRow>(memberExportSQL,[after,limit])).rows);
  expect(response.headers.get('cache-control')).toContain('no-store');
  const data=await response.json();
  expect(data.members).toHaveLength(2);
  expect(data.members[0]).toEqual({id:'a',name:'회원',provider:'email',email:'player@example.invalid',joinedAt:new Date(1794790000000).toISOString()});
  expect(data.members[1].joinedAt).toBeNull();
  expect(data.members[1].email).toBe('');
  expect(JSON.stringify(data)).not.toMatch(/secret-|provider-subject|password_hash|pc_session/);
  const paged=await memberExport(request('?after=a'),token,async(after,limit)=>(await db.query<MemberExportRow>(memberExportSQL,[after,limit])).rows);
  expect((await paged.json()).members.map((m:MemberExportRow)=>m.id)).toEqual(['b']);
 }finally{await db.close();}
});

test('가입자가 많으면 500명 단위로 다음 페이지를 안내한다',async()=>{
 const response=await memberExport(request(),token,async(_after,limit)=>{
  expect(limit).toBe(501);
  return Array.from({length:501},(_,i)=>({id:String(i).padStart(4,'0'),name:'member',email:null,created:null,provider:'email'}));
 });
 const data=await response.json();expect(data.members).toHaveLength(500);expect(data.nextCursor).toBe('0499');
});

test('스프레드시트 동기화는 수식 입력을 막고 페이지 실패 시 기존 데이터를 보존한다',async()=>{
 const source=await readFile('integrations/google-sheets/Code.gs','utf8');
 function context(fail:boolean){
  const writes:unknown[][][]=[],clears:number[][]=[];let page=0;
  const sheet={getLastRow:()=>4,getMaxRows:()=>1000,getRange:(...range:any[])=>({
   getDisplayValues:()=>[['회원 ID','이름','이메일','가입일 (한국시간)','가입 방식']],
   setNumberFormat(){return this;},setValues(values:unknown[][]){writes.push(values);},clearContent(){clears.push(range);},setNote(){}
  })};
  const sandbox:any={PropertiesService:{getScriptProperties:()=>({getProperties:()=>({MEMBERS_EXPORT_TOKEN:token,MEMBERS_EXPORT_URL:'https://playcoach.example/api/internal/members-export',MEMBERS_SHEET_ID:'test-sheet'})})},
   LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
   UrlFetchApp:{fetch:()=>{page++;return {getResponseCode:()=>fail&&page===2?503:200,getContentText:()=>JSON.stringify(page===1?{members:[{id:'a',name:'=IMPORTXML("bad")',email:'user@example.invalid',provider:'email',joinedAt:null}],nextCursor:'a'}:{members:[],nextCursor:null})};}},
   SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet})},Utilities:{formatDate:()=>''}
  };
  runInNewContext(source,sandbox);return {sandbox,writes,clears};
 }
 const failed=context(true);expect(()=>failed.sandbox.syncPlaycoachMembers()).toThrow(/503/);expect(failed.writes).toHaveLength(0);expect(failed.clears).toHaveLength(0);
 const ok=context(false);ok.sandbox.syncPlaycoachMembers();expect(ok.writes[0][0][1]).toBe('\'=IMPORTXML("bad")');expect(ok.clears).toHaveLength(1);
});
