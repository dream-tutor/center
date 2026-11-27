#!/usr/bin/env node
// 2026-11-25 지점 페이지 글을 그 지점 자료(기준본 wstudycenter.com/data/branches.json)와 맞춘다 — 사장님 11-25 "최대한 보수적으로".
//   틀린 낱말·구절만 바꾸고 문장 틀·순서는 그대로 둔다.
//   ① 아래 소개 문단 '… {과목} 수업을 진행하며, 초등부터 고등까지 학년별 맞춤 코칭을 제공합니다.'
//      · 학년: 과목 학년 합집합이 초1~고3 을 다 덮지 않으면 '{처음}부터 {끝}까지'(사이가 비면 '(○ 제외)') — 11-24
//        scripts/grade_block_2026-11-24.cjs 와 같은 규칙. 다 덮으면 원문 '초등부터 고등까지'.
//      · 과목: 그 지점이 여는 과목을 빠뜨렸거나 안 여는 과목을 적었으면 고친다(둔산점 수학·율하점 사회 등). 같은 과목이 두 번
//        적힌 것(위례점 '국어 · 국어 · …')도 한 번으로. 맞으면 순서까지 그대로.
//   ※ ②의 설명문 틀 바꾸기는 한 방향이다 — 나중에 자료가 바뀌어 '초중고' 틀이 다시 맞게 되어도 되돌리지 않는다.
//   ② 설명문(meta·og) '{시군구} {동} {지점}. 초중고 {과목} 개별 진도 수업, …': 적힌 과목 가운데 초·중·고 하나라도 안 여는 과목이
//      있으면 _rewrite_desc.js 의 다른 후보 '{지점}, {시군구} {동} 자기주도학습 학원. {과목} 개별 진도 수업. …'로 바꾼다
//      (해시로 고른 변형이 맞는 페이지는 그대로).
//   ③ 설명문 과목 목록이 앞 세 과목(기준본 과목 순서, 10-27 규칙)을 다 담지 못했으면 앞 세 과목으로(둔산점 수학·소하점 과학).
//      다섯·네 과목을 다 적은 설명문은 그대로.
//   바뀐 페이지만 page-updated(data-iso·최종 업데이트)를 TODAY 로. 사이트맵 lastmod 는 따로 맞춘다(scripts/_README.md).
//   원문과 이 스크립트가 쓴 꼴을 다 알아보므로 다시 돌리면 0장, 기준본 학년·과목이 바뀌면 새 자료대로 다시 맞춘다.
// 사용: node scripts/branch_text_2026-11-25.cjs [--write]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BRANCH_SRC || path.join(ROOT, '..', 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');
const TODAY = '2026-11-27'; // 11-25 에 고쳐 11-27 에 배포 — 페이지 수정일은 배포일
const MAX_DESC = 80;

const base = Object.values(JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, '')));
const SEQ = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
const SUBJ = ['국어', '영어', '수학', '과학', '사회'];
const gradesOf = (b, s) => ((b.grades_by_subject || {})[s] || '').split(',').map((x) => x.trim()).filter(Boolean);
const fail = (m) => { throw new Error(m); };
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
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
// grade_block_2026-11-24.cjs 의 rangeText 와 같은 꼴
function rangeText(all) {
  if (SEQ.every((k) => all.has(k))) return '초등부터 고등까지';
  const idx = SEQ.map((k, i) => (all.has(k) ? i : -1)).filter((i) => i >= 0);
  const lo = idx[0], hi = idx[idx.length - 1];
  const miss = SEQ.slice(lo, hi + 1).filter((k) => !all.has(k));
  return `${SEQ[lo]}부터 ${SEQ[hi]}까지${miss.length ? `(${miss.join('·')} 제외)` : ''}`;
}
// 빠진 과목을 넣고 안 여는 과목을 뺀다: 지금 순서가 국·영·수·과·사 순서면 그 순서로, 아니면 뒤에 붙인다
function fixSubjects(items, want) {
  const kept = items.filter((s) => want.includes(s));
  const miss = want.filter((s) => !kept.includes(s));
  if (!miss.length) return kept;
  const inOrder = kept.every((s, i) => i === 0 || SUBJ.indexOf(kept[i - 1]) < SUBJ.indexOf(s));
  return inOrder ? SUBJ.filter((s) => kept.includes(s) || miss.includes(s)) : [...kept, ...miss];
}
const levelsOf = (b, s) => new Set(gradesOf(b, s).map((g) => g[0]));
const allLevels = (b, s) => { const lv = levelsOf(b, s); return lv.has('초') && lv.has('중') && lv.has('고'); };

const SEO_RE = /([가-힣]+(?: · [가-힣]+)*)( 수업을 진행하며, )(초등부터 고등까지|[초중고]\d부터 [초중고]\d까지(?:\([^)<]*\))?)( 학년별 맞춤 코칭을 제공합니다)/;
const V1_RE = /^(\S+) (\S+) (.+?)\. 초중고 ([가-힣·]+) 개별 진도 수업, 수강료·수업 시간 공개\. 무료 상담\.$/;
const V0_RE = /^(.+?), (\S+) (\S+) 자기주도학습 학원\. ([가-힣·]+) 개별 진도 수업\. 수강료·수업 시간 공개, 무료 상담\.$/;

const changes = []; const groups = new Map(); const warns = [];
const note = (k) => groups.set(k, (groups.get(k) || 0) + 1);
for (const b of base) {
  const pages = fs.readdirSync(path.join(ROOT, b.region_slug)).map((d) => path.join(ROOT, b.region_slug, d, b.branch_slug, 'index.html'))
    .filter((p) => fs.existsSync(p) && !fs.readFileSync(p, 'utf8').includes('페이지 이동 안내'));
  if (pages.length !== 1) fail(`지점 페이지 ${pages.length}장: ${b.name}`);
  const f = pages[0];
  const raw = fs.readFileSync(f, 'utf8');
  const isCrlf = raw.includes('\r\n');
  const orig = isCrlf ? raw.replace(/\r\n/g, '\n') : raw;
  const title = (orig.match(/<title>([^<|]*?) \|/) || [])[1] || '';
  if (!title.endsWith(b.name.replace(/\(.*\)$/, ''))) fail(`제목과 지점 불일치 ${title} / ${b.name}: ${rel(f)}`);
  const subs = b.subjects || [];
  let h = orig; const what = [];

  // ① 아래 소개 문단
  const all = new Set(subs.flatMap((s) => gradesOf(b, s)));
  h = one(h, new RegExp(SEO_RE.source), (m, list, mid, range, tail) => {
    const items = list.split(' · ');
    if (!items.every((x) => SUBJ.includes(x))) fail(`소개 문단 과목 아님 '${list}': ${rel(f)}`);
    const want = fixSubjects([...new Set(items)], subs); // 같은 과목이 두 번 적힌 목록(위례점 '국어 · 국어 · …')도 한 번으로
    const R = rangeText(all);
    if (want.join('·') !== items.join('·')) { what.push(`소개 과목 ${items.join('·')} → ${want.join('·')}`); note('① 소개 문단 과목을 지점 과목으로'); }
    if (R !== range) { what.push(`소개 학년 ${range} → ${R}`); note(`① 소개 문단 학년 '${range}' → 범위`); }
    return want.join(' · ') + mid + R + tail;
  }, '소개 문단 ' + rel(f));

  // ②·③ 설명문
  const desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (desc === undefined) fail('설명문 없음 ' + rel(f));
  let nd = desc; let m;
  const first3 = subs.slice(0, 3);
  if ((m = desc.match(V1_RE)) || (m = desc.match(V0_RE))) {
    const isV1 = V1_RE.test(desc);
    const [, p1, p2, p3, sj] = m;
    let SJ = sj.split('·');
    let sjChanged = false;
    const kept = SJ.filter((x) => subs.includes(x));
    if (kept.length !== SJ.length || !first3.every((x) => kept.includes(x))) {
      const fixed = first3.every((x) => kept.includes(x)) ? kept : first3;
      what.push(`설명문 과목 ${SJ.join('·')} → ${fixed.join('·')}`); note('③ 설명문 과목을 앞 세 과목으로');
      SJ = fixed; sjChanged = true;
    }
    if (isV1) {
      const [SG, DG, B] = [p1, p2, p3];
      const bad = SJ.filter((s) => !allLevels(b, s));
      if (bad.length) {
        nd = `${B}, ${SG} ${DG} 자기주도학습 학원. ${SJ.join('·')} 개별 진도 수업. 수강료·수업 시간 공개, 무료 상담.`;
        if ([...nd].length > MAX_DESC) nd = `${B}, ${SG} ${DG} 자기주도학습 학원. ${SJ.join('·')} 수업, 무료 상담.`;
        what.push(`설명문 '초중고' 틀 → 다른 후보(${bad.join('·')} 초·중·고 다 안 엶)`); note("② 설명문 '초중고 {과목}' 틀을 다른 후보로");
      } else if (sjChanged) nd = `${SG} ${DG} ${B}. 초중고 ${SJ.join('·')} 개별 진도 수업, 수강료·수업 시간 공개. 무료 상담.`;
    } else if (sjChanged) {
      const [B, SG, DG] = [p1, p2, p3];
      nd = `${B}, ${SG} ${DG} 자기주도학습 학원. ${SJ.join('·')} 개별 진도 수업. 수강료·수업 시간 공개, 무료 상담.`;
    }
  } else if (!/초중고 자기주도학습 전문 · /.test(desc)) warns.push(`설명문 꼴이 다름(그대로): ${rel(f)} ${desc}`);
  if (nd !== desc) {
    if ([...nd].length > MAX_DESC) fail(`설명문 ${[...nd].length}자: ${rel(f)} ${nd}`);
    if (/["<>&]/.test(nd)) fail('설명문 escape ' + rel(f));
    const cnt = h.split(`content="${desc}"`).length - 1;
    if (cnt !== 2) fail(`설명문·og 설명문 ${cnt}곳: ${rel(f)}`);
    h = h.split(`content="${desc}"`).join(`content="${nd}"`);
  }

  if (h === orig) continue;
  h = bumpDate(h, rel(f));
  changes.push({ f, h: isCrlf ? h.replace(/\n/g, '\r\n') : h, what, desc: nd !== desc ? [desc, nd] : null });
}
console.log(`지점 페이지 ${base.length}장 → 바뀔 페이지 ${changes.length}장`);
for (const [k, n] of [...groups].sort((a, c) => c[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${k}`);
console.log('');
for (const c of changes) {
  console.log(`${rel(c.f)}\n    ${c.what.join(' / ')}`);
  if (c.desc) console.log(`    - ${c.desc[0]}\n    + ${c.desc[1]}`);
}
if (warns.length) { console.log(`\n확인 ${warns.length}건:`); for (const w of warns) console.log('  ' + w); }
if (WRITE) { for (const c of changes) fs.writeFileSync(c.f, c.h, 'utf8'); console.log(`\n→ ${changes.length}개 파일을 썼습니다.`); }
else console.log('\n--write 를 붙이면 씁니다.');
