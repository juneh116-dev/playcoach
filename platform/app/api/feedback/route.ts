import { NextResponse } from "next/server";
import { z } from "zod";
import { member } from "@/lib/auth";
import { db } from "@/lib/db";
import { sameOrigin, failure } from "@/lib/http";
import { submitFeedback } from "@/lib/queries";
const schema = z.object({
  requestId: z.string().uuid(),
  body: z.string().trim().min(20).max(4000),
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
        { error: "피드백을 20~4,000자로 입력해 주세요." },
        { status: 400 },
      );
    const { requestId, body } = parsed.data;
    const result = await db().query(submitFeedback, [requestId, user.id, body]);
    if (!result.rowCount)
      return NextResponse.json(
        { error: "답변 권한이 없거나 이미 답변한 요청입니다." },
        { status: 403 },
      );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
