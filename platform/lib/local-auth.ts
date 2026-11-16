import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {hashPassword,verifyPassword,absentPasswordHash} from './password';
import type {bindings} from './platform-bindings';
type Database=NonNullable<ReturnType<typeof bindings>['DB']>;
const schema=z.object({email:z.string().trim().max(254).email().transform(v=>v.toLowerCase()),password:z.string().min(12).max(128)});
const reply=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
async function allowed(db:Database,key:string,limit:number,now:number){
 const row=await db.prepare(`INSERT INTO pc_auth_limits(key,attempts,resets) VALUES(?,1,?)
 ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN pc_auth_limits.resets<=? THEN 1 ELSE pc_auth_limits.attempts+1 END,
 resets=CASE WHEN pc_auth_limits.resets<=? THEN excluded.resets ELSE pc_auth_limits.resets END RETURNING attempts`).bind(key,now+900000,now,now).first<{attempts:number}>();
 return !!row&&row.attempts<=limit;
}
export async function localAuth(request:Request,mode:'register'|'login',db:Database|undefined){
 if(request.method!=='POST')return reply({error:'허용되지 않은 요청입니다.'},405);
 if(!db)return reply({error:'회원 서비스를 연결하고 있습니다. 잠시 후 다시 시도해 주세요.'},503);
 if(Number(request.headers.get('content-length')||0)>8192)return reply({error:'입력 내용을 확인해 주세요.'},413);
 try{
  const raw=await request.json().catch(()=>null);
  const parsed=schema.safeParse(raw);
  if(!parsed.success)return reply({error:'올바른 이메일과 12~128자의 비밀번호를 입력해 주세요.'},400);
  const {email,password}=parsed.data,now=Date.now();
  const ip=process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown':'development';
  const accountKey=digest(mode+':email:'+email),addressKey=digest(mode+':address:'+ip);
  if(!await allowed(db,accountKey,mode==='register'?5:10,now)||!await allowed(db,addressKey,60,now))return reply({error:'시도 횟수를 초과했습니다. 15분 후 다시 시도해 주세요.'},429);
  if(mode==='register'){
   const name=typeof raw?.name==='string'?raw.name.trim():'';
   if(!name||name.length>40||raw.consent!==true)return reply({error:'이름과 개인정보 수집·이용 동의 여부를 확인해 주세요.'},400);
   const memberId=randomUUID(),encoded=await hashPassword(password);
   try{
    await db.batch([
     db.prepare('INSERT INTO pc_members(id,name,provider,subject) VALUES(?,?,?,?)').bind(memberId,name,'email',email),
     db.prepare('INSERT INTO pc_credentials(email,member_id,password_hash,created) VALUES(?,?,?,?)').bind(email,memberId,encoded,now)
    ]);
   }catch(error){
    if((error as {code?:string}).code==='23505')return reply({error:'가입을 완료하지 못했습니다. 기존 계정이 있다면 로그인해 주세요.'},409);
    throw error;
   }
   // Explicit login after signup; never expose the password hash or provider subject.
   return reply({ok:true},201);
  }
  const credential=await db.prepare('SELECT member_id,password_hash FROM pc_credentials WHERE email=?').bind(email).first<{member_id:string;password_hash:string}>();
  const valid=await verifyPassword(password,credential?.password_hash||absentPasswordHash);
  if(!credential||!valid)return reply({error:'이메일 또는 비밀번호가 올바르지 않습니다.'},401);
  const token=randomBytes(32).toString('hex');
  await db.prepare('INSERT INTO pc_sessions(hash,member_id,expires) VALUES(?,?,?)').bind(digest(token),credential.member_id,now+604800000).run();
  const secure=new URL(request.url).protocol==='https:'||process.env.NODE_ENV==='production';
  return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Cache-Control':'no-store','Set-Cookie':`pc_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure?'; Secure':''}`}});
 }catch{return reply({error:'회원 서비스를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'},503);}
}
