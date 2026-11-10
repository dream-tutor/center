#!/usr/bin/env node
// 2026-11-10 점검(wawa-A-2) 이어서: hub_coords_2026-11-10.cjs 가 고친 봉담읍·교동·영천동·둔산동 말고도, 동 허브 18장의
//   지점 칸 19개가 같은 결함 — 화면 주소 글자와 그 지점 JSON-LD streetAddress 가 옛 건물(또는 같은 동 W+ 지점 건물)을
//   가리키고, 같은 페이지의 지도·카카오맵 길찾기와 지점 페이지(JSON-LD·위치 안내)만 기준본과 맞았다.
//   예: 노형동 '과원북4길 39 보성빌딩'(08-31 이전 전 주소, 기준본 27), 오산동 '운암로 35 한진프라자'(기준본 성호대로 121),
//   화정동·풍덕천동·송도동은 화정점·수지점·송도점 칸에 같은 동 W+ 지점의 위치 안내·주소가 들어가 있었다.
// 값은 기준본(wstudycenter.com/data/branches.json)에서 읽고, 파일·지점을 정해 고친다(주소 값으로 일괄 치환하지 않는다 —
//   길주로 219·화중로 32-31·진산로 106·해돋이로 160-6 은 같은 페이지 W+ 지점에서는 맞는 주소다).
//   - 일반 칸: 기준본 주소(끝의 학원 이름 뺌) / 📌 꼴 칸: 지점 페이지 '📌 …<br>주소' 위치 안내 그대로
//   - 허브 JSON-LD 의 그 지점 streetAddress: 기준본 주소(지점 페이지 JSON-LD 와 같은 값)
// 지번만 다른 칸(가경동 '1841번지', 불당동 '1619' 등)은 같은 건물일 수 있어 여기서 고치지 않는다.
// 이미 고쳐진 칸은 건너뛰고, 바뀐 페이지만 page-updated(data-iso·최종 업데이트)와 sitemap.xml lastmod 를 오늘로 올린다
//   (다시 돌리면 바뀌는 페이지 0장).
// 사용: node scripts/hub_addr_2026-11-10.cjs [--write]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BRANCH_SRC || path.join(ROOT, '..', 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');
const TODAY = '2026-11-10';
const DOMAIN = 'https://wcoachingcenter.com/';
const base = JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, ''));

// [허브, 지점] — 11-10 검토에서 대조한 19칸
const CELLS = [
  ['jeju/jeju-si/dong/노형동', '노형점'],
  ['seoul/nowon/dong/하계동', '하계점'],
  ['gyeonggi/osan/dong/오산동', '오산점'],
  ['gyeonggi/anyang/dong/비산동', '비산점'],
  ['gyeonggi/bucheon/dong/상동', '상동점'],
  ['gyeonggi/bucheon/dong/중동', '중동점'],
  ['gyeonggi/bucheon/dong/중동', '신중동점'],
  ['gyeonggi/guri/dong/인창동', '인창점'],
  ['gyeonggi/suwon/dong/천천동', '천천점'],
  ['seoul/dongdaemun/dong/용두동', '제기점'],
  ['seoul/seongbuk/dong/동소문동', '동소문점'],
  ['ulsan/namgu/dong/삼산동', '삼산점'],
  ['gyeonggi/goyang/dong/신원동', '삼송점'],
  ['gyeonggi/goyang/dong/원흥동', '원흥점'],
  ['gyeonggi/gimpo/dong/장기동', '장기점'],
  ['jeonbuk/jeonju/dong/송천동', '송천점'],
  ['gyeonggi/goyang/dong/화정동', '화정점'],     // 📌 칸 — 화정점(W+) 위치 안내가 들어가 있었다
  ['gyeonggi/yongin/dong/풍덕천동', '수지점'],   // 📌 칸 — 수지점(W+)
  ['incheon/yeonsu/dong/송도동', '송도점'],      // 📌 칸 — 송도점(W+)
];

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fail = m => { throw new Error(m); };
function one(h, re, fn, what) {
  let n = 0; const r = h.replace(re, (...a) => { n++; return fn(...a); });
  if (n !== 1) fail(`${what}: ${n}곳`);
  return r;
}
function bumpDate(h) {
  return one(one(h, /(<div class="page-updated" data-iso=")\d{4}-\d{2}-\d{2}(")/, (x, a, z) => a + TODAY + z, 'data-iso'),
    /📅 최종 업데이트: \d{4}\.\d{2}\.\d{2}/, () => `📅 최종 업데이트: ${TODAY.replace(/-/g, '.')}`, '최종 업데이트');
}
const pagePath = b => path.join(ROOT, b.region_slug, b.district_slug, b.branch_slug, 'index.html');
const shortAddr = a => a.replace(/\s*(와와학습코칭학원|와와학습코칭센터|모두오름학습코칭학원)$/, '');

const byHub = new Map();
for (const [rel, name] of CELLS) {
  if (!byHub.has(rel)) byHub.set(rel, []);
  byHub.get(rel).push(name);
}
const out = [];
for (const [rel, names] of byHub) {
  const f = path.join(ROOT, rel, 'index.html');
  const orig = fs.readFileSync(f, 'utf8'); let h = orig;
  const notes = [];
  for (const name of names) {
    const b = base[name] || fail('기준본에 없음 ' + name);
    if (`${b.region_slug}/${b.district_slug}/dong/${b.dong}` !== rel) fail(`허브와 지점 동이 다름: ${rel} ${name}`);
    // 지점 페이지가 기준본과 맞는지(맞는 쪽을 허브로 옮긴다)
    const bp = fs.readFileSync(pagePath(b), 'utf8');
    const bld = (bp.match(/"streetAddress": "([^"]*)"/) || fail('지점 JSON-LD 주소 없음 ' + name))[1];
    if (bld !== b.address) fail(`지점 페이지 JSON-LD 주소가 기준본과 다름: ${name}`);
    const guide = (bp.match(/<div class="branch-location-guide">([^<]*<br>[^<]*)<\/div>/) || fail('위치 안내 없음 ' + name))[1];
    h = one(h, new RegExp('("name": "와와학습코칭센터 ' + esc(name) + '",[\\s\\S]*?"streetAddress": ")([^"]*)(")'), (x, a, c, z) => {
      if (c !== b.address) notes.push(`JSON-LD ${name}: ${c} → ${b.address}`);
      return a + b.address + z;
    }, `허브 JSON-LD 주소 ${rel} ${name}`);
    h = one(h, new RegExp('(<a href="\\.\\./\\.\\./' + esc(b.branch_slug) + '/"[^>]*>→ ' + esc(name) + ' 자세히 보기</a><br><span style="font-size:13px;color:#64748B;">)([^<]*(?:<br>[^<]*)?)(</span>)'), (x, a, c, z) => {
      const v = c.startsWith('📌') ? guide : shortAddr(b.address);
      if (c !== v) notes.push(`칸 ${name}: ${c} → ${v}`);
      return a + v + z;
    }, `허브 지점 칸 ${rel} ${name}`);
  }
  if (h === orig) { console.log(`${rel}: 이미 맞음`); continue; }
  h = bumpDate(h);
  out.push({ f, rel, h, notes });
}
let xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
for (const o of out) {
  const loc = DOMAIN + encodeURI(o.rel) + '/';
  xml = one(xml, new RegExp('(<loc>' + esc(loc) + '</loc>\\s*<lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>)'), (x, a, z) => a + TODAY + z, '사이트맵 ' + loc);
  console.log(o.rel);
  for (const n of o.notes) console.log('   ' + n);
}
console.log(`\n주소 고칠 동 허브 ${out.length}장`);
if (WRITE) {
  for (const o of out) fs.writeFileSync(o.f, o.h, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
  console.log('→ 썼습니다');
} else console.log('--write 를 붙이면 씁니다.');
