#!/usr/bin/env node
// 2026-11-13 와와 지점 기준본(wstudycenter.com/data/branches.json) 2026-11-11 변경(사장님 결정)을 wcoachingcenter.com 에 반영.
//  [strengths] 지점 소개 문단 — 기준본 strengths 의 와와 금지어·개설 과목 어긋남을 원문에서 고쳤다(사장님 11-11 "와와 원문 고쳐주세요",
//     금지어 문장은 이 저장소 banned_words_2026-11-10.cjs 의 고친 문장 그대로). scripts/strengths_2026-10-27.cjs 를 그대로 다시 돌려
//     화면을 기준본에 맞추고, 문단이 바뀐 지점 페이지만 page-updated(data-iso·최종 업데이트)·sitemap lastmod 를 오늘로.
//     assets/branches.json 사본의 strengths 칸도 기준본과 같게.
//  [seohae] 인천 서구 → 서해구 (사장님 11-11 "서해구 표기 바꿔줘" — 인천 행정구역 개편 2026-07-01, 「인천광역시 서구 명칭 변경에 관한
//     법률」). 기준본 청라점·루원시티점이 district 서해구·district_slug seohae(와와 학습학원·가이드와 같은 slug)가 됐다.
//     - incheon/seogu/** 색인 페이지 20쪽을 같은 하위 경로의 incheon/seohae/** 로 옮긴다: 주소 incheon/seogu/ → incheon/seohae/,
//       글자 '서구' → '서해구'(앞 글자가 한글이 아닌 것만 — 이 20쪽에는 강서구 같은 붙은 이름이 없고, 있으면 멈춘다),
//       카카오맵 길찾기 이름의 인코딩된 '인천 서구', 상담 폼 hidden 시군구 값, page-updated 날짜(새 주소라 오늘).
//       시군구 페이지에는 개편 안내 한 줄(와와 학습학원 DISTRICT_NOTE·가이드·레슨과 같은 문장) — 옛 구 이름은 이 한 줄에만.
//     - 옛 incheon/seogu/** 20쪽은 noindex·canonical·meta refresh·location.replace 이동 안내로 바꾼다. GitHub Pages 라 301 이 안 된다
//       — 와와 학습학원 build.js DISTRICT_MOVED, 이 저장소의 세종 sejong/unknown·지점 통합 스텁과 같은 틀이고 _gen_sitemap.py 가
//       사이트맵에서 뺀다. 이동할 곳 주소는 퍼센트 인코딩(GitHub Pages 는 인코딩 안 된 한글 경로 요청에 400).
//     - 링크·글자: incheon/index.html(서해구 묶음·지점 카드·상담 지점 목록 — 본문이 바뀌어 날짜 오늘), 시도 15쪽 '지역별 지점 안내'
//       목록과 인천 다른 구 3쪽 이웃 구 카드(탐색 링크 글자만 바뀌어 날짜 그대로), branches.js(홈·후기 지점 검색이 district_en 으로
//       링크를 만든다 — 두 지점 주소·시군구·NESTED 키), sitemap.xml(옛 20주소 → 새 20주소, lastmod 오늘, /incheon/ 도 오늘),
//       assets/branches.json 사본의 두 지점 4칸.
//     - 광주·대전 서구(gwangju/seogu·daejeon/seogu)는 개편과 무관 — 건드리지 않는다.
// assets/branches.json 은 기준본 + 와와(wawacenter.kr) scripts/sync_branches_from_base.cjs 의 CENTER_OVERRIDES 와 같아진다(그 스크립트는
//   쌍둥이 와와 사본까지 함께 쓰므로 여기서는 center 사본만 같은 규칙으로. 들여쓰기 2칸, 끝 줄바꿈 없음 — 그 스크립트 출력과 같은 꼴).
//   지금 사본과 다른 칸이 strengths·인천 두 지점 4칸 말고도 있으면 멈춘다.
// 네이버 썸네일 시험(_thumb_test.json)은 건드리지 않는다 — 비교군 청라동·신현동 허브도 함께 옮겨지므로 비교 때는 옛·새 주소를 합쳐 볼 것.
// 다시 돌려도 같은 결과(옛 쪽이 이미 이동 안내면 옮기기를 건너뛰고, 이미 맞은 칸은 그대로). 생성기로 페이지를 다시 만든 뒤에는 다시 돌린다.
// 사용: node scripts/seohae_2026-11-13.cjs [strengths|seohae] [--write]   (부분을 안 적으면 둘 다, --write 가 없으면 모의)
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BRANCH_SRC || path.join(ROOT, '..', 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');
const PARTS = ['strengths', 'seohae'].filter((p) => process.argv.includes(p));
const DO = (p) => !PARTS.length || PARTS.includes(p);
const TODAY = '2026-11-13';
const DOMAIN = 'https://wcoachingcenter.com';
const OLD = 'incheon/seogu', NEW = 'incheon/seohae';
const NOTE = '2026년 7월 1일 행정구역 개편으로 인천 서구는 서해구로 이름이 바뀌었고, 검단 지역은 검단구로 나뉘었습니다.';
const ENC_OLD = encodeURIComponent('인천 서구'), ENC_NEW = encodeURIComponent('인천 서해구'); // 카카오맵 길찾기 이름
const INCHEON = ['청라점', '루원시티점'], INCHEON_FIELDS = ['district', 'district_slug', 'address', 'nearby_text'];

const fail = (m) => { throw new Error(m); };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const read = (f) => fs.readFileSync(f, 'utf8');
const relRoot = (f) => path.relative(ROOT, f).split(path.sep).join('/');
function one(h, re, fn, what) {
  let n = 0; const r = h.replace(re, (...a) => { n++; return fn(...a); });
  if (n !== 1) fail(`${what}: ${n}곳`);
  return r;
}
function bumpDate(h, what) {
  h = one(h, /(<div class="page-updated" data-iso=")\d{4}-\d{2}-\d{2}(")/, (x, a, z) => a + TODAY + z, 'data-iso ' + what);
  return one(h, /📅 최종 업데이트: \d{4}\.\d{2}\.\d{2}/, () => `📅 최종 업데이트: ${TODAY.replace(/-/g, '.')}`, '최종 업데이트 ' + what);
}
const isStub = (h) => { const head = h.slice(0, 1200); return head.includes('name="robots" content="noindex"') && head.includes('http-equiv="refresh"'); };
function stubPage(target) {
  return `<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<title>페이지 이동 안내</title>\n<meta name="robots" content="noindex">\n<link rel="canonical" href="${target}">\n<meta http-equiv="refresh" content="0; url=${target}">\n<script>location.replace("${target}");</script>\n</head>\n<body>\n<p>페이지 주소가 변경되었습니다. <a href="${target}">이동하기</a></p>\n</body>\n</html>\n`;
}
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/^[._]/.test(e.name) && e.name !== 'node_modules') walk(p, out); } else if (e.name === 'index.html') out.push(p);
  }
  return out;
}

const base = JSON.parse(read(BASE).replace(/^﻿/, ''));
const writes = new Map(); // 파일 → 새 내용 (바뀐 것만)
const stage = (f, h) => { if (!fs.existsSync(f) || read(f) !== h) writes.set(f, h); };
const lastmod = new Set(); // 사이트맵 lastmod 를 오늘로 올릴 loc
const locRename = []; // [옛 loc, 새 loc]
const report = [];

// ── [seohae] 옮기기 ──
const oldDir = path.join(ROOT, ...OLD.split('/')), newDir = path.join(ROOT, ...NEW.split('/'));
if (DO('seohae')) {
  if (INCHEON.some((n) => base[n].district_slug !== 'seohae')) fail('기준본 청라점·루원시티점이 아직 seohae 가 아님');
  const sources = walk(oldDir).filter((f) => !isStub(read(f)));
  if (sources.length && sources.length !== 20) fail(`옮길 페이지 수가 20 이 아님: ${sources.length}`);
  if (!sources.length && !fs.existsSync(path.join(newDir, 'index.html'))) fail('옛 쪽도 새 쪽도 없음');
  for (const f of sources) {
    const rel = path.relative(oldDir, path.dirname(f)).split(path.sep).filter(Boolean).map((x) => x + '/').join(''); // '' · 'cheongla/' · 'dong/청라동/math/'
    let h = read(f);
    if (/(?:gwangju|daejeon)\/seogu/.test(h)) fail(`다른 시도 seogu 링크가 있음: ${OLD}/${rel}`);
    const attached = h.match(/[가-힣]서구/g);
    if (attached) fail(`붙은 '서구'(${[...new Set(attached)].join(',')})가 있음: ${OLD}/${rel}`);
    h = h.split(`${OLD}/`).join(`${NEW}/`);
    if (/seogu/.test(h)) fail(`seogu 가 남음: ${OLD}/${rel}`);
    h = h.split(ENC_OLD).join(ENC_NEW);
    if (h.includes(encodeURIComponent('서구'))) fail(`인코딩된 '서구'가 남음: ${OLD}/${rel}`);
    h = h.replace(/서구/g, '서해구');
    h = bumpDate(h, `${NEW}/${rel}`);
    if (rel === '') {
      const anchor = '<p class="section-sub">원하는 지점을 선택하시면 상세 정보를 볼 수 있습니다.</p>';
      const eol = h.includes('\r\n') ? '\r\n' : '\n';
      h = one(h, new RegExp(esc(anchor)), () => `${anchor}${eol}    <p class="section-sub" style="font-size:13px;margin-top:6px;">${NOTE}</p>`, '개편 안내 자리');
    }
    stage(path.join(newDir, ...rel.split('/').filter(Boolean), 'index.html'), h);
    stage(f, stubPage(DOMAIN + encodeURI(`/${NEW}/${rel}`)));
    locRename.push([DOMAIN + encodeURI(`/${OLD}/${rel}`), DOMAIN + encodeURI(`/${NEW}/${rel}`)]);
  }
  report.push(`옮긴 페이지 ${sources.length}쪽 (옛 주소는 이동 안내 ${sources.length}쪽)`);

  // 옮긴 20쪽 밖의 링크·글자
  const navOnly = [];
  for (const f of walk(ROOT)) {
    if (f.startsWith(oldDir + path.sep) || f.startsWith(newDir + path.sep)) continue;
    const orig = read(f);
    if (!orig.includes(`${OLD}/`) && !orig.includes('href="seogu/"')) continue;
    const rel = relRoot(f);
    let h = orig;
    if (rel === 'incheon/index.html') {
      h = one(h, /href="seogu\/"/, () => 'href="seohae/"', '인천 서구 전체보기');
      h = h.split(`${OLD}/`).join(`${NEW}/`);
      h = one(h, /<span class="d-name">서구<\/span>/, () => '<span class="d-name">서해구</span>', '인천 서구 묶음 이름');
      let n = 0;
      h = h.replace(/<div class="branch-card-loc">서구 (신현동|청라동)<\/div>/g, (x, d) => { n++; return `<div class="branch-card-loc">서해구 ${d}</div>`; });
      if (n !== 2) fail(`인천 지점 카드 ${n}곳`);
      n = 0;
      h = h.replace(/data-sido="인천" data-sgg="서구"/g, () => { n++; return 'data-sido="인천" data-sgg="서해구"'; });
      if (n !== 2) fail(`인천 상담 지점 목록 ${n}곳`);
      h = one(h, new RegExp(esc(`<a href="/${NEW}/">서구</a>`)), () => `<a href="/${NEW}/">서해구</a>`, '인천 지역 목록');
      h = bumpDate(h, rel);
      lastmod.add(`${DOMAIN}/incheon/`);
      report.push('본문이 바뀐 페이지 incheon/index.html (날짜 오늘)');
    } else if (/^incheon\/(bupyeong|namdong|yeonsu)\/index\.html$/.test(rel)) {
      h = one(h, new RegExp(esc(`<a href="/${OLD}/" class="neighbor-district-card"><div class="ndc-name">서구</div>`)),
        () => `<a href="/${NEW}/" class="neighbor-district-card"><div class="ndc-name">서해구</div>`, '이웃 구 카드 ' + rel);
      navOnly.push(rel);
    } else {
      h = one(h, new RegExp(esc(`<a href="/${OLD}/">서구</a>`)), () => `<a href="/${NEW}/">서해구</a>`, '지역 목록 ' + rel);
      navOnly.push(rel);
    }
    if (h.includes(`${OLD}/`) || h.includes('href="seogu/"')) fail(`옛 주소가 남음: ${rel}`);
    // 인천 페이지에 남은 단독 '서구'는 '지역별 지점 안내'의 광주·대전 링크뿐이어야 한다(다른 시도 페이지의 '서구'는 광주·대전 것)
    if (rel.startsWith('incheon/')) for (const m of h.matchAll(/(?<![가-힣])서구/g)) {
      const pre = h.slice(Math.max(0, m.index - 30), m.index);
      if (!/\/(gwangju|daejeon)\/seogu\/">$/.test(pre)) fail(`남은 '서구'(${rel}): …${pre}서구`);
    }
    stage(f, h);
  }
  if (navOnly.length) report.push(`탐색 링크 글자만 바뀐 페이지 ${navOnly.length}쪽 (날짜 그대로)`);

  // branches.js — 홈·후기 지점 검색
  const f = path.join(ROOT, 'branches.js'); let h = read(f);
  for (const name of INCHEON) {
    h = one(h, new RegExp(`\\{"name": "${esc(name)}",[^{}]*\\}`), (x) => {
      if (x.includes('"district_en": "seohae"')) return x;
      let y = one(x, /"address": "인천 서구 /, () => '"address": "인천 서해구 ', name + ' address');
      y = one(y, /"district": "서구"/, () => '"district": "서해구"', name + ' district');
      y = one(y, /"nearby": "인천 서구 /, () => '"nearby": "인천 서해구 ', name + ' nearby');
      return one(y, /"district_en": "seogu"/, () => '"district_en": "seohae"', name + ' district_en');
    }, 'branches.js ' + name);
  }
  if (!h.includes('"서해구": {"청라동": 1, "신현동": 1}')) h = one(h, /"서구": \{"청라동": 1, "신현동": 1\}/, () => '"서해구": {"청라동": 1, "신현동": 1}', 'branches.js NESTED 인천');
  stage(f, h);
}

// ── assets/branches.json 사본 ──
{
  const want = JSON.parse(JSON.stringify(base));
  // 와와(wawacenter.kr) scripts/sync_branches_from_base.cjs 의 CENTER_OVERRIDES 와 같아야 한다(그쪽을 고치면 여기도)
  const renameSchool = (from, to) => (arr) => (arr || []).map((s) => (s === from ? to : s));
  const renameKeyword = (from, to) => (arr) => (arr || []).map((s) => (s.startsWith(from) ? to + s.slice(from.length) : s));
  const OVERRIDES = [
    ['중동점', 'schools_high', renameSchool('증흥고', '중흥고')],
    ['중동점(W+)', 'schools_high', renameSchool('증흥고', '중흥고')],
    ['수성만촌점', 'schools_mid', renameSchool('동중', '대구동중')],
    ['수성만촌점', 'keywords', renameKeyword('동중', '대구동중')],
    ['석사점', 'schools_high', renameSchool('춘여고', '춘천여고')],
    ['새롬점', 'district_slug', () => 'sejong'],
  ];
  for (const [name, field, fn] of OVERRIDES) { if (!want[name]) fail('기준본에 없음 ' + name); want[name][field] = fn(want[name][field]); }
  const f = path.join(ROOT, 'assets', 'branches.json');
  const cur = JSON.parse(read(f));
  const next = JSON.parse(JSON.stringify(cur));
  const names = [...new Set([...Object.keys(cur), ...Object.keys(want)])];
  const took = [];
  for (const n of names) {
    if (!cur[n] || !want[n]) fail(`assets/branches.json 지점 목록이 기준본과 다름: ${n}`);
    for (const k of new Set([...Object.keys(cur[n]), ...Object.keys(want[n])])) {
      if (JSON.stringify(cur[n][k]) === JSON.stringify(want[n][k])) continue;
      const part = k === 'strengths' ? 'strengths' : INCHEON.includes(n) && INCHEON_FIELDS.includes(k) ? 'seohae' : null;
      if (!part) fail(`assets/branches.json 에 예상 밖 차이: ${n}.${k}`);
      if (!DO(part)) continue;
      next[n][k] = want[n][k]; took.push(`${n}.${k}`);
    }
  }
  report.push(`assets/branches.json 기준본에 맞춘 칸 ${took.length}개`);
  stage(f, JSON.stringify(next, null, 2));
}

// ── [strengths] 지점 소개 문단 (strengths_2026-10-27.cjs 를 그대로 돌린다) ──
const P_RE = /<p class="section-sub" style="margin:4px auto 0;max-width:720px;">[^<]*<\/p>/;
const branchPages = Object.values(base).filter((b) => b.strengths)
  .map((b) => ({ b, f: path.join(ROOT, b.region_slug, b.district_slug, b.branch_slug, 'index.html') })).filter((x) => fs.existsSync(x.f));
const paraOf = (f) => (read(f).match(P_RE) || [''])[0];
const before = new Map(branchPages.map((x) => [x.f, paraOf(x.f)]));

console.log(report.join('\n'));
for (const f of [...writes.keys()].sort()) console.log('  ' + (fs.existsSync(f) ? '수정 ' : '새로 ') + relRoot(f));
if (WRITE) for (const [f, h] of writes) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, h, 'utf8'); }

if (DO('strengths')) {
  console.log('\n지점 소개 문단 — strengths_2026-10-27.cjs' + (WRITE ? ' --write' : ' (모의)'));
  console.log(execFileSync(process.execPath, [path.join(__dirname, 'strengths_2026-10-27.cjs'), ...(WRITE ? ['--write'] : [])], { encoding: 'utf8' }).trim());
  if (WRITE) {
    const dated = [];
    for (const x of branchPages) {
      if (paraOf(x.f) === before.get(x.f)) continue;
      const rel = relRoot(path.dirname(x.f));
      fs.writeFileSync(x.f, bumpDate(read(x.f), rel), 'utf8');
      dated.push(`${x.b.name}(${rel})`);
      lastmod.add(`${DOMAIN}/${encodeURI(rel)}/`);
    }
    console.log(`문단이 바뀌어 날짜를 올린 지점 페이지 ${dated.length}장: ${dated.join(' · ')}`);
  }
}

// ── sitemap.xml ──
{
  const f = path.join(ROOT, 'sitemap.xml'); let xml = read(f);
  for (const [o, n] of locRename) {
    if (!xml.includes(`<loc>${n}</loc>`)) xml = one(xml, new RegExp(`<loc>${esc(o)}</loc>`), () => `<loc>${n}</loc>`, '사이트맵 ' + o);
    lastmod.add(n);
  }
  for (const loc of lastmod) xml = one(xml, new RegExp(`(<loc>${esc(loc)}</loc>\\s*<lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>)`), (x, a, z) => a + TODAY + z, '사이트맵 lastmod ' + loc);
  if (DO('seohae') && xml.includes(`/${OLD}/`)) fail('사이트맵에 옛 서구 주소가 남음');
  console.log(`\nsitemap.xml: 주소 바꿈 ${locRename.length} · lastmod 오늘로 ${lastmod.size}`);
  if (WRITE) fs.writeFileSync(f, xml, 'utf8');
}
console.log(WRITE ? '→ 썼습니다' : '\n--write 를 붙이면 씁니다.');
