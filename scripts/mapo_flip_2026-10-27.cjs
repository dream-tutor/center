#!/usr/bin/env node
// 2026-10-27 마포2호점 → 마포점 (사장님 10-27 결정: 통합 뒤 이름은 마포점, 교육지원청 명칭·등록번호는 그대로)
// 10-15 에 마포점(mapo) 주소를 마포2호점(mapo2ho)으로 보내는 이동 안내로 바꿔 두었던 것을 뒤집는다.
//   - seoul/mapo/mapo2ho/index.html(지금의 본문) → seoul/mapo/mapo/index.html 로 옮기며 이름을 마포점으로
//     (제목·h1·JSON-LD·브레드크럼·신청 지점·CTA, canonical 자기 자신). 등록 명칭 '마포2호점와와학습코칭학원' 은 그대로.
//   - seoul/mapo/mapo2ho/index.html 은 /seoul/mapo/mapo/ 로 가는 noindex 이동 안내(10-15 와 같은 틀)
//   - 마포2호점을 이름·주소로 가리키던 페이지(시도·시군구 카드, 동 허브·동×과목, 상암점, 학교 페이지, 숭문중 이동 안내)의
//     글자 '마포2호점' → '마포점', 주소 'mapo2ho/' → 'mapo/'
// 10-15 이전 마포점 본문(염리동 주소)은 되살리지 않는다.
// 사용: node scripts/mapo_flip_2026-10-27.cjs [--write]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const REG_NAME = '마포2호점와와학습코칭학원';
const PH = '\u0000REGNAME\u0000';

function rename(html) {
  const before = html;
  html = html.split(REG_NAME).join(PH);
  html = html.split('마포2호점').join('마포점');
  html = html.replace(/mapo2ho\//g, 'mapo/');
  html = html.split(PH).join(REG_NAME);
  return { html, changed: html !== before };
}

function walk(d, out) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'assets' || e.name === 'scripts') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name === 'index.html') out.push(p);
  }
  return out;
}

const mapoDir = path.join(ROOT, 'seoul', 'mapo');
const srcFull = path.join(mapoDir, 'mapo2ho', 'index.html');
const dstFull = path.join(mapoDir, 'mapo', 'index.html');
const full = fs.readFileSync(srcFull, 'utf8');
if (!full.includes('<title>와와학습코칭센터 마포2호점')) throw new Error('mapo2ho 가 본문 페이지가 아님');
if (!fs.readFileSync(dstFull, 'utf8').includes('페이지 이동 안내')) throw new Error('mapo 가 이동 안내가 아님');

const page = rename(full).html;
// 확인: 등록 명칭은 남고, 그 밖의 마포2호점·mapo2ho 는 없어야 한다
const rest = page.split(REG_NAME).join('');
if (rest.includes('마포2호점') || rest.includes('mapo2ho')) throw new Error('마포점 페이지에 옛 이름이 남음');
if (!page.includes('<link rel="canonical" href="https://wcoachingcenter.com/seoul/mapo/mapo/">')) throw new Error('canonical 확인 실패');
if (!page.includes('<input type="hidden" name="지점" value="마포점">')) throw new Error('신청 지점 확인 실패');
if (!page.includes('<span>' + REG_NAME + '(서울특별시 서부교육지원청 제02202300102호)</span>')) throw new Error('등록 명칭 확인 실패');

const stub = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>페이지 이동 안내</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="https://wcoachingcenter.com/seoul/mapo/mapo/">
<meta http-equiv="refresh" content="0; url=https://wcoachingcenter.com/seoul/mapo/mapo/">
<script>location.replace("https://wcoachingcenter.com/seoul/mapo/mapo/");</script>
</head>
<body>
<p>페이지 주소가 변경되었습니다. <a href="https://wcoachingcenter.com/seoul/mapo/mapo/">이동하기</a></p>
</body>
</html>
`;

const others = [];
for (const f of walk(ROOT, [])) {
  if (f === srcFull || f === dstFull) continue;
  const h = fs.readFileSync(f, 'utf8');
  if (!h.includes('마포2호점') && !h.includes('mapo2ho')) continue;
  const r = rename(h);
  const rest2 = r.html.split(REG_NAME).join('');
  if (rest2.includes('마포2호점') || rest2.includes('mapo2ho')) throw new Error('옛 이름 남음: ' + f);
  others.push([f, r.html]);
}

console.log(`마포점 본문: ${path.relative(ROOT, dstFull)} (${page.length}자) / 이동 안내: ${path.relative(ROOT, srcFull)}`);
console.log(`그 밖에 고치는 페이지 ${others.length}장:`);
for (const [f] of others) console.log('  ' + path.relative(ROOT, f));
if (WRITE) {
  fs.writeFileSync(dstFull, page, 'utf8');
  fs.writeFileSync(srcFull, stub, 'utf8');
  for (const [f, h] of others) fs.writeFileSync(f, h, 'utf8');
  console.log('→ 썼습니다');
} else console.log('--write 를 붙이면 씁니다.');
