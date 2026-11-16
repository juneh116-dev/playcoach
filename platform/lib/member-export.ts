import {createHash, timingSafeEqual} from 'node:crypto';

export const memberExportSQL = `SELECT m.id,m.name,m.provider,c.email,c.created
 FROM pc_members m LEFT JOIN pc_credentials c ON c.member_id=m.id
 WHERE m.id > $1 ORDER BY m.id LIMIT $2`;
export type MemberExportRow = {id:string;name:string;provider:string;email:string|null;created:string|number|null};
const json = (body:unknown, status=200) => Response.json(body, {status, headers:{
  'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff',
}});

export async function memberExport(request:Request, token:string|undefined,
  read:(after:string, limit:number)=>Promise<MemberExportRow[]>) {
  if (!token || token.length < 32) return json({error:'연결 준비 중입니다.'},503);
  const authorization = request.headers.get('authorization') || '';
  const digest = (value:string) => createHash('sha256').update(value).digest();
  if (!timingSafeEqual(digest(authorization), digest('Bearer '+token))) return json({error:'인증이 필요합니다.'},401);
  const after = new URL(request.url).searchParams.get('after') || '';
  if (after && !/^[a-zA-Z0-9-]{1,128}$/.test(after)) return json({error:'잘못된 페이지입니다.'},400);
  try {
    const rows = await read(after,501);
    const members = rows.slice(0,500).map(row => ({
      id:row.id, name:row.name, email:row.email || '', provider:row.provider,
      joinedAt:row.created == null ? null : new Date(Number(row.created)).toISOString(),
    }));
    return json({members,nextCursor:rows.length>500?members[members.length-1].id:null});
  } catch {
    return json({error:'가입자 정보를 불러오지 못했습니다.'},503);
  }
}
