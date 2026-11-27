#!/usr/bin/env node
// 2026-11-27 — 상담 폼: 같은 자리의 와와·더블유플러스·글로리드 묶음은 묶음 전체가 여는 과목·학년으로 켜고 끈다.
//   사장님 11-27 "더블유플러스와 글로리드는 근방에서 수업이 가능한 내용이라 과목 선정할 때 와와 더블유플러스 글로리드 같이 있으면 해당 과목들은 다 열리게 해줘."
//   묶음 = 자료(assets/branches.json, 기준본 사본)에서 같은 시·도와 시·군·구 안에 상표 꼬리 '(W+)'(더블유플러스)·'(글로리드)'를 뗀 이름이 같은 지점이
//   둘 이상인 것. 이름을 표로 박지 않고 자료에서 센다. 2026-11-27 자료로는 8묶음 18곳이다: 수지점·수지점(글로리드)·수지점(W+) / 은평점·은평점(글로리드)·
//   은평점(W+) / 화정점·화정점(W+) / 중동점·중동점(W+) / 다산점·다산점(W+) / 후곡점·후곡점(W+) / 송도점·송도점(W+) / 둔산점·둔산점(W+).
//   '(모두)' 지점은 짝이 없어 해당하지 않는다.
//   2026-11-25 폼 고침(form_grade_filter_2026-11-25.cjs)은 지점 하나를 기준으로 학교급·학년·과목을 껐다. 그래서 은평점(영어·사회·과학) 창에서는 같은 자리
//   은평점(글로리드)의 국어와 은평점(W+)의 수학을 고를 수 없었다. 이제 묶음 안 어느 지점이든(지점이 미리 정해진 페이지든 지점을 고르는 폼이든) 묶음 전체가
//   여는 과목·학년을 합쳐서 켠다(과목마다 여는 학년을 합침). 예: 은평점이면 국어(초3~고1)·수학(초3~고2)도 고를 수 있고, 고2 를 고르면 수학만 켜진다.
// 무엇을:
//   ① 묶음 지점이 든 폼(숨은 칸이든 지점 선택칸이든)에 묶음이 여는 과목의 단추가 없으면 더한다. 순서는 기존 규칙(국어·영어·수학·사회·과학) 그대로이고
//      꼴·들여쓰기·줄끝도 그 칸의 기존 단추 줄과 같다. 2026-11-27 자료로는 지점 페이지 11장만 해당한다(그 지점 과목만 그려 두던 곳).
//      지점 선택칸 폼과 동×과목 폼은 이미 단추가 다 있다.
//   ② 그 폼의 스크립트를 form_grade_filter_2026-11-25.cjs 의 셈으로 다시 맞춘다. 묶음 규칙과 폼 스크립트 틀은 그 파일에 있고 이 스크립트가 불러 쓴다
//      (두 스크립트가 같은 셈을 쓰게). 하위 페이지는 GR(지점 → 과목 → 여는 학년)의 묶음 지점 값이 묶음 합집합이 되고, 홈 두 폼과 후기 창은 branches.js 를
//      읽을 때 묶음을 합쳐 센다. 합친 결과 걸러질 것이 없어진 페이지는 원래 학년 칸 스크립트로 돌아간다(화정점 등).
//   바뀌지 않는 것: 지점 고르기 목록, 보내는 지점 이름·키·값(고른 지점 이름이 그대로 접수된다), 안내 문구, 칸 id·name, 본문·제목·설명문·지점 카드의
//   과목·학년 표기, 묶음이 아닌 지점의 폼 동작. 폼만 바뀌므로 data-iso·'최종 업데이트'·사이트맵 lastmod 는 올리지 않는다. 줄끝(CRLF/LF)은 파일마다 원래대로.
//   생성기(git 밖 와와(wawacenter.kr))는 고치지 않았다 — 페이지를 다시 만들면 form_grade_filter 뒤에 이 스크립트를 다시 돌린다(scripts/_README.md).
// 사용: node scripts/form_brand_group_2026-11-27.cjs            → 바뀔 곳만 세어 보여 준다(아무것도 안 씀)
//       node scripts/form_brand_group_2026-11-27.cjs --write    → 이 저장소 html 을 다시 쓴다
//       --list <파일>  바뀔(바뀐) 페이지 목록     --plan <파일>  묶음 지점이 든 폼마다 지점·더하는 단추·묶음 합집합(TSV)
//       --emit <폴더> --sample <상대경로,…>  그 페이지들의 고친 사본만 <폴더>/<상대경로> 에 쓴다(시험용, 저장소는 안 건드림)
//   다시 돌려도 안전: 이미 맞춘 페이지는 바뀌지 않는다(0장). 틀이 다른 페이지가 하나라도 있으면 아무것도 쓰지 않고 멈춘다.
//   단추는 더하기만 한다 — 묶음이 풀리거나 묶음 과목이 줄어도 더한 단추를 빼지 않으니(그 과목은 흐리게 꺼진다) 그때는 손으로 본다.
'use strict';
const fs = require('fs');
const path = require('path');
const F = require('./form_grade_filter_2026-11-25.cjs'); // 묶음 규칙(GROUPS·groupMasksOf)과 폼 스크립트 틀·셈(fitPage). 불러 쓰면 페이지를 훑지 않는다
const { ROOT, SEQ, SUBJ, GROUPS, fail } = F;

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const argv = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const EMIT = argv('--emit');
const SAMPLE = (argv('--sample') || '').split(',').map((s) => s.trim()).filter(Boolean);
const LIST = argv('--list');
const PLAN = argv('--plan');

// 과목 단추 칸에 빠진 과목을 순서(국어·영어·수학·사회·과학)대로 끼워 넣는다. 꼴과 단추 사이 글(줄바꿈·들여쓰기)은 그 칸의 기존 단추 그대로.
//   칸은 두 꼴이다: 단추가 줄마다 하나(지점·동 허브·학교)와 한 줄에 다 붙은 꼴(동×과목). 둘 다 원래 꼴을 지킨다.
const BOX_OPEN = '<div class="subject-checks">';
const LABEL_RE = /<label( class="checked")?><input type="checkbox" name="과목" value="([^"]+)"( checked)?>\2<\/label>/g;
function addButtons(raw, r, need) {
  const a = raw.indexOf('<form id="consultForm"');
  const z = a < 0 ? -1 : raw.indexOf('</form>', a);
  const b0 = a < 0 ? -1 : raw.indexOf(BOX_OPEN, a);
  const b1 = b0 < 0 ? -1 : raw.indexOf('</div>', b0);
  if (a < 0 || z < 0 || b0 < 0 || b1 < 0 || b1 > z) fail(`${r}: 과목 단추 칸을 못 찾음`);
  const inner = raw.slice(b0 + BOX_OPEN.length, b1);
  const labs = [...inner.matchAll(LABEL_RE)];
  if (!labs.length || labs.length !== (inner.match(/<label\b/g) || []).length) fail(`${r}: 과목 단추 꼴이 다름`);
  // 단추 앞·사이·뒤 글은 공백(줄바꿈·들여쓰기)뿐이고 사이 글은 모두 같아야 한다
  const endOf = (m) => m.index + m[0].length;
  const head = inner.slice(0, labs[0].index), tail = inner.slice(endOf(labs[labs.length - 1]));
  const seps = labs.slice(1).map((m, i) => inner.slice(endOf(labs[i]), m.index));
  const sep = seps.length ? seps[0] : head;
  if (/\S/.test(head + tail + seps.join('')) || seps.some((s) => s !== sep)) fail(`${r}: 과목 단추 사이에 다른 글이 있음`);
  const have = labs.map((m) => m[2]);
  const order = have.map((s) => SUBJ.indexOf(s));
  if (order.some((v, i) => v < 0 || (i > 0 && v <= order[i - 1]))) fail(`${r}: 과목 단추 순서가 국어·영어·수학·사회·과학이 아님`);
  const all = [
    ...labs.map((m) => ({ s: m[2], t: m[0] })),
    ...need.filter((s) => !have.includes(s)).map((s) => ({ s, t: `<label><input type="checkbox" name="과목" value="${s}">${s}</label>` })),
  ].sort((x, y) => SUBJ.indexOf(x.s) - SUBJ.indexOf(y.s));
  return raw.slice(0, b0 + BOX_OPEN.length) + head + all.map((x) => x.t).join(sep) + tail + raw.slice(b1);
}

// 여는 학년을 '초3~고1' 꼴로(빈 학년이 있으면 낱낱이)
function rangeOf(mask) {
  const g = SEQ.filter((_, i) => mask & (1 << i));
  if (!g.length) return '-';
  return g.length === SEQ.indexOf(g[g.length - 1]) - SEQ.indexOf(g[0]) + 1 ? (g.length > 1 ? `${g[0]}~${g[g.length - 1]}` : g[0]) : g.join(',');
}
const maskText = (m) => SUBJ.filter((s) => m[s]).map((s) => `${s} ${rangeOf(m[s])}`).join(' · ');

const changes = [];
const rows = [];
const added = [];
let nForms = 0;
for (const f of F.walk(ROOT)) {
  const r = F.rel(f), kind = F.kindOf(r);
  const raw = fs.readFileSync(f, 'utf8');
  let cur = raw;
  if (kind !== '홈' && kind !== '후기') {
    // 하위 페이지: 묶음 지점이 든 폼만 본다(묶음이 아닌 지점의 폼은 건드리지 않는다)
    if (!raw.includes('<form id="consultForm"')) continue;
    const facts = F.formFacts(raw.replace(/\r\n/g, '\n'), r);
    const members = facts.names.filter((n) => GROUPS[n]);
    if (!members.length) continue;
    nForms++;
    // ① 묶음이 여는 과목 가운데 이 폼에 단추가 없는 것
    const need = SUBJ.filter((s) => !facts.subjects.includes(s) && members.some((n) => F.groupMasksOf(n)[s]));
    if (need.length) { cur = addButtons(raw, r, need); added.push(`${r} [${members.join(',')}] ${facts.subjects.join('·')} + ${need.join('·')}`); }
    rows.push([r, kind, facts.select ? '지점 선택칸' : '숨은 칸', members.join(','), facts.subjects.join('·'), need.join('·'),
      members.map((n) => `${n}: ${maskText(F.masksOf(n))} → ${maskText(F.groupMasksOf(n))}`).join(' / ')].join('\t'));
  }
  // ② 폼 스크립트를 묶음 합집합으로 다시 맞춘다(홈·후기 창은 branches.js 를 읽는 스크립트)
  const out = F.fitPage(cur, r);
  if (out === raw) continue;
  // 날짜 줄은 그대로여야 한다(폼만 바뀐다)
  const iso = (t) => (t.match(/data-iso="[^"]*"/g) || []).join();
  if (iso(out) !== iso(raw)) fail(`${r}: 날짜 줄이 바뀜`);
  changes.push({ f, r, kind, out });
}

const groups = [...new Set(Object.values(GROUPS))];
console.log(`묶음 ${groups.length}개(지점 ${Object.keys(GROUPS).length}곳): ${groups.map((g) => g.join('·')).join(' / ')}`);
console.log(`묶음 지점이 든 하위 페이지 폼 ${nForms}장, 그리고 홈 두 폼·후기 창`);
console.log(`과목 단추를 더할 페이지 ${added.length}장`);
for (const a of added) console.log('  ' + a);
const byKind = {};
for (const c of changes) byKind[c.kind] = (byKind[c.kind] || 0) + 1;
console.log(`바뀔 페이지 ${changes.length}장 ${JSON.stringify(byKind)} (폼만 — 날짜는 그대로)`);
if (LIST) fs.writeFileSync(LIST, changes.map((c) => c.r).join('\n') + (changes.length ? '\n' : ''), 'utf8');
if (PLAN) fs.writeFileSync(PLAN, ['경로\t종류\t지점 칸\t묶음 지점\t과목 단추\t더하는 단추\t지점 하나 → 묶음 합집합', ...rows].join('\n') + '\n', 'utf8');
if (EMIT) {
  for (const s of SAMPLE) {
    const c = changes.find((x) => x.r === s);
    const src = c ? c.out : fs.readFileSync(path.join(ROOT, s), 'utf8');
    const p = path.join(EMIT, s);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, src, 'utf8');
  }
  console.log(`→ 표본 ${SAMPLE.length}장을 ${EMIT} 에 썼습니다(저장소는 그대로).`);
}
if (WRITE) { for (const c of changes) fs.writeFileSync(c.f, c.out, 'utf8'); console.log(`→ ${changes.length}개 파일을 썼습니다.`); }
else if (!EMIT) console.log('(모의 실행 — --write 를 붙이면 씁니다)');
