#!/usr/bin/env node
// 2026-10-27 저녁 — 개신점·이충점·동백점 수강 학년이 고3 까지로 늘었다(기준본 wstudycenter.com/data/branches.json grades_by_subject).
//   개신·이충 영어·수학 고2→고3, 동백 국어·영어·수학·과학 고1→고3. 다른 지점·칸은 건드리지 않는다.
//   낮의 scripts/data_2026-10-27.cjs(데이터)·branch_changes_2026-10-27.cjs(페이지) 와 같은 방식 — 학년 칸·학년 범위만 떼어 낸 것.
//   - 데이터: center·와와 루트 branches.js, 와와 assets/main.js BRANCHES 의 grade_* 칸(바뀐 지점만, 칸 순서 그대로)
//     (assets/branches.json 두 벌은 와와 scripts/sync_branches_from_base.cjs --write 가 맡는다)
//   - 페이지(center 만 — 와와 저장소는 구 도메인 301 이라 페이지를 두지 않는다):
//     지점 페이지 과목·학년 표, 동 허브 설명문·og 설명문의 학년 범위, 동×과목 페이지의 학년 범위(head 전체·strong·'대상으로')와 학년 목록 줄
//   지점 식별은 branch_en(slug) 우선 — 와와는 같은 명칭이 20곳 겹치니 name 만으로 찾지 않는다(center-branch-matching 규칙).
// 사용: node scripts/grade_high3_2026-10-27.cjs          → 차이만 보여 준다
//       node scripts/grade_high3_2026-10-27.cjs --write  → 파일을 다시 쓴다
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');            // center(wcoachingcenter.com)
const GROUP = path.resolve(ROOT, '..');
const WAWA = path.join(GROUP, '와와(wawacenter.kr)');
const BASE = process.env.BRANCH_SRC || path.join(GROUP, 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');

const CHANGED = ['개신점', '이충점', '동백점'];
const GRADE_FIELDS = { grade_kor: '국어', grade_eng: '영어', grade_math: '수학', grade_sci: '과학', grade_soc: '사회' };

const base = JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, ''));
const BR = Object.values(base);

const SUBJ = ['국어', '영어', '수학', '과학', '사회'];
const SLUG_ORDER = ['korean', 'english', 'math', 'science', 'social'];
const SUBJ_OF = { korean: '국어', english: '영어', math: '수학', science: '과학', social: '사회' };
const CHIP_ICON = { 국어: '📖', 영어: '🔤', 수학: '🧮', 과학: '🔬', 사회: '🌏' };
const CARD_ICON = { 국어: '📖', 영어: '🔤', 수학: '🔢', 과학: '🔬', 사회: '🌏' };
const CLS = { 국어: 'kor', 영어: 'eng', 수학: 'math', 과학: 'sci', 사회: 'soc' };
const GRADES = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
const LEVEL = g => g[0] === '초' ? 'elem' : g[0] === '중' ? 'mid' : 'high';
const RANGE_RE = /[초중고]\d~[초중고]\d/g;
const eul = s => /[1368]$/.test(s) ? '을' : '를';

const subjOf = b => SUBJ.filter(s => (b.subjects || []).includes(s));
const gradesOf = (b, s) => ((b.grades_by_subject || {})[s] || '').split(',').map(x => x.trim()).filter(Boolean);
const sortG = arr => [...new Set(arr)].sort((a, c) => GRADES.indexOf(a) - GRADES.indexOf(c));
function rangeStr(arr) { const g = sortG(arr); if (!g.length) return null; return g[0] === g[g.length - 1] ? g[0] : `${g[0]}~${g[g.length - 1]}`; }
const inDong = (r, d, dong) => BR.filter(b => b.region_slug === r && b.district_slug === d && b.dong === dong);

// ---- 데이터 파일 (data_2026-10-27.cjs 와 같은 꼴) ----
function dumpsArr(arr) {
  return '[' + arr.map(o => '{' + Object.keys(o).map(k => JSON.stringify(k) + ': ' + JSON.stringify(o[k])).join(', ') + '}').join(', ') + ']';
}
function patchArray(arr, label) {
  const lines = [];
  for (const name of CHANGED) {
    const b = base[name];
    let i = arr.findIndex(x => x.branch_en ? x.branch_en === b.branch_slug : x.name === name);
    if (i < 0) i = arr.findIndex(x => x.name === name && x.region === b.region && x.district === b.district);
    if (i < 0) { lines.push(`  [경고] ${label}에 ${name}(${b.branch_slug}) 없음`); continue; }
    const cur = arr[i]; const next = {};
    for (const k of Object.keys(cur)) next[k] = (k in GRADE_FIELDS) ? ((b.grades_by_subject || {})[GRADE_FIELDS[k]] || '') : cur[k];
    for (const k of Object.keys(next)) if (next[k] !== cur[k]) lines.push(`  ${name}.${k}: ${JSON.stringify(cur[k])} → ${JSON.stringify(next[k])}`);
    arr[i] = next;
  }
  return lines;
}
function doArrayFile(file, startRe) {
  const s = fs.readFileSync(file, 'utf8');
  let a; if (startRe) { const m = startRe.exec(s); if (!m) throw new Error('BRANCHES 없음: ' + file); a = m.index + m[0].length - 1; } else a = s.indexOf('[');
  const b = s.indexOf('];', a);
  const arr = JSON.parse(s.slice(a, b + 1));
  if (dumpsArr(arr) !== s.slice(a, b + 1)) throw new Error('형식이 예상과 다름: ' + file);
  const lines = patchArray(arr, path.relative(GROUP, file));
  console.log(`${path.relative(GROUP, file)}: 차이 ${lines.length}건`); if (lines.length) console.log(lines.join('\n'));
  if (WRITE && lines.length) { fs.writeFileSync(file, s.slice(0, a) + dumpsArr(arr) + s.slice(b + 1), 'utf8'); console.log('  → 다시 씀'); }
}

// ---- 페이지 (branch_changes_2026-10-27.cjs 의 학년 부분) ----
const out = new Map(); const crlf = new Set(); const warns = [];
function read(f) {
  if (out.has(f)) return out.get(f);
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes('\r\n')) { crlf.add(f); return s.replace(/\r\n/g, '\n'); }
  return s;
}
function save(f, html, orig) { if (html !== orig) out.set(f, html); }
function writeOut(f, html) { fs.writeFileSync(f, crlf.has(f) ? html.replace(/\n/g, '\r\n') : html, 'utf8'); }
const rel = f => path.relative(ROOT, f).split(path.sep).join('/');
const warn = m => { warns.push(m); console.log('  [확인] ' + m); };
function replaceOnce(h, re, fn, what, f) {
  let n = 0; const r = h.replace(re, (...a) => { n++; return fn(...a); });
  if (!n) warn(`${what} 못 찾음: ${rel(f)}`);
  return r;
}

function editBranchPage(b) {
  const f = path.join(ROOT, b.region_slug, b.district_slug, b.branch_slug, 'index.html');
  const orig = read(f); let h = orig;
  if (!h.includes(`<title>와와학습코칭센터 ${b.name} |`)) throw new Error('지점 페이지 제목 불일치: ' + rel(f));
  const subs = subjOf(b);
  const rows = subs.map(s => `<tr><td style="width:80px"><span class="subj-name subj-name-${CLS[s]}">${CARD_ICON[s]} ${s}</span></td><td><div class="grade-chips">` +
    gradesOf(b, s).map(g => `<span class="grade-chip grade-chip-${LEVEL(g)}">${g}</span>`).join('') + '</div></td></tr>').join('');
  h = replaceOnce(h, /<table class="subj-grade-table">[\s\S]*?<\/table>/, () =>
    `<table class="subj-grade-table">\n  <thead><tr><th>과목</th><th>수강 가능 학년</th></tr></thead>\n  <tbody>${rows}</tbody>\n</table>`, '과목·학년 표', f);
  save(f, h, orig);
}

function editHub(r, d, dong) {
  const f = path.join(ROOT, r, d, 'dong', dong, 'index.html');
  if (!fs.existsSync(f)) { warn(`동 허브 없음 ${r}/${d}/${dong}`); return; }
  const bs = inDong(r, d, dong);
  const G = rangeStr(bs.flatMap(b => subjOf(b).flatMap(s => gradesOf(b, s))));
  const orig = read(f); let h = orig; let n = 0;
  h = h.replace(/(<meta (?:name="description"|property="og:description") content=")([^"]*)(")/g, (m, a, c, z) => {
    if (G && RANGE_RE.test(c)) { n++; c = c.replace(RANGE_RE, G); }
    if (c.length > 80) warn(`설명문 ${c.length}자: ${rel(f)}`);
    return a + c + z;
  });
  if (n !== 2) warn(`허브 설명문 학년 범위 ${n}곳: ${rel(f)}`);
  save(f, h, orig);
  return bs;
}

function editSubjectPage(f, r, d, dong, subj, bs) {
  const Bx = bs.filter(b => b.subjects.includes(subj));
  const grades = sortG(Bx.flatMap(b => gradesOf(b, subj)));
  const G = rangeStr(grades);
  const orig = read(f); let h = orig;
  const hi = h.indexOf('</head>');
  h = h.slice(0, hi).replace(RANGE_RE, G) + h.slice(hi);
  h = h.replace(/<strong>[초중고]\d~[초중고]\d<\/strong>/g, `<strong>${G}</strong>`);
  h = h.replace(/[초중고]\d~[초중고]\d(?:을|를) 대상으로/g, `${G}${eul(G)} 대상으로`);
  h = replaceOnce(h, new RegExp('(<div class="info-icon">)([^<]*)(</div>\\s*<div class="info-content">\\s*<div class="info-label">' + subj + ' 수업 가능 학년</div>\\s*<div class="info-value">)([^<]*)(</div>)'),
    (m, a, icon, mid, list, z) => a + CHIP_ICON[subj] + mid + grades.join(' · ') + z, '과목 학년 줄', f);
  const left = (h.replace(/<a href="\.\.\/(?:korean|english|math|science|social)\/"[^>]*>[^<]*<\/a>/g, '').match(RANGE_RE) || []).filter(x => x !== G);
  if (left.length) warn(`다른 학년 범위 ${[...new Set(left)].join(',')} 남음: ${rel(f)}`);
  save(f, h, orig);
}

function editSubjectPages(r, d, dong, bs) {
  const dir = path.join(ROOT, r, d, 'dong', dong);
  for (const sl of SLUG_ORDER) {
    const subj = SUBJ_OF[sl]; const f = path.join(dir, sl, 'index.html');
    if (!fs.existsSync(f) || read(f).includes('페이지 이동 안내')) continue;
    if (!bs.some(b => b.subjects.includes(subj))) { warn(`과목이 없는데 페이지가 있음(그대로 둠): ${rel(f)}`); continue; }
    editSubjectPage(f, r, d, dong, subj, bs);
  }
}

// ---- 실행 ----
doArrayFile(path.join(ROOT, 'branches.js'));
doArrayFile(path.join(WAWA, 'branches.js'));
doArrayFile(path.join(WAWA, 'assets', 'main.js'), /var BRANCHES = \[/);

const dongs = new Map();
for (const name of CHANGED) {
  const b = base[name]; if (!b) throw new Error('기준본에 없음 ' + name);
  console.log(`\n## ${name} (${b.region_slug}/${b.district_slug}/${b.branch_slug}, ${b.dong}) ` + subjOf(b).map(s => `${s} ${rangeStr(gradesOf(b, s))}`).join(' · '));
  editBranchPage(b);
  dongs.set(`${b.region_slug}/${b.district_slug}/${b.dong}`, b);
}
for (const [key, b] of dongs) {
  console.log(`## 동 ${key} (지점 ${inDong(b.region_slug, b.district_slug, b.dong).map(x => x.name).join('·')})`);
  const bs = editHub(b.region_slug, b.district_slug, b.dong);
  if (bs) editSubjectPages(b.region_slug, b.district_slug, b.dong, bs);
}
console.log(`\n페이지 수정 ${out.size}장 · 확인 ${warns.length}건`);
for (const f of out.keys()) console.log('  ' + rel(f));
if (WRITE) { for (const [f, h] of out) writeOut(f, h); console.log('→ 썼습니다'); }
else console.log('--write 를 붙이면 씁니다.');
