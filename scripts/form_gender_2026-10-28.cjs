#!/usr/bin/env node
// 2026-10-28 — 상담 폼에 성별(남/여) 선택 칸을 넣고 '연락처' 라벨을 '학부모 연락처'로 바꾼다(사장님 지시 10-28).
//   목적: 문의 초안에 성별이 실려 EEP 등록이 쉬워지게 — t.js 가 폼 칸을 name 속성으로 훑어 lead_info 로 보내고 eep-bridge 가 '성별' 키를 읽는다(값 '남'·'여' 그대로).
//   기존 양식(칸 구성·시트 열·전송 키)은 그대로 두고 최대한 컴팩트하게 — 성별은 학생 이름 칸 바로 오른쪽의 작은 select 하나(새 줄·새 라벨 없음, 선택 항목).
//   폼마다 정확히 한 번씩 치환(폼이 박힌 index.html 2,296장 = <select name="연락처앞"> 가 있는 것 전부. 홈만 폼이 2개 — 본문 fs-*·모달 m-* — 라 2번):
//     ① 학생 이름 input 을 flex 감싸개로 싸고 그 오른쪽에 <select name="성별"> (모양은 연락처 앞자리 select 와 같은 꼴, 52px)
//        — 라벨 다음 줄에 input 이 오는 꼴(290장)과 한 줄에 붙은 꼴(2,006장) 둘 다. 홈은 name 대신 id(fs-name·m-name)라 select 에 id(fs-gender·m-gender)도 준다.
//     ② <label>연락처 * → 학부모 연락처 *   (칸 이름 name="연락처"·"연락처앞"·검사·번호 결합은 그대로)
//     ③ 제출 JS data 객체의 이름 키 바로 뒤에 성별 키, 들여쓰기·콜론 뒤 공백은 그 줄과 같게 (시트에 열이 없으면 GAS 가 무시 — 09-20 '학교' 키와 같은 방식)
//     ④ 동의 상세(details) 수집 항목 문구: 성별(선택) 추가·학부모 연락처
//     ⑤ privacy/index.html 수집하는 정보 문장 (두 가지만 — 처리방침 '두 가지만' 규칙)
//   치환 수가 폼 수와 다르면 그 페이지를 보고하고 아무것도 쓰지 않는다. data-iso·날짜는 건드리지 않는다(사이트맵 변동 0).
//   줄끝(CRLF)은 원래대로 보존한다. 쌍둥이 저장소 와와(wawacenter.kr)는 옛 도메인(301)이라 손대지 않는다.
// 사용: node scripts/form_gender_2026-10-28.cjs          → 차이만 세어 보여 준다
//       node scripts/form_gender_2026-10-28.cjs --write  → 파일을 다시 쓴다
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');            // center(wcoachingcenter.com)
const WRITE = process.argv.includes('--write');
const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', 'scripts', 'assets']);
const FORM_RE = /<select class="form-input" name="연락처앞"/g;   // 폼 하나에 하나 — 페이지의 폼 수

// ---- 치환 규칙 ----
function genderSelect(attr) {                          // attr = 이름 input 의 name="이름" | id="fs-name" | id="m-name"
  const id = attr === 'id="fs-name"' ? ' id="fs-gender"' : attr === 'id="m-name"' ? ' id="m-gender"' : '';
  return '<select class="form-input" name="성별"' + id + ' aria-label="성별" style="flex:0 0 52px;appearance:none;-webkit-appearance:none;text-align:center;text-align-last:center;padding:0">'
    + '<option value="">성별</option><option value="남">남</option><option value="여">여</option></select>';
}
const NAME_EXPR = {                                     // 제출 JS — 이름 값을 읽는 식 → 성별 값을 읽는 식
  "(form.querySelector('[name=\"이름\"]')||{}).value || ''": "(form.querySelector('[name=\"성별\"]')||{}).value || ''",
  "document.getElementById('fs-name').value": "(document.getElementById('fs-gender')||{}).value || ''",
  "document.getElementById('m-name') ? document.getElementById('m-name').value : ''": "document.getElementById('m-gender') ? document.getElementById('m-gender').value : ''",
};
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const RULES = [
  { // ① 학생 이름 input → flex 감싸개 + 성별 select
    what: '학생 이름 칸',
    re: /(<label class="form-label">학생 이름 <span style="color:red">\*<\/span><\/label>\s*)<input type="text" class="form-input" (name="이름"|id="fs-name"|id="m-name") required>(?=\s*<\/div>)/g,
    to: (m, lead, attr) => lead + '<div style="display:flex;gap:6px"><input type="text" class="form-input" ' + attr + ' required style="flex:1;min-width:0">' + genderSelect(attr) + '</div>',
    done: /<input type="text" class="form-input" (?:name="이름"|id="fs-name"|id="m-name") required style="flex:1;min-width:0"><select class="form-input" name="성별"/g,
  },
  { // ② 라벨 글자
    what: '연락처 라벨',
    re: /<label class="form-label">연락처 <span style="color:red">\*<\/span><\/label>/g,
    to: () => '<label class="form-label">학부모 연락처 <span style="color:red">*</span></label>',
    done: /<label class="form-label">학부모 연락처 <span style="color:red">\*<\/span><\/label>/g,
  },
  { // ③ 제출 JS — 이름 키 다음 줄에 성별 키 (들여쓰기·콜론 뒤 공백 같게)
    what: '제출 JS 성별 키',
    re: new RegExp('^([ \\t]*)이름:([ \\t]+)(' + Object.keys(NAME_EXPR).map(esc).join('|') + '),\\n(?![ \\t]*성별:)', 'gm'),
    to: (m, ind, sp, expr) => m + ind + '성별:' + sp + NAME_EXPR[expr] + ',\n',
    done: new RegExp('^[ \\t]*성별:[ \\t]+(?:' + Object.values(NAME_EXPR).map(esc).join('|') + '),$', 'gm'),
  },
  { // ④ 동의 상세 수집 항목
    what: '동의 상세 수집 항목',
    re: /수집 항목<\/b>: 학생 이름, 연락처, 거주 주소, 학년, 희망 지점·과목, 학교 이름\(선택\)\./g,
    to: () => '수집 항목</b>: 학생 이름, 성별(선택), 학부모 연락처, 거주 주소, 학년, 희망 지점·과목, 학교 이름(선택).',
    done: /수집 항목<\/b>: 학생 이름, 성별\(선택\), 학부모 연락처, 거주 주소, 학년, 희망 지점·과목, 학교 이름\(선택\)\./g,
  },
];

const PRIVACY_RULE = { // ⑤ 처리방침 — 수집하는 정보 문장만
  what: '처리방침 수집 정보 문장',
  re: /학생 이름, 연락처, 거주 주소, 학년, 희망 지점, 희망 과목을 받습니다\. 학교 이름은 원하실 때만 적습니다\./g,
  to: () => '학생 이름, 학부모 연락처, 거주 주소, 학년, 희망 지점, 희망 과목을 받습니다. 성별과 학교 이름은 원하실 때만 적습니다.',
  done: /학생 이름, 학부모 연락처, 거주 주소, 학년, 희망 지점, 희망 과목을 받습니다\. 성별과 학교 이름은 원하실 때만 적습니다\./g,
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
let pages = 0, already = 0;

function apply(f, raw, rules, expected) {
  let h = raw;
  if (h.includes('\r\n')) { crlf.add(f); h = h.replace(/\r\n/g, '\n'); }
  const orig = h;
  if (rules.every(r => count(h, r.done) === expected && count(h, r.re) === 0)) { already++; return; }   // 이미 반영된 페이지(다시 돌려도 안전)
  for (const r of rules) {
    const n = count(h, r.re);
    if (n !== expected) { problems.push([f, `${r.what} 치환 ${n}건 (폼 ${expected}개, 이미 반영 ${count(h, r.done)})`]); continue; }
    h = h.replace(r.re, r.to);
    if (count(h, r.done) !== expected) problems.push([f, `${r.what} 치환 뒤 확인 실패`]);
  }
  if (h !== orig) out.set(f, h);
}

for (const f of walk(ROOT)) {
  const s = fs.readFileSync(f, 'utf8');
  const forms = count(s, FORM_RE);
  if (!forms) continue;
  pages++;
  if (forms > 1) multi.push(`${rel(f)} (폼 ${forms}개)`);
  apply(f, s, RULES, forms);
}
const PRIVACY = path.join(ROOT, 'privacy', 'index.html');
if (!fs.existsSync(PRIVACY)) problems.push([PRIVACY, '파일 없음']);
else apply(PRIVACY, fs.readFileSync(PRIVACY, 'utf8'), [PRIVACY_RULE], 1);

console.log(`폼 페이지 ${pages}장 (이미 반영 ${already}, 폼 둘 이상: ${multi.join(', ') || '없음'}) · 처리방침 1장 → 바뀔 파일 ${out.size}`);
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
