#!/usr/bin/env node
// 2026-11-10 점검 경미 묶음.
//  wawa-B-7: 학교 페이지의 '이 과목들로 수업 가능합니다' 단추 중 동×과목 이동 안내 스텁(noindex·refresh)을 가리키는 것을 지운다.
//    10-27 반영(scripts/branch_changes_2026-10-27.cjs editSchoolPages)이 개신점 국어·서신점 과학을 빼며 과목 문장·카드·폼만 고치고
//    단추는 남겨, 청주 학교 18장은 '개신동 국어학원', 전주 2장은 '서신동 과학학원' 단추가 스텁(→ 동 페이지)으로 갔다.
//    스텁 여부는 그 주소의 index.html 에 meta refresh 가 있는지로 본다(과목 이름을 손으로 적지 않는다).
//  wawa-B-9: 처리방침·후기·상담 페이지 설명문을 10-02 말투(검색어 앞, 사실을 명사로 끊어 쉼표)로.
//    처리방침은 본문 두 항목(수집하는 정보·보관 기간)만 — 옛 문장은 본문에 없는 '지점 제공과 처리 위탁'을 말했다. 제목은 그대로.
// 바뀐 페이지만 page-updated(data-iso·최종 업데이트)와 sitemap.xml lastmod 를 오늘로 올린다.
// 사용: node scripts/minor_fixes_2026-11-10.cjs [--write]  (한 번 돌린 뒤 다시 돌리면 바뀌는 것이 없다)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const TODAY = '2026-11-10';
const DOMAIN = 'https://wcoachingcenter.com/';

function bumpDate(h) {
  return h.replace(/(<div class="page-updated" data-iso=")\d{4}-\d{2}-\d{2}(")/, (x, a, z) => a + TODAY + z)
    .replace(/📅 최종 업데이트: \d{4}\.\d{2}\.\d{2}/, () => `📅 최종 업데이트: ${TODAY.replace(/-/g, '.')}`);
}
function sitemapBump(xml, relDir, warn) {
  const loc = DOMAIN + encodeURI(relDir) + '/';
  const re = new RegExp('(<loc>' + loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</loc>\\s*<lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>)');
  if (!re.test(xml)) { warn(`사이트맵에 없음 ${loc}`); return xml; }
  return xml.replace(re, (x, a, z) => a + TODAY + z);
}
const warns = [];
const warn = m => { warns.push(m); console.log('  [확인] ' + m); };
const changed = [];

// ── B-7 학교 페이지 과목 단추 ──
const BTN_SECTION = /(이 과목들로 수업 가능합니다<\/h2><\/div><div[^>]*>)(.*?)(<\/div><\/div><\/section>)/s;
const BTN = /<a href="(\.\.\/\.\.\/dong\/[^"/]+\/[a-z]+\/)"[^>]*>[^<]*<\/a>/g;
const isStub = f => fs.existsSync(f) && /http-equiv="refresh"/.test(fs.readFileSync(f, 'utf8'));
for (const r of fs.readdirSync(ROOT).sort()) {
  const rp = path.join(ROOT, r);
  if (r.startsWith('.') || r.startsWith('_') || ['assets', 'scripts', 'node_modules'].includes(r) || !fs.statSync(rp).isDirectory()) continue;
  for (const d of fs.readdirSync(rp).sort()) {
    const sd = path.join(rp, d, 'school');
    if (!fs.existsSync(sd)) continue;
    for (const s of fs.readdirSync(sd).sort()) {
      const f = path.join(sd, s, 'index.html');
      if (!fs.existsSync(f)) continue;
      const raw = fs.readFileSync(f, 'utf8');
      const m = raw.match(BTN_SECTION);
      if (!m) continue;
      const dropped = [];
      const inner = m[2].replace(BTN, (a, href) => {
        const target = path.join(sd, s, href, 'index.html');
        if (isStub(target)) { dropped.push(a.replace(/<[^>]+>/g, '')); return ''; }
        return a;
      });
      if (!dropped.length) continue;
      if (!/<a /.test(inner)) { warn(`단추가 다 빠짐 — 건너뜀 ${r}/${d}/school/${s}`); continue; }
      const h = bumpDate(raw.replace(BTN_SECTION, (x, a, _b, z) => a + inner + z));
      changed.push({ f, rel: `${r}/${d}/school/${s}`, h });
      console.log(`${r}/${d}/school/${s} 단추 뺌: ${dropped.join(', ')}`);
    }
  }
}

// ── B-9 설명문 3장 ──
const DESC = {
  privacy: {
    meta: '와와학습코칭센터 개인정보처리방침, 상담 신청 때 받는 학생 이름·학부모 연락처·거주 주소·학년·희망 지점·과목, 상담 종료 후 6개월 이내 파기',
    og: '와와학습코칭센터 개인정보처리방침, 상담 신청 때 받는 학생 이름·학부모 연락처·거주 주소·학년·희망 지점·과목, 상담 종료 후 6개월 이내 파기',
  },
  reviews: {
    meta: '와와학습코칭센터 학생·학부모 후기, 초등·중등·고등·학부모별 보기, 진단·계획·실행·점검 자기주도학습 코칭과 공부 습관 변화',
  },
  inquiry: {
    meta: '와와학습코칭센터 무료 상담 신청, 거주 지역 가까운 지점 연결, 초중고 자기주도학습 코칭, 학년·희망 과목 선택',
    og: '와와학습코칭센터 무료 상담 신청, 거주 지역 가까운 지점 연결, 초중고 자기주도학습 코칭',
  },
};
for (const [dir, v] of Object.entries(DESC)) {
  const f = path.join(ROOT, dir, 'index.html');
  const raw = fs.readFileSync(f, 'utf8');
  let h = raw;
  if (v.meta) h = h.replace(/(<meta name="description" content=")[^"]*(")/, (x, a, z) => a + v.meta + z);
  if (v.og) h = h.replace(/(<meta property="og:description" content=")[^"]*(")/, (x, a, z) => a + v.og + z);
  if (h === raw) continue;
  for (const t of [v.meta, v.og].filter(Boolean)) if (t.length > 80) warn(`${dir} 설명문 ${t.length}자(80자 넘음)`);
  changed.push({ f, rel: dir, h: bumpDate(h) });
  console.log(`${dir} 설명문 바꿈`);
}

let xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
for (const c of changed) xml = sitemapBump(xml, c.rel, warn);
console.log(`\n바꿀 페이지 ${changed.length}장 · 확인 ${warns.length}건`);
if (WRITE) {
  for (const c of changed) fs.writeFileSync(c.f, c.h, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
  console.log('→ 썼습니다');
} else console.log('--write 를 붙이면 씁니다.');
