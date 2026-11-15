> 최신 독립 배포 구성은 [DEPLOYMENT.md](DEPLOYMENT.md)를 확인하세요. 아래 초기 구축 안내 중 NextAuth 및 초기 스키마 설명은 이전 버전입니다. 현재 화면은 `/api/platform/*` 자체 OAuth·세션과 `db/002-platform.sql`을 사용합니다.

# PLAYCOACH 서비스 앱

기존 GitHub 저장소 안의 Next.js / TypeScript / PostgreSQL 기반 앱입니다. 루트의 기존 랜딩페이지와 포트폴리오는 보존했습니다. GitHub Pages는 기존 정적 페이지를 계속 제공하고, 이 앱은 Node.js를 지원하는 호스팅에 별도로 배포합니다.

## 로컬 실행

Node.js 22 이상을 사용합니다.

```sh
cd platform
npm ci
cp .env.example .env.local
npm run dev
```

설정 없이도 홈, 요청 작성 화면과 로그인 전 화면을 볼 수 있습니다. 가짜 로그인·접수·답변 데이터는 만들지 않습니다. 설정이 없는 로그인 버튼은 비활성화됩니다.

## 데이터베이스

별도 PostgreSQL 데이터베이스에 `db/001-initial.sql`을 한 번 적용하고 `DATABASE_URL`을 설정합니다. 운영 DB는 TLS 인증서 검증을 켭니다. 이 앱은 브라우저에서 DB에 직접 접속하지 않습니다. 서버 연결 계정은 테이블 소유자로 구성하며 비밀 연결 문자열은 서버 환경변수에만 저장합니다. 익명 클라이언트용 권한은 부여하지 않습니다.

회원은 첫 소셜 로그인에서 생성됩니다. 현재 코치 등록·승인 UI는 없으므로 운영자가 검증한 계정만 DB에서 `coaches`에 등록해야 합니다. `sports`와 `regions`는 `lib/catalog.ts`와 동일한 값으로 설정합니다. 사용자가 직접 `approved`를 변경하는 API는 없습니다.

## 네이버·카카오 로그인

호스팅 환경변수에 `.env.example`의 값을 설정합니다. `NEXTAUTH_SECRET`은 `openssl rand -base64 32` 등으로 생성하고, `NEXTAUTH_URL`은 실제 서비스의 HTTPS 주소로 설정합니다. 비밀값을 GitHub나 채팅에 올리지 않습니다.

- 카카오 개발자 앱: REST API 키를 `KAKAO_CLIENT_ID`에 설정하고 카카오 로그인 및 Client Secret을 활성화합니다. 표시 이름 범위 설정도 확인합니다.
- 네이버 개발자 앱: 네이버 로그인 Client ID / Secret을 설정하고 필요한 서비스 검수를 진행합니다.
- 허용 Callback URL: `https://서비스주소/api/auth/callback/kakao`, `https://서비스주소/api/auth/callback/naver`.
- 로컬 테스트 시 `http://localhost:3000`을 기준으로 각각 별도 등록합니다.
- 제공자 식별자로 계정을 구분합니다. 같은 이메일이라는 이유로 네이버·카카오 계정을 자동 병합하지 않습니다.

## 현재 구현

- 홈 → 종목 선택 → 지역 선택 → 고민 작성 화면
- 두 소셜 제공자의 인증 라우트·세션 연결 구조
- 로그인 사용자만 요청 생성. 종목·지역 검증 및 계정당 24시간 5건 제한
- 승인·종목·활동 지역이 일치하는 코치에게 요청 수신자와 웹 내부 알림을 트랜잭션으로 생성
- 본인 요청·답변 조회, 승인된 수신 코치의 답변 및 답변 알림 생성
- 동일 요청에 코치당 한 번 답변. 다른 지역 코치, 미승인 코치, 종료 요청에 대한 답변 차단
- 서울·경기·부산 지역 목록. 국가 전체 지역 데이터 확장은 후속 작업

알림은 DB에 생성되고 페이지를 열거나 새로고침하면 확인하는 웹 내부 알림입니다. 카카오 알림톡·이메일·푸시·실시간 구독은 아직 연결하지 않았습니다.

## 검증

```sh
npm run build
npm run typecheck
npx playwright install chromium
npm test
```

PostgreSQL 호환 PGlite로 실제 마이그레이션과 운영 쿼리의 지역·종목·승인 필터, 수신자 권한, 중복 답변, 종료 요청 차단을 검증합니다. Playwright로 모바일 선택 흐름, 비로그인 API 차단, 주요 화면을 확인합니다. 외부 OAuth와 실제 운영 PostgreSQL 연결 검증은 계정 설정 후 별도로 진행해야 합니다.

## 배포

GitHub 저장소 `juneh116-dev/playcoach`를 Node.js 지원 호스팅에 연결하고 프로젝트 Root Directory를 `platform`으로 설정합니다. Build Command는 `npm run build`, Start Command는 필요 시 `npm start`입니다. GitHub Pages에 Next.js 서버 앱을 정적 내보내기하지 않습니다. 기존 사이트 교체와 도메인 변경은 호스팅 검증 후 진행합니다.

## 실제 서비스 공개 전 남은 구축

1. 개발자 앱·운영 DB·호스팅 연결, 실제 OAuth 및 DB 통합 검증
2. 비공개 영상 저장소, 업로드 용량·형식 검증, 수신 코치만 접근하는 만료 URL 및 삭제
3. 코치·레슨장 등록/승인, 상세 프로필
4. 피드백에서 레슨 신청·수락·완료로 이어지는 상태 관리
5. 완료 레슨에 연결된 리뷰 및 평점
6. 요청/계정 삭제, 보관 기간에 따른 자동 파기, 관리자·신고 처리
7. 운영자 연락처·위탁/국외 이전·제3자 제공 내용을 포함한 정식 약관·처리방침 확정
8. 필요 시 알림톡 등 외부 알림 채널 연결, 페이지네이션·추가 남용 방지

현재는 서비스 기반 구축 단계이며 위 항목까지 완료한 출시 버전은 아닙니다. 개발 환경의 검색 노출은 차단합니다.
