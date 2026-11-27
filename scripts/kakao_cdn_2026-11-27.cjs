#!/usr/bin/env node
// 2026-11-27 — 주소 검색(카카오 우편번호) 스크립트를 받는 호스트를 t1.daumcdn.net → t1.kakaocdn.net 으로.
//   카카오 공지: "t1.daumcdn.net 도메인 종료 안내 - 2026년 11월 30일까지 t1.kakaocdn.net으로 변경해 주세요."
//   (옛 호스트로 받으면 검색 창 위에 이 공지 띠가 뜬다 — 사장님이 11-27 원스텝센터 상담 창에서 발견. 마감 뒤에는 창이 안 뜰 수 있다.)
//   두 주소는 같은 파일이다(11-27 확인: postcode.v2.js VERSION 261109, 35,814B, sha256 같음). 스크립트가 여는 검색 창(iframe)은
//   어느 쪽으로 받아도 postcode.map.kakao.com 이고, window.daum 은 window.kakao 와 같은 객체라 new daum.Postcode(...) 는 그대로 돈다.
//   바꾸는 것은 호스트 글자뿐이다 — 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/…' 의 't1.daumcdn.net' 만.
//   폼 스크립트만 바뀌므로 data-iso·'최종 업데이트'·사이트맵 lastmod 는 올리지 않는다. 파일은 바이트 그대로 읽고 써서 줄끝(CRLF/LF)·BOM 이 유지된다.
//   생성기(git 밖 와와(wawacenter.kr) 의 _gen_dong.py·generate_pages.py·scripts/build_extra_pages.py·scripts/upgrade_address_to_search.py)도
//   --gen 으로 같은 글자로 맞춘다. 쌍둥이 와와 저장소의 html 은 옛 도메인(301)이라 손대지 않는다(10-28·11-11 과 같음).
// 사용: node scripts/kakao_cdn_2026-11-27.cjs                  → 바뀔 곳만 세어 보여 준다(아무것도 안 씀)
//       node scripts/kakao_cdn_2026-11-27.cjs --write          → 이 저장소 파일을 다시 쓴다
//       node scripts/kakao_cdn_2026-11-27.cjs --gen [--write]  → 생성기 파일(기본 ../와와(wawacenter.kr), WAWA_GEN_DIR 로 덮어쓰기)
//   다시 돌려도 안전: 이미 바꾼 곳은 '이미 새 주소'로 세고 넘어간다(바꿀 것 0장). 옛 호스트가 우편번호 스크립트가 아닌 다른 꼴로
//   하나라도 나오면 아무것도 쓰지 않고 멈춘다(사람이 보고 판단).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.env.CENTER_ROOT ? path.resolve(process.env.CENTER_ROOT) : path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const GEN = args.includes('--gen');
const GEN_DIR = process.env.WAWA_GEN_DIR ? path.resolve(process.env.WAWA_GEN_DIR) : path.resolve(ROOT, '..', '와와(wawacenter.kr)');

const OLD_HOST = 't1.daumcdn.net';
const NEW_HOST = 't1.kakaocdn.net';
const TAIL = '/mapjsapi/bundle/postcode/';             // 우편번호 스크립트 경로 머리 — 이 꼴만 바꾼다
const OLD = OLD_HOST + TAIL;
const NEW = NEW_HOST + TAIL;

const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.claude', '.wrangler']);
const TEXT_EXT = new Set(['.html', '.htm', '.js', '.cjs', '.mjs', '.css', '.json', '.xml', '.txt', '.py', '.svg']);

function walk(dir, skipTop, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      if (skipTop && dir === skipTop.root && skipTop.names.has(ent.name)) continue;
      walk(path.join(dir, ent.name), skipTop, out);
    } else if (ent.isFile() && TEXT_EXT.has(path.extname(ent.name).toLowerCase())) {
      out.push(path.join(dir, ent.name));
    }
  }
  return out;
}

function count(hay, needle) {
  let n = 0, i = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; }
  return n;
}

// 파일 목록을 훑어 { 바꿀 파일, 바꿀 곳 수, 이미 새 주소인 파일, 다른 꼴 } 을 센다. latin1 로 읽고 써서 바이트가 그대로 유지된다.
function scan(files, base) {
  const todo = [], odd = [];
  let places = 0, already = 0;
  for (const f of files) {
    const s = fs.readFileSync(f, 'latin1');
    const nOldHost = count(s, OLD_HOST);
    const nOld = count(s, OLD);
    if (nOldHost !== nOld) odd.push(path.relative(base, f) + ' (옛 호스트 ' + nOldHost + '곳 중 우편번호 스크립트 꼴 ' + nOld + '곳)');
    if (nOld) { todo.push({ f, s, n: nOld }); places += nOld; }
    else if (s.includes(NEW)) already++;
  }
  return { todo, odd, places, already };
}

function apply(res, base, label) {
  console.log(label + ': 바꿀 파일 ' + res.todo.length + '개(' + res.places + '곳), 이미 새 주소 ' + res.already + '개');
  if (res.odd.length) {
    console.log('  ✖ 우편번호 스크립트가 아닌 꼴의 옛 호스트가 있다 — 아무것도 쓰지 않는다:');
    for (const o of res.odd.slice(0, 20)) console.log('    ' + o);
    process.exitCode = 1;
    return false;
  }
  if (!WRITE) {
    for (const t of res.todo.slice(0, 5)) console.log('  (모의) ' + path.relative(base, t.f) + ' — ' + t.n + '곳');
    if (res.todo.length > 5) console.log('  (모의) … 외 ' + (res.todo.length - 5) + '개');
    return true;
  }
  for (const t of res.todo) fs.writeFileSync(t.f, t.s.split(OLD).join(NEW), 'latin1');
  console.log('  → ' + res.todo.length + '개 파일을 썼다.');
  return true;
}

if (GEN) {
  if (!fs.existsSync(GEN_DIR)) { console.log('생성기 폴더가 없다: ' + GEN_DIR); process.exit(1); }
  // 생성기·보조 스크립트만(html 은 옛 도메인 페이지라 뺀다)
  const files = walk(GEN_DIR, null, []).filter(f => !/\.html?$/i.test(f));
  apply(scan(files, GEN_DIR), GEN_DIR, '생성기(' + GEN_DIR + ')');
} else {
  // 이 저장소: scripts 폴더(이 스크립트·README 가 옛 호스트 글자를 설명으로 담는다)는 훑지 않는다
  const files = walk(ROOT, { root: ROOT, names: new Set(['scripts']) }, []);
  apply(scan(files, ROOT), ROOT, '와와 코칭센터(' + files.length + '개 파일 훑음)');
}
if (!WRITE) console.log('모의 실행 — 쓰려면 --write');
