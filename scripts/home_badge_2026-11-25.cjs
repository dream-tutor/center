#!/usr/bin/env node
// 2026-11-25 홈 '전국 지점 찾기' 카드의 더블유플러스(W+) 배지를 지점 자료로 만든다(사장님 11-25 "최대한 보수적으로" — 배지 글자만).
//   왜: index.html 의 카드 그리기 스크립트가 이름에 'W+'가 들기만 하면 '🔢 수학·과학 전문'을 붙였다. 은평점(W+)은 수학만 열어
//   (branches.js grade_sci 빈 값, 교육청 명칭 '은평점더블유플러스수학보습학원') 시도 페이지의 '은평점(W+) (수학 전문)'과도 어긋났다.
//   무엇을: 배지 글자를 그 카드 지점의 branches.js 학년 칸(grade_math·grade_sci)에서 만든다 — 수학·과학을 다 열면 그대로
//   '수학·과학 전문', 하나만 열면 '수학 전문'. 글로리드 '국어 전문' 배지(두 지점 모두 국어를 연다)와 배지 모양은 그대로.
//   바뀌면 홈 page-updated 를 TODAY 로. 사이트맵 lastmod 는 따로 맞춘다(scripts/_README.md). 다시 돌리면 0장.
// 사용: node scripts/home_badge_2026-11-25.cjs [--write]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const TODAY = '2026-11-27'; // 11-25 에 고쳐 11-27 에 배포 — 페이지 수정일은 배포일
const f = path.join(ROOT, 'index.html');

const OLD = `      + (b.name.indexOf('W+') >= 0 ? '<span class="bc-badge bc-badge-math">🔢 수학·과학 전문</span>' : '')`;
const NEW = `      + (b.name.indexOf('W+') >= 0 && (b.grade_math || b.grade_sci) ? '<span class="bc-badge bc-badge-math">🔢 ' + [b.grade_math ? '수학' : '', b.grade_sci ? '과학' : ''].filter(Boolean).join('·') + ' 전문</span>' : '')`;
const fail = (m) => { throw new Error(m); };
function one(h, re, fn, what) { let n = 0; const r = h.replace(re, (...a) => { n++; return fn(...a); }); if (n !== 1) fail(`${what}: ${n}곳`); return r; }

const raw = fs.readFileSync(f, 'utf8');
const crlf = raw.includes('\r\n');
let h = crlf ? raw.replace(/\r\n/g, '\n') : raw;
if (h.includes(NEW)) { console.log('이미 고침 — 0장'); process.exit(0); }
if (h.split(OLD).length !== 2) fail('W+ 배지 줄을 한 곳에서 찾지 못함');
h = h.replace(OLD, () => NEW);
h = one(h, /(<div class="page-updated" data-iso=")\d{4}-\d{2}-\d{2}(")/, (x, a, z) => a + TODAY + z, 'data-iso');
h = one(h, /📅 최종 업데이트: \d{4}\.\d{2}\.\d{2}/, () => `📅 최종 업데이트: ${TODAY.replace(/-/g, '.')}`, '최종 업데이트');

// 자료로 미리 보기: 배지가 붙는 지점과 글자
const src = fs.readFileSync(path.join(ROOT, 'branches.js'), 'utf8');
const arr = JSON.parse(src.slice(src.indexOf('['), src.indexOf('];') + 1));
for (const b of arr.filter((x) => x.name.indexOf('W+') >= 0)) {
  const t = b.grade_math || b.grade_sci ? [b.grade_math ? '수학' : '', b.grade_sci ? '과학' : ''].filter(Boolean).join('·') + ' 전문' : '(배지 없음)';
  console.log(`  ${b.name}: ${t}`);
}
console.log('홈 index.html W+ 배지 → 자료로');
if (WRITE) { fs.writeFileSync(f, crlf ? h.replace(/\n/g, '\r\n') : h, 'utf8'); console.log('→ 썼습니다'); }
else console.log('--write 를 붙이면 씁니다.');
