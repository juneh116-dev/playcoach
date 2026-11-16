import { createHash } from "node:crypto";
import { getServerSession, type NextAuthOptions } from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import NaverProvider from "next-auth/providers/naver";
import { db } from "./db";

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET
      ? [
          KakaoProvider({
            clientId: process.env.KAKAO_CLIENT_ID,
            clientSecret: process.env.KAKAO_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET
      ? [
          NaverProvider({
            clientId: process.env.NAVER_CLIENT_ID,
            clientSecret: process.env.NAVER_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn() {
      return !!(process.env.DATABASE_URL && process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_URL);
    },
    async jwt({ token, account, user }) {
      if (account) {
        // Provider identities remain separate; email alone never links accounts.
        const id = createHash("sha256")
          .update(`${account.provider}:${account.providerAccountId}`)
          .digest("hex");
        await db().query(
          "INSERT INTO members(id, display_name) VALUES ($1,$2) ON CONFLICT(id) DO UPDATE SET display_name=EXCLUDED.display_name",
          [id, user.name || "플레이어"],
        );
        token.sub = id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) Object.assign(session.user, { id: token.sub });
      return session;
    },
  },
};
export async function member() {
  const session = await getServerSession(authOptions);
  return session?.user as { id: string; name?: string | null } | undefined;
}
