# 검색·공유 미리보기

홈페이지의 검색 제목과 설명, canonical, Open Graph 및 Twitter 메타데이터를 실제 PLAYCOACH URL로 설정했습니다. 현재 홈페이지에서 사용하던 브랜드 로고의 고해상도 이미지로 48/96px 파비콘, 180px 터치 아이콘, 512px 로고, 1200×630px 공유 이미지를 만들었습니다. 로고는 홈페이지 이미지와 Organization 구조화 데이터에도 연결했습니다.

- 홈페이지: https://juneh116-dev.github.io/playcoach/
- 사이트맵: https://juneh116-dev.github.io/playcoach/sitemap.xml
- 공유 대표 이미지: https://juneh116-dev.github.io/playcoach/assets/playcoach-og.jpg
- 완료 화면의 기존 noindex는 유지합니다.

## 배포 이후 확인

Search Console에서 위 홈페이지 URL의 색인 생성 요청과 사이트맵 제출을 할 수 있습니다. 이 PR은 검색엔진 계정에 직접 제출하지 않습니다. 검색 제목·설명·썸네일은 검색엔진이 최종 선택하며, 코드 배포가 검색 결과의 즉시 변경을 의미하지 않습니다. OG 이미지는 링크 공유 미리보기용이며 Google 검색 썸네일 노출을 보장하지 않습니다.

GitHub Pages 프로젝트는 /playcoach/ 하위 경로에 있습니다. Google 검색의 파비콘은 호스트당 하나이며 호스트 루트 홈페이지에서 발견한 파비콘을 기준으로 사용합니다. 현재 프로젝트의 링크는 브라우저 아이콘에는 적용되지만 검색 아이콘에는 호스트 루트 https://juneh116-dev.github.io/ 의 설정도 영향을 줍니다. 또한 하위 경로의 robots.txt는 호스트 루트 robots.txt를 대신하지 않습니다. 다른 루트 저장소는 이 PR에서 변경하지 않았습니다.

참고:
- https://developers.google.com/search/docs/appearance/favicon-in-search
- https://developers.google.com/search/docs/appearance/google-images
- https://developers.google.com/search/docs/appearance/snippet
