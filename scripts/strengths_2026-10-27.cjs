#!/usr/bin/env node
// 2026-10-27 지점 소개 글(기준본 strengths, 회사 시트 '센터강점'을 다듬은 것) → 지점 페이지 '○○점 위치 안내' 제목 아래 한 문단.
// 사장님 규칙: 코치·강사·선생님·원장·센터장 등 사람 언급 금지. 구조 자료와 어긋나는 문장(주말불가인데 주말 수업, 없는 과목, 과목 수,
// 없는 학년)은 그 문장만 뺀다. 기존 class(.section-sub)만 쓰고 새 디자인은 넣지 않는다.
// 사용: node scripts/strengths_2026-10-27.cjs [--write]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const GROUP = path.resolve(ROOT, '..');
const BASE = process.env.BRANCH_SRC || path.join(GROUP, 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');
const base = JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, ''));

const SUBJ = ['국어', '영어', '수학', '과학', '사회'];
const PERSON = /코치|강사|선생님|원장|센터장|부원장|실장|담임|교사|쌤/;
const KNUM = { 한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5 };
const escHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function sentences(text) { return text.split(/(?<=\.)\s+/).map(s => s.trim()).filter(Boolean); }

function filterStrengths(b) {
  const subs = b.subjects || [];
  const grades = new Set(Object.values(b.grades_by_subject || {}).flatMap(v => v.split(',')));
  const keep = [], drop = [];
  for (const s of sentences(b.strengths)) {
    const why = [];
    if (PERSON.test(s)) why.push('사람 언급');
    if (/\d{2,4}-\d{3,4}-\d{4}/.test(s)) why.push('전화번호');
    const mentioned = SUBJ.filter(x => s.includes(x));
    const missing = mentioned.filter(x => !subs.includes(x));
    if (missing.length) why.push(`없는 과목 ${missing.join('·')}`);
    const cnt = s.match(/(한|두|세|네|다섯) 과목/); if (cnt && KNUM[cnt[1]] !== subs.length) why.push(`과목 수 ${cnt[1]}≠${subs.length}`);
    if (/전 ?과목/.test(s) && subs.length < 5) why.push(`전과목 아님(${subs.length})`);
    if (b.weekend === '주말불가' && /주말|토요일|일요일|토·일|토일/.test(s)) why.push('주말불가');
    if (/고3|고등 ?3학년|고등학교 3학년/.test(s) && !grades.has('고3')) why.push('고3 없음');
    if (/초등/.test(s) && ![...grades].some(g => g.startsWith('초'))) why.push('초등 없음');
    if (why.length) drop.push([s, why.join(', ')]); else keep.push(s);
  }
  return { keep, drop };
}

let edited = 0, skipped = [];
const dropped = [];
for (const b of Object.values(base)) {
  if (!b.strengths) continue;
  const f = path.join(ROOT, b.region_slug, b.district_slug, b.branch_slug, 'index.html');
  if (!fs.existsSync(f)) { skipped.push(`${b.name}: 페이지 없음`); continue; }
  const { keep, drop } = filterStrengths(b);
  for (const [s, why] of drop) dropped.push(`${b.name} [${why}] ${s}`);
  if (!keep.length) { skipped.push(`${b.name}: 남는 문장 없음`); continue; }
  const raw = fs.readFileSync(f, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  // 브랜드 지점(글로리드·모두·W+)은 페이지 제목이 '수지점 위치 안내'처럼 괄호 없는 이름이다
  const anchor = `<h2 class="section-title" style="margin-bottom:6px;">${b.name.replace(/\(.*\)$/, '')} 위치 안내</h2>`;
  if (!raw.includes(anchor)) { skipped.push(`${b.name}: 위치 안내 제목 없음`); continue; }
  const p = `<p class="section-sub" style="margin:4px auto 0;max-width:720px;">${escHtml(keep.join(' '))}</p>`;
  const existing = new RegExp(escRe(anchor) + '(?:\\r?\\n\\s*<p class="section-sub" style="margin:4px auto 0;max-width:720px;">[^<]*</p>)?');
  const next = raw.replace(existing, anchor + eol + '    ' + p);
  if (next !== raw) { edited++; if (WRITE) fs.writeFileSync(f, next, 'utf8'); }
}
function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

console.log(`지점 소개 넣은 페이지 ${edited}장 (기준본 strengths ${Object.values(base).filter(b => b.strengths).length}곳)`);
console.log(`\n뺀 문장 ${dropped.length}개:`); for (const d of dropped) console.log('  ' + d);
console.log(`\n건너뜀 ${skipped.length}:`); for (const s of skipped) console.log('  ' + s);
console.log(WRITE ? '→ 썼습니다' : '--write 를 붙이면 씁니다.');
