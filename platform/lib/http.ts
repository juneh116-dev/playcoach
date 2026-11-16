import { NextResponse } from "next/server";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.NEXTAUTH_URL;
  return !!origin && origin === new URL(expected || request.url).origin;
}
export function failure(error: unknown) {
  console.error(
    "PLAYCOACH request failed",
    error instanceof Error ? error.name : "unknown",
  );
  return NextResponse.json(
    { error: "처리하지 못했습니다. 잠시 후 다시 시도해 주세요." },
    { status: 503 },
  );
}
