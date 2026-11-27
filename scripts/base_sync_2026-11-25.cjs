#!/usr/bin/env node
// 2026-11-25 기준본(wstudycenter.com/data/branches.json) 변경 14칸을 사이트 자료 사본에 옮긴다(사장님 11-25 결정).
//   - 소개 글(strengths) 11곳: 행신·산남·개신·신봉·이곡·가경·영통구청·수진·내발산·동소문·남외점
//     (남외는 '다른 과목 특강' 구절 삭제, 고3 을 열지 않는 곳은 '수능·대학 입학' 대신 모의고사, 학년 범위에 '한 곳에서'를 붙이지 않음)
//   - 주엽점 주말 칸 '수학 과학 / 토요일' → '수학 / 토요일'(과학 미개설)
//   - 관평점 국어 학년에 빠진 초6·중1 채움(초1~중3), 이곡점 과학을 다른 과목처럼 초2부터(초1 뺌)
// 쓰는 곳(바뀐 칸만, 다른 칸·순서·꼴은 그대로):
//   - center assets/branches.json(2칸 들여쓰기, 끝 줄바꿈 없음), 쌍둥이 와와(wawacenter.kr) assets/branches.json(1칸, 끝 줄바꿈 없음)
//     — 쌍둥이 사본에 남아 있는 다른 차이(11-11 변경분 등)는 건드리지 않는다
//   - center 루트 branches.js 의 grade_kor·grade_eng·grade_math·grade_sci·grade_soc·weekend(홈 지점 찾기·상담 창이 읽는다).
//     소개 글 칸은 branches.js 에 없다. 쌍둥이 저장소의 branches.js·assets/main.js 는 옛 도메인(301)이라 두지 않는다.
//   지점 식별은 branch_en(slug) — 와와는 같은 명칭이 겹친다(center-branch-matching 규칙).
// 값은 기준본에서 읽는다 — 기준본이 다시 바뀌면 그 값으로 다시 맞추고, 이미 같으면 0 칸이다.
// 2026-11-27 기준본에서 4칸이 더 바뀌어 아래 표에 더했다(사장님 11-25 "신곡점·별가람점도 관평점처럼 채워줘", 11-27 진행):
//   - 신곡점 사회 학년에 빠진 초5 채움(초1~중3), 별가람점 국어·영어 학년에 빠진 고2 채움(초1~고3)
//   - 금천점 소개 글 '초등부터 고2까지 한 센터에서 이어서 수업합니다' → '초등부터 고2까지 이어서 수업합니다'
// 사용: node scripts/base_sync_2026-11-25.cjs [--write]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GROUP = path.resolve(ROOT, '..');
const TWIN = path.join(GROUP, '와와(wawacenter.kr)');
const BASE = process.env.BRANCH_SRC || path.join(GROUP, 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');

// 2026-11-25 기준본에서 바뀐 칸(지점 → 칸)
const CHANGED = {
  행신점: ['strengths'], 산남점: ['strengths'], 개신점: ['strengths'], 신봉점: ['strengths'], 이곡점: ['strengths', 'grades_by_subject'],
  가경점: ['strengths'], 영통구청점: ['strengths'], 수진점: ['strengths'], 내발산점: ['strengths'], 동소문점: ['strengths'], 남외점: ['strengths'],
  주엽점: ['weekend'], 관평점: ['grades_by_subject'],
  // 2026-11-27 에 더 바뀐 4칸(별가람점은 국어·영어 두 칸)
  신곡점: ['grades_by_subject'], 별가람점: ['grades_by_subject'], 금천점: ['strengths'],
};
const GRADE_FIELDS = { grade_kor: '국어', grade_eng: '영어', grade_math: '수학', grade_sci: '과학', grade_soc: '사회' };

const fail = (m) => { throw new Error(m); };
const base = JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, ''));
const short = (v) => { const s = JSON.stringify(v); return s.length > 90 ? s.slice(0, 90) + '…' : s; };

function doJson(file, indent) {
  const raw0 = fs.readFileSync(file, 'utf8');
  const crlf = raw0.includes('\r\n'); // 작업 폴더는 LF 다. git worktree 로 뗀 판(core.autocrlf)은 CRLF 라 같은 꼴로 되돌려 쓴다
  const raw = crlf ? raw0.replace(/\r\n/g, '\n') : raw0;
  const j = JSON.parse(raw);
  if (JSON.stringify(j, null, indent) !== raw) fail('형식이 예상과 다름(들여쓰기·끝 줄바꿈): ' + file);
  const lines = [];
  for (const [name, fields] of Object.entries(CHANGED)) {
    const b = base[name] || fail('기준본에 없음 ' + name);
    const c = j[name] || fail(`${path.relative(GROUP, file)}에 없음 ${name}`);
    if (c.branch_slug !== b.branch_slug) fail(`slug 다름 ${name}: ${c.branch_slug} ≠ ${b.branch_slug}`);
    for (const k of fields) {
      if (JSON.stringify(c[k]) === JSON.stringify(b[k])) continue;
      lines.push(`  ${name}.${k}: ${short(c[k])}\n      → ${short(b[k])}`);
      c[k] = JSON.parse(JSON.stringify(b[k]));
    }
  }
  console.log(`${path.relative(GROUP, file)}: ${lines.length}칸`); if (lines.length) console.log(lines.join('\n'));
  if (WRITE && lines.length) { const out = JSON.stringify(j, null, indent); fs.writeFileSync(file, crlf ? out.replace(/\n/g, '\r\n') : out, 'utf8'); }
}

// 파이썬 json.dumps(ensure_ascii=False) 꼴: ', ' 와 ': ' 구분자, 한 줄 (scripts/data_2026-10-27.cjs 와 같음)
function dumpsArr(arr) {
  return '[' + arr.map((o) => '{' + Object.keys(o).map((k) => JSON.stringify(k) + ': ' + JSON.stringify(o[k])).join(', ') + '}').join(', ') + ']';
}
function doBranchesJs(file) {
  const s = fs.readFileSync(file, 'utf8');
  const a = s.indexOf('['); const e = s.indexOf('];', a);
  const arr = JSON.parse(s.slice(a, e + 1));
  if (dumpsArr(arr) !== s.slice(a, e + 1)) fail('형식이 예상과 다름: ' + file);
  const lines = [];
  for (const [name, fields] of Object.entries(CHANGED)) {
    const b = base[name];
    const want = {};
    if (fields.includes('grades_by_subject')) for (const [k, subj] of Object.entries(GRADE_FIELDS)) want[k] = (b.grades_by_subject || {})[subj] || '';
    if (fields.includes('weekend')) want.weekend = b.weekend;
    if (!Object.keys(want).length) continue; // 소개 글만 바뀐 지점 — branches.js 에 그 칸이 없다
    const hits = arr.filter((x) => x.branch_en === b.branch_slug && x.region_en === b.region_slug);
    if (hits.length !== 1) fail(`branches.js 에서 ${name}(${b.region_slug}/${b.branch_slug}) ${hits.length}곳`);
    const cur = hits[0];
    for (const [k, v] of Object.entries(want)) {
      if (!(k in cur)) fail(`branches.js ${name} 에 ${k} 칸 없음`);
      if (cur[k] === v) continue;
      lines.push(`  ${name}.${k}: ${JSON.stringify(cur[k])} → ${JSON.stringify(v)}`);
      cur[k] = v; // 칸 순서는 그대로(값만 바꾼다)
    }
  }
  console.log(`${path.relative(GROUP, file)}: ${lines.length}칸`); if (lines.length) console.log(lines.join('\n'));
  if (WRITE && lines.length) fs.writeFileSync(file, s.slice(0, a) + dumpsArr(arr) + s.slice(e + 1), 'utf8');
}

doJson(path.join(ROOT, 'assets', 'branches.json'), 2);
doJson(path.join(TWIN, 'assets', 'branches.json'), 1);
doBranchesJs(path.join(ROOT, 'branches.js'));
console.log(WRITE ? '→ 썼습니다' : '\n--write 를 붙이면 씁니다.');
