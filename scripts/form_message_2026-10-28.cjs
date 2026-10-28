#!/usr/bin/env node
// 2026-10-28 — 상담 폼 ① 희망 과목 버튼 정리 ② 문의 내용(선택) 칸 추가 (사장님 지시 10-28 — "과목 체크표시 말고 버튼식으로 누르게",
//   "국영수사과 말고 기타는 빼줘", "문의내용도 전체 선택으로 조금 칸 줘서 넣게").
//   버튼 모양 자체는 assets/style.css(홈은 인라인 <style>)에서만 바꿨다 — 네모를 다시 보이게 하던 @supports 규칙·:has() 규칙을 지우고 라벨 전체가 버튼.
//   마크업은 체크박스 그대로 둔다(추적 스크립트 t.js 가 name="과목" 체크박스를 읽어 문의 초안에 과목을 싣는다 — 바꾸지 말 것).
//   폼마다 정확히 한 번씩(폼이 박힌 index.html 2,296장 = <select class="form-input" name="연락처앞"> 가 있는 것 전부. 홈만 폼이 2개(본문 fs-*·모달 m-*)라 2번):
//     ① .subject-checks 블록 — 라벨을 국어·영어·수학·사회·과학 순으로 다시 세우고 '기타' 라벨은 지운다(지점 페이지는 그 지점이 여는 과목만 있으니
//        없는 과목은 그대로 없음). 같은 과목이 두 번 든 라벨은 하나로. `> 국어</label>` 의 글자 앞 공백도 정리(네모가 숨어도 글자가 가운데).
//        동×과목 페이지처럼 그 과목이 미리 `checked` 인 라벨에는 `class="checked"` 를 함께 둔다 — 선택 표시가 change 때 JS 로만 바뀌어
//        (:has() 를 뺐으니) 처음 뜰 때 선택돼 보이려면 마크업에 있어야 한다(reset 뒤에도 reset 핸들러가 같은 상태로 맞춘다).
//        블록은 두 꼴 — 라벨이 줄마다 하나(지점·동·학교·허브, 홈, inquiry, reviews)와 한 줄에 다 붙은 꼴(동×과목) — 둘 다 원래 꼴을 지킨다.
//     ② 희망 과목 .form-group 다음, 동의 줄(.form-agree 또는 모달의 modalAgree 줄) 바로 앞에 문의 내용(선택) textarea 한 칸(두 줄 높이·500자).
//        후기 페이지만 과목 뒤에 지점 선택칸이 있어 그 뒤·동의 줄 앞에 들어간다. 홈은 id fs-message / m-message 도 준다.
//     ③ 제출 JS data — `과목:` 줄 다음 줄에 `문의내용:` 키(과목 뒤·신청일 앞). 다른 키·순서는 그대로(시트에 열이 없으면 GAS 가 무시 — '학교' 키와 같은 방식).
//     ④ 동의 상세 '수집 항목' — 학교 이름(선택). → 학교 이름(선택), 문의 내용(선택).
//     ⑤ privacy/index.html — 성별과 학교 이름은 원하실 때만 적습니다. → 성별, 학교 이름, 문의 내용은 원하실 때만 적습니다.
//   치환 수가 폼 수와 다르면 그 페이지를 보고하고 아무것도 쓰지 않는다. data-iso·날짜는 건드리지 않는다(사이트맵 변동 0).
//   줄끝(CRLF)은 원래대로 보존한다. 쌍둥이 저장소 와와(wawacenter.kr)는 옛 도메인(301)이라 손대지 않는다(생성기 틀만 같은 글자로 맞춤).
// 사용: node scripts/form_message_2026-10-28.cjs          → 차이만 세어 보여 준다
//       node scripts/form_message_2026-10-28.cjs --write  → 파일을 다시 쓴다
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');            // center(wcoachingcenter.com)
const WRITE = process.argv.includes('--write');
const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', 'scripts', 'assets']);
const FORM_RE = /<select class="form-input" name="연락처앞"/g;   // 폼 하나에 하나 — 페이지의 폼 수

const SUBJECT_ORDER = ['국어', '영어', '수학', '사회', '과학'];   // 사장님 10-28 "국영수사과" — '기타' 과목은 없앤다
const DROP_SUBJECTS = new Set(['기타']);

// ① 과목 블록(열기 ~ 라벨들 ~ 블록 닫기 ~ form-group 닫기)
const BLOCK_RE = /<div class="subject-checks"(?: id="(fs|m)-subjects")?>([\s\S]*?)<\/div>(\n[ \t]*<\/div>\n)/g;
const LABEL_RE = /<label(?: class="([^"]*)")?><input type="checkbox" name="([^"]+)" value="([^"]+)"( checked)?>([^<]*)<\/label>/g;
// ② 동의 줄 — 그 바로 앞에 문의 내용 칸이 들어간다
const ANCHOR_RE = /^([ \t]*)(?:<div class="form-agree">|<div style="display:flex;align-items:center;gap:8px;[^"]*">\n[ \t]*<input type="checkbox" id="modalAgree")/m;
const ANCHOR_SPAN = 2000;                               // 블록 끝에서 이만큼 안에 동의 줄이 있어야 한다(후기 페이지의 지점 선택칸 ~700자)
const TEXTAREA_RE = /<textarea class="form-input"[^>]* name="문의내용"/g;
function messageGroup(prefix) {                         // prefix = 'fs' | 'm' | null
  const id = prefix ? ' id="' + prefix + '-message"' : '';
  return '<div class="form-group" style="margin-bottom:14px;"><label class="form-label">문의 내용 <span style="color:#94a3b8;font-weight:400;">(선택)</span></label>'
    + '<textarea class="form-input"' + id + ' name="문의내용" rows="2" maxlength="500" placeholder="궁금한 점을 짧게 남겨 주세요" style="resize:vertical;min-height:0"></textarea></div>';
}
// ③ 제출 JS — 과목 줄 → 문의내용 줄
const JS_EXPR = {
  'subjects': "((form.querySelector('[name=\"문의내용\"]')||{}).value || '').trim()",
  "fsSubjects.join(', ')": "((document.getElementById('fs-message')||{}).value || '').trim()",
  "mSubjects.join(', ')": "((document.getElementById('m-message')||{}).value || '').trim()",
};
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const JS_RULE = {
  what: '제출 JS 문의내용 키',
  re: new RegExp('^([ \\t]*)과목:[ \\t]+(' + Object.keys(JS_EXPR).map(esc).join('|') + '),\\n(?![ \\t]*문의내용:)', 'gm'),
  to: (m, ind, expr) => m + ind + '문의내용: ' + JS_EXPR[expr] + ',\n',
  done: new RegExp('^[ \\t]*문의내용: (?:' + Object.values(JS_EXPR).map(esc).join('|') + '),$', 'gm'),
};
// ④ 동의 상세 수집 항목
const COLLECT_RULE = {
  what: '동의 상세 수집 항목',
  re: /학년, 희망 지점·과목, 학교 이름\(선택\)\. 신청 일시와/g,
  to: () => '학년, 희망 지점·과목, 학교 이름(선택), 문의 내용(선택). 신청 일시와',
  done: /학년, 희망 지점·과목, 학교 이름\(선택\), 문의 내용\(선택\)\. 신청 일시와/g,
};
// ⑤ 처리방침 — 수집하는 정보 문장만(처리방침 '두 가지만' 규칙)
const PRIVACY_RULE = {
  what: '처리방침 수집 정보 문장',
  re: /성별과 학교 이름은 원하실 때만 적습니다\./g,
  to: () => '성별, 학교 이름, 문의 내용은 원하실 때만 적습니다.',
  done: /성별, 학교 이름, 문의 내용은 원하실 때만 적습니다\./g,
};

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
const notes = { reordered: [], deduped: [] };
const stat = { pages: 0, forms: 0, already: 0, blocks: 0, oneLine: 0, preChecked: 0, reordered: 0, dropped: 0, deduped: 0, trimmed: 0, inserted: 0, jsKeys: 0, collect: 0 };

function labelHtml(e) {
  return `<label${e.checked ? ' class="checked"' : ''}><input type="checkbox" name="${e.name}" value="${e.value}"${e.checked ? ' checked' : ''}>${e.value}</label>`;
}

// ① + ② — 과목 블록을 정리하고 동의 줄 앞에 문의 내용 칸을 넣는다. 블록 수가 폼 수와 다르면 멈춘다.
function subjectsAndMessage(f, h, expected) {
  const blocks = [];
  BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = BLOCK_RE.exec(h))) blocks.push({ start: m.index, end: m.index + m[0].length, prefix: m[1] || null, inner: m[2], tail: m[3], openTag: m[0].slice(0, m[0].indexOf('>') + 1) });
  if (blocks.length !== expected) { problems.push([f, `과목 블록 ${blocks.length}개 (폼 ${expected}개)`]); return h; }
  for (let b = blocks.length - 1; b >= 0; b--) {           // 뒤에서부터 — 앞쪽 인덱스가 안 흔들리게
    const blk = blocks[b];
    stat.blocks++;
    const labels = [...blk.inner.matchAll(LABEL_RE)];
    if (blk.inner.replace(LABEL_RE, '').trim()) { problems.push([f, '과목 블록 안에 라벨이 아닌 것이 있다']); return h; }
    if (!labels.length) { problems.push([f, '과목 라벨이 없다']); return h; }
    const multiline = blk.inner.startsWith('\n');
    if (!multiline) stat.oneLine++;
    const indent = multiline ? ((blk.inner.match(/\n([ \t]*)<label/) || [])[1] || '') : '';
    const closeIndent = multiline ? ((blk.inner.match(/\n([ \t]*)$/) || [])[1] || '') : '';
    const byValue = new Map();
    const order = [];                                        // 원래 순서(중복 제외)
    let anyChecked = false;
    for (const l of labels) {
      const [, cls, name, value, checked, text] = l;
      if (cls && cls !== 'checked') { problems.push([f, `과목 라벨에 모르는 class "${cls}"`]); return h; }
      if (DROP_SUBJECTS.has(value)) { stat.dropped++; continue; }
      if (!SUBJECT_ORDER.includes(value)) { problems.push([f, `모르는 과목 값 "${value}"`]); return h; }
      if (text.trim() !== value) { problems.push([f, `과목 라벨 글자 "${text.trim()}" ≠ 값 "${value}"`]); return h; }
      if (/^\s/.test(text) || /\s$/.test(text)) stat.trimmed++;
      if (byValue.has(value)) { stat.deduped++; notes.deduped.push(rel(f)); if (checked) byValue.get(value).checked = true; continue; }
      byValue.set(value, { name, value, checked: !!checked });
      order.push(value);
    }
    if (!byValue.size) { problems.push([f, '과목이 하나도 안 남음']); return h; }
    const entries = [...byValue.values()];
    anyChecked = entries.some(e => e.checked);
    if (anyChecked) stat.preChecked++;
    entries.sort((a, c) => SUBJECT_ORDER.indexOf(a.value) - SUBJECT_ORDER.indexOf(c.value));
    if (entries.map(e => e.value).join('·') !== order.join('·')) { stat.reordered++; notes.reordered.push(`${rel(f)} ${order.join('·')} → ${entries.map(e => e.value).join('·')}`); }
    const newInner = multiline
      ? '\n' + entries.map(e => indent + labelHtml(e)).join('\n') + '\n' + closeIndent
      : entries.map(labelHtml).join('');
    const newBlock = blk.openTag + newInner + '</div>' + blk.tail;
    // ② 동의 줄 앞 문의 내용 칸 — 이미 있으면 그대로
    const span = h.slice(blk.end, blk.end + ANCHOR_SPAN);
    const am = ANCHOR_RE.exec(span);
    if (!am) { problems.push([f, '과목 블록 뒤 동의 줄을 못 찾음']); return h; }
    const between = span.slice(0, am.index);
    let insert = '';
    if (!TEXTAREA_RE.test(between)) { insert = am[1] + messageGroup(blk.prefix) + '\n'; stat.inserted++; }
    TEXTAREA_RE.lastIndex = 0;
    h = h.slice(0, blk.start) + newBlock + between + insert + h.slice(blk.end + am.index);
  }
  return h;
}

function applyRule(f, h, r, expected, counter) {
  if (count(h, r.done) === expected && count(h, r.re) === 0) return h;        // 이미 반영
  const n = count(h, r.re);
  if (n !== expected) { problems.push([f, `${r.what} 치환 ${n}건 (폼 ${expected}개, 이미 반영 ${count(h, r.done)})`]); return h; }
  h = h.replace(r.re, r.to);
  if (count(h, r.done) !== expected) { problems.push([f, `${r.what} 치환 뒤 확인 실패`]); return h; }
  if (counter) stat[counter] += n;
  return h;
}

function processPage(f, raw, forms) {
  let h = raw;
  if (h.includes('\r\n')) { crlf.add(f); h = h.replace(/\r\n/g, '\n'); }
  const orig = h;
  const before = problems.length;
  h = subjectsAndMessage(f, h, forms);
  h = applyRule(f, h, JS_RULE, forms, 'jsKeys');
  h = applyRule(f, h, COLLECT_RULE, forms, 'collect');
  if (problems.length > before) return;
  const ta = count(h, TEXTAREA_RE);
  if (ta !== forms) { problems.push([f, `문의 내용 칸 ${ta}개 (폼 ${forms}개)`]); return; }
  if (count(h, /value="기타"> ?기타<\/label>/g)) { problems.push([f, "'기타' 과목이 남았다"]); return; }
  if (h === orig) { stat.already++; return; }
  out.set(f, h);
}

for (const f of walk(ROOT)) {
  const s = fs.readFileSync(f, 'utf8');
  const forms = count(s, FORM_RE);
  if (!forms) continue;
  stat.pages++; stat.forms += forms;
  if (forms > 1) multi.push(`${rel(f)} (폼 ${forms}개)`);
  processPage(f, s, forms);
}
const PRIVACY = path.join(ROOT, 'privacy', 'index.html');
if (!fs.existsSync(PRIVACY)) problems.push([PRIVACY, '파일 없음']);
else {
  let h = fs.readFileSync(PRIVACY, 'utf8');
  if (h.includes('\r\n')) { crlf.add(PRIVACY); h = h.replace(/\r\n/g, '\n'); }
  const o = h;
  h = applyRule(PRIVACY, h, PRIVACY_RULE, 1, null);
  if (h !== o) out.set(PRIVACY, h);
}

console.log(`폼 페이지 ${stat.pages}장 · 폼 ${stat.forms}개 (이미 반영 ${stat.already}, 폼 둘 이상: ${multi.join(', ') || '없음'}) · 처리방침 1장 → 바뀔 파일 ${out.size}`);
console.log(`  과목 블록 ${stat.blocks} (한 줄 꼴 ${stat.oneLine}, 미리 체크된 과목 있음 ${stat.preChecked}) · 순서 바뀐 폼 ${stat.reordered} · '기타' 삭제 ${stat.dropped} · 중복 라벨 합침 ${stat.deduped} · 라벨 공백 정리 ${stat.trimmed}`);
console.log(`  문의 내용 칸 추가 ${stat.inserted} · 제출 JS 키 ${stat.jsKeys} · 수집 항목 문구 ${stat.collect}`);
if (notes.deduped.length) console.log(`  중복 라벨이 있던 페이지: ${[...new Set(notes.deduped)].join(', ')}`);
if (notes.reordered.length) { console.log(`  순서 바뀐 폼 예(최대 8): `); for (const n of notes.reordered.slice(0, 8)) console.log(`    ${n}`); }
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
