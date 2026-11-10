#!/usr/bin/env node
// 2026-11-10 점검(wawa-A-1): 동 허브의 '수강 가능 과목' 줄을 기준본(wstudycenter.com/data/branches.json)의
//   그 동 지점 과목 합집합으로 맞춘다. 10-27 반영(scripts/branch_changes_2026-10-27.cjs editHub)은 그때 바뀐 지점의 허브만
//   고쳐서, 나머지 17장은 Init 때 값이 남아 같은 페이지의 제목·과목 바로가기·상담 폼 과목과 달랐다
//   (반여동·가경동·성남동은 지점이 안 여는 과목까지 적었다).
// 바꾸는 것은 그 한 줄뿐이다 — 제목·h1·설명문(검색어 나열, 10-02 '제목은 그대로')·소개 문단·학교 목록은 건드리지 않는다.
// 바뀐 페이지만 page-updated(data-iso·최종 업데이트)와 sitemap.xml lastmod 를 오늘로 올린다.
// 기준본의 같은 동 지점과 허브에 실린 지점(→ ○○점 자세히 보기)이 다르면 그 허브는 건너뛰고 알린다.
// 고친 뒤에는 node _thumb_test.js plan 으로 썸네일 시험 배너 과목(= 기준본 ∩ 이 줄)을 다시 볼 것.
// 사용: node scripts/hub_subjects_2026-11-10.cjs [--write]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BRANCH_SRC || path.join(ROOT, '..', 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');
const TODAY = '2026-11-10';
const DOMAIN = 'https://wcoachingcenter.com/';

const base = JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, ''));
const BR = Object.values(base);
const SUBJ = ['국어', '영어', '수학', '과학', '사회'];
const LINE_RE = /(<div class="info-label">수강 가능 과목<\/div>\s*<div class="info-value">)([^<]*)(<\/div>)/;

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
for (const r of fs.readdirSync(ROOT).sort()) {
  const rp = path.join(ROOT, r);
  if (r.startsWith('.') || r.startsWith('_') || ['assets', 'scripts', 'node_modules'].includes(r) || !fs.statSync(rp).isDirectory()) continue;
  for (const d of fs.readdirSync(rp).sort()) {
    const dongDir = path.join(rp, d, 'dong');
    if (!fs.existsSync(dongDir)) continue;
    for (const dong of fs.readdirSync(dongDir).sort()) {
      const f = path.join(dongDir, dong, 'index.html');
      if (!fs.existsSync(f)) continue;
      const raw = fs.readFileSync(f, 'utf8');
      if (raw.includes('페이지 이동 안내')) continue;
      const m = raw.match(LINE_RE);
      if (!m) { warn(`과목 줄 없음 ${r}/${d}/dong/${dong}`); continue; }
      const bs = BR.filter(b => b.region_slug === r && b.district_slug === d && b.dong === dong);
      if (!bs.length) continue; // 기준본 동 이름이 다른 허브(병점동·새롬동·염리동 — 줄은 실린 지점 과목과 같다)
      const shown = [...raw.matchAll(/<a href="\.\.\/\.\.\/([a-z0-9-]+)\/"[^>]*>→ [^<]* 자세히 보기<\/a>/g)].map(x => x[1]).sort();
      const want = bs.map(b => b.branch_slug).sort();
      if (shown.join() !== want.join()) { warn(`허브 지점(${shown}) ≠ 기준본 같은 동(${want}) — 건너뜀 ${r}/${d}/dong/${dong}`); continue; }
      const S = SUBJ.filter(s => bs.some(b => (b.subjects || []).includes(s))).join(' · ');
      if (m[2] === S) continue;
      let h = raw.replace(LINE_RE, (x, a, c, z) => a + S + z);
      h = bumpDate(h);
      changed.push({ f, rel: `${r}/${d}/dong/${dong}`, h });
      console.log(`${r}/${d}/dong/${dong} [${bs.map(b => b.name).join(',')}] '${m[2]}' → '${S}'`);
    }
  }
}
let xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
for (const c of changed) xml = sitemapBump(xml, c.rel, warn);
console.log(`\n과목 줄 고칠 허브 ${changed.length}장 · 확인 ${warns.length}건`);
if (WRITE) {
  for (const c of changed) fs.writeFileSync(c.f, c.h, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
  console.log('→ 썼습니다');
} else console.log('--write 를 붙이면 씁니다.');
