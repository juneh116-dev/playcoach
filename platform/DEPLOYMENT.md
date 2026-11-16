# 독립 배포 — Vercel

기존 Higgsfield 배포는 호스팅 로그인 때문에 일반 방문용 주소로 사용하지 않습니다. 이 폴더의 Next.js 앱은 호스팅 계정 로그인 없이 홈페이지를 제공하고, `/api/platform/*`에서 자체 이메일 로그인과 선택형 네이버·카카오 세션을 확인합니다. Higgsfield SDK, 인증 또는 API를 호출하지 않습니다.

## 배포 설정

- GitHub: `juneh116-dev/playcoach`
- Root Directory: `platform`
- Framework: Next.js
- Build: `npm run build:vercel` (DB가 설정된 경우 마이그레이션 성공 후 `next build`)
- 앱 서버 지역: 서울 `icn1`
- 운영 DB: Supabase 무료 PostgreSQL, 서울 `ap-northeast-2` (`playcoach-db-seoul`)
- Install: `npm ci`
- Production 배포의 Deployment Protection은 비활성화해 일반 방문을 허용해야 합니다. Preview 보호는 유지해도 됩니다.
- 공개 후 반드시 쿠키가 없는 브라우저에서 `/`가 HTTP 200이며 Vercel·Higgsfield 로그인으로 이동하지 않는지 확인합니다.

필수 환경변수는 `APP_URL`(최종 공개 origin)과 `DATABASE_URL`입니다. `ADMIN_MEMBER_ID`는 코치 승인 관리자 계정에 설정합니다. 소셜 로그인을 사용할 때만 `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET` 또는 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 쌍을 추가합니다. 이메일 회원가입은 소셜 키 없이 동작합니다. 레거시 NextAuth 환경변수는 현재 화면에 필요하지 않습니다. 값을 코드나 채팅에 올리지 않습니다. 공개 홈페이지는 이 값 없이도 열립니다. 실제 코치 목록 및 개인 기능에는 운영 DB 연결이 필요합니다.

운영 PostgreSQL 연결을 환경변수에 설정한 뒤 `npm run db:migrate`로 `db/002-platform.sql`, `db/003-local-auth.sql`, `db/004-private-platform.sql`을 순서대로 적용합니다. 두 번째 마이그레이션은 이메일 자격 증명과 시도 횟수 제한 테이블이므로 생략하면 이메일 가입이 동작하지 않습니다. 세 번째 마이그레이션은 모든 `pc_*` 테이블의 RLS를 활성화하고 `PUBLIC`, `anon`, `authenticated` 권한을 제거합니다. Supabase 브라우저 Data API로 계정·비밀번호 해시·세션·영상에 접근하지 못하게 하며, 서버의 PostgreSQL 소유자 연결은 유지합니다. 기존 초기 Next.js 실험용 `001-initial.sql`의 테이블과 별개로 `pc_*` 테이블을 사용합니다. 실제 개인정보가 이미 있는 DB라면 별도 이관 계획 없이 기존 테이블을 삭제하지 않습니다.

소셜 로그인 Callback은 최종 도메인을 기준으로 등록합니다.

```text
https://최종도메인/api/platform/auth/kakao/callback
https://최종도메인/api/platform/auth/naver/callback
```

요청/수신자/피드백/레슨/리뷰 로직과 CSS 스크롤 애니메이션을 이전했습니다. 영상은 임시로 비공개 PostgreSQL 바이너리 저장을 사용하며 Vercel 요청 크기를 고려해 3MB로 제한합니다. 큰 영상은 전용 비공개 객체 저장소 및 직접 업로드로 확장해야 합니다. 일반 운영 전 별도 확장 항목입니다.

2026-11-16 Vercel 계정 연결과 CLI Production 배포를 완료했습니다. 공개 주소는 https://playcoach-opal.vercel.app 이며 Vercel Authentication 보호는 비활성화했습니다. 쿠키·인증 헤더 없이 `/`, `/login`, `/signup`이 HTTP 200으로 열리고 `/api/platform/me`는 `user: null`을 반환하는 것을 확인했습니다.

`APP_URL`과 `DATABASE_URL` 설정, Supabase 서울 DB 생성, 세 개의 마이그레이션 적용을 완료했습니다. Vercel 배포 API에서 앱 서버 지역 `icn1`도 확인했습니다. 임시 계정으로 실제 운영 주소의 이메일 가입, 잘못된 비밀번호 거부, 로그인, 세션 확인, 개인 수신함, 로그아웃과 세션 폐기를 검증했고 해당 테스트 계정은 삭제했습니다. 익명 Supabase Data API의 자격 증명 테이블 접근 차단도 검증했습니다. 소셜 키는 미등록이므로 네이버·카카오 버튼은 비활성화됩니다.

Supabase의 공식 공개 CA를 `lib/supabase-ca.json`에 포함하고 기본 Node.js CA와 함께 사용합니다. 인증서와 호스트 이름 검증을 끄지 않습니다. 출처는 `https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`, SHA-256 지문은 `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`이며 만료일은 2031-04-26 UTC입니다. 갱신 시 공식 출처와 지문·유효기간을 다시 확인하세요.

GitHub 자동 연결은 Vercel에서 저장소 접근 오류로 실패했습니다. 현재 배포는 `platform/` 소스를 CLI로 올린 독립 배포입니다. 자동 배포를 사용하려면 Vercel GitHub 앱의 저장소 접근을 허용하고 Git 연결 및 Root Directory=`platform`을 설정하세요. 현재 CLI 전용 프로젝트의 Root Directory는 기본값이며 CLI는 `platform/`에서 실행합니다.

## CLI 배포와 공개 검증

```sh
npx vercel login
# platform 폴더에서 실행합니다. 기존 GitHub 연동 프로젝트라면 Root Directory=platform을 확인합니다.
npx vercel link
npx vercel env add DATABASE_URL production
npx vercel env add APP_URL production
npx vercel --prod
npm run check:public -- https://최종도메인
```

HTTP 프록시를 사용하는 Node.js 24 환경에서는 `NODE_USE_ENV_PROXY=1 npm run check:public -- https://최종도메인`으로 검사합니다.

환경변수를 추가하거나 변경한 경우 재배포해야 적용됩니다. Vercel 프로젝트 Settings → Deployment Protection에서 Production 도메인의 익명 접근을 허용합니다. 공개 검사가 401/302로 실패하면 배포 성공으로 처리하지 않습니다. 마지막으로 쿠키 없는 브라우저에서도 홈 화면이 표시되는지 확인합니다. 운영 DB가 설정되지 않으면 공개 홈은 열려도 실제 회원가입은 503을 반환하므로 별도로 DB 연결과 마이그레이션을 완료해야 합니다.

## 운영 인증 재검증

배포된 앱과 DB에 접근 가능한 환경에서 `node scripts/check-account.mjs https://playcoach-opal.vercel.app`을 실행할 수 있습니다. `APP_URL`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`가 필요합니다. 임시 계정의 가입·로그인·세션·수신함·로그아웃 및 익명 Data API 차단을 검사하고 계정·세션·해당 계정의 시도 횟수 레코드를 정리합니다. 실제 회원 계정이나 코칭 요청은 생성·수정하지 않습니다.

로컬에서 DB에 접근할 수 없다면 Vercel에서 `npx vercel --prod --build-env PLAYCOACH_CHECK_ACCOUNT_URL=https://playcoach-opal.vercel.app`로 검증할 수 있습니다. 이 검사는 **기존에 실행 중인 공개 배포**를 대상으로 하므로 첫 배포 완료 후 사용합니다. 일반 배포에는 이 옵션이 필요하지 않습니다. 마이그레이션이나 지정한 인증 검사가 실패하면 새 배포를 중단합니다.
