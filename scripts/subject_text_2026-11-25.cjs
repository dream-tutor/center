#!/usr/bin/env node
// 2026-11-25 동×과목 페이지(/{시도}/{시군구}/dong/{동}/{과목}/) 글을 그 페이지 지점 자료(기준본 wstudycenter.com/data/branches.json)와 맞춘다
//   — 사장님 11-25 "전체적으로 최대한 보수적으로". 틀린 낱말·구절만 바꾸고 문장 틀·칸 구성·순서·디자인·링크는 그대로 둔다.
//   페이지의 지점 = 지점 칸의 카드 지점('../../../{지점}/' 링크), 대표 지점 = 제목 끝 지점(첫 카드). 과목 = 그 페이지 과목.
//   ① 제목 '… 추천 | 초중고 밀착 코칭 …'과 첫 화면 '초중고 {과목} 자기주도학습 전문'의 학교급을 카드 지점들이 그 과목에서 여는
//      학교급으로(초중고·초중등·중고등·초등·중등·고등). 앞쪽 검색어 '{동} {과목}학원 추천'은 그대로(사장님 결정 3).
//   ② '수업 방식' 문장 네 가지 — 문장 속 지점이 그 과목에서 열지 않는 것을 말하면:
//      · '고등은 {과목} 학교 시험과 모의고사 복습을 … {지점}에서 …': 고등을 안 열면 고등을 여는 카드 지점 이름으로,
//        그런 지점이 없으면 '중등은 {과목} 학교 시험을 …'.
//      · '{지점}은 {과목} 내신 대비부터 수능 실전까지 …'·'수능 영역별 출제 흐름과 …'·'{지점}은 내신과 수능 두 트랙을 …':
//        고3 을 안 열면(사장님 결정 2 — 고3 을 열지 않는 곳은 수능을 말하지 않는다) 고3 을 여는 카드 지점 이름으로, 없으면
//        '내신 대비부터 모의고사까지'(고등이 없으면 '내신 대비를')·'학교 시험 출제 흐름과'·'내신과 모의고사 두 트랙'
//        (고등이 없으면 '기초와 내신 두 트랙').
//   ③ 학년 범위: 대표 지점 이름을 든 자리(첫 화면 <strong>, '<strong>와와학습코칭센터 {지점}</strong>은 {범위}을 대상으로',
//      설명문·og 설명문)는 대표 지점의 그 과목 범위로, 동 단위 칸('{과목} 수업 가능 학년' 줄과 JSON-LD Course 설명
//      '{동} 와와학습코칭센터의 {범위} …')은 카드 지점 합집합으로. 지점이 하나면 둘이 같다.
//   ④ '{동}에서 이 과목들도 수업 가능합니다' 칸의 '{대표 지점}에서는 {과목} 외에도 아래 과목 코칭이 가능합니다.':
//      대표 지점이 아래 링크 과목을 다 열지 않으면 주어만 '{동}에서는'으로(링크는 그대로).
//   ⑤ 그 과목이 열지 않는 학교급(카드 지점 합집합 기준)만 뺀다: '{동} 인근 학교 ({과목} 등록 가능)'의 학교 묶음(다 빠지면 칸째),
//      수강료 표 줄, '1회 수업 시간'의 학교급, 설명문의 학교 이름(다 빠지면 '… 학생 등록 가능'·'… 가까운' 구절째).
//      여는 학교급이 표·시간에서 빠진 것은 새로 넣지 않는다(칸·줄을 새로 만드는 일 — 만촌동 과학·동춘동 국어는 그대로).
//   바뀐 페이지만 page-updated(data-iso·최종 업데이트)를 TODAY 로. 사이트맵 lastmod 는 따로 맞춘다(scripts/_README.md).
//   상담 폼(<form>…</form>)·주소·링크는 건드리지 않는다(쓰기 전에 폼이 그대로인지 확인한다).
//   이 스크립트가 쓴 꼴도 알아보므로 다시 돌리면 0장이고, 기준본이 바뀌면 ①~④는 새 자료대로 다시 맞춘다(원문 꼴로 되돌리는 것 포함).
//   ⑤는 빼기만 한다 — 자료가 다시 늘어도 뺀 학교·줄을 되살리지 않으니 그때는 손으로 볼 것.
//   (2026-11-25 점검 확정 건 subject-title-chojunggo·subject-high-suneung-no-high·suneung-no-go3·multi-subject-union-on-named-branch·
//    multi-subject-chips-one-branch·named-branch-union-subjects·subject-stale-levels 의 동×과목 부분. 처음 돌린 날 156장.)
//   주의: 10-27 scripts/branch_changes_2026-10-27.cjs 를 다시 돌리면 그 동(상동·마곡동 등)의 대표 지점 범위가 다시 합집합으로
//   바뀌니 그 뒤 이 스크립트를 한 번 더 돌린다.
// 사용: node scripts/subject_text_2026-11-25.cjs [--write] [--verbose] [--list=<바뀐 페이지 목록을 쓸 파일>]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BRANCH_SRC || path.join(ROOT, '..', 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');
const LIST = (process.argv.find((a) => a.startsWith('--list=')) || '').slice(7);
const TODAY = '2026-11-27'; // 11-25 에 고쳐 11-27 에 배포 — 페이지 수정일은 배포일
const MAX_DESC = 80;

const base = Object.values(JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, '')));
const SEQ = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
const SUBJ_OF = { korean: '국어', english: '영어', math: '수학', science: '과학', social: '사회' };
const LV_KO = { 초: '초등', 중: '중등', 고: '고등' };
const LABEL = { 초중고: '초중고', 초중: '초중등', 중고: '중고등', 초: '초등', 중: '중등', 고: '고등' };
const RANGE = '[초중고]\\d(?:~[초중고]\\d)?';
const gradesOf = (b, s) => ((b.grades_by_subject || {})[s] || '').split(',').map((x) => x.trim()).filter(Boolean);
const sortG = (a) => [...new Set(a)].sort((x, y) => SEQ.indexOf(x) - SEQ.indexOf(y));
const rangeStr = (a) => { const g = sortG(a); return !g.length ? null : g.length === 1 ? g[0] : `${g[0]}~${g[g.length - 1]}`; };
const levelsOf = (g) => ['초', '중', '고'].filter((l) => g.some((x) => x[0] === l)); // 초·중·고 순서
const eul = (s) => (/[1368]$/.test(s) ? '을' : '를'); // 일·삼·육·팔 받침 → 을
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
const forms = (h) => (h.match(/<form[\s\S]*?<\/form>/g) || []).join('\n');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (/^[._]/.test(e.name) || ['assets', 'scripts', 'node_modules'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'index.html' && /^[^/]+\/[^/]+\/dong\/[^/]+\/(korean|english|math|science|social)\/index\.html$/.test(rel(p))) out.push(p);
  }
  return out;
}

const writes = new Map(); // 파일 → { raw(읽은 그대로), out(쓸 글) }
const groups = new Map(); const warns = []; const notes = [];
const note = (k) => groups.set(k, (groups.get(k) || 0) + 1);
let seen = 0, stubs = 0;
for (const f of walk(ROOT)) {
  const raw = fs.readFileSync(f, 'utf8');
  const isCrlf = raw.includes('\r\n');
  const orig = isCrlf ? raw.replace(/\r\n/g, '\n') : raw;
  if (orig.includes('페이지 이동 안내')) { stubs++; continue; }
  seen++;
  const R0 = rel(f);
  const [r, , , D, sl] = R0.split('/');
  const S = SUBJ_OF[sl];
  let h = orig; const what = [];

  // ── 지점: 카드(지점 칸 안의 '../../../{지점}/' 링크)와 대표 지점(제목 끝)
  const gi = h.indexOf('<div class="branch-detail-grid">'), gj = h.indexOf('<div class="shuttle-note">', gi);
  if (gi < 0 || gj < 0) fail('지점 칸을 못 찾음: ' + R0);
  const slugs = [...new Set([...h.slice(gi, gj).matchAll(/<a href="\.\.\/\.\.\/\.\.\/([a-z0-9-]+)\/"/g)].map((m) => m[1]))];
  const cards = slugs.map((s) => base.find((b) => b.region_slug === r && b.branch_slug === s) || fail(`카드 지점을 기준본에서 못 찾음 ${s}: ${R0}`));
  if (!cards.length) fail('카드 지점 없음: ' + R0);
  for (const b of cards) if (!h.slice(gi, gj).includes(`🏢 ${b.name}<`) && !h.slice(gi, gj).includes(`→ ${b.name} 자세히 보기`)) fail(`카드 이름 ≠ 기준본 ${b.name}: ${R0}`);
  // 제목의 동 자리는 '동탄 목동'처럼 앞에 말이 붙기도 한다
  const tm = h.match(/<title>([^<|]+?) ([가-힣]+)학원 추천 \| (초중고|초중등|중고등|초등|중등|고등) 밀착 코칭 와와학습코칭센터 (\S+)<\/title>/) || fail('제목 꼴이 다름: ' + R0);
  if ((tm[1] !== D && !tm[1].endsWith(' ' + D)) || tm[2] !== S) fail(`제목의 동·과목이 폴더와 다름 ${tm[1]}/${tm[2]}: ${R0}`);
  const rep = cards.find((b) => b.name === tm[4]) || fail(`제목 지점 ${tm[4]}이 카드에 없음: ${R0}`);
  if (rep !== cards[0]) warns.push(`제목 지점이 첫 카드가 아님: ${R0}`);
  const repG = gradesOf(rep, S);
  if (!repG.length) fail(`대표 지점이 이 과목을 안 엶 ${rep.name}: ${R0}`);
  const unionG = sortG(cards.flatMap((b) => gradesOf(b, S)));
  const L = levelsOf(unionG); // 이 과목에서 카드 지점이 여는 학교급
  const has = (b, test) => gradesOf(b, S).some(test);
  const hasHigh = (b) => has(b, (g) => g[0] === '고');
  const hasMid = (b) => has(b, (g) => g[0] === '중');
  const has3 = (b) => has(b, (g) => g === '고3');
  const pickBranch = (need) => cards.find(need); // 대표 지점부터(첫 카드) 조건에 맞는 지점

  // ── ① 제목·첫 화면의 학교급
  const label = LABEL[L.join('')] || fail(`학교급 조합을 글로 못 씀 ${L.join('')}: ${R0}`);
  if (tm[3] !== label) {
    h = one(h, /(<title>[^<|]+? [가-힣]+학원 추천 \| )(초중고|초중등|중고등|초등|중등|고등)( 밀착 코칭 와와학습코칭센터 \S+<\/title>)/, (m, a, x, z) => a + label + z, '제목 학교급 ' + R0);
    what.push(`제목 ${tm[3]}→${label}`); note(`① 제목 학교급 → ${label}`);
  }
  const pm = h.match(new RegExp(`<div class="hero-pre-title"[^>]*>(초중고|초중등|중고등|초등|중등|고등) ${S} 자기주도학습 전문</div>`)) || fail('첫 화면 머리글 꼴이 다름: ' + R0);
  if (pm[1] !== label) {
    h = one(h, new RegExp(`(<div class="hero-pre-title"[^>]*>)(?:초중고|초중등|중고등|초등|중등|고등)( ${S} 자기주도학습 전문</div>)`), (m, a, z) => a + label + z, '첫 화면 학교급 ' + R0);
    what.push(`첫 화면 ${pm[1]}→${label}`); note(`① 첫 화면 학교급 → ${label}`);
  }

  // ── ② '수업 방식' 수능·고등 문장
  const T = [
    {
      k: 'T0', br: (m) => m[1], re: new RegExp(`([^\\s<>]+?)은 ${S} (내신 대비부터 수능 실전까지|내신 대비부터 모의고사까지|내신 대비를) 학년별 커리큘럼으로 함께 준비합니다\\.`, 'g'),
      want: () => { const p = pickBranch(has3); if (p) return `${p.name}은 ${S} 내신 대비부터 수능 실전까지 학년별 커리큘럼으로 함께 준비합니다.`;
        if (hasHigh(rep)) return `${rep.name}은 ${S} 내신 대비부터 모의고사까지 학년별 커리큘럼으로 함께 준비합니다.`;
        if (hasMid(rep)) return `${rep.name}은 ${S} 내신 대비를 학년별 커리큘럼으로 함께 준비합니다.`;
        return null; },
    },
    {
      k: 'T2', br: (m) => m[3], re: new RegExp(`(고등|중등)은 ${S} (학교 시험과 모의고사 복습을|학교 시험을) 학년에 맞춰 ([^\\s<>]+?)에서 함께 준비합니다\\.`, 'g'),
      want: () => { const p = pickBranch(hasHigh); if (p) return `고등은 ${S} 학교 시험과 모의고사 복습을 학년에 맞춰 ${p.name}에서 함께 준비합니다.`;
        if (hasMid(rep)) return `중등은 ${S} 학교 시험을 학년에 맞춰 ${rep.name}에서 함께 준비합니다.`;
        return null; },
    },
    {
      k: 'T6', br: (m) => m[2], re: new RegExp(`(수능 영역별|학교 시험) 출제 흐름과 ${S} 학습 흐름을 연계해 ([^\\s<>]+?)에서 함께 다룹니다\\.`, 'g'),
      want: () => { const p = pickBranch(has3); if (p) return `수능 영역별 출제 흐름과 ${S} 학습 흐름을 연계해 ${p.name}에서 함께 다룹니다.`;
        if (hasMid(rep) || hasHigh(rep)) return `학교 시험 출제 흐름과 ${S} 학습 흐름을 연계해 ${rep.name}에서 함께 다룹니다.`;
        return null; },
    },
    {
      k: 'T7', br: (m) => m[1], re: /([^\s<>]+?)은 (내신과 수능|내신과 모의고사|기초와 내신) 두 트랙을 분리하지 않고, ([^\s<>]+?) 학생의 학년에 따라 비중을 조정합니다\./g,
      want: (m) => { const tail = ` 두 트랙을 분리하지 않고, ${m[3]} 학생의 학년에 따라 비중을 조정합니다.`;
        const p = pickBranch(has3); if (p) return `${p.name}은 내신과 수능${tail}`;
        if (hasHigh(rep)) return `${rep.name}은 내신과 모의고사${tail}`;
        if (hasMid(rep)) return `${rep.name}은 기초와 내신${tail}`;
        return null; },
    },
  ];
  const bi = h.indexOf('<body');
  for (const t of T) {
    const found = [...h.slice(bi).matchAll(t.re)];
    if (found.length > 1) fail(`${t.k} 문장이 ${found.length}개: ${R0}`);
    if (!found.length) continue;
    const m = found[0];
    const want = t.want(m) || fail(`${t.k} 문장을 맞출 꼴이 없음(지점 자료 확인): ${R0}`);
    if (m[0] !== want) {
      h = h.slice(0, bi) + h.slice(bi).replace(m[0], want);
      what.push(`${t.k}: ${m[0]} → ${want}`);
      // 묶음 이름: 문장에서 지점·과목·동 자리를 가린 꼴(지점 이름이 바뀌면 '지점 바꿈')
      const wm = [...want.matchAll(t.re)][0] || fail(`${t.k} 새 문장을 다시 알아보지 못함: ${R0}`);
      const shape = (x) => { let s = x[0].split(t.br(x)).join('{지점}').split(S).join('{과목}'); if (t.k === 'T7') s = s.replace(`, ${x[3]} 학생의`, ', {동} 학생의'); return s; };
      note(`② ${t.k} '${shape(m)}' → '${shape(wm)}'${t.br(m) !== t.br(wm) ? ' (지점 바꿈)' : ''}`);
    }
  }

  // ── ③ 학년 범위
  const nr = rangeStr(repG), ur = rangeStr(unionG);
  h = one(h, new RegExp(`(와와학습코칭센터 ${esc(rep.name)}은 [^<]*<strong>)(${RANGE})(</strong> 학생의 )`), (m, a, x, z) => { if (x !== nr) { what.push(`첫 화면 범위 ${x}→${nr}`); note('③ 대표 지점 범위(첫 화면)'); } return a + nr + z; }, '첫 화면 범위 ' + R0);
  // 범위가 그대로면 조사도 그대로 둔다(옛 범위에 붙은 조사가 틀린 페이지가 있지만 이번 고칠 거리가 아니다)
  h = one(h, new RegExp(`(<strong>와와학습코칭센터 ${esc(rep.name)}</strong>은 )(${RANGE})(을|를)( 대상으로 )`), (m, a, x, j, z) => { if (x === nr) return m; what.push(`'대상으로' 범위 ${x}→${nr}`); note("③ 대표 지점 범위('…을 대상으로')"); return a + nr + eul(nr) + z; }, "'대상으로' 범위 " + R0);
  const descRe = /(<meta (?:name="description"|property="og:description") content=")([^"]*)(")/g;
  const descs = [...h.matchAll(descRe)].map((m) => m[2]);
  if (descs.length !== 2 || descs[0] !== descs[1]) fail('설명문·og 설명문이 둘이 아니거나 서로 다름: ' + R0);
  let desc = descs[0];
  if (!desc.includes(`와와학습코칭센터 ${rep.name}`)) fail(`설명문에 대표 지점 이름 없음: ${R0}`);
  const dr = [...desc.matchAll(new RegExp(RANGE, 'g'))];
  if (dr.length !== 1) fail(`설명문 범위가 ${dr.length}개: ${R0}`);
  if (dr[0][0] !== nr) { desc = desc.replace(dr[0][0], nr); what.push(`설명문 범위 ${dr[0][0]}→${nr}`); note('③ 대표 지점 범위(설명문·og 설명문)'); }
  h = one(h, new RegExp(`("description": "${esc(D)} 와와학습코칭센터의 )(${RANGE})( 학년별 ${S} 맞춤 코칭")`), (m, a, x, z) => { if (x !== ur) { what.push(`JSON-LD 범위 ${x}→${ur}`); note('③ 동 단위 범위(JSON-LD Course)'); } return a + ur + z; }, 'JSON-LD 범위 ' + R0);
  h = one(h, new RegExp(`(<div class="info-label">${S} 수업 가능 학년</div>\\s*<div class="info-value">)([^<]*)(</div>)`), (m, a, x, z) => { const want = unionG.join(' · '); if (x !== want) { what.push(`학년 줄 ${x}→${want}`); note('③ 동 단위 학년 줄(카드 지점 합집합)'); } return a + want + z; }, '학년 줄 ' + R0);

  // ── ④ '이 과목들도 수업 가능합니다' 칸의 주어
  const oi = h.indexOf('<!-- 같은 동 다른 과목 -->');
  if (oi >= 0) {
    const oj = h.indexOf('</section>', oi);
    const sec = h.slice(oi, oj);
    const linked = [...new Set([...sec.matchAll(/<a href="\.\.\/(korean|english|math|science|social)\/"/g)].map((m) => SUBJ_OF[m[1]]))];
    const om = sec.match(new RegExp(`(<p class="section-sub"[^>]*>)([^<\\s]+)(에서는 ${S} 외에도 아래 과목 코칭이 가능합니다\\.</p>)`)) || fail('다른 과목 칸 문장 꼴이 다름: ' + R0);
    if (om[2] !== rep.name && om[2] !== D) fail(`다른 과목 칸 주어가 대표 지점도 동도 아님 ${om[2]}: ${R0}`);
    const wantSubj = linked.every((s) => (rep.subjects || []).includes(s)) ? rep.name : D;
    if (om[2] !== wantSubj) {
      h = h.slice(0, oi) + sec.replace(om[0], om[1] + wantSubj + om[3]) + h.slice(oj);
      what.push(`다른 과목 칸 주어 ${om[2]}→${wantSubj}`); note(wantSubj === D ? "④ '{지점}에서는' → '{동}에서는'" : "④ '{동}에서는' → '{지점}에서는'");
    }
  } else if (/외에도 아래 과목 코칭이 가능합니다/.test(h)) fail('다른 과목 칸 표시가 없음: ' + R0);

  // ── ⑤ 그 과목이 열지 않는 학교급 빼기(학교 목록·수강료 표 줄·1회 수업 시간·설명문 학교 이름)
  const keepLv = (ko) => L.includes(ko[0]);
  const LVK = { elem: '초', mid: '중', high: '고' };
  const sm = h.match(/<div class="school-section"><div class="school-section-title">[^<]*<\/div>((?:<div class="school-group"><span class="school-group-label (?:elem|mid|high)">[^<]*<\/span><span class="school-list">[^<]*<\/span><\/div>)*)<div class="school-extra-note"[^>]*>[^<]*<\/div><\/div>/);
  if (sm) {
    const gs = [...sm[1].matchAll(/<div class="school-group"><span class="school-group-label (elem|mid|high)">[^<]*<\/span><span class="school-list">[^<]*<\/span><\/div>/g)];
    const kept = gs.filter((g) => L.includes(LVK[g[1]]));
    if (kept.length !== gs.length) {
      const dropped = gs.filter((g) => !kept.includes(g)).map((g) => LV_KO[LVK[g[1]]]);
      if (kept.length) h = h.replace(sm[0], sm[0].replace(sm[1], kept.map((g) => g[0]).join('')));
      else h = one(h, new RegExp(`\\n[ \\t]*${esc(sm[0])}\\n    </div>`), () => '\n          </div>', '학교 칸 통째로 빼기 ' + R0); // 학교 칸이 없는 페이지와 같은 꼴
      what.push(`학교 목록에서 ${dropped.join('·')} 뺌${kept.length ? '' : '(칸째)'}`); note(`⑤ 학교 목록 ${dropped.join('·')} 뺌${kept.length ? '' : '(칸째)'}`);
    }
  }
  const fi = h.indexOf('<section class="fee-mini-section"');
  if (fi >= 0) {
    const fj = h.indexOf('</section>', fi);
    let fee = h.slice(fi, fj);
    const before = fee;
    const dropped = new Set();
    fee = fee.replace(/\n[ \t]*<tr><td>(초등|중등|고등)<\/td><td>[\d,]+<\/td><td>[\d,]+<\/td><td>[\d,]+<\/td><\/tr>/g, (m, ko) => (keepLv(ko) ? m : (dropped.add(ko), '')));
    if (/<tbody>\s*<\/tbody>/.test(fee)) fail('수강료 표 줄이 하나도 안 남음: ' + R0);
    fee = fee.replace(/(<span>1회 수업 시간: )([^<]*)(<\/span>)/g, (m, a, t, z) => {
      const tm2 = t.match(/^(.*?)(?: \(([^)]*)은 상담 시 안내\))?$/);
      const okSeg = tm2[1] === '상담 시 안내' ? [] : tm2[1].split(', ');
      if (okSeg.some((x) => !/^(초등|중등|고등) \d+분$/.test(x))) fail(`1회 수업 시간 꼴이 다름 '${t}': ${R0}`);
      const ngSeg = tm2[2] ? tm2[2].split('·') : [];
      const ok = okSeg.filter((x) => keepLv(x) || (dropped.add(x.slice(0, 2)), false));
      const ng = ngSeg.filter((x) => keepLv(x) || (dropped.add(x), false));
      const nt = ok.length ? ok.join(', ') + (ng.length ? ` (${ng.join('·')}은 상담 시 안내)` : '') : '상담 시 안내';
      return a + nt + z;
    });
    if (fee !== before) {
      h = h.slice(0, fi) + fee + h.slice(fj);
      what.push(`수강료 표·수업 시간에서 ${[...dropped].join('·')} 뺌`); note(`⑤ 수강료 표·1회 수업 시간 ${[...dropped].join('·')} 뺌`);
    }
  }
  // 설명문의 학교 이름: 카드 지점 학교 자료로 학교급을 알아보고(없으면 끝 글자), 그 과목이 안 여는 학교급만 뺀다
  const schoolLv = (n) => {
    for (const b of cards) for (const k of ['elem', 'mid', 'high']) if ((b[`schools_${k}`] || []).includes(n)) return LVK[k];
    const s = n.replace(/등?학교$/, ''); // '대건고등학교' → '대건고'
    return /[초중고]$/.test(s) ? s.slice(-1) : null;
  };
  // [꼴, 학교 목록 무리 번호, 구분자, 학교가 다 빠질 때 구절째 지우는 값] — _rewrite_desc.js 의 세 꼴과 생성기 원래 꼴(동탄 목동 5장)
  const DESC_SCH = [
    [/(개별 진도 수업), ([^.,]+?) 학생 등록 가능\./, 2, '·', '$1.'],
    [/\. ([^.,]+?) 학생 등록 가능, /, 1, '·', '. '],
    [/학원, ([^ ,.]+?) 가까운 와와학습코칭센터/, 1, '·', '학원 와와학습코칭센터'],
    [/\. ([^.]+?) 학생 등록 가능\.$/, 1, ', ', '.'],
  ];
  for (const [re, gno, sep, drop] of DESC_SCH) {
    const m = desc.match(re);
    if (!m) continue;
    const list = m[gno];
    const names = list.split(sep);
    const bad = names.filter((n) => { const l = schoolLv(n); if (!l) warns.push(`설명문 학교 학교급 모름 ${n}: ${R0}`); return l && !L.includes(l); });
    if (!bad.length) continue;
    const keep = names.filter((n) => !bad.includes(n));
    const nd = keep.length ? desc.replace(m[0], m[0].replace(list, keep.join(sep))) : desc.replace(re, drop);
    what.push(`설명문 학교 ${bad.join('·')} 뺌${keep.length ? '' : '(구절째)'}`); note(`⑤ 설명문 학교 이름 뺌${keep.length ? '' : '(구절째)'}`);
    desc = nd;
  }
  if (desc !== descs[0]) {
    if (desc.length > MAX_DESC && desc.length > descs[0].length) fail(`설명문이 ${desc.length}자로 길어짐: ${R0}`);
    let n = 0;
    h = h.replace(descRe, (m, a, c, z) => { n++; return a + desc + z; });
    if (n !== 2) fail('설명문 바꾸기 ' + n + '곳: ' + R0);
  }

  if (h === orig) { if (what.length) fail('적은 고침이 있는데 글이 그대로: ' + R0); continue; }
  if (!what.length) fail('적지 않은 변경이 생김: ' + R0);
  if (forms(h) !== forms(orig)) fail('폼 안이 바뀜(이 스크립트는 폼을 건드리지 않아야 함): ' + R0);
  h = bumpDate(h, R0);
  writes.set(f, { raw, out: isCrlf ? h.replace(/\n/g, '\r\n') : h });
  notes.push(`${R0}\n    ${what.join('\n    ')}`);
}

console.log(`동×과목 페이지 ${seen}장(이동 안내 ${stubs}장은 뺌) → 바뀔 페이지 ${writes.size}장`);
console.log('\n바뀐 묶음(페이지 수):');
for (const [k, n] of [...groups].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${k}`);
if (process.argv.includes('--verbose')) { console.log('\n페이지별:'); for (const n of notes) console.log('  ' + n); }
if (warns.length) { console.log(`\n확인 ${warns.length}건:`); for (const w of warns) console.log('  ' + w); }
if (LIST) fs.writeFileSync(LIST, [...writes.keys()].map(rel).sort().join('\n') + (writes.size ? '\n' : ''), 'utf8');
if (WRITE) {
  for (const [f, { raw, out }] of writes) {
    if (fs.readFileSync(f, 'utf8') !== raw) fail('읽은 뒤에 파일이 바뀜(다른 작업과 겹침 — 다시 돌릴 것): ' + rel(f));
    fs.writeFileSync(f, out, 'utf8');
  }
  console.log(`\n→ ${writes.size}개 파일을 썼습니다.`);
} else console.log('\n--write 를 붙이면 씁니다.');
