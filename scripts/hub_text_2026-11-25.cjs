#!/usr/bin/env node
// 2026-11-25 동 허브 글을 그 허브 지점 자료(기준본 wstudycenter.com/data/branches.json)와 맞춘다 — 사장님 11-25 "최대한 보수적으로".
//   허브의 지점은 '→ ○○점 자세히 보기' 카드 지점이다. 틀린 낱말·구절만 바꾸고 문장 틀·순서·칸은 그대로 둔다.
//   ① 제목의 대표 지점: '{동} {과목}학원·… 추천 | 와와학습코칭센터 {지점}'에서 그 지점이 제목 과목을 다 열지 않는데 다른 카드 지점이
//      나머지를 여는 허브(지점 여럿)는 지점 이름 자리를 'N곳'으로 — '… 추천 | 와와학습코칭센터 2곳'(<title>·og:title·설명문·
//      og 설명문. 모두 동 이름으로 시작해 동을 되풀이하지 않고, 제목이 전보다 길어지지 않는다). 카드 순서는 그대로.
//   ② 아무 카드 지점도 열지 않는 과목(영천동 국어·주엽동 과학): 제목·og:title·h1·설명문·본문 과목 목록에서 그 과목만 뺀다.
//      앞쪽 검색어 꼴과 남은 과목 순서는 그대로.
//   ③ 본문의 과목 목록 문장('… 과목의 학년별 커리큘럼을 운영합니다' 등 다섯 꼴)이 카드 지점이 여는 과목을 빠뜨렸으면 넣는다(평내동 국어).
//      제목·h1·설명문 머리의 과목 나열(검색어)은 빠진 과목을 보태지 않는다 — 없는 과목을 말하는 것이 아니라서(사장님 결정 3).
//   ④ 설명문(meta·og)의 '{범위} 개별 진도 수업': 그 문장이 가리키는 지점(제목의 대표 지점, ①이면 카드 지점 전체)의
//      과목 학년 합집합 처음~끝과 다르면 그 범위로(여는 학년을 안 연다고 하거나 안 여는 학년을 연다고 하는 것을 고침).
//      범위가 과목 목록에 붙은 문장이 아니라 지점 소개 뒤 따로 있는 문장이라, 과목마다 학년이 조금 달라도 합집합 하나로 둔다.
//   ⑤ '초등·중등·고등 학년별로 {과목} 수업을 진행합니다': 적힌 과목 가운데 초·중·고 하나라도 안 여는 과목이 있으면
//      '학년별로 {과목} 수업을 진행합니다'(학교급 낱말만 뺀다).
//   ⑥ '내신부터 수능까지, …': 카드 지점이 고3 을 열지 않으면 '내신부터 모의고사까지, …'(사장님 11-25 — 고3 을 열지 않는 곳은 수능을 말하지 않음).
//   바뀐 페이지만 page-updated(data-iso·최종 업데이트)를 TODAY 로. 사이트맵 lastmod 는 따로 맞춘다(scripts/_README.md).
//   이 스크립트가 쓴 꼴도 알아보므로 다시 돌리면 0장, 기준본이 바뀌면 새 자료대로 다시 맞춘다(①은 대표 지점이 다시 맞게 되어도
//   'N곳'을 지점 이름으로 되돌리지 않는다 — 그때는 손으로 볼 것. 지점 수가 바뀌면 N 은 다시 맞추지 않으니 그것도 손으로).
// 사용: node scripts/hub_text_2026-11-25.cjs [--write]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BRANCH_SRC || path.join(ROOT, '..', 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');
const TODAY = '2026-11-27'; // 11-25 에 고쳐 11-27 에 배포 — 페이지 수정일은 배포일
const MAX_DESC = 80;

const base = Object.values(JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, '')));
const SEQ = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
const SUBJ = ['국어', '영어', '수학', '과학', '사회'];
const gradesOf = (b, s) => ((b.grades_by_subject || {})[s] || '').split(',').map((x) => x.trim()).filter(Boolean);
const allGrades = (bs) => [...new Set(bs.flatMap((b) => SUBJ.flatMap((s) => gradesOf(b, s))))];
const sortG = (a) => [...new Set(a)].sort((x, y) => SEQ.indexOf(x) - SEQ.indexOf(y));
function rangeOf(bs) {
  const g = sortG(allGrades(bs));
  const lo = SEQ.indexOf(g[0]), hi = SEQ.indexOf(g[g.length - 1]);
  const gap = SEQ.slice(lo, hi + 1).filter((k) => !g.includes(k));
  return { r: g[0] === g[g.length - 1] ? g[0] : `${g[0]}~${g[g.length - 1]}`, gap };
}
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
// 과목 목록에서 뺄 과목을 뺀다(구분자·순서 그대로). '수학학원·영어학원' 꼴도 '수학·영어' 꼴도 된다.
function dropSubjects(list, sep, drop, suffix = '') {
  const items = list.split(sep);
  const kept = items.filter((x) => !drop.includes(x.slice(0, x.length - suffix.length)));
  if (!kept.length) fail('과목이 하나도 안 남음: ' + list);
  return kept.join(sep);
}
// 빠진 과목을 넣는다: 지금 순서가 국·영·수·과·사 순서면 그 순서로, 아니면 뒤에 붙인다.
function addSubjects(items, want) {
  const miss = want.filter((s) => !items.includes(s));
  if (!miss.length) return items;
  const inOrder = items.every((s, i) => i === 0 || SUBJ.indexOf(items[i - 1]) < SUBJ.indexOf(s));
  return inOrder ? SUBJ.filter((s) => items.includes(s) || miss.includes(s)) : [...items, ...miss];
}

const changes = []; const groups = new Map(); const warns = [];
const note = (k) => groups.set(k, (groups.get(k) || 0) + 1);
let seen = 0;
for (const r of fs.readdirSync(ROOT)) {
  const rp = path.join(ROOT, r);
  if (!fs.statSync(rp).isDirectory() || /^[._]/.test(r) || ['assets', 'scripts', 'node_modules'].includes(r)) continue;
  for (const d of fs.readdirSync(rp)) {
    const dp = path.join(rp, d, 'dong');
    if (!fs.existsSync(dp)) continue;
    for (const dong of fs.readdirSync(dp)) {
      const f = path.join(dp, dong, 'index.html');
      if (!fs.existsSync(f)) continue;
      const raw = fs.readFileSync(f, 'utf8');
      const isCrlf = raw.includes('\r\n');
      const orig = isCrlf ? raw.replace(/\r\n/g, '\n') : raw;
      if (orig.includes('페이지 이동 안내')) continue;
      seen++;
      const cards = [...orig.matchAll(/<a href="\.\.\/\.\.\/([a-z0-9-]+)\/"[^>]*>→ ([^<]*?) 자세히 보기<\/a>/g)].map((m) => ({ slug: m[1], name: m[2] }));
      const bs = cards.map((c) => base.find((b) => b.region_slug === r && b.branch_slug === c.slug) || fail(`카드 지점을 기준본에서 못 찾음 ${c.slug}: ${rel(f)}`));
      bs.forEach((b, i) => { if (b.name !== cards[i].name) fail(`카드 이름 ≠ 기준본 ${cards[i].name}/${b.name}: ${rel(f)}`); });
      if (!bs.length) { warns.push(`카드 지점 없음: ${rel(f)}`); continue; }
      const U = SUBJ.filter((s) => bs.some((b) => b.subjects.includes(s)));
      let h = orig; const what = [];

      // ── 제목 꼴: '{동} {과목}학원·… 추천 | 와와학습코칭센터 {지점}'
      const tm = h.match(/<title>(\S+) ((?:[가-힣]+학원·?)+) 추천 \| 와와학습코칭센터 ([^<]+)<\/title>/);
      let named = null; // 설명문 범위 문장이 가리키는 지점들
      if (!tm) warns.push(`제목 꼴이 다름(그대로): ${rel(f)} ${(h.match(/<title>([^<]*)/) || [])[1]}`);
      else {
        const T = tm[2].split('·').map((x) => x.replace(/학원$/, ''));
        const extra = T.filter((s) => !U.includes(s)); // ② 아무 카드 지점도 안 여는 과목
        const B = tm[3];
        const nb = bs.find((b) => b.name === B);
        const tWant = T.filter((s) => !extra.includes(s));
        if (extra.length) {
          // 제목·og:title·h1·설명문·본문 목록에서 그 과목만 뺀다
          h = h.replace(/(<title>|<meta property="og:title" content=")(\S+) ((?:[가-힣]+학원·?)+)( 추천 \| )/g, (m, a, D, list, z) => a + D + ' ' + dropSubjects(list, '·', extra, '학원') + z);
          h = h.replace(/(<h1>\S+ <span>와와학습코칭센터<\/span><br>)([가-힣·]+)( 학원<\/h1>)/, (m, a, list, z) => a + dropSubjects(list, '·', extra) + z);
          h = h.replace(/(<meta (?:name="description"|property="og:description") content="\S+ )([가-힣·]+)( 학원[ ,])/g, (m, a, list, z) => list.split('·').every((x) => SUBJ.includes(x)) ? a + dropSubjects(list, '·', extra) + z : m);
          h = h.replace(/(<meta (?:name="description"|property="og:description") content="\S+ )((?:[가-힣]+학원·?)+)([ ,])/g, (m, a, list, z) => a + dropSubjects(list, '·', extra, '학원') + z);
          what.push(`없는 과목 뺌 ${extra.join('·')}`); note(`② 제목·h1 에서 안 여는 과목 뺌(${extra.join('·')})`);
        }
        const label = `${bs.length}곳`; // 제목·설명문 모두 동 이름으로 시작하므로 '와와학습코칭센터 N곳'(제목이 전보다 길어지지 않게)
        if (B === label) named = bs; // 이 스크립트가 쓴 꼴
        else if (!nb) warns.push(`제목 지점 '${B}'이 카드에 없음(그대로): ${rel(f)}`);
        else if (tWant.some((s) => !nb.subjects.includes(s))) {
          // ① 대표 지점이 제목 과목을 다 열지 않음(다른 카드 지점이 나머지를 엶) → '{동} N곳'
          if (bs.length < 2) fail(`지점 하나인데 대표 지점이 과목을 다 안 엶(②로 처리되었어야 함): ${rel(f)}`);
          h = one(h, new RegExp(`(<title>[^<]* 추천 \\| 와와학습코칭센터 )${esc(B)}(</title>)`), (m, a, z) => a + label + z, '제목 대표 지점 ' + rel(f));
          h = one(h, new RegExp(`(<meta property="og:title" content="[^"]* 추천 \\| 와와학습코칭센터 )${esc(B)}(")`), (m, a, z) => a + label + z, 'og:title 대표 지점 ' + rel(f));
          // 설명문도 같은 꼴(80자 안 — '{동} N곳'이면 다섯 곳이 80자를 넘는다)
          let nD = 0;
          h = h.replace(new RegExp(`(<meta (?:name="description"|property="og:description") content="[^"]*?와와학습코칭센터 )${esc(B)}(\\. )`, 'g'), (m, a, z) => { nD++; return a + label + z; });
          if (nD !== 2) fail(`설명문 대표 지점 ${nD}곳: ${rel(f)}`);
          named = bs;
          what.push(`대표 지점 ${B} → ${label}`); note(`① 대표 지점 → '{동} N곳'`);
        } else named = [nb];
      }

      // ── ③ 본문 과목 목록 문장(다섯 꼴): 안 여는 과목은 빼고, 여는 과목이 빠졌으면 넣는다
      const BODY = [
        /([가-힣·]+)( 과목의 학년별 커리큘럼을 운영합니다)/g,
        /(수업 과목은 )([가-힣·]+)(입니다)/g,
        /(학생들의 )([가-힣·]+)( 코칭을 하고 있습니다)/g,
        /(<h2>[^<]*? )([가-힣·]+)( 학원 안내<\/h2>)/g,
        /(학년별로 )([가-힣·]+)( 수업을 진행합니다)/g,
      ];
      const bi = h.indexOf('<body');
      let body = h.slice(bi);
      for (const re of BODY) {
        body = body.replace(re, (...m) => {
          const parts = m.slice(1, m.length - 2);
          const li = parts.findIndex((p) => /^[가-힣]+(?:·[가-힣]+)*$/.test(p) && p.split('·').every((x) => SUBJ.includes(x)));
          if (li < 0) return m[0];
          const items = parts[li].split('·');
          const want = addSubjects(items.filter((s) => U.includes(s)), U);
          if (want.join('·') === items.join('·')) return m[0];
          what.push(`본문 과목 ${items.join('·')} → ${want.join('·')}`); note('③ 본문 과목 목록을 카드 지점 과목으로');
          parts[li] = want.join('·');
          return parts.join('');
        });
      }
      h = h.slice(0, bi) + body;

      // ── ④ 설명문 범위
      if (named) {
        const { r: R, gap } = rangeOf(named);
        if (gap.length) warns.push(`가리키는 지점 학년 사이가 빔(${gap.join('·')}) — 범위 그대로 둠: ${rel(f)}`);
        else {
          let n = 0, cur = null;
          h = h.replace(/(<meta (?:name="description"|property="og:description") content=")([^"]*)(")/g, (m, a, c, z) => {
            const ms = c.match(/[초중고]\d~[초중고]\d(?= 개별 진도 수업)/g) || [];
            if (ms.length > 1) fail(`설명문 범위 ${ms.length}곳: ${rel(f)}`);
            if (!ms.length) return m;
            n++; cur = ms[0];
            return ms[0] === R ? m : a + c.replace(/[초중고]\d~[초중고]\d(?= 개별 진도 수업)/, R) + z;
          });
          if (n && n !== 2) fail(`설명문·og 설명문 범위 ${n}곳: ${rel(f)}`);
          if (n && cur !== R) { what.push(`설명문 범위 ${cur} → ${R}`); note('④ 설명문 범위를 가리키는 지점 합집합으로'); }
        }
      }

      // ── ⑤ '초등·중등·고등 학년별로 {과목} 수업을 진행합니다'
      h = h.replace(/초등·중등·고등 (학년별로 )([가-힣·]+)( 수업을 진행합니다)/g, (m, a, list, z) => {
        const lack = list.split('·').filter((s) => { const lv = new Set(bs.flatMap((b) => gradesOf(b, s)).map((g) => g[0])); return !(lv.has('초') && lv.has('중') && lv.has('고')); });
        if (!lack.length) return m;
        what.push(`'초등·중등·고등' 뺌(${lack.join('·')})`); note('⑤ 학년별로 문장의 학교급 낱말 뺌');
        return a + list + z;
      });

      // ── ⑥ '내신부터 수능까지'
      const has3 = allGrades(bs).includes('고3');
      if (!has3 && h.includes('내신부터 수능까지, ')) {
        h = h.split('내신부터 수능까지, ').join('내신부터 모의고사까지, ');
        what.push('내신부터 수능까지 → 모의고사까지'); note('⑥ 고3 없는 허브 내신부터 모의고사까지');
      }
      if (has3 && h.includes('내신부터 모의고사까지, ')) warns.push(`고3 을 여는데 '모의고사까지'(되돌릴지 확인): ${rel(f)}`);

      if (h === orig) continue;
      for (const m of h.matchAll(/<meta name="description" content="([^"]*)"/g)) if ([...m[1]].length > MAX_DESC) warns.push(`설명문 ${[...m[1]].length}자: ${rel(f)}`);
      h = bumpDate(h, rel(f));
      changes.push({ f, h: isCrlf ? h.replace(/\n/g, '\r\n') : h, what });
    }
  }
}
console.log(`동 허브 ${seen}장 → 바뀔 페이지 ${changes.length}장`);
for (const [k, n] of [...groups].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${k}`);
console.log('');
for (const c of changes) console.log(`${rel(c.f)}\n    ${c.what.join(' / ')}`);
if (warns.length) { console.log(`\n확인 ${warns.length}건:`); for (const w of warns) console.log('  ' + w); }
if (WRITE) { for (const c of changes) fs.writeFileSync(c.f, c.h, 'utf8'); console.log(`\n→ ${changes.length}개 파일을 썼습니다.`); }
else console.log('\n--write 를 붙이면 씁니다.');
