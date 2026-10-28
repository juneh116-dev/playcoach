# PLAYCOACH GA4 사용자 행동 이벤트
측정 ID: G-8981HN9P16. 현재 서비스는 demo이며 실제 신청 접수나 회원가입은 없습니다.

| 이벤트 | 전송 조건 | 주요 파라미터 |
|---|---|---|
| ui_click | 헤더·추천 태그·카테고리·전체보기·CTA·푸터·완료 페이지 홈 링크 클릭 | element_id, ui_location, action, interest_sport(해당 시) |
| application_open | 신청 팝업이 실제로 열림 | form_id, entry_point, form_placement |
| application_close | X·Escape·배경 클릭으로 신청창 닫힘 | close_method, form_started |
| application_start | 이름·연락처·종목 중 첫 사용자 입력/변경. 자동 포커스 제외 | form_id, entry_point, form_placement |
| sport_select | 사용자가 종목 변경 | sport(고정 영문 코드) |
| application_submit_attempt | 폼 submit. 클릭·Enter 동일 처리 | form_id, entry_point, form_placement |
| form_validation_error | 유효성 검사 실패. 제출당 첫 오류 | field_name, error_type |
| privacy_notice_open | 개인정보 안내가 실제로 열림 | mode=info/submit |
| privacy_acknowledgement_change | 안내 체크박스 변경 | mode, checked |
| privacy_notice_acknowledge | info 모드 확인 | mode=info |
| privacy_notice_close | 안내 팝업 닫힘 | mode, close_method |
| application_intent_complete | 유효 제출 후 submit 모드에서 동의하고 완료하기 | entry_point, form_placement, sport |
| section_view | 섹션 제목 등 대표 지점 50% 이상 1초 노출 | section_id |
| content_view | 코치 12개·소개 3개·고민 6개 카드 각각 50% 이상 1초 노출 | content_type, content_id, sport(코치만) |
| result_view | 완료 페이지 조회 | page_type=result |

- 공통: app_mode=demo, page_type=landing/result, send_to=G-8981HN9P16.
- application_start는 기존 향상된 측정 form_start와 구별하는 맞춤 이벤트입니다. 자동 form_submit을 신청 완료 지표로 사용하지 마세요.
- ui_click은 의도, application_open은 실제 열림을 측정하므로 퍼널에서 합산하지 않습니다.
- 현재 로고 외 랜딩페이지의 링크 28개는 모두 신청 팝업을 엽니다. 이용 방법·FAQ·개인정보 헤더/푸터 링크도 현재 동작대로 계측합니다.
- 검색창·코치 모드 토글·정적 카드에는 클릭 기능이 없어 search/toggle/코치 선택 이벤트를 만들지 않습니다.
- 카드·섹션 노출은 페이지 로드당 대상별 1회이며 비활성 탭에서 노출 타이머를 중지합니다.
- application_start는 페이지의 동일 폼에 1회. form_started는 이 페이지에서 해당 폼의 입력 시작 여부입니다.
- 신청창을 닫아도 하단 폼을 계속 사용할 수 있으므로 즉시 이탈 이벤트를 만들지 않습니다.
- 하단 폼 직접 입력은 entry_point=inline_form, form_placement=inline. 팝업은 각 링크 고정 ID와 modal입니다.
- 이름·연락처·입력 문자열·입력 길이·해시 값은 이벤트에 넣지 않습니다. 종목만 허용 목록으로 변환합니다.
- 완료 이벤트는 입력값 삭제 전 종목 코드만 확보하고 입력값을 즉시 지운 다음 전송합니다. 중복 클릭은 1회로 제한합니다.
- GA4 전송 콜백 또는 최대 900ms 후 완료 화면으로 이동합니다. 분석 기능 오류/차단도 신청 흐름을 막지 않습니다.
- 완료 URL 직접 방문·새로고침은 application_intent_complete를 발생시키지 않습니다.
- generate_lead, sign_up, purchase 및 수동 page_view/scroll은 추가하지 않습니다.
- 개인정보 안내를 실제 전송 범위(선택 종목·이용 행동, 이름·연락처 제외)에 맞게 수정했습니다.

## GA4 관리 화면에서 별도로 설정할 항목

| 항목 | 추천 |
|---|---|
| 주요 이벤트 후보 | application_intent_complete 1개. 현재는 데모 신청 의향으로 해석 |
| 주요 이벤트 집계 | 초기 수요 조사는 세션당 1회 권장 |
| 보조 퍼널 | application_open → application_start → application_submit_attempt → privacy_notice_open(mode=submit) → application_intent_complete |
| 하단 경로 | application_open 없는 직접 폼 입력 경로도 별도로 분석 |
| 맞춤 측정기준(이벤트 범위) | entry_point, form_placement, sport, element_id, ui_location, app_mode, content_type, content_id, section_id 필요에 따라 등록 |
| 자동 폼 상호작용 | 혼동을 줄이려면 향상된 측정의 양식 상호작용 OFF 권장. 이 코드는 관리자 설정을 변경하지 않음 |

GA4 관리 화면의 주요 이벤트 지정·맞춤 측정기준 등록은 별도 작업입니다. 코드 배포만으로 자동 등록되지 않습니다.

## 검증
네트워크로 GA4를 전송하지 않는 격리된 실제 Chromium에서 모든 신청 링크 28개를 클릭해 각각 1회 계측을 확인했습니다.
자동 포커스 미집계, 입력 오류, info 안내의 확인 미전환, 종목 선택, 중복 완료 클릭, 결과 새로고침, 모바일 하단 폼의 Enter 제출, GA4 미사용 시 정상 이동, 이름·연락처 제외, JavaScript 오류 없음 확인.
이 테스트는 실제 GA4 속성의 이벤트 수신 확인을 대신하지 않습니다.
