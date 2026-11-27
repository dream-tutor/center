#!/usr/bin/env node
// 2026-11-24 '학년별 맞춤 프로그램' 칸을 그 페이지 지점 자료에 맞춘다(사장님 "여기서 고쳐줘").
// 왜: 생성기가 모든 페이지에 같은 글을 넣었다 — 머리 '어떤 학년이든 맞춤 코칭 / 초등부터 고등까지, …'와 초등 카드
//   '전과목 기초 탄탄히 / 국·영·수·사·과 고르게 다져 …'. 지점 202곳 모두 초·중·고를 열지만, 초1~고3 을 다 여는 곳은 96곳,
//   초등에서 다섯 과목을 다 여는 곳은 75곳뿐이라 거제수월점(영어·수학, 초5~고2) 같은 지점 페이지에서 사실과 어긋났다.
//   같은 날 기준본 소개 글 세 문장('전 학년'·'전 과목'을 고친 것)과 같은 종류.
// 무엇을: 지점 페이지는 그 지점, 시도·시군구 페이지는 그 지역 지점 전체(합집합) 자료로 본다. 홈은 전국 단위 소개라 그대로 둔다.
//   ① 학년이 초1~고3 을 다 덮지 않으면 머리를 '학년에 맞춘 코칭' / '초5부터 고2까지, 시기마다 필요한 공부를 챙깁니다.'(중간이 비면 '(고2 제외)')
//   ② 초등에서 여는 과목이 다섯이 아니면 초등 카드 셋째 줄을 '영어·수학 기초 탄탄히' / '두 과목을 고르게 다져 중학교 이후를 대비합니다.'
//   맞는 페이지는 손대지 않는다. 바뀐 페이지만 page-updated(data-iso·최종 업데이트)·sitemap lastmod 를 오늘로.
// 생성기(쌍둥이 와와 저장소의 git 밖 .py)는 옛 글을 그대로 낸다 — 페이지를 다시 만들면 이 스크립트를 다시 돌린다(scripts/_README.md).
// 사용: node scripts/grade_block_2026-11-24.cjs [--write] [--no-sitemap]   (--write 가 없으면 모의 — 바뀔 페이지 수와 문구 묶음만 보여 준다)
//   --no-sitemap: 페이지만 쓰고 sitemap.xml 은 두다(사이트맵을 다른 단계에서 한꺼번에 맞출 때 — 2026-11-25 기준본 변경 반영 때 이렇게 돌렸다)
// 2026-11-25: 기준본 이곡점 과학에서 초1 을 뺀 뒤 TODAY 를 그날로 바꿔 다시 돌렸다(자료가 바뀐 곳만 바뀜).
// 2026-11-27: 기준본 별가람점 국어·영어에 고2 를 채운 뒤 다시 돌렸다(별가람점 1장이 '(고2 제외)' 없이 원문으로 돌아감).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BRANCH_SRC || path.join(ROOT, '..', 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');
const NO_SITEMAP = process.argv.includes('--no-sitemap');
const TODAY = '2026-11-27'; // 11-25 에 고쳐 11-27 에 배포 — 페이지 수정일은 배포일
const DOMAIN = 'https://wcoachingcenter.com';
const SEQ = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
const SUBJ = ['국어', '영어', '수학', '사회', '과학']; // 카드 원문 '국·영·수·사·과' 순서
const KNUM = { 2: '두', 3: '세', 4: '네' };

const START = '<div class="section-tag">학년별 맞춤 프로그램</div>';
// 원문(생성기 글) — 자료가 초1~고3·다섯 과목을 다 열면 이 글이 맞고, 아니면 아래 꼴로 바꾼다.
const OLD_TITLE = '<h2 class="section-title">어떤 학년이든 맞춤 코칭</h2>';
const OLD_SUB = '<p class="section-sub">초등부터 고등까지, 시기마다 필요한 공부를 챙깁니다.</p>';
const OLD_ELEM = '<li><b>전과목 기초 탄탄히</b><span>국·영·수·사·과 고르게 다져 중학교 이후를 대비합니다.</span></li>';
// 원문과 이 스크립트가 쓴 꼴을 다 알아본다 — 기준본 학년·과목이 바뀐 뒤 다시 돌리면 새 자료대로 다시 맞춘다(다 열게 되면 원문으로)
const RE_TITLE = /<h2 class="section-title">(?:어떤 학년이든 맞춤 코칭|학년에 맞춘 코칭)<\/h2>/;
const RE_SUB = /<p class="section-sub">(?:초등부터 고등까지|[초중고]\d부터 [초중고]\d까지(?:\([^)<]*\))?), 시기마다 필요한 공부를 챙깁니다\.<\/p>/;
const RE_ELEM = /<li><b>[가-힣·]+ 기초 탄탄히<\/b><span>[^<]*<\/span><\/li>/;

const fail = (m) => { throw new Error(m); };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function one(h, re, fn, what) {
  let n = 0;
  const r = h.replace(re, (...a) => { n++; return fn(...a); });
  if (n !== 1) fail(`${what}: ${n}곳`);
  return r;
}
function bumpDate(h, what) {
  h = one(h, /(<div class="page-updated" data-iso=")\d{4}-\d{2}-\d{2}(")/, (x, a, z) => a + TODAY + z, 'data-iso ' + what);
  return one(h, /📅 최종 업데이트: \d{4}\.\d{2}\.\d{2}/, () => `📅 최종 업데이트: ${TODAY.replace(/-/g, '.')}`, '최종 업데이트 ' + what);
}
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/^[._]/.test(e.name) && e.name !== 'node_modules') walk(p, out); } else if (e.name === 'index.html') out.push(p);
  }
  return out;
}

const base = Object.values(JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, '')));
const gradesOf = (b) => Object.fromEntries(Object.entries(b.grades_by_subject || {}).map(([s, v]) => [s, String(v).split(',').map((x) => x.trim()).filter(Boolean)]));
// 페이지 주소 → 그 페이지가 말하는 지점들. 지점은 시도+지점 슬러그로 찾는다(세종 새롬점은 기준본 시군구 슬러그가 unknown, center 주소는 sejong/sejong/saelom).
function branchesOf(parts) {
  const [r, d, b] = parts;
  if (parts.length === 1) return base.filter((x) => x.region_slug === r);
  if (parts.length === 2) return base.filter((x) => x.region_slug === r && x.district_slug === d);
  if (parts.length === 3) return base.filter((x) => x.region_slug === r && x.branch_slug === b);
  return null;
}
function rangeText(all) {
  const idx = SEQ.map((k, i) => (all.has(k) ? i : -1)).filter((i) => i >= 0);
  const lo = idx[0], hi = idx[idx.length - 1];
  const miss = SEQ.slice(lo, hi + 1).filter((k) => !all.has(k));
  return `${SEQ[lo]}부터 ${SEQ[hi]}까지${miss.length ? `(${miss.join('·')} 제외)` : ''}`;
}

const writes = new Map();
const lastmod = [];
const groups = new Map(); // 바뀐 문구 묶음 → 페이지 수 (모의 실행 보고용)
const note = (k) => groups.set(k, (groups.get(k) || 0) + 1);
let seen = 0, skippedHome = 0;
const unknown = [];
for (const f of walk(ROOT)) {
  let h = fs.readFileSync(f, 'utf8');
  const i = h.indexOf(START);
  if (i < 0) continue;
  seen++;
  const parts = path.relative(ROOT, path.dirname(f)).split(path.sep).filter(Boolean);
  if (!parts.length) { skippedHome++; continue; } // 홈 — 전국 단위 소개
  const bs = branchesOf(parts);
  if (!bs || !bs.length) { unknown.push(parts.join('/')); continue; }
  const j = h.indexOf('</section>', i);
  if (j < 0) fail(`칸 끝 없음: ${parts.join('/')}`);
  let block = h.slice(i, j);
  const before = block;
  const gs = bs.map(gradesOf);
  const all = new Set(gs.flatMap((g) => Object.values(g).flat()));
  const elemSubs = SUBJ.filter((s) => gs.some((g) => (g[s] || []).some((k) => k[0] === '초')));
  const full = SEQ.every((k) => all.has(k));
  const wantTitle = full ? OLD_TITLE : '<h2 class="section-title">학년에 맞춘 코칭</h2>';
  const wantSub = full ? OLD_SUB : `<p class="section-sub">${rangeText(all)}, 시기마다 필요한 공부를 챙깁니다.</p>`;
  const span = elemSubs.length === 1 ? '학교 진도에 맞춰 차근차근 다져 중학교 이후를 대비합니다.' : `${KNUM[elemSubs.length]} 과목을 고르게 다져 중학교 이후를 대비합니다.`;
  const wantElem = !elemSubs.length || elemSubs.length === SUBJ.length ? OLD_ELEM : `<li><b>${elemSubs.join('·')} 기초 탄탄히</b><span>${span}</span></li>`;
  block = one(block, RE_TITLE, () => wantTitle, '머리 제목 ' + parts.join('/'));
  block = one(block, RE_SUB, () => wantSub, '머리 설명 ' + parts.join('/'));
  block = one(block, RE_ELEM, () => wantElem, '초등 카드 ' + parts.join('/'));
  if (block !== before) {
    if (!before.includes(wantTitle) || !before.includes(wantSub)) note(`머리: ${wantTitle.replace(/<[^>]+>/g, '')} / ${wantSub.replace(/<[^>]+>/g, '')}`);
    if (!before.includes(wantElem)) note(`초등: ${wantElem.replace(/<\/b><span>/, ' / ').replace(/<[^>]+>/g, '')}`);
  }
  if (block === before) continue;
  h = h.slice(0, i) + block + h.slice(j);
  h = bumpDate(h, parts.join('/'));
  writes.set(f, h);
  lastmod.push(`${DOMAIN}/${parts.join('/')}/`);
}

const sm = path.join(ROOT, 'sitemap.xml');
let xml = fs.readFileSync(sm, 'utf8');
const notInSitemap = [];
for (const loc of lastmod) {
  const re = new RegExp(`(<loc>${esc(loc)}</loc>\\s*<lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>)`);
  if (!re.test(xml)) { notInSitemap.push(loc); continue; }
  xml = one(xml, re, (m, a, z) => a + TODAY + z, '사이트맵 lastmod ' + loc);
}
if (writes.size && !NO_SITEMAP) writes.set(sm, xml);

const depth = {};
for (const loc of lastmod) { const n = loc.slice(DOMAIN.length).split('/').filter(Boolean).length; depth[n] = (depth[n] || 0) + 1; }
console.log(`칸이 있는 페이지 ${seen}장(홈 ${skippedHome}장은 그대로) → 바뀔 페이지 ${lastmod.length}장 (깊이별 시도 ${depth[1] || 0} · 시군구 ${depth[2] || 0} · 지점 ${depth[3] || 0})`);
console.log(`사이트맵 lastmod 오늘로 ${lastmod.length - notInSitemap.length}${notInSitemap.length ? ` · 사이트맵에 없음 ${notInSitemap.length}: ${notInSitemap.join(', ')}` : ''}${NO_SITEMAP ? ' (--no-sitemap: sitemap.xml 은 쓰지 않음)' : ''}`);
if (unknown.length) console.log(`지점을 못 찾은 페이지 ${unknown.length}: ${unknown.join(', ')}`);
console.log('\n바뀐 문구 묶음(페이지 수):');
for (const [k, n] of [...groups].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${k}`);
if (WRITE) { for (const [f, h] of writes) fs.writeFileSync(f, h, 'utf8'); console.log(`\n→ ${writes.size}개 파일을 썼습니다.`); }
else console.log('\n--write 를 붙이면 씁니다.');
