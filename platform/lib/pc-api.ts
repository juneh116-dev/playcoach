import {localAuth} from './local-auth';
import {bindings} from './platform-bindings';
import {sports,validRegion} from './pc-catalog';
type Env=ReturnType<typeof bindings>&{KAKAO_CLIENT_ID?:string;KAKAO_CLIENT_SECRET?:string;NAVER_CLIENT_ID?:string;NAVER_CLIENT_SECRET?:string;ADMIN_MEMBER_ID?:string};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const cookie=(r:Request,n:string)=>r.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(n+'='))?.slice(n.length+1)||'';
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const text=(v:unknown,max:number)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max?v.trim():'';
export async function platformAPI(r:Request):Promise<Response>{
 const env=bindings() as Env,db=env.DB,u=new URL(r.url),p=u.pathname.replace('/api/platform/',''),now=Date.now();
 try{
 const configuredOrigin=process.env.APP_URL||process.env.NEXTAUTH_URL;
 if(configuredOrigin){const canonical=new URL(configuredOrigin);u.protocol=canonical.protocol;u.host=canonical.host;}
 if(p==='config')return json({kakao:!!(env.DB&&env.KAKAO_CLIENT_ID&&env.KAKAO_CLIENT_SECRET),naver:!!(env.DB&&env.NAVER_CLIENT_ID&&env.NAVER_CLIENT_SECRET)});
 if(r.method!=='GET'&&r.headers.get('origin')!==u.origin)return json({error:'허용되지 않은 요청입니다.'},403);
 if(p==='register'||p==='login')return localAuth(r,p,db);
 if(!db&&p==='me')return json({user:null,admin:false});
 if(!db){if(!['coaches','reviews'].includes(p)&&!p.startsWith('auth/')&&!cookie(r,'pc_session'))return json({error:'로그인이 필요합니다.'},401);return json({error:'서비스 연결을 준비하고 있습니다.'},503);}
 if(p.startsWith('auth/')){
  const provider=p.split('/')[1],callback=p.endsWith('/callback');
  if(!['kakao','naver'].includes(provider))return json({error:'지원하지 않는 로그인입니다.'},400);
  const id=provider==='kakao'?env.KAKAO_CLIENT_ID:env.NAVER_CLIENT_ID,secret=provider==='kakao'?env.KAKAO_CLIENT_SECRET:env.NAVER_CLIENT_SECRET;
  if(!id||!secret)return Response.redirect(u.origin+'/login?error=not_configured',302);
  const redirect=u.origin+'/api/platform/auth/'+provider+'/callback';
  if(!callback){const state=crypto.randomUUID();const auth=new URL(provider==='kakao'?'https://kauth.kakao.com/oauth/authorize':'https://nid.naver.com/oauth2.0/authorize');auth.search=new URLSearchParams({client_id:id,redirect_uri:redirect,response_type:'code',state}).toString();return new Response(null,{status:302,headers:{Location:auth.toString(),'Set-Cookie':'pc_state='+provider+':'+state+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600','Cache-Control':'no-store'}});}
  if(!u.searchParams.get('state')||cookie(r,'pc_state')!==provider+':'+u.searchParams.get('state')||!u.searchParams.get('code'))return json({error:'로그인 확인에 실패했습니다.'},400);
  const tokenResponse=await fetch(provider==='kakao'?'https://kauth.kakao.com/oauth/token':'https://nid.naver.com/oauth2.0/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:id,client_secret:secret,redirect_uri:redirect,code:u.searchParams.get('code')!,state:u.searchParams.get('state')!})});
  const token=await tokenResponse.json() as any;if(!tokenResponse.ok||!token.access_token)return Response.redirect(u.origin+'/login?error=failed',302);
  const profileResponse=await fetch(provider==='kakao'?'https://kapi.kakao.com/v2/user/me':'https://openapi.naver.com/v1/nid/me',{headers:{Authorization:'Bearer '+token.access_token}});
  const profile=await profileResponse.json() as any;
  const subject=provider==='kakao'?profile.id:profile.response?.id,name=provider==='kakao'?profile.properties?.nickname:profile.response?.nickname;
  if(!profileResponse.ok||!subject)return json({error:'계정 확인에 실패했습니다.'},400);
  const memberId=await hash(provider+':'+subject),session=crypto.randomUUID()+crypto.randomUUID();
  await db.batch([db.prepare('INSERT INTO pc_members(id,name,provider,subject) VALUES(?,?,?,?) ON CONFLICT(provider,subject) DO UPDATE SET name=excluded.name').bind(memberId,String(name||'플레이어'),provider,String(subject)),db.prepare('INSERT INTO pc_sessions(hash,member_id,expires) VALUES(?,?,?)').bind(await hash(session),memberId,now+604800000)]);
  const headers=new Headers({Location:'/request','Cache-Control':'no-store'});headers.append('Set-Cookie','pc_session='+session+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800');headers.append('Set-Cookie','pc_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');return new Response(null,{status:302,headers});
 }
 const session=cookie(r,'pc_session');
 const user=session?await db.prepare('SELECT m.id,m.name FROM pc_sessions s JOIN pc_members m ON m.id=s.member_id WHERE s.hash=? AND s.expires>?').bind(await hash(session),now).first<{id:string;name:string}>():null;
 if(r.method!=='GET'&&r.headers.get('origin')!==u.origin)return json({error:'허용되지 않은 요청입니다.'},403);
 if(p==='me')return json({user,admin:!!user&&env.ADMIN_MEMBER_ID===user.id});
 if(p==='coaches'&&r.method==='GET'){
  const result=await db.prepare("SELECT c.id,c.name,c.bio,c.sport,c.region,c.kind,(SELECT AVG(rating) FROM pc_reviews WHERE coach_id=c.id) rating,(SELECT COUNT(*) FROM pc_reviews WHERE coach_id=c.id) reviews FROM pc_coaches c WHERE approved=1 AND (?='' OR sport=?) AND (?='' OR region=?) ORDER BY name LIMIT 100").bind(u.searchParams.get('sport')||'',u.searchParams.get('sport')||'',u.searchParams.get('region')||'',u.searchParams.get('region')||'').all();return json(result.results);
 }
 if(p==='reviews'&&r.method==='GET')return json((await db.prepare('SELECT rating,body,created FROM pc_reviews WHERE coach_id=? ORDER BY created DESC LIMIT 50').bind(u.searchParams.get('coach')||'').all()).results);
 if(!user)return json({error:'로그인이 필요합니다.'},401);
 if(p==='logout'){await db.prepare('DELETE FROM pc_sessions WHERE hash=?').bind(await hash(session)).run();return new Response('{}',{headers:{'Set-Cookie':'pc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+(u.protocol==='https:'?'; Secure':''),'Content-Type':'application/json'}});}
 const coach=await db.prepare('SELECT * FROM pc_coaches WHERE member_id=?').bind(user.id).first<any>();
 if(p==='upload'&&r.method==='POST'){
  if(!env.STORAGE)return json({error:'영상 저장소 연결을 준비 중입니다.'},503);
  if(Number(r.headers.get('content-length')||0)>4*1024*1024)return json({error:'영상은 3MB 이하로 첨부해 주세요.'},413);
  const f=(await r.formData()).get('file');if(!(f instanceof File)||f.size===0||f.size>3*1024*1024)return json({error:'영상은 3MB 이하로 첨부해 주세요.'},400);
  const recent=await db.prepare('SELECT count(*) n FROM pc_uploads WHERE member_id=? AND created>?').bind(user.id,now-86400000).first<any>();if(recent.n>=10)return json({error:'오늘의 영상 업로드 한도를 초과했습니다.'},429);
  const bytes=new Uint8Array(await f.arrayBuffer()),mp4=String.fromCharCode(...bytes.slice(4,8))==='ftyp',webm=bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3;
  if(!mp4&&!webm)return json({error:'MP4 또는 WebM 영상만 올릴 수 있습니다.'},400);
  const id=crypto.randomUUID(),mime=mp4?'video/mp4':'video/webm';await env.STORAGE.put('videos/'+id,bytes,{httpMetadata:{contentType:mime}});
  try{await db.prepare('INSERT INTO pc_uploads VALUES(?,?,?,?,?)').bind(id,user.id,mime,f.size,now).run();}catch(e){await env.STORAGE.delete('videos/'+id);throw e;}return json({id},201);
 }
 if(p.startsWith('video/')&&r.method==='GET'){
  const id=p.split('/')[1],upload=await db.prepare('SELECT * FROM pc_uploads WHERE id=?').bind(id).first<any>();
  const allowed=upload&&(upload.member_id===user.id||await db.prepare('SELECT 1 FROM pc_requests q JOIN pc_recipients x ON x.request_id=q.id JOIN pc_coaches c ON c.id=x.coach_id WHERE q.upload_id=? AND c.member_id=? AND c.approved=1').bind(id,user.id).first());
  if(!allowed)return json({error:'영상을 확인할 권한이 없습니다.'},403);
  const object=await env.STORAGE?.get('videos/'+id);if(!object)return json({error:'영상을 찾을 수 없습니다.'},404);
  return new Response(object.body as any,{headers:{'Content-Type':upload.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(p==='requests'&&r.method==='POST'){
  const b=await r.json() as any;if(!sports.includes(b.sport)||!validRegion(b.region)||b.consent!==true||(!text(b.concern,2000)&&!b.uploadId))return json({error:'종목·지역·고민 또는 영상과 동의 여부를 확인해 주세요.'},400);
  if(b.uploadId&&!await db.prepare('SELECT id FROM pc_uploads WHERE id=? AND member_id=?').bind(b.uploadId,user.id).first())return json({error:'올바른 영상을 첨부해 주세요.'},400);
  const count=await db.prepare('SELECT COUNT(*) n FROM pc_requests WHERE member_id=? AND created>?').bind(user.id,now-86400000).first<any>();if(count.n>=5)return json({error:'24시간에 최대 5건 요청할 수 있어요.'},429);
  const id=crypto.randomUUID();await db.batch([db.prepare('INSERT INTO pc_requests(id,member_id,sport,region,concern,upload_id,created) VALUES(?,?,?,?,?,?,?)').bind(id,user.id,b.sport,b.region,text(b.concern,2000),b.uploadId||null,now),db.prepare('INSERT INTO pc_recipients(request_id,coach_id) SELECT ?,id FROM pc_coaches WHERE approved=1 AND sport=? AND region=? AND member_id<>?').bind(id,b.sport,b.region,user.id)]);
  const n=await db.prepare('SELECT COUNT(*) n FROM pc_recipients WHERE request_id=?').bind(id).first<any>();return json({id,recipients:n.n},201);
 }
 if(p==='inbox'){
  const requests=(await db.prepare('SELECT * FROM pc_requests WHERE member_id=? ORDER BY created DESC LIMIT 100').bind(user.id).all()).results;
  const feedback=(await db.prepare('SELECT f.*,c.name,c.bio FROM pc_feedback f JOIN pc_coaches c ON c.id=f.coach_id JOIN pc_requests q ON q.id=f.request_id WHERE q.member_id=? ORDER BY f.created DESC').bind(user.id).all()).results;
  const lessons=(await db.prepare('SELECT l.*,c.name FROM pc_lessons l JOIN pc_coaches c ON c.id=l.coach_id WHERE l.member_id=? ORDER BY created DESC').bind(user.id).all()).results;return json({requests,feedback,lessons});
 }
 if(p==='coach-register'&&r.method==='POST'){
  const b=await r.json() as any;if(!text(b.name,80)||!text(b.bio,2000)||!sports.includes(b.sport)||!validRegion(b.region)||!['coach','facility'].includes(b.kind))return json({error:'이름·소개·종목·지역을 확인해 주세요.'},400);
  if(coach)return json({error:'이미 등록된 프로필이 있습니다.'},409);
  await db.prepare('INSERT INTO pc_coaches(id,member_id,name,bio,sport,region,kind) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),user.id,b.name.trim(),b.bio.trim(),b.sport,b.region,b.kind).run();return json({ok:true},201);
 }
 if(p==='coach'){
  if(!coach?.approved)return json({coach,requests:[],lessons:[]});
  return json({coach,requests:(await db.prepare('SELECT q.*,f.body feedback FROM pc_recipients x JOIN pc_requests q ON q.id=x.request_id LEFT JOIN pc_feedback f ON f.request_id=q.id AND f.coach_id=x.coach_id WHERE x.coach_id=? AND q.status=? ORDER BY q.created DESC LIMIT 100').bind(coach.id,'open').all()).results,lessons:(await db.prepare('SELECT * FROM pc_lessons WHERE coach_id=? ORDER BY created DESC LIMIT 100').bind(coach.id).all()).results});
 }
 if(p==='feedback'&&r.method==='POST'){
  const b=await r.json() as any;if(!coach?.approved||!text(b.body,4000)||b.body.trim().length<20)return json({error:'승인된 코치만 20자 이상의 피드백을 보낼 수 있습니다.'},400);
  const result=await db.prepare("INSERT OR IGNORE INTO pc_feedback(id,request_id,coach_id,body,created) SELECT ?,q.id,?,?,? FROM pc_requests q JOIN pc_recipients x ON x.request_id=q.id WHERE q.id=? AND x.coach_id=? AND q.status='open'").bind(crypto.randomUUID(),coach.id,b.body.trim(),now,b.requestId,coach.id).run();if(!result.meta.changes)return json({error:'답변 권한이 없거나 이미 답변한 요청입니다.'},403);return json({ok:true},201);
 }
 if(p==='lessons'&&r.method==='POST'){
  const b=await r.json() as any;const result=await db.prepare('INSERT OR IGNORE INTO pc_lessons(id,request_id,coach_id,member_id,created) SELECT ?,q.id,f.coach_id,?,? FROM pc_requests q JOIN pc_feedback f ON f.request_id=q.id WHERE q.id=? AND q.member_id=? AND f.coach_id=?').bind(crypto.randomUUID(),user.id,now,b.requestId,user.id,b.coachId).run();return result.meta.changes?json({ok:true},201):json({error:'신청할 수 없거나 이미 신청한 레슨입니다.'},409);
 }
 if(p==='lesson-status'&&r.method==='POST'){
  const b=await r.json() as any;let result;
  if(b.status==='completed')result=await db.prepare("UPDATE pc_lessons SET status='completed' WHERE id=? AND member_id=? AND status='accepted'").bind(b.id,user.id).run();
  else if(b.status==='cancelled')result=await db.prepare("UPDATE pc_lessons SET status='cancelled' WHERE id=? AND member_id=? AND status IN ('requested','accepted')").bind(b.id,user.id).run();
  else if(coach?.approved&&['accepted','declined'].includes(b.status))result=await db.prepare("UPDATE pc_lessons SET status=? WHERE id=? AND coach_id=? AND status='requested'").bind(b.status,b.id,coach.id).run();
  if(!result?.meta.changes)return json({error:'변경할 수 없는 레슨입니다.'},403);return json({ok:true});
 }
 if(p==='review'&&r.method==='POST'){
  const b=await r.json() as any;if(!Number.isInteger(b.rating)||b.rating<1||b.rating>5||!text(b.body,1000))return json({error:'평점과 후기를 확인해 주세요.'},400);
  const result=await db.prepare("INSERT OR IGNORE INTO pc_reviews(id,lesson_id,coach_id,member_id,rating,body,created) SELECT ?,id,coach_id,?,?,?,? FROM pc_lessons WHERE id=? AND member_id=? AND status='completed'").bind(crypto.randomUUID(),user.id,b.rating,b.body.trim(),now,b.lessonId,user.id).run();return result.meta.changes?json({ok:true},201):json({error:'완료된 본인 레슨에 한 번만 후기를 남길 수 있습니다.'},403);
 }
 if(p==='admin'){
  if(env.ADMIN_MEMBER_ID!==user.id)return json({error:'관리자 권한이 필요합니다.'},403);
  if(r.method==='GET')return json((await db.prepare('SELECT * FROM pc_coaches WHERE approved=0').all()).results);
  const b=await r.json() as any;await db.prepare('UPDATE pc_coaches SET approved=1 WHERE id=?').bind(b.id).run();return json({ok:true});
 }
 return json({error:'요청을 찾을 수 없습니다.'},404);
 }catch{return json({error:'처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'},503);}
}
