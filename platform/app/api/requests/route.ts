import { NextResponse } from "next/server";
import { z } from "zod";
import { member } from "@/lib/auth";
import { db } from "@/lib/db";
import { sports, validRegion } from "@/lib/catalog";
import { sameOrigin, failure } from "@/lib/http";
import { matchRecipients, notifyRecipients } from "@/lib/queries";
const schema = z.object({
  sport: z.enum(sports),
  region: z.string().refine(validRegion),
  concern: z.string().trim().min(1).max(2000),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "허용되지 않은 요청입니다." },
      { status: 403 },
    );
  try {
    const user = await member();
    if (!user)
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 },
      );
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      return NextResponse.json(
        { error: "종목, 지역, 고민과 동의 여부를 확인해 주세요." },
        { status: 400 },
      );
    const { sport, region, concern } = parsed.data;
    const client = await db().connect();
    try {
      await client.query("BEGIN");
      // Serialize requests from one account to enforce a server-side daily limit.
      await client.query("SELECT id FROM members WHERE id=$1 FOR UPDATE", [
        user.id,
      ]);
      const count = await client.query(
        "SELECT count(*)::int AS total FROM feedback_requests WHERE member_id=$1 AND created_at > now()-interval '24 hours'",
        [user.id],
      );
      if (count.rows[0].total >= 5) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "무료 피드백은 24시간 동안 최대 5건 요청할 수 있습니다." },
          { status: 429 },
        );
      }
      const result = await client.query(
        "INSERT INTO feedback_requests(member_id,sport,region,concern,consent_version) VALUES($1,$2,$3,$4,$5) RETURNING id",
        [user.id, sport, region, concern, "2026-11-12-v1"],
      );
      const id = result.rows[0].id;
      // Snapshot eligible recipients at submission; later profile edits do not expose old requests.
      const recipients = await client.query(matchRecipients, [
        id,
        sport,
        region,
        user.id,
      ]);
      await client.query(notifyRecipients, [id]);
      await client.query("COMMIT");
      return NextResponse.json(
        { id, recipients: recipients.rowCount },
        { status: 201 },
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return failure(error);
  }
}
