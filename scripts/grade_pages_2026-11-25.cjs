#!/usr/bin/env node
// 2026-11-25 기준본 자료 변경 3건을 페이지에 옮긴다(사장님 11-25 — 기준본 wstudycenter.com/data/branches.json 에서 읽는다).
//   - 관평점 국어 학년 초1~초5·중2·중3 → 초1~중3(빠진 초6·중1 채움), 이곡점 과학 초1~고1 → 초2~고1(초1 뺌)
//     · 지점 페이지 '수강 가능 과목 · 학년' 표: 바뀐 과목 줄의 학년 칩만(줄 순서·다른 줄은 그대로)
//     · 그 지점 동의 동×과목 페이지(바뀐 과목만): 학년 범위(head 의 설명문·JSON-LD, 첫 화면 <strong>, '…을 대상으로')와
//       '{과목} 수업 가능 학년' 줄. 범위는 그 동에서 그 과목을 여는 지점들의 합집합(10-27 scripts/grade_high3_2026-10-27.cjs 와 같은 방식)
//   - 주엽점 주말 칸 '수학 과학 / 토요일' → '수학 / 토요일': 지점 페이지 '주말수업' 줄
//   그 밖의 칸(지점 소개 문단은 scripts/strengths_2026-10-27.cjs, '학년별 맞춤 프로그램' 칸은 scripts/grade_block_2026-11-24.cjs,
//   동 허브 설명문의 학년 범위는 scripts/hub_text_2026-11-25.cjs, 지점 아래 문단 범위는 scripts/branch_text_2026-11-25.cjs)가 맡는다.
//   바뀐 페이지만 page-updated(data-iso·최종 업데이트)를 TODAY 로. 사이트맵 lastmod 는 따로 맞춘다(scripts/_README.md).
//   이미 맞으면 바꾸지 않으므로 다시 돌리면 0장이다.
// 2026-11-27: 기준본에서 신곡점 사회(초5 채움)·별가람점 국어·영어(고2 채움)가 더 바뀌어 아래 표에 더했다(사장님 11-25 "신곡점·별가람점도
//   관평점처럼 채워줘"). 지점이 여럿인 동(별가람점의 별내동)의 동×과목 페이지는 여기서 건드리지 않고 subject_text_2026-11-25.cjs 에 맡긴다.
// 사용: node scripts/grade_pages_2026-11-25.cjs [--write]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BRANCH_SRC || path.join(ROOT, '..', 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');
const TODAY = '2026-11-27'; // 11-25 에 고쳐 11-27 에 배포 — 페이지 수정일은 배포일

// 이날 바뀐 지점과 칸(값은 기준본에서 읽는다)
const CHANGED = {
  관평점: { grades: ['국어'] }, 이곡점: { grades: ['과학'] }, 주엽점: { weekend: true },
  // 2026-11-27 에 더 바뀐 칸: 신곡점 사회에 초5, 별가람점 국어·영어에 고2 채움
  신곡점: { grades: ['사회'] }, 별가람점: { grades: ['국어', '영어'] },
};

const base = JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, ''));
const BR = Object.values(base);
const SEQ = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
const SLUG = { 국어: 'korean', 영어: 'english', 수학: 'math', 과학: 'science', 사회: 'social' };
const CLS = { 국어: 'kor', 영어: 'eng', 수학: 'math', 과학: 'sci', 사회: 'soc' };
const CARD_ICON = { 국어: '📖', 영어: '🔤', 수학: '🔢', 과학: '🔬', 사회: '🌏' };
const LEVEL = (g) => (g[0] === '초' ? 'elem' : g[0] === '중' ? 'mid' : 'high');
const RANGE = '[초중고]\\d~[초중고]\\d';
const gradesOf = (b, s) => ((b.grades_by_subject || {})[s] || '').split(',').map((x) => x.trim()).filter(Boolean);
const sortG = (arr) => [...new Set(arr)].sort((a, c) => SEQ.indexOf(a) - SEQ.indexOf(c));
const rangeStr = (arr) => { const g = sortG(arr); return !g.length ? null : g[0] === g[g.length - 1] ? g[0] : `${g[0]}~${g[g.length - 1]}`; };
const eul = (s) => (/[1368]$/.test(s) ? '을' : '를'); // 일·삼·육·팔 받침 → 을
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fail = (m) => { throw new Error(m); };

const out = new Map(); const crlf = new Set(); const warns = []; const notes = [];
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
function read(f) {
  if (out.has(f)) return out.get(f);
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes('\r\n')) { crlf.add(f); return s.replace(/\r\n/g, '\n'); }
  return s;
}
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
function save(f, h, orig, what) { if (h !== orig) { out.set(f, bumpDate(h, rel(f))); notes.push(`${rel(f)}  ${what}`); } }

// 1. 지점 페이지 과목·학년 표의 바뀐 과목 줄
function branchRow(b, s) {
  const f = path.join(ROOT, b.region_slug, b.district_slug, b.branch_slug, 'index.html');
  const orig = read(f);
  if (!orig.includes(`<title>와와학습코칭센터 ${b.name.replace(/\(.*\)$/, '')} |`) && !orig.includes(`<title>와와학습코칭센터 ${b.name} |`)) fail('지점 페이지 제목 불일치: ' + rel(f));
  const chips = gradesOf(b, s).map((g) => `<span class="grade-chip grade-chip-${LEVEL(g)}">${g}</span>`).join('');
  const re = new RegExp(`(<tr><td style="width:80px"><span class="subj-name subj-name-${CLS[s]}">${CARD_ICON[s]} ${s}</span></td><td><div class="grade-chips">)((?:<span class="grade-chip grade-chip-(?:elem|mid|high)">[^<]*</span>)*)(</div></td></tr>)`);
  const h = one(orig, re, (m, a, old, z) => a + chips + z, `과목·학년 표 ${s} 줄 ${rel(f)}`);
  save(f, h, orig, `표 ${s} 줄 → ${gradesOf(b, s).join(',')}`);
}

// 2. 그 동의 동×과목 페이지(바뀐 과목)
function subjectPage(b, s) {
  const f = path.join(ROOT, b.region_slug, b.district_slug, 'dong', b.dong, SLUG[s], 'index.html');
  if (!fs.existsSync(f)) { warns.push(`동×과목 페이지 없음: ${rel(f)}`); return; }
  const orig = read(f);
  if (orig.includes('페이지 이동 안내')) { warns.push(`이동 안내라 그대로: ${rel(f)}`); return; }
  const inDong = BR.filter((x) => x.region_slug === b.region_slug && x.district_slug === b.district_slug && x.dong === b.dong && (x.subjects || []).includes(s));
  const cards = [...orig.matchAll(/<a href="\.\.\/\.\.\/\.\.\/([a-z0-9-]+)\/"/g)].map((m) => m[1]);
  // 지점이 여럿인 동(별내동 등)은 여기서 손대지 않는다. 그런 페이지는 대표 지점 이름을 든 자리가 그 지점 범위, 동 단위 칸이 카드 지점
  //   합집합이라 범위 글자가 둘이고, scripts/subject_text_2026-11-25.cjs ③이 기준본에서 둘 다 다시 맞춘다(2026-11-27 별가람점 때 넣음).
  if (inDong.length !== 1 || (cards.length && cards.some((c) => c !== b.branch_slug))) { warns.push(`지점이 여럿인 페이지 — 여기서는 그대로, subject_text_2026-11-25.cjs 가 맞춤(카드 ${[...new Set(cards)].join(',')}): ${rel(f)}`); return; }
  const grades = sortG(inDong.flatMap((x) => gradesOf(x, s)));
  const G = rangeStr(grades);
  let h = orig;
  // 학년 범위: 페이지에 있는 범위 글자는 모두 같은 값이어야 한다(그 값을 새 값으로)
  const hi = h.indexOf('</head>');
  const found = new Set([...h.slice(0, hi).matchAll(new RegExp(RANGE, 'g'))].map((m) => m[0])
    .concat([...h.matchAll(new RegExp(`<strong>(${RANGE})</strong>`, 'g'))].map((m) => m[1]))
    .concat([...h.matchAll(new RegExp(`(${RANGE})(?:을|를) 대상으로`, 'g'))].map((m) => m[1])));
  if (found.size !== 1) fail(`범위 글자가 하나가 아님 ${[...found].join(',')}: ${rel(f)}`);
  const old = [...found][0];
  if (old !== G) {
    h = h.slice(0, hi).split(old).join(G) + h.slice(hi);
    h = h.split(`<strong>${old}</strong>`).join(`<strong>${G}</strong>`);
    h = h.replace(new RegExp(`${esc(old)}(?:을|를) 대상으로`, 'g'), `${G}${eul(G)} 대상으로`);
    const left = h.replace(/<a href="\.\.\/(?:korean|english|math|science|social)\/"[^>]*>[^<]*<\/a>/g, '').split(old).length - 1;
    if (left) warns.push(`옛 범위 ${old} ${left}곳 남음: ${rel(f)}`);
  }
  // 학년 줄
  h = one(h, new RegExp(`(<div class="info-label">${s} 수업 가능 학년</div>\\s*<div class="info-value">)([^<]*)(</div>)`), (m, a, list, z) => a + grades.join(' · ') + z, `학년 줄 ${rel(f)}`);
  // 학교급이 바뀌면(초·중·고 유무) 수강료 표·학교 목록도 손봐야 한다 — 이번 변경은 학교급이 그대로라 알리기만
  const lv = (arr) => [...new Set(arr.map(LEVEL))].sort().join(',');
  const oldList = (orig.match(new RegExp(`<div class="info-label">${s} 수업 가능 학년</div>\\s*<div class="info-value">([^<]*)</div>`)) || [])[1] || '';
  if (lv(oldList.split(' · ').filter(Boolean)) !== lv(grades)) warns.push(`학교급이 바뀜 — 수강료 표·학교 목록 확인: ${rel(f)}`);
  save(f, h, orig, `${s} 범위 ${old} → ${G}, 학년 줄 ${grades.join('·')}`);
}

// 3. 지점 페이지 주말수업 줄
function weekendRow(b) {
  const f = path.join(ROOT, b.region_slug, b.district_slug, b.branch_slug, 'index.html');
  const orig = read(f);
  if (!b.weekend || b.weekend === '주말불가') fail(`주말 칸이 없거나 주말불가 — 줄을 지울지 따로 볼 것: ${b.name}`);
  const h = one(orig, /(<div class="info-label">주말수업<\/div><div class="info-value">)([^<]*)(<\/div>)/, (m, a, old, z) => a + b.weekend + z, `주말수업 줄 ${rel(f)}`);
  save(f, h, orig, `주말수업 → ${b.weekend}`);
}

for (const [name, c] of Object.entries(CHANGED)) {
  const b = base[name] || fail('기준본에 없음 ' + name);
  for (const s of c.grades || []) { branchRow(b, s); subjectPage(b, s); }
  if (c.weekend) weekendRow(b);
}
console.log(`바뀔 페이지 ${out.size}장`);
for (const n of notes) console.log('  ' + n);
if (warns.length) { console.log(`\n확인 ${warns.length}건:`); for (const w of warns) console.log('  ' + w); }
if (WRITE) {
  for (const [f, h] of out) fs.writeFileSync(f, crlf.has(f) ? h.replace(/\n/g, '\r\n') : h, 'utf8');
  console.log(`\n→ ${out.size}개 파일을 썼습니다.`);
} else console.log('\n--write 를 붙이면 씁니다.');
