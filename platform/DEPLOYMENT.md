# 독립 배포 — Vercel

기존 Higgsfield 배포는 호스팅 로그인 때문에 일반 방문용 주소로 사용하지 않습니다. 이 폴더의 Next.js 앱은 호스팅 계정 로그인 없이 홈페이지를 제공하고, `/api/platform/*`에서 자체 네이버·카카오 세션을 확인합니다. Higgsfield SDK, 인증 또는 API를 호출하지 않습니다.

## 배포 설정

- GitHub: `juneh116-dev/playcoach`
- Root Directory: `platform`
- Framework: Next.js
- Build: `npm run build`
- Install: `npm ci`
- Production 배포의 Deployment Protection은 비활성화해 일반 방문을 허용해야 합니다. Preview 보호는 유지해도 됩니다.
- 공개 후 반드시 쿠키가 없는 브라우저에서 `/`가 HTTP 200이며 Vercel·Higgsfield 로그인으로 이동하지 않는지 확인합니다.

환경변수에 `APP_URL`(최종 공개 origin), `DATABASE_URL`, `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `ADMIN_MEMBER_ID`를 설정합니다. 값을 코드나 채팅에 올리지 않습니다. 공개 홈페이지는 이 값 없이도 열립니다. 실제 코치 목록 및 개인 기능에는 운영 DB 연결이 필요합니다.

운영 PostgreSQL에 `db/002-platform.sql`을 적용합니다. 기존 초기 Next.js 실험용 `001-initial.sql`의 테이블과 별개로 `pc_*` 테이블을 사용합니다. 실제 개인정보가 이미 있는 DB라면 별도 이관 계획 없이 기존 테이블을 삭제하지 않습니다.

소셜 로그인 Callback은 최종 도메인을 기준으로 등록합니다.

```text
https://최종도메인/api/platform/auth/kakao/callback
https://최종도메인/api/platform/auth/naver/callback
```

요청/수신자/피드백/레슨/리뷰 로직과 CSS 스크롤 애니메이션을 이전했습니다. 영상은 임시로 비공개 PostgreSQL 바이너리 저장을 사용하며 Vercel 요청 크기를 고려해 3MB로 제한합니다. 큰 영상은 전용 비공개 객체 저장소 및 직접 업로드로 확장해야 합니다. 일반 운영 전 별도 확장 항목입니다.

현재 Vercel 계정 연결이 확인되지 않아 새 공개 배포는 아직 실행하지 않았습니다. 연결 후 소스 업로드, Production 배포, 비로그인 접속 검사 순서로 완료합니다. 이전 배포 성공을 새 배포 성공으로 간주하지 않습니다.
