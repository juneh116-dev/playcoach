import {db} from '@/lib/db';
import {memberExport, memberExportSQL} from '@/lib/member-export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request:Request) {
  return memberExport(request,process.env.MEMBERS_SHEET_EXPORT_TOKEN,
    async (after,limit) => (await db().query(memberExportSQL,[after,limit])).rows);
}
