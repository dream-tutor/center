#!/usr/bin/env node
// 2026-11-10 점검(wawa-A-2): 동 허브 4장의 지도 좌표·지점 주소와 지점 페이지 4장의 JSON-LD 좌표가 옛 값이었다.
//   - 봉담읍 허브: 지도 핀·적힌 주소·JSON-LD 주소가 동탄호수점(15.7km 떨어진 동탄순환대로 127-19) 것
//   - 교동 허브: 강릉교동점 옛 자리(경강로 2157, 2.2km) / 영천동 허브: 영천점 옛 자리(동탄순환대로 689, 0.15km)
//   - 둔산동 허브: 지도 핀이 둔산점(W+) 자리, 둔산점 칸 주소·JSON-LD 도 둔산점(W+) 것(둔산로 130) — 길찾기는 둔산점(둔산로 142)
//   - 지점 페이지 bongdam·gangleunggyodong·yeongcheon·dunsan: 화면 지도는 맞고 JSON-LD GeoCoordinates 만 옛 값
// 값은 기준본(wstudycenter.com/data/branches.json)에서 읽는다. 좌표 값으로 일괄 치환하지 않는다 — 같은 옛 값이
// 동탄호수점·산척동(3m 차)·둔산점(W+) 페이지에서는 맞는 값이라, 파일과 지점을 정해 고친다.
// 바뀐 페이지만 page-updated(data-iso·최종 업데이트)와 sitemap.xml lastmod 를 오늘로 올린다.
// 사용: node scripts/hub_coords_2026-11-10.cjs [--write]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BRANCH_SRC || path.join(ROOT, '..', 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');
const TODAY = '2026-11-10';
const DOMAIN = 'https://wcoachingcenter.com/';
const base = JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, ''));

// 허브(지도 핀을 둘 지점 = 같은 페이지 '카카오맵 길찾기'가 가리키는 지점) / 고칠 지점 페이지
const HUBS = [
  { rel: 'gyeonggi/hwaseong/dong/봉담읍', branch: '봉담점' },
  { rel: 'gangwon/gangneung/dong/교동', branch: '강릉교동점' },
  { rel: 'gyeonggi/hwaseong/dong/영천동', branch: '영천점' },
  { rel: 'daejeon/seogu/dong/둔산동', branch: '둔산점' },
];
const BRANCH_PAGES = ['봉담점', '강릉교동점', '영천점', '둔산점'];

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
// 지점 페이지의 '📌 …<br>주소' 안내(허브의 📌 꼴 칸에 그대로 쓴다)
const guideOf = b => (fs.readFileSync(pagePath(b), 'utf8').match(/<div class="branch-location-guide">([^<]*<br>[^<]*)<\/div>/) || fail(`위치 안내 없음 ${b.name}`))[1];
const shortAddr = a => a.replace(/\s*(와와학습코칭학원|와와학습코칭센터|모두오름학습코칭학원)$/, '');

const out = [];
for (const hub of HUBS) {
  const b = base[hub.branch] || fail('기준본에 없음 ' + hub.branch);
  const f = path.join(ROOT, hub.rel, 'index.html');
  const orig = fs.readFileSync(f, 'utf8'); let h = orig;
  // 길찾기 링크가 이 지점 좌표인지(지도 핀을 같은 자리에 둔다)
  const kk = h.match(/map\.kakao\.com\/link\/to\/[^,"]*,([\d.]+),([\d.]+)"/) || fail('길찾기 없음 ' + hub.rel);
  if (+kk[1] !== b.lat || +kk[2] !== b.lng) fail(`길찾기 좌표가 기준본 ${hub.branch} 와 다름: ${hub.rel}`);
  h = one(h, /(<div class="wawa-map" data-lat=")[\d.]+(" data-lng=")[\d.]+(")/, (x, a, m, z) => a + b.lat + m + b.lng + z, '허브 지도');
  h = one(h, new RegExp('("name": "와와학습코칭센터 ' + esc(b.name) + '",[\\s\\S]*?"streetAddress": ")([^"]*)(")'), (x, a, c, z) => a + b.address + z, '허브 JSON-LD 주소');
  h = one(h, new RegExp('(<a href="\\.\\./\\.\\./' + esc(b.branch_slug) + '/"[^>]*>→ ' + esc(b.name) + ' 자세히 보기</a><br><span style="font-size:13px;color:#64748B;">)([^<]*(?:<br>[^<]*)?)(</span>)'),
    (x, a, c, z) => a + (c.startsWith('📌') ? guideOf(b) : shortAddr(b.address)) + z, '허브 지점 칸 주소');
  h = bumpDate(h);
  out.push({ f, rel: hub.rel, orig, h });
}
for (const name of BRANCH_PAGES) {
  const b = base[name];
  const f = pagePath(b);
  const orig = fs.readFileSync(f, 'utf8'); let h = orig;
  const mp = h.match(/class="wawa-map" data-lat="([\d.]+)" data-lng="([\d.]+)"/) || fail('지도 없음 ' + name);
  if (+mp[1] !== b.lat || +mp[2] !== b.lng) fail(`화면 지도가 기준본과 다름: ${name}`);
  h = one(h, /("latitude": )[\d.]+(,\s*"longitude": )[\d.]+/, (x, a, m) => a + b.lat + m + b.lng, '지점 JSON-LD 좌표');
  h = bumpDate(h);
  out.push({ f, rel: `${b.region_slug}/${b.district_slug}/${b.branch_slug}`, orig, h });
}
let xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
for (const o of out) {
  const loc = DOMAIN + encodeURI(o.rel) + '/';
  xml = one(xml, new RegExp('(<loc>' + esc(loc) + '</loc>\\s*<lastmod>)\\d{4}-\\d{2}-\\d{2}(</lastmod>)'), (x, a, z) => a + TODAY + z, '사이트맵 ' + loc);
  const diff = o.h.split(/\r?\n/).filter((l, i) => l !== o.orig.split(/\r?\n/)[i]);
  console.log(`${o.rel}: ${diff.length}줄`);
  for (const l of diff) console.log('   + ' + l.trim().slice(0, 160));
}
if (WRITE) {
  for (const o of out) fs.writeFileSync(o.f, o.h, 'utf8');
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
  console.log('→ 썼습니다');
} else console.log('--write 를 붙이면 씁니다.');
