"use client";
import { signIn, signOut } from "next-auth/react";
export function ProviderButton({
  provider,
  enabled,
}: {
  provider: "kakao" | "naver";
  enabled: boolean;
}) {
  return (
    <button
      disabled={!enabled}
      className={`social ${provider}`}
      onClick={() => signIn(provider, { callbackUrl: "/request" })}
    >
      <b>{provider === "kakao" ? "●" : "N"}</b>
      {provider === "kakao" ? "카카오" : "네이버"}로 시작하기
      {!enabled && <small>연결 준비 중</small>}
    </button>
  );
}
export function Logout() {
  return (
    <button
      className="button secondary"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      로그아웃
    </button>
  );
}
