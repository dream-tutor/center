#!/usr/bin/env node
// 2026-10-28 — 상담 폼 동의 상세 둘째 details('받는 곳·제공 항목 보기')의 '제공 항목' 줄을 성별·학부모 연락처에 맞춘다.
//   같은 날 form_gender_2026-10-28.cjs(0da9fc82e)가 성별 칸·'학부모 연락처' 라벨·첫 details 의 '수집 항목' 문구는 바꿨는데
//   둘째 details 의 '제공 항목' 줄은 옛 글자 그대로 남아 있었다 — 그 한 줄만 고친다.
//     <b>제공 항목</b>: 학생 이름, 연락처, 거주 주소, 학년, 희망 과목, 학교 이름(적은 경우)
//   → <b>제공 항목</b>: 학생 이름, 성별(적은 경우), 학부모 연락처, 거주 주소, 학년, 희망 과목, 학교 이름(적은 경우)
//   폼마다 정확히 한 번씩(폼이 박힌 index.html 2,296장 = <select class="form-input" name="연락처앞"> 가 있는 것 전부. 홈만 폼이 2개라 2번).
//   치환 수가 폼 수와 다르면 그 페이지를 보고하고 아무것도 쓰지 않는다. data-iso·날짜는 건드리지 않는다(사이트맵 변동 0).
//   줄끝(CRLF)은 원래대로 보존한다. 쌍둥이 저장소 와와(wawacenter.kr)는 옛 도메인(301)이라 손대지 않는다 — 생성기 틀(form_privacy.py)만 같은 글자로 맞췄다.
// 사용: node scripts/form_provide_items_2026-10-28.cjs          → 차이만 세어 보여 준다
//       node scripts/form_provide_items_2026-10-28.cjs --write  → 파일을 다시 쓴다
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');            // center(wcoachingcenter.com)
const WRITE = process.argv.includes('--write');
const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', 'scripts', 'assets']);
const FORM_RE = /<select class="form-input" name="연락처앞"/g;   // 폼 하나에 하나 — 페이지의 폼 수

const RULES = [
  { // 동의 상세 둘째 details — 제공 항목 줄
    what: '동의 상세 제공 항목',
    re: /<b>제공 항목<\/b>: 학생 이름, 연락처, 거주 주소, 학년, 희망 과목, 학교 이름\(적은 경우\)<br>/g,
    to: () => '<b>제공 항목</b>: 학생 이름, 성별(적은 경우), 학부모 연락처, 거주 주소, 학년, 희망 과목, 학교 이름(적은 경우)<br>',
    done: /<b>제공 항목<\/b>: 학생 이름, 성별\(적은 경우\), 학부모 연락처, 거주 주소, 학년, 희망 과목, 학교 이름\(적은 경우\)<br>/g,
  },
];

// ---- 파일 ----
const rel = f => path.relative(ROOT, f).split(path.sep).join('/');
const count = (s, re) => { re.lastIndex = 0; let n = 0; while (re.exec(s)) n++; re.lastIndex = 0; return n; };
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) yield* walk(path.join(dir, e.name)); }
    else if (e.name === 'index.html') yield path.join(dir, e.name);
  }
}

const problems = [];                 // [파일, 설명]
const out = new Map();               // 파일 → 새 내용(LF)
const crlf = new Set();
const multi = [];                    // 폼이 둘 이상인 페이지(홈)
let pages = 0, already = 0;

function apply(f, raw, rules, expected) {
  let h = raw;
  if (h.includes('\r\n')) { crlf.add(f); h = h.replace(/\r\n/g, '\n'); }
  const orig = h;
  if (rules.every(r => count(h, r.done) === expected && count(h, r.re) === 0)) { already++; return; }   // 이미 반영된 페이지(다시 돌려도 안전)
  for (const r of rules) {
    const n = count(h, r.re);
    if (n !== expected) { problems.push([f, `${r.what} 치환 ${n}건 (폼 ${expected}개, 이미 반영 ${count(h, r.done)})`]); continue; }
    h = h.replace(r.re, r.to);
    if (count(h, r.done) !== expected) problems.push([f, `${r.what} 치환 뒤 확인 실패`]);
  }
  if (h !== orig) out.set(f, h);
}

for (const f of walk(ROOT)) {
  const s = fs.readFileSync(f, 'utf8');
  const forms = count(s, FORM_RE);
  if (!forms) continue;
  pages++;
  if (forms > 1) multi.push(`${rel(f)} (폼 ${forms}개)`);
  apply(f, s, RULES, forms);
}

console.log(`폼 페이지 ${pages}장 (이미 반영 ${already}, 폼 둘 이상: ${multi.join(', ') || '없음'}) → 바뀔 파일 ${out.size}`);
if (problems.length) {
  console.log(`\n[멈춤] 치환 수가 폼 수와 다른 곳 ${problems.length}건 — 아무것도 쓰지 않았습니다.`);
  for (const [f, why] of problems.slice(0, 50)) console.log(`  ${rel(f)}: ${why}`);
  if (problems.length > 50) console.log(`  … 외 ${problems.length - 50}건`);
  process.exit(1);
}
if (WRITE) {
  for (const [f, h] of out) fs.writeFileSync(f, crlf.has(f) ? h.replace(/\n/g, '\r\n') : h, 'utf8');
  console.log(`→ ${out.size}개 파일을 다시 썼습니다 (CRLF 보존 ${[...out.keys()].filter(f => crlf.has(f)).length}).`);
} else {
  const sample = [...out.keys()].slice(0, 3).map(rel);
  console.log(`예: ${sample.join(' · ')}`);
  console.log('--write 를 붙이면 씁니다.');
}
