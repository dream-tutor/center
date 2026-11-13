# center(wcoachingcenter.com) 패치 스크립트

이 저장소에는 빌드가 없다. 페이지는 쌍둥이 저장소 `학원(wawa)\와와(wawacenter.kr)` 의 생성기(`_gen_dong.py`·`scripts\build_extra_pages.py`·`generate_pages.py`, git 밖)로 만든 정적 HTML 이고, 그 뒤 고친 것은 이 폴더의 날짜 붙은 스크립트(`*_YYYY-MM-DD.cjs`)가 페이지를 직접 고쳤다. 생성기로 페이지를 다시 만들면 이 패치가 빠진다.

파일 이름이 밑줄로 시작해 GitHub Pages(Jekyll)가 공개하지 않는다.

## 재생성 뒤 다시 돌릴 스크립트

저장소 폴더에서 차례로. 각각 먼저 인자 없이(모의) 돌려 바뀔 것을 보고 `--write` 를 붙인다. 고칠 것이 없으면 0장이 나온다.

1. `node scripts/hub_addr_2026-11-10.cjs` — 동 허브 지점 칸·JSON-LD 의 옛 건물 주소를 기준본으로(2026-11-10).
2. `node scripts/strengths_2026-10-27.cjs` — 지점 페이지 '○○점 위치 안내' 아래 소개 문단을 기준본 strengths 에서(금지어·없는 과목·주말불가 문장은 뺀다). 날짜는 안 건드린다.
3. `node scripts/banned_words_2026-11-10.cjs` — 소개 문단의 금지어 문장 고친 표. 2026-11-11 에 기준본 원문을 이 표의 문장으로 고친 뒤로는 바꿀 것이 0 이다(표는 기록·안전망).
4. `node scripts/seohae_2026-11-13.cjs` — 인천 서구 → 서해구: `incheon/seogu/**` 를 `incheon/seohae/**` 로 옮기고 옛 주소는 이동 안내, 지역 목록·`branches.js`·`assets/branches.json`·`sitemap.xml`, 그리고 소개 문단이 바뀐 지점 페이지 날짜(2026-11-13). 생성기가 옛 `seogu` 주소로 페이지를 다시 만들면 이 스크립트가 다시 옮긴다.

그 밖의 날짜 붙은 스크립트(`hub_coords`·`hub_subjects`·`minor_fixes`·`form_*` 등)도 생성기에 없는 고침이다. 다시 만든 뒤에는 모의로 돌려 바뀔 것이 0 인지 본다. 네이버 썸네일 시험 배너는 `node _thumb_test.js apply .`(저장소 루트의 `_thumb_test.json` 배정 그대로).

## 함께 볼 것

- `assets/branches.json` 은 기준본(`wstudycenter.com\data\branches.json`) 사본이다. 맞추는 도구는 쌍둥이 저장소 `scripts/sync_branches_from_base.cjs`(center·와와 두 사본을 함께 쓴다, 인자 없이 돌리면 비교만).
- 사이트맵은 `py -I _gen_sitemap.py`(페이지의 `data-iso` 를 lastmod 로, 이동 안내 페이지는 뺀다 — 이 PC 에서 약 10분).
- 페이지 날짜는 내용이 바뀐 페이지만 올린다(`page-updated` 의 `data-iso`·`최종 업데이트`와 sitemap `lastmod` 가 같은 값).
