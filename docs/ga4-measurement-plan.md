# PLAYCOACH GA4 측정 설계안
상태: 검토용. GA4 기본 연결만 PR에 구현하며 아래 맞춤 이벤트는 승인 후 적용합니다. 최종 머지는 별도 승인이 필요합니다.

- 대상: https://juneh116-dev.github.io/playcoach/
- 측정 ID: G-8981HN9P16 / 스트림: playcoach-web / 스트림 ID: 16218904491
- 기준: GitHub main의 index.html, assets/privacy.js, assets/base.css, result.html. 공개 URL 직접 열기는 도구 오류로 실패했으며 실제 렌더링·클릭 검증은 미완료입니다.
- 모바일에서는 상단 이용 방법·자주 묻는 질문·개인정보 안내가 숨겨지고 사전 가입만 노출됩니다.
- 현재 모든 외부 폼/대화상자 밖 링크는 로고를 제외하고 신청 팝업을 엽니다. href가 #how, #running 또는 개인정보 안내여도 실제로는 신청 팝업입니다.
- 실제 신청 정보 전송·저장이 없는 데모입니다. 검색 입력, 회원가입, 영상 업로드, 결제, 코치 상세 기능은 없습니다.
- 기본 연결을 위한 최신 사용자 요청은 승인으로 처리합니다. 맞춤 이벤트 설계 승인이나 main 머지 승인으로 확대 해석하지 않습니다.

## 1. 전체 클릭 요소 매핑
각 줄의 ID는 제안한 측정용 ID입니다. 기존 DOM ID가 있는 경우 그대로 사용합니다.
아래 application_open은 실제 팝업이 열린 뒤에만 전송합니다. 클릭 횟수와 성공적으로 열린 횟수는 서로 다른 지표입니다.
표의 ui_click 파라미터에는 공통 ui_location, element_id 외에 표시된 값을 함께 보냅니다.

| 화면/요소 | 측정 ID 또는 값 | 현재 실제 행동 | 클릭 이벤트 | 추가 파라미터 |
|---|---|---|---|---|
| 헤더 로고 | header_logo | 홈으로 이동 | ui_click | action=home |
| 헤더 이용 방법 | header_how | 신청 팝업 열기 | ui_click | action=open_application, intended_action=view_how |
| 헤더 자주 묻는 질문 | header_faq | 신청 팝업 열기 | ui_click | action=open_application, intended_action=view_faq |
| 헤더 개인정보 안내 | header_privacy | 신청 팝업 열기 | ui_click | action=open_application, intended_action=view_privacy |
| 헤더 사전 가입 | cta-top | 신청 팝업 열기; 실제 가입 아님 | ui_click | action=open_application |
| 히어로 신청 카드/내부 신청 문구 | cta-main | 카드 어디를 눌러도 동일 신청 팝업 | ui_click | action=open_application |
| 추천 태그 5개 | hero_chip_batting_form / pitching_balance / fielding_footwork / amateur_baseball / beginner | 모두 신청 팝업; 실제 검색·값 자동입력 없음 | ui_click | action=open_application, content_type=topic, content_id=해당 태그 코드 |
| 종목 러닝 | category_running | 신청 팝업; 러닝 영역 이동 아님 | ui_click | action=open_application, interest_sport=running |
| 종목 야구 | category_baseball | 신청 팝업 | ui_click | action=open_application, interest_sport=baseball |
| 종목 축구 | category_soccer | 신청 팝업 | ui_click | action=open_application, interest_sport=soccer |
| 종목 테니스 | category_tennis | 신청 팝업 | ui_click | action=open_application, interest_sport=tennis |
| 종목 골프 | category_golf | 신청 팝업 | ui_click | action=open_application, interest_sport=golf |
| 종목 헬스 | category_fitness | 신청 팝업 | ui_click | action=open_application, interest_sport=fitness |
| 종목 배구 | category_volleyball | 신청 팝업 | ui_click | action=open_application, interest_sport=volleyball |
| 종목 배드민턴 | category_badminton | 신청 팝업 | ui_click | action=open_application, interest_sport=badminton |
| 영상 분석 카테고리 | category_video_analysis | 신청 팝업; 동영상 재생 없음 | ui_click | action=open_application, content_id=video_analysis |
| 전체보기 카테고리 | category_all | 신청 팝업 | ui_click | action=open_application, content_id=all |
| 러닝·야구·축구 인기 코치 전체 보기 3개 | coaches_all_running / baseball / soccer | 모두 신청 팝업; 목록 페이지 없음 | ui_click | action=open_application, interest_sport=해당 종목 |
| 짙은 배경 배너 무료 피드백 신청 | mid_feedback_cta | 신청 팝업 | ui_click | action=open_application |
| 3단계 코치 찾기 아래 이용 방법 보기 | how_more | 신청 팝업; 도움말 이동 아님 | ui_click | action=open_application, intended_action=view_how |
| 푸터 이용 방법 | footer_how | 신청 팝업 | ui_click | action=open_application, intended_action=view_how |
| 푸터 무료 피드백 신청 | footer_feedback_cta | 신청 팝업 | ui_click | action=open_application |
| 푸터 개인정보 안내 | footer_privacy | 신청 팝업 | ui_click | action=open_application, intended_action=view_privacy |
| 폼 개인정보 자세히 보기 | form_privacy_details | 개인정보 안내 팝업 열기 | privacy_notice_open | mode=info, ui_location=application_form |
| 신청 팝업 X / Escape / 배경 클릭 | application_close | 신청 팝업 닫기, 폼을 하단으로 복귀 | application_close | close_method=button/escape/backdrop, form_started=true/false |
| 폼 무료 피드백 신청 | cta-submit | 입력 검증; 유효하면 개인정보 동의 팝업 | application_submit_attempt | form_id=lead-form, form_placement=inline/modal |
| 개인정보 동의 체크박스 | privacy-agree | 완료/확인 버튼 활성화·비활성화 | privacy_acknowledgement_change | mode=info/submit, checked=true/false |
| 개인정보 팝업 닫기 / Escape / 배경 | privacy-cancel 등 | 개인정보 팝업 닫기 | privacy_notice_close | mode, close_method=button/escape/backdrop |
| 개인정보 팝업 확인했습니다 | privacy-ok, mode=info | 안내 닫기 | privacy_notice_acknowledge | mode=info |
| 개인정보 팝업 동의하고 완료하기 | privacy-ok, mode=submit | 입력값 삭제 후 result.html 이동 | application_intent_complete | form_id=lead-form, sport, entry_point, app_mode=demo |
| 완료 페이지 처음 화면으로 | result_home | 홈 이동 | ui_click | ui_location=result, element_id=result_home, action=home |

위 표는 랜딩페이지의 링크 29개와 버튼 5개, 동의 체크박스, 완료 페이지 홈 링크를 포함합니다. 이름/연락처 입력 2개와 종목 선택 1개는 아래 폼 이벤트로 다룹니다. disabled 확인 버튼에는 이벤트를 보내지 않습니다.

## 2. 폼·화면 노출·자동 이벤트

| 이벤트 | 발생 조건 / 사용자 행동 | 파라미터 | 중복 방지 |
|---|---|---|---|
| page_view | 홈 또는 완료 페이지 로드 | page_title, page_location, page_referrer | 기본 태그에서 한 번. 수동 page_view 추가 금지 |
| scroll | 페이지 최초 90% 스크롤 도달 | GA4 향상된 측정 기본값 | 수동 scroll 중복 금지 |
| section_view | 섹션 제목/대표 노출 지점이 50% 이상 1초 연속 보임 | section_id=hero/popular_running/popular_baseball/popular_soccer/features/concerns/how/apply/footer | 페이지 로드당 section_id 1회. 긴 섹션 전체 높이를 기준으로 삼지 않음 |
| content_view | 개별 소개/고민/코치 카드가 50% 이상 1초 노출 | content_type=feature/concern/coach, content_id, sport(해당 시) | 페이지 로드당 content_id 1회 |
| application_open | showModal 성공 후 닫힘→열림 전이 | entry_point, form_id=lead-form, form_placement=modal | 이미 열린 상태에서 재호출 시 제외 |
| form_start | 이름/연락처/종목에 최초 사용자 입력·변경 | form_id, form_placement, entry_point | JS가 자동으로 이름 칸에 주는 focus는 제외. 페이지의 동일 폼에 1회 |
| sport_select | 종목을 사용자가 변경 | sport=허용 목록 코드, form_id, form_placement | 실제 변경마다 1회. 값 없음은 not_selected |
| application_submit_attempt | 마우스 클릭 또는 Enter로 submit 발생 | form_id, form_placement, entry_point | 버튼 click과 submit 양쪽에서 이 이벤트를 중복 전송하지 않음 |
| form_validation_error | checkValidity 실패 | field_name=name/contact/sport, error_type=required/format/too_long | 제출 시 첫 오류만 1회; 입력값·브라우저 오류 원문 전송 금지 |
| privacy_notice_open | 유효한 제출 또는 자세히 보기로 안내 팝업 열림 | mode=submit/info, form_id | 실제 열림 기준 |
| application_intent_complete | 유효한 폼 제출 후 submit 모드에서 동의하고 완료하기 | form_id, form_placement, entry_point, sport, app_mode=demo | 흐름당 1회. result URL 방문·새로고침으로 발생시키지 않음 |
| result_view | 완료 페이지 로드 | page_type=result, app_mode=demo | 페이지당 1회. 주요 이벤트 아님; 단순 page_view로 대체 가능 |

신청 팝업을 닫는다고 항상 이탈은 아닙니다. 폼이 하단으로 복귀하고 입력 내용이 유지될 수 있어 application_abandon을 즉시 전송하지 않습니다. 실제 이탈은 퍼널에서 다음 단계가 없는 세션으로 분석합니다.

### 콘텐츠 ID 매핑

| 유형 | 카드/문구 | content_id |
|---|---|---|
| feature | 플레이 영상 분석 | video_analysis |
| feature | 문제 기반 추천 | problem_based_matching |
| feature | 첫 상담 전 방향 확인 | first_consultation |
| concern | 자세 교정이 필요해요 | posture_correction |
| concern | 실력이 잘 늘지 않아요 | skill_plateau |
| concern | 부상 없이 운동하고 싶어요 | injury_prevention |
| concern | 혼자 운동하기가 막막해요 | training_support |
| concern | 대회나 시즌을 준비하고 있어요 | competition_preparation |
| concern | 기본기부터 다시 배우고 싶어요 | fundamentals |
| coach | 러닝 자세 교정 / 부상 예방 러닝 / 기록 향상 훈련 / 러닝 시작하기 | running_form / running_injury_prevention / running_performance / running_beginner |
| coach | 타격 폼 교정 / 투구 밸런스 / 수비 풋워크 / 야구 입문 코칭 | baseball_batting / baseball_pitching / baseball_fielding / baseball_beginner |
| coach | 기본기 향상 / 드리블 코칭 / 슈팅 자세 교정 / 경기 체력 훈련 | soccer_basics / soccer_dribbling / soccer_shooting / soccer_conditioning |

## 3. 지금 이벤트를 만들지 않을 요소

| 요소 | 현재 확인한 상태 | 처리 |
|---|---|---|
| 코치 모드 토글 | span/i 모양 장식. 전환 동작 없음 | toggle 이벤트 제외 |
| 검색창 | div/span, 실제 input·검색 처리 없음 | search·view_search_results 제외 |
| 코치 카드 12개 | article, 클릭 링크 없음 | 클릭 제외; content_view로 노출 측정 |
| 소개 카드 3개와 고민 카드 6개 | 정적 콘텐츠 | 클릭 제외; content_view만 |
| 3단계 안내와 후기형 고민 문구 | 정적 콘텐츠 | 필요한 section_view만 |
| 영상·목표 입력 안내 | 실제 영상 업로드/재생 없음 | video_start, upload_video 제외 |
| 사전 가입 버튼 | 신청 팝업일 뿐 계정 생성 없음 | sign_up 제외 |
| 무료 피드백 완료 | 연락처 수집·접수 서버 없음 | generate_lead 제외. 데모 application_intent_complete 사용 |
| 완료 페이지 직접 방문 | 누구나 열 수 있음 | page_view만으로 완료 전환 생성 금지 |

## 4. 공통 파라미터와 GA4 등록

| 파라미터 | 정의 / 예 | 보고서 설정 |
|---|---|---|
| app_mode | 현재 demo, 향후 live | 이벤트 범위 맞춤 측정기준 우선 등록 |
| page_type | landing / result | 이벤트 범위 우선 등록 |
| ui_location | header / hero / category_nav / popular_coaches / mid_banner / how / footer / application_form / privacy_modal / result | 이벤트 범위 우선 등록 |
| element_id | 표의 고정 측정 ID | 이벤트 범위 우선 등록 |
| entry_point | 현재 신청 흐름을 연 요소 ID; 직접 하단 사용은 inline_form | 이벤트 범위 우선 등록. 새 팝업 흐름마다 덮어쓰기; 하단 입력 시 오래된 값 재사용 금지 |
| form_id | lead-form | 자동 이벤트와 같은 키 사용 |
| form_placement | inline / modal, 실제 동작 시점 기준 | 이벤트 범위 우선 등록 |
| sport | running/baseball/soccer/tennis/golf/fitness/volleyball/badminton/other/not_selected | 이벤트 범위 우선 등록; 선택값 화이트리스트만 전송 |
| interest_sport | 클릭한 카테고리의 관심 종목; 폼의 sport와 구분 | 필요 시 맞춤 측정기준 |
| content_type / content_id | feature/concern/coach/topic 및 고정 코드 | 필요 시 맞춤 측정기준 |
| mode / close_method / error_type / field_name | 제한된 코드 값 | 진단에 필요할 때만 등록 |

entry_point는 신청 완료까지 유지하되 개인정보나 무작위 사용자 ID를 넣지 않습니다. 모든 파라미터를 모든 이벤트에 보내지 않고 해당 이벤트에 관련 있는 값만 보냅니다. 클릭 문구·자유 입력·이름·연락처·입력 길이·사용자 해시는 수집하지 않습니다.

## 5. 주요 이벤트 후보와 추천

| 후보 | 중요도 | 지금 주요 이벤트 지정 | 근거 |
|---|---|---|---|
| application_intent_complete | 1순위 | 추천, 데모 신청 의향 완료로 명시 | 검증+동의까지 완료한 가장 강한 의향. 실제 접수/매출 아님 |
| form_start | 2순위 | 선택; 초기에 분석용 보조 지표로 유지 추천 | 단순 팝업 열기보다 의도가 높지만 미완료를 포함 |
| application_open | 3순위 | 기본 비추천; 보조 퍼널 지표 | 이용 방법·FAQ도 현재 팝업을 열어 신청 의향이 과대평가될 수 있음 |
| generate_lead | 실제 접수 도입 후 1순위 | 지금 제외 | 서버가 접수를 확인한 뒤에만 전송. 응답 중복 방지 필요 |
| sign_up / purchase | 기능 도입 후 검토 | 지금 제외 | 계정 생성·결제가 없음 |
| page_view / scroll / ui_click / result_view | 탐색·진단 | 제외 | 방문·클릭을 최종 성과와 혼합하지 않기 위함 |

추천 퍼널: landing page_view → application_open(팝업 경로만) → form_start → application_submit_attempt → privacy_notice_open(mode=submit) → application_intent_complete.
하단 폼 직접 사용 경로는 application_open을 건너뜁니다. 퍼널은 열린 경로를 허용하거나 팝업/하단 경로를 분리합니다.
주요 이벤트 집계는 초기 수요 조사에서 세션당 1회 권장. 총 완료 이벤트와 완료 세션 수를 구분합니다. 별도 중복 클릭 방지와 함께 사용합니다. 임의의 매출·통화 가치는 부여하지 않습니다.

## 6. 향상된 측정과 개인정보 고지

| 설정/이슈 | 권장안 |
|---|---|
| 첨부 화면의 향상된 측정 | 전체 스위치 ON 확인. 개별 +4 항목의 활성 상태는 화면만으로 확정 불가 |
| page_view / scroll | 기본 태그·향상된 측정 활용. 별도 동일 이름 이벤트 중복 구현 금지 |
| 자동 이탈 클릭(click) | 외부 도메인 이동용. 사이트 내부 신청 버튼 측정을 대신하지 않음 |
| 양식 상호작용 자동 측정 | 맞춤 form_start/제출 흐름 구현 전 OFF 권장. 데모 submit을 완료로 오인하거나 이중 수집하지 않도록 함 |
| 자동 검색·영상·다운로드 | 실제 기능이 없으므로 현재 측정 대상 없음 |
| 개인정보 고지 | 현재 문구는 입력값과 분석 데이터의 범위를 구분해야 함. PR에 GA4 페이지 조회·브라우저/기기·쿠키 등 분석 고지 추가 |
| 폼 동의 체크 | 입력값 처리 안내 확인용이며 분석 쿠키 동의로 해석하지 않음 |
| 분석 동의 방식 | 서비스 운영 정책에 맞춰 결정. 별도 CMP/동의 배너 도입은 이 PR 범위 아님 |
| 기본 연결 PR | 양쪽 페이지 Google tag 추가, 측정 ID 연결, 광고 신호 비활성화, 분석 고지 정비. 맞춤 이벤트·GA4 관리 화면의 주요 이벤트 설정은 미적용 |

## 7. 구현 후 검수 기준

| 확인 항목 | 기대 결과 |
|---|---|
| 홈/완료 페이지 로드 | 각 페이지 page_view 1회, G-8981HN9P16으로 전송 |
| 추천 태그·카테고리·헤더·푸터 | 실제 클릭별 고정 element_id와 위치가 일치 |
| 신청 팝업 자동 포커스 | form_start 미발생; 실제 사용자 입력 때만 발생 |
| 하단/팝업 폼 | placement와 entry_point가 실제 경로와 일치 |
| 빈 값·잘못된 연락처 | validation_error만; 완료 이벤트 없음 |
| 자세히 보기 확인 | 개인정보 안내 이벤트만; 완료 이벤트 없음 |
| 유효 제출→동의→완료 | application_intent_complete 한 번; 입력값 삭제 유지 |
| 완료 페이지 직접 방문/새로고침 | 완료 주요 이벤트 증가 없음 |
| GA4 요청 파라미터 | 이름·연락처·폼 원문 없음 |
| 실제 GA4 DebugView/실시간 | 승인 후 테스트 기기에서 수신 확인. 코드 검사만으로 수신 완료라 주장하지 않음 |
| 배포 | 사용자 머지 승인 후 main 반영 및 Pages 성공 확인 |

## 참고 자료
- 소스: https://github.com/juneh116-dev/playcoach/blob/main/index.html
- 실제 동작: https://github.com/juneh116-dev/playcoach/blob/main/assets/privacy.js
- 완료 화면: https://github.com/juneh116-dev/playcoach/blob/main/result.html
- Google 추천 이벤트: https://support.google.com/analytics/answer/9267735?hl=ko
- 향상된 측정: https://support.google.com/analytics/answer/9216061?hl=ko
- 주요 이벤트: https://support.google.com/analytics/answer/13128484?hl=ko
