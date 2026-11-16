# PLAYCOACH 독립 서비스 앱

Next.js / TypeScript / PostgreSQL 기반 서비스입니다. 저장소 루트의 GitHub Pages 랜딩페이지와 별도로 `platform/`을 Vercel에 배포합니다. Higgsfield 인증이나 SDK에 의존하지 않습니다.

## 시작하기

Node.js 22 이상에서 실행합니다.

```sh
cd platform
npm ci
cp .env.example .env.local
npm run dev
```

홈페이지, 로그인, 회원가입 화면은 호스팅 계정이나 서비스 로그인 없이 열립니다. 실제 가입·로그인·요청 저장에는 PostgreSQL 연결이 필요합니다. DB 미연결 시 가입 성공으로 표시하지 않고 연결 준비 안내를 반환합니다.

## 계정

- 자체 이메일·비밀번호 회원가입과 로그인이 기본입니다. 비밀번호는 12~128자이며 salted scrypt 해시로 저장합니다.
- 회원가입 후 이메일로 로그인합니다. 세션은 HttpOnly 쿠키와 DB의 해시된 토큰을 사용하며 7일간 유지됩니다.
- 네이버·카카오 로그인은 선택 기능입니다. 운영 DB와 해당 제공자의 키가 모두 설정된 경우만 활성화됩니다. 이메일 가입에 소셜 키는 필요하지 않습니다.
- 같은 이메일이라는 이유로 자체 계정과 소셜 계정을 자동 병합하지 않습니다.
- 현재 화면과 API는 `/api/platform/*`, DB는 `002-platform.sql`과 `003-local-auth.sql`을 사용합니다. 이전 NextAuth 경로와 `001-initial.sql`은 레거시이며 새 배포 설정에 사용하지 않습니다.

## 데이터베이스와 배포

운영 서버의 환경변수에 `DATABASE_URL`과 최종 공개 origin인 `APP_URL`을 설정합니다. 비밀값은 코드나 채팅에 올리지 않습니다. TLS 인증서 검증을 유지합니다.

```sh
npm run db:migrate
```

위 명령은 독립 앱의 두 마이그레이션을 순서대로 적용하며 기존 레거시 테이블을 삭제하지 않습니다. 상세 Vercel 설정과 OAuth 콜백은 [DEPLOYMENT.md](DEPLOYMENT.md)를 확인하세요.

## 구현 범위

종목·지역 기반 요청, 승인 코치 매칭, 비공개 소용량 영상, 코치 등록·관리자 승인, 피드백, 레슨 신청·수락·완료, 완료 레슨 후기 기능을 제공합니다. 서울·경기·부산 일부 지역을 지원합니다. 알림톡·이메일·푸시 알림은 연결하지 않았습니다.

## 검증

```sh
npm run build
npm run typecheck
npx playwright install chromium
npm test
npm run check:public -- https://최종도메인
```

시스템 Chromium을 사용할 때는 `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm test`로 실행합니다. 테스트는 PGlite로 실제 SQL과 자체 인증을 검사하고, Playwright로 공개 접근·가입 화면·요청 흐름을 확인합니다. 공개 URL 검사는 쿠키·인증 헤더·보호 우회 없이 홈페이지와 가입·로그인 페이지의 HTTP 200, 리다이렉트 부재와 익명 세션을 확인합니다. 실제 운영 DB와 외부 OAuth 검증은 해당 연결 후 별도로 수행해야 합니다.

## 일반 모집 전 남은 작업

이메일 인증·비밀번호 재설정, 계정 삭제·보관 기간에 따른 파기, 정식 운영 약관·개인정보 처리방침, 대용량 비공개 영상 저장소와 직접 업로드, 관리자·신고 처리가 남아 있습니다. 영상은 현재 Vercel 요청 제한을 고려해 3MB 이하만 지원합니다. 검색 노출은 차단되어 있습니다.
