#!/usr/bin/env node
// 2026-11-25 — 상담 폼: 지점에 맞춰 학년·과목 끄기 (사장님 11-25 "폼도 바꿔주고", 점검 c-form-grade-options-nonschool·form-subject-buttons·school-form-options).
//   전에는 학년 칸이 지점과 상관없이 초1~6·중1~3·고1~3 을 다 내주고(화명점은 초3~고2 인데 고3 도 고를 수 있었다), 과목 단추도
//   동·지역 합집합이라 숨은 칸으로 정해진 지점이 열지 않는 과목(진관동 국어 창의 영어·수학 등)을 고를 수 있었다. 거르는 장치는 홈의
//   wawaSyncSubjects(고른 지점이 안 여는 과목 숨김)뿐이었다.
//   이제 지점이 정해졌거나(지점 페이지·동·학교 페이지의 숨은 칸) 사용자가 지점을 고르면(시도·시군구·지점 여럿인 동·학교 페이지의 지점 칸,
//   홈 두 폼, 후기 페이지 창) 그 지점이 열지 않는 학교급·학년은 고를 수 없게(disabled) 하고, 고른 학년(학교급만 골랐으면 그 학교급)에 그 지점이
//   열지 않는 과목은 흐리게(.off — assets/style.css·홈 인라인 CSS 에 이미 있는 '안 여는 과목' 꼴) 끈다. 지점이 안 정해졌으면 지금처럼 다 연다.
//   지점·학년을 바꿔 이미 고른 값이 막히면 그 값만 푼다. '기타' 학년은 그대로(늘 고를 수 있고, 고르면 과목은 그 지점이 여는 것 전부).
//   허용 학년은 그 페이지에 단추가 있는 과목만으로 센다 — 단추 없는 과목으로만 여는 학년을 고르면 고를 과목이 없어 접수가 막히기 때문.
//   지점 자료가 없거나(일반문의) 단추 과목을 하나도 안 열면 지점이 안 정해진 것처럼 다 연다.
//   본보기: wstudycoaching.com 상담 창(2026-11-24 사장님 승인 — 지점에 맞춰 학년·과목 끄기).
// 무엇을:
//   ① 하위 페이지(시도·시군구·지점·동 허브·동×과목·학교) — 페이지마다 박힌 학년 칸 스크립트(var GRADES …)를 넓혀, 그 폼 지점들의 자료(GR)와
//      거르는 함수를 붙인다. GR 은 assets/branches.json(기준본 사본)의 grades_by_subject 에서 이 스크립트가 계산해 넣는다(지점 → 과목 →
//      여는 학년 비트, 초1=1 … 고3=2048). 걸러도 바뀌는 것이 하나도 없는 페이지(그 지점들이 단추 과목을 모든 학년에 여는 페이지)와
//      일반문의(/inquiry/)는 원래 스크립트 그대로 둔다. 다시 돌리면 자료대로 다시 계산한다(바뀔 것이 없게 되면 원래 스크립트로 되돌린다).
//   ② 홈(index.html) — wawaSyncSubjects(지점 고르면 안 여는 과목 숨김)를 넓혀 학교급·학년 칸과 학년별 과목도 맞춘다. 자료는 branches.js(BRANCHES)의 grade_* 칸.
//   ③ 후기(reviews/index.html) 상담 창 — 아래 '신청 지점 선택'(#r-branch)으로 고른 지점 기준. 자료는 branches.js(BRANCHES).
//   지키는 것: 칸 id·name·마크업·보내는 키·값 형식·필수 여부·제출 흐름·완료 화면은 그대로(t.js WF 표가 칸 id 를 읽는다). 폼 HTML 은 손대지 않고 스크립트만.
//   폼 스크립트만 바뀌므로 data-iso·사이트맵 lastmod 는 올리지 않는다. 줄끝(CRLF/LF)은 파일마다 원래대로.
//   생성기(git 밖 와와(wawacenter.kr) 의 _gen_dong.py·scripts/build_extra_pages.py·generate_pages.py)는 고치지 않았다 — 페이지를 다시 만들면
//   이 스크립트를 다시 돌린다(scripts/_README.md).
// 2026-11-27 — 같은 자리의 와와·더블유플러스·글로리드 묶음 (사장님 11-27 "더블유플러스와 글로리드는 근방에서 수업이 가능한 내용이라 과목 선정할 때
//   와와 더블유플러스 글로리드 같이 있으면 해당 과목들은 다 열리게 해줘").
//   묶음 = 같은 시·도와 시·군·구 안에서 상표 꼬리 '(W+)'·'(글로리드)'를 뗀 이름이 같은 지점이 둘 이상인 것. 이름을 표로 박지 않고 자료에서 센다
//   (2026-11-27 자료로 8묶음 18곳). 묶음에 든 지점은 폼이 켜고 끄는 기준을 묶음 전체의 합집합으로 한다(과목마다 여는 학년을 합침): 하위 페이지는 GR 의
//   그 지점 값, 홈·후기 창은 branches.js 를 읽는 셈. 묶음이 아닌 지점은 전과 같다. 보내는 지점 이름·키·값, 지점 고르기 목록, 본문의 과목·학년 표기는 그대로다.
//   묶음 과목 단추를 더하는 일(폼 HTML)은 form_brand_group_2026-11-27.cjs 가 하고, 그 스크립트가 이 파일의 틀·셈을 불러 쓴다
//   (require 로 불리면 페이지를 훑지 않고 함수만 내준다). 이 스크립트만 돌려도 묶음 합집합으로 다시 계산한다.
// 사용: node scripts/form_grade_filter_2026-11-25.cjs             → 바뀔 곳만 세어 보여 준다(아무것도 안 씀)
//       node scripts/form_grade_filter_2026-11-25.cjs --write     → 이 저장소 html 을 다시 쓴다
//       --list <파일>   바뀔(바뀐) 페이지 목록을 그 파일에 쓴다     --plan <파일>  페이지별 지점·막히는 학교급·학년·과목 표(TSV)
//       --emit <폴더> --sample <상대경로,…>  그 페이지들의 고친 사본만 <폴더>/<상대경로> 에 쓴다(시험용, 저장소는 안 건드림)
//   셈이 하나라도 어긋나면(틀이 다른 페이지, 자료에 없는 지점 등) 아무것도 쓰지 않고 멈춘다.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.env.CENTER_ROOT ? path.resolve(process.env.CENTER_ROOT) : path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const argv = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const EMIT = argv('--emit');
const SAMPLE = (argv('--sample') || '').split(',').map((s) => s.trim()).filter(Boolean);
const LIST = argv('--list');
const PLAN = argv('--plan');

const SEQ = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
const SUBJ = ['국어', '영어', '수학', '사회', '과학'];
const LV = { 초등학교: 0, 중학교: 6, 고등학교: 9 };
const LM = { 초등학교: 63, 중학교: 448, 고등학교: 3584 };
const LV_N = { 초등학교: 6, 중학교: 3, 고등학교: 3 };
const fail = (m) => { console.error('[멈춤] ' + m); process.exit(1); };

// ── 자료: assets/branches.json(기준본 사본) → 지점 → 과목 → 여는 학년 비트 ──────────────────────────
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'branches.json'), 'utf8').replace(/^\uFEFF/, ''));
function masksOf(name) {
  const b = Object.prototype.hasOwnProperty.call(DATA, name) ? DATA[name] : null;
  if (!b) return null;
  const m = {};
  for (const s of SUBJ) {
    let v = 0;
    for (const g of String((b.grades_by_subject || {})[s] || '').split(',')) {
      const t = g.trim();
      if (!t) continue;
      const i = SEQ.indexOf(t);
      if (i < 0) fail(`${name} ${s} 학년 값을 모름: ${t}`);
      v |= 1 << i;
    }
    if (v) m[s] = v;
  }
  return m;
}

// ── 같은 자리의 와와·더블유플러스·글로리드 묶음(2026-11-27) ─────────────────────────────────
//   같은 시·도와 시·군·구 안에서 상표 꼬리를 뗀 이름이 같은 지점이 둘 이상이면 한 묶음이다(근방에서 함께 수업). '(모두)'처럼 다른 꼬리는 떼지 않는다.
//   홈·후기 창에 넣는 페이지 스크립트(groupOf 등)도 같은 규칙을 branches.js 의 region·district·name 으로 센다.
const BRAND_TAIL = /\((?:W\+|글로리드)\)$/;
const GROUPS = (() => {
  const by = new Map();
  for (const n of Object.keys(DATA)) {
    const k = [DATA[n].region, DATA[n].district, n.replace(BRAND_TAIL, '')].join('|');
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(n);
  }
  const g = {};
  for (const v of by.values()) if (v.length > 1) for (const n of v) g[n] = v;
  return g;
})();
// 폼이 켜고 끄는 기준: 묶음이면 묶음 전체의 합집합(과목마다 여는 학년을 합침), 아니면 그 지점 그대로
function groupMasksOf(name) {
  const own = masksOf(name);
  if (!own || !GROUPS[name]) return own;
  const m = {};
  for (const s of SUBJ) {
    let v = 0;
    for (const n of GROUPS[name]) v |= masksOf(n)[s] || 0;
    if (v) m[s] = v;
  }
  return m;
}
// 묶음 때문에 그 지점 하나일 때보다 넓어진 지점인가
const widened = (name) => !!GROUPS[name] && JSON.stringify(groupMasksOf(name)) !== JSON.stringify(masksOf(name));

// ── ① 하위 페이지 학년 칸 스크립트 ───────────────────────────────────────────
const ORIG_HEAD = [
  '<script>',
  '(function(){',
  "  var s = document.getElementById('fs-school');",
  "  var g = document.getElementById('fs-grade');",
  '  if(!s || !g) return;',
  "  var GRADES = {'초등학교':[1,2,3,4,5,6], '중학교':[1,2,3], '고등학교':[1,2,3]};",
  "  s.addEventListener('change', function(){",
  '    var sel = s.value;',
  '    var list = GRADES[sel] || [];',
  `    g.innerHTML = '<option value="">' + (list.length ? '학년 선택' : '-') + '</option>';`,
  '    list.forEach(function(n){',
  "      var o = document.createElement('option');",
  "      o.textContent = n + '학년';",
  '      g.appendChild(o);',
  '    });',
  '    g.disabled = !list.length;',
  '  });',
];
const ORIG_TAIL = ['})();', '</script>'];
const ORIG_N = [...ORIG_HEAD, ...ORIG_TAIL].join('\n');
const MARK = '지점에 맞춰 학년·과목 끄기(2026-11-25)';
// 거르는 함수 — 하위 페이지·후기 창이 같은 글을 쓴다(지점 칸을 찾는 식만 다르다)
function fitLines(branchExpr) {
  return [
    "  var f = s.form, LV = {'초등학교':0, '중학교':6, '고등학교':9}, LM = {'초등학교':63, '중학교':448, '고등학교':3584};",
    '  if(!f) return;',
    '  function fit(){',
    `    var b = ${branchExpr}, m = b ? GR[b.value] : null, cs = f.querySelectorAll('.subject-checks input'), all = 0, i, o, c, ok;`,
    '    if(m) for(i = 0; i < cs.length; i++) all |= m[cs[i].value] || 0;',
    '    if(!all) m = null;',
    '    for(i = 0; i < s.options.length; i++){ o = s.options[i]; o.disabled = !!m && LM[o.value] > 0 && !(all & LM[o.value]); }',
    '    o = s.options[s.selectedIndex];',
    `    if(o && o.disabled){ s.value = ''; g.innerHTML = '<option value="">-</option>'; g.disabled = true; }`,
    '    var lv = LV[s.value];',
    '    for(i = 1; i < g.options.length; i++){ o = g.options[i]; o.disabled = !!m && lv != null && !(all & (1 << (lv + parseInt(o.value, 10) - 1))); }',
    '    o = g.options[g.selectedIndex];',
    "    if(o && o.disabled) g.value = '';",
    '    var want = lv == null ? 4095 : g.value ? 1 << (lv + parseInt(g.value, 10) - 1) : LM[s.value];',
    '    for(i = 0; i < cs.length; i++){',
    '      c = cs[i]; ok = !m || !!((m[c.value] || 0) & want);',
    '      c.disabled = !ok; if(!ok) c.checked = false;',
    "      if(c.parentNode && c.parentNode.classList){ c.parentNode.classList.toggle('off', !ok); c.parentNode.classList.toggle('checked', c.checked); }",
    '    }',
    '  }',
    "  f.addEventListener('change', function(e){ if(e.target && e.target.tagName === 'SELECT') fit(); });",
    "  f.addEventListener('reset', function(){ setTimeout(fit, 0); });",
    '  fit();',
  ];
}
const NOTE = [
  `  /* ${MARK}: 이 폼의 지점(숨은 칸이나 고른 지점)이 열지 않는 학교급·학년은 고를 수 없게 하고,`,
  '     고른 학년(학교급만 골랐으면 그 학교급)에 그 지점이 열지 않는 과목은 흐리게(.off) 한다. 지점이 안 정해졌으면 모두 그대로 연다.',
  '     이미 고른 값이 막히면 그 값만 푼다. 허용 학년은 이 폼에 단추가 있는 과목으로만 센다(고를 과목이 없는 학년을 내주지 않게).',
  '     GR = 지점 → 과목 → 여는 학년(초1=1 … 고3=2048). scripts/form_grade_filter_2026-11-25.cjs 가 assets/branches.json 에서 넣는다. */',
];
const FIT_N = fitLines("f.querySelector('[name=\"지점\"]')");
// 묶음 합집합이 든 폼에만 설명 한 줄을 더 붙인다(2026-11-27). 표시(MARK)부터 */ 까지를 주석으로 알아보므로 두 꼴 다 인식된다.
const MARK_G = '같은 자리 묶음(2026-11-27)';
const NOTE_G = [
  ...NOTE.slice(0, 3),
  NOTE[3].replace(/ \*\/$/, ''),
  `     ${MARK_G}: 같은 자리의 와와·더블유플러스·글로리드 지점은 근방에서 함께 수업하므로 묶음 전체가 여는 과목·학년을 합쳐 넣었다. 접수되는 지점 이름은 그대로다. */`,
];
const newN = (grJson, grouped) => [...ORIG_HEAD, ...(grouped ? NOTE_G : NOTE), `  var GR = ${grJson};`, ...FIT_N, ...ORIG_TAIL].join('\n');
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const eolRe = (s) => s.split('\n').map(escRe).join('\\r?\\n');
// 원래 꼴과 이 스크립트가 쓴 꼴을 다 알아본다(줄끝은 CRLF·LF 둘 다). 쓴 꼴의 설명 주석은 글이 바뀌어도 알아보게 표시(MARK)부터 */ 까지로 잡는다.
const RE_N = new RegExp('(?:' + eolRe(ORIG_N) + '|' + eolRe(ORIG_HEAD.join('\n')) + '\\r?\\n  /\\* ' + escRe(MARK) + '[\\s\\S]*?\\*/\\r?\\n  var GR = \\{[^\\r\\n]*\\};\\r?\\n' + eolRe([...FIT_N, ...ORIG_TAIL].join('\n')) + ')', 'g');

// ── ② 홈 wawaSyncSubjects ─────────────────────────────────────────────────
const HOME_OLD = [
  '<script>',
  '/* 지점 선택 시 해당 지점 미개설 과목 숨김 — 지점 페이지와 동일 규칙 */',
  '(function () {',
  '  var MAP = { "국어": "grade_kor", "영어": "grade_eng", "수학": "grade_math", "사회": "grade_soc", "과학": "grade_sci" };',
  '  function subjectsOf(name) {',
  '    if (!name || typeof BRANCHES === "undefined") return null;',
  '    var b = null;',
  '    for (var i = 0; i < BRANCHES.length; i++) { if (BRANCHES[i].name === name) { b = BRANCHES[i]; break; } }',
  '    if (!b) return null;',
  '    var out = [];',
  '    for (var k in MAP) { if (String(b[MAP[k]] || "").trim()) out.push(k); }',
  '    return out;',
  '  }',
  '  function bind(branchId, boxId) {',
  '    var sel = document.getElementById(branchId), box = document.getElementById(boxId);',
  '    if (!sel || !box) return;',
  '    function update() {',
  '      var subs = subjectsOf(sel.value);',
  '      Array.prototype.forEach.call(box.querySelectorAll("label"), function (l) {',
  '        var inp = l.querySelector("input"); if (!inp) return;',
  '        var ok = !subs || subs.indexOf(inp.value) > -1;',
  '        l.style.display = ok ? "" : "none";',
  '        if (!ok) { inp.checked = false; l.classList.remove("checked"); } /* 숨기는 과목은 눌린 표시(.checked)도 지운다 */',
  '      });',
  '    }',
  '    sel.addEventListener("change", update);',
  '    /* 지점이 코드로 바뀌는 경로(동에 지점이 1곳이면 자동 선택, 시도·시군구·동을 바꿔 지점이 비는 때, 폼 reset)는',
  '       지점 칸에 change 가 나지 않는다 — 같은 폼의 다른 select change·reset 뒤에도 다시 맞춘다 */',
  '    var host = sel.form || document;',
  '    host.addEventListener("change", function (e) { if (e.target !== sel && e.target.tagName === "SELECT") update(); });',
  '    host.addEventListener("reset", function () { setTimeout(update, 0); });',
  '    syncs.push(update);',
  '    update();',
  '  }',
  '  var syncs = [];',
  "  /* fbAutoSelect(지점 카드 '상담 신청')·URL 파라미터 자동 선택처럼 value 만 넣는 곳에서 부른다 */",
  '  window.wawaSyncSubjects = function () { for (var i = 0; i < syncs.length; i++) syncs[i](); };',
  '  bind("fs-branch", "fs-subjects");',
  '  bind("m-branch", "m-subjects");',
  '})();',
  '</script>',
].join('\n');
const HOME_V1 = [
  '<script>',
  '/* 지점 선택 시 해당 지점 미개설 과목 숨김 — 지점 페이지와 동일 규칙',
  `   ${MARK}: 고른 지점이 열지 않는 학교급·학년도 고를 수 없게 하고, 고른 학년(학교급만 골랐으면 그 학교급)에`,
  '   그 지점이 열지 않는 과목은 흐리게(.off) 한다. 지점을 안 골랐으면 모두 그대로 연다. 이미 고른 값이 막히면 그 값만 푼다.',
  '   자료는 branches.js 의 grade_* 칸(scripts/form_grade_filter_2026-11-25.cjs). */',
  '(function () {',
  '  var MAP = { "국어": "grade_kor", "영어": "grade_eng", "수학": "grade_math", "사회": "grade_soc", "과학": "grade_sci" };',
  '  function subjectsOf(name) {',
  '    if (!name || typeof BRANCHES === "undefined") return null;',
  '    var b = null;',
  '    for (var i = 0; i < BRANCHES.length; i++) { if (BRANCHES[i].name === name) { b = BRANCHES[i]; break; } }',
  '    if (!b) return null;',
  '    var out = [];',
  '    for (var k in MAP) { if (String(b[MAP[k]] || "").trim()) out.push(k); }',
  '    return out;',
  '  }',
  '  var SEQ = ["초1", "초2", "초3", "초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3"];',
  '  var LV = { "초등학교": 0, "중학교": 6, "고등학교": 9 }, LM = { "초등학교": 63, "중학교": 448, "고등학교": 3584 };',
  '  /* 과목 → 여는 학년(초1=1 … 고3=2048) */',
  '  function masksOf(name) {',
  '    if (!name || typeof BRANCHES === "undefined") return null;',
  '    for (var i = 0; i < BRANCHES.length; i++) {',
  '      if (BRANCHES[i].name !== name) continue;',
  '      var b = BRANCHES[i], m = {};',
  '      for (var k in MAP) String(b[MAP[k]] || "").split(",").forEach(function (v) { var j = SEQ.indexOf(v.trim()); if (j > -1) m[k] = (m[k] || 0) | (1 << j); });',
  '      return m;',
  '    }',
  '    return null;',
  '  }',
  '  /* 허용 학년은 단추가 보이는 과목으로만 센다(숨긴 과목은 0) */',
  '  function fitGrades(name, box, sc, gd) {',
  '    var m = masksOf(name), cs = box.querySelectorAll("input"), all = 0, i, o, c, ok, lv;',
  '    if (m) for (i = 0; i < cs.length; i++) all |= m[cs[i].value] || 0;',
  '    if (!all) m = null;',
  '    if (sc && gd) {',
  '      for (i = 0; i < sc.options.length; i++) { o = sc.options[i]; o.disabled = !!m && LM[o.value] > 0 && !(all & LM[o.value]); }',
  '      o = sc.options[sc.selectedIndex];',
  `      if (o && o.disabled) { sc.value = ""; gd.innerHTML = '<option value="">학년 선택</option>'; gd.disabled = true; }`,
  '      lv = LV[sc.value];',
  '      for (i = 1; i < gd.options.length; i++) { o = gd.options[i]; o.disabled = !!m && lv != null && !(all & (1 << (lv + parseInt(o.value, 10) - 1))); }',
  '      o = gd.options[gd.selectedIndex];',
  '      if (o && o.disabled) gd.value = "";',
  '    }',
  '    var want = lv == null ? 4095 : gd.value ? 1 << (lv + parseInt(gd.value, 10) - 1) : LM[sc.value];',
  '    for (i = 0; i < cs.length; i++) {',
  '      c = cs[i]; ok = !m || !!((m[c.value] || 0) & want);',
  '      c.disabled = !ok; if (!ok) c.checked = false;',
  '      if (c.parentNode && c.parentNode.classList) { c.parentNode.classList.toggle("off", !ok); c.parentNode.classList.toggle("checked", c.checked); }',
  '    }',
  '  }',
  '  function bind(branchId, boxId, schoolId, gradeId) {',
  '    var sel = document.getElementById(branchId), box = document.getElementById(boxId);',
  '    if (!sel || !box) return;',
  '    function update() {',
  '      var subs = subjectsOf(sel.value);',
  '      Array.prototype.forEach.call(box.querySelectorAll("label"), function (l) {',
  '        var inp = l.querySelector("input"); if (!inp) return;',
  '        var ok = !subs || subs.indexOf(inp.value) > -1;',
  '        l.style.display = ok ? "" : "none";',
  '        if (!ok) { inp.checked = false; l.classList.remove("checked"); } /* 숨기는 과목은 눌린 표시(.checked)도 지운다 */',
  '      });',
  '      fitGrades(sel.value, box, document.getElementById(schoolId), document.getElementById(gradeId));',
  '    }',
  '    sel.addEventListener("change", update);',
  '    /* 지점이 코드로 바뀌는 경로(동에 지점이 1곳이면 자동 선택, 시도·시군구·동을 바꿔 지점이 비는 때, 폼 reset)는',
  '       지점 칸에 change 가 나지 않는다 — 같은 폼의 다른 select change·reset 뒤에도 다시 맞춘다 */',
  '    var host = sel.form || document;',
  '    host.addEventListener("change", function (e) { if (e.target !== sel && e.target.tagName === "SELECT") update(); });',
  '    host.addEventListener("reset", function () { setTimeout(update, 0); });',
  '    syncs.push(update);',
  '    update();',
  '  }',
  '  var syncs = [];',
  "  /* fbAutoSelect(지점 카드 '상담 신청')·URL 파라미터 자동 선택처럼 value 만 넣는 곳에서 부른다 */",
  '  window.wawaSyncSubjects = function () { for (var i = 0; i < syncs.length; i++) syncs[i](); };',
  '  bind("fs-branch", "fs-subjects", "fs-school", "fs-grade");',
  '  bind("m-branch", "m-subjects", "m-school", "m-grade");',
  '})();',
  '</script>',
].join('\n');
// 2026-11-27: 고른 지점이 묶음에 들면 묶음 전체로 센다 — 2026-11-25 꼴(HOME_V1)에서 subjectsOf·masksOf 두 덩어리만 바꾼 것이 지금 꼴(HOME_NEW)이다.
const HOME_SUBJ_V1 = [
  '  function subjectsOf(name) {',
  '    if (!name || typeof BRANCHES === "undefined") return null;',
  '    var b = null;',
  '    for (var i = 0; i < BRANCHES.length; i++) { if (BRANCHES[i].name === name) { b = BRANCHES[i]; break; } }',
  '    if (!b) return null;',
  '    var out = [];',
  '    for (var k in MAP) { if (String(b[MAP[k]] || "").trim()) out.push(k); }',
  '    return out;',
  '  }',
].join('\n');
const HOME_SUBJ_G = [
  `  /* ${MARK_G}: 같은 시·도와 시·군·구 안에서 상표 꼬리 '(W+)'·'(글로리드)'를 뗀 이름이 같은 지점들은 근방에서 함께 수업한다.`,
  '     그중 하나를 고르면 묶음 전체가 여는 과목·학년을 합쳐서 켜고 끈다. 묶음이 아니면 그 지점 하나다. 접수되는 지점 이름은 고른 그대로다. */',
  '  function groupOf(name) {',
  '    if (!name || typeof BRANCHES === "undefined") return null;',
  '    var cut = function (n) { return String(n).replace(/\\((?:W\\+|글로리드)\\)$/, ""); }, b = null, out = [], i;',
  '    for (i = 0; i < BRANCHES.length; i++) { if (BRANCHES[i].name === name) { b = BRANCHES[i]; break; } }',
  '    if (!b) return null;',
  '    for (i = 0; i < BRANCHES.length; i++) { if (BRANCHES[i].region === b.region && BRANCHES[i].district === b.district && cut(BRANCHES[i].name) === cut(name)) out.push(BRANCHES[i]); }',
  '    return out;',
  '  }',
  '  function subjectsOf(name) {',
  '    var g = groupOf(name);',
  '    if (!g) return null;',
  '    var out = [];',
  '    for (var k in MAP) { for (var i = 0; i < g.length; i++) { if (String(g[i][MAP[k]] || "").trim()) { out.push(k); break; } } }',
  '    return out;',
  '  }',
].join('\n');
const HOME_MASK_V1 = [
  '  /* 과목 → 여는 학년(초1=1 … 고3=2048) */',
  '  function masksOf(name) {',
  '    if (!name || typeof BRANCHES === "undefined") return null;',
  '    for (var i = 0; i < BRANCHES.length; i++) {',
  '      if (BRANCHES[i].name !== name) continue;',
  '      var b = BRANCHES[i], m = {};',
  '      for (var k in MAP) String(b[MAP[k]] || "").split(",").forEach(function (v) { var j = SEQ.indexOf(v.trim()); if (j > -1) m[k] = (m[k] || 0) | (1 << j); });',
  '      return m;',
  '    }',
  '    return null;',
  '  }',
].join('\n');
const HOME_MASK_G = [
  '  /* 과목 → 여는 학년(초1=1 … 고3=2048). 묶음이면 묶음 합집합 */',
  '  function masksOf(name) {',
  '    var g = groupOf(name), m = {};',
  '    if (!g) return null;',
  '    g.forEach(function (b) { for (var k in MAP) String(b[MAP[k]] || "").split(",").forEach(function (v) { var j = SEQ.indexOf(v.trim()); if (j > -1) m[k] = (m[k] || 0) | (1 << j); }); });',
  '    return m;',
  '  }',
].join('\n');
// 덩어리가 꼭 한 번 나와야 바꾼다
function swapOnce(text, from, to, what) {
  if (text.split(from).length !== 2) fail(`${what}: 바꿀 덩어리가 한 번 나오지 않음`);
  return text.replace(from, () => to);
}
const HOME_NEW = swapOnce(swapOnce(HOME_V1, HOME_SUBJ_V1, HOME_SUBJ_G, '홈 subjectsOf'), HOME_MASK_V1, HOME_MASK_G, '홈 masksOf');

// ── ③ 후기 페이지 상담 창 ─────────────────────────────────────────────────
const REV_OLD = [
  '// 학교-학년 연동',
  '(function(){',
  "  var school = document.getElementById('fs-school');",
  "  var grade = document.getElementById('fs-grade');",
  '  if(!school || !grade) return;',
  '  var GRADES = {',
  "    '초등학교': [1,2,3,4,5,6],",
  "    '중학교': [1,2,3],",
  "    '고등학교': [1,2,3]",
  '  };',
  "  school.addEventListener('change', function(){",
  '    var sel = school.value;',
  '    var list = GRADES[sel] || [];',
  `    grade.innerHTML = '<option value="">' + (list.length ? '학년 선택' : '-') + '</option>';`,
  '    list.forEach(function(g){',
  "      var o = document.createElement('option');",
  "      o.textContent = g + '학년';",
  '      grade.appendChild(o);',
  '    });',
  '    grade.disabled = !list.length;',
  '  });',
  '})();',
].join('\n');
const REV_V1 = [
  REV_OLD,
  '',
  `/* ${MARK}: 아래 '신청 지점 선택'(#r-branch)에서 고른 지점이 열지 않는 학교급·학년은 고를 수 없게 하고,`,
  '   고른 학년(학교급만 골랐으면 그 학교급)에 그 지점이 열지 않는 과목은 흐리게(.off) 한다. 지점을 안 골랐으면 모두 그대로 연다.',
  '   이미 고른 값이 막히면 그 값만 푼다. 자료는 branches.js 의 grade_* 칸(scripts/form_grade_filter_2026-11-25.cjs). */',
  '(function(){',
  "  var s = document.getElementById('fs-school'), g = document.getElementById('fs-grade');",
  "  if(!s || !g || typeof BRANCHES === 'undefined') return;",
  "  var SEQ = ['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1','고2','고3'], MAP = {'국어':'grade_kor', '영어':'grade_eng', '수학':'grade_math', '사회':'grade_soc', '과학':'grade_sci'}, GR = {};",
  "  BRANCHES.forEach(function(x){ var m = {}, k; for(k in MAP) String(x[MAP[k]] || '').split(',').forEach(function(v){ var j = SEQ.indexOf(v.trim()); if(j > -1) m[k] = (m[k] || 0) | (1 << j); }); GR[x.name] = m; });",
  ...fitLines("document.getElementById('r-branch')"),
  '})();',
].join('\n');
// 2026-11-27: 지점마다 센 GR 을 묶음끼리 합친다 — 2026-11-25 꼴(REV_V1)의 GR 만드는 줄 뒤에 한 덩어리를 더한 것이 지금 꼴(REV_NEW)이다.
const REV_GR_V1 = "  BRANCHES.forEach(function(x){ var m = {}, k; for(k in MAP) String(x[MAP[k]] || '').split(',').forEach(function(v){ var j = SEQ.indexOf(v.trim()); if(j > -1) m[k] = (m[k] || 0) | (1 << j); }); GR[x.name] = m; });";
const REV_GR_G = [
  REV_GR_V1,
  `  /* ${MARK_G}: 같은 시·도와 시·군·구 안에서 상표 꼬리 '(W+)'·'(글로리드)'를 뗀 이름이 같은 지점들은 근방에서 함께 수업한다.`,
  '     그중 하나를 고르면 묶음 전체가 여는 과목·학년을 합쳐서 켜고 끈다. 접수되는 지점 이름은 고른 그대로다. */',
  '  (function(){',
  "    var cut = function(n){ return String(n).replace(/\\((?:W\\+|글로리드)\\)$/, ''); }, by = {}, k;",
  "    BRANCHES.forEach(function(x){ k = x.region + '|' + x.district + '|' + cut(x.name); (by[k] = by[k] || []).push(x.name); });",
  '    for(k in by){ if(by[k].length < 2) continue; var u = {}; by[k].forEach(function(n){ for(var c in GR[n]) u[c] = (u[c] || 0) | GR[n][c]; }); by[k].forEach(function(n){ GR[n] = u; }); }',
  '  })();',
].join('\n');
const REV_NEW = swapOnce(REV_V1, REV_GR_V1, REV_GR_G, '후기 GR');

// ── 페이지 읽기 ───────────────────────────────────────────────────────────
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!/^[._]/.test(e.name) && e.name !== 'node_modules' && e.name !== 'scripts' && e.name !== 'assets') walk(p, out); }
    else if (e.name === 'index.html') out.push(p);
  }
  return out;
}
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
function kindOf(r) {
  const s = r.split('/'); s.pop();
  if (!s.length) return '홈';
  if (s[0] === 'reviews' && s.length === 1) return '후기';
  if (s[0] === 'inquiry' && s.length === 1) return '상담';
  if (s.length === 1) return '시도';
  if (s.length === 2) return '시군구';
  if (s.length === 3) return '지점';
  if (s[2] === 'dong') return s.length === 4 ? '동 허브' : '동×과목';
  if (s[2] === 'school') return '학교';
  return '기타';
}
// 줄끝을 지키며 바꾸기: 맞은 덩어리 안 줄끝(CRLF/LF)을 새 글에도 쓴다
const withEol = (matched, text) => (matched.includes('\r\n') ? text.replace(/\n/g, '\r\n') : text);

// 그 페이지 상담 폼(consultForm)의 지점들·학교급 선택지·과목 단추
function formFacts(h, r) {
  const fs0 = h.indexOf('<form id="consultForm"');
  if (fs0 < 0) return null;
  const fe = h.indexOf('</form>', fs0);
  if (fe < 0) fail(`${r}: consultForm 끝이 없음`);
  const form = h.slice(fs0, fe);
  if ((h.match(/<form\b/g) || []).length !== 1) fail(`${r}: 폼이 하나가 아님`);
  const names = [];
  let hidden = false, select = false;
  for (const m of form.matchAll(/<input type="hidden" name="지점" value="([^"]*)">/g)) { names.push(m[1]); hidden = true; }
  const sel = form.match(/<select[^>]*name="지점"[^>]*>([\s\S]*?)<\/select>/);
  if (sel) { select = true; for (const m of sel[1].matchAll(/<option value="([^"]+)"/g)) names.push(m[1]); }
  if (hidden && select) fail(`${r}: 숨은 지점 칸과 지점 선택칸이 둘 다 있음`);
  if (hidden && names.length !== 1) fail(`${r}: 숨은 지점 칸이 ${names.length}개`);
  const sc = form.match(/<select class="form-select" id="fs-school"[^>]*>([\s\S]*?)<\/select>/);
  if (!sc) fail(`${r}: 폼 안에 #fs-school 이 없음`);
  if (!/<select class="form-select" id="fs-grade"/.test(form)) fail(`${r}: 폼 안에 #fs-grade 가 없음`);
  const levels = [...sc[1].matchAll(/<option(?: value="([^"]*)")?(?: selected)?>([^<]*)<\/option>/g)].map((m) => (m[1] != null ? m[1] : m[2]));
  const pre = (sc[1].match(/<option(?: value="[^"]*")? selected>([^<]*)<\/option>/) || [])[1] || '';
  const gradeOpts = [...(form.match(/<select class="form-select" id="fs-grade"[^>]*>([\s\S]*?)<\/select>/) || [, ''])[1].matchAll(/<option>(\d)학년<\/option>/g)].map((m) => +m[1]);
  const box = form.match(/<div class="subject-checks">([\s\S]*?)<\/div>/);
  if (!box) fail(`${r}: 폼 안에 과목 단추가 없음`);
  // 동×과목 페이지는 그 과목 단추가 미리 눌려 있다(<label class="checked"><input … checked>)
  const subjects = [], checked = [];
  for (const m of box[1].matchAll(/<label( class="checked")?><input type="checkbox" name="과목" value="([^"]+)"( checked)?>\2<\/label>/g)) {
    if (!!m[1] !== !!m[3]) fail(`${r}: 과목 단추 눌림 표시가 어긋남`);
    subjects.push(m[2]);
    if (m[3]) checked.push(m[2]);
  }
  const nLabel = (box[1].match(/<label\b/g) || []).length;
  if (!subjects.length || subjects.length !== nLabel) fail(`${r}: 과목 단추 꼴이 다름`);
  return { names, hidden, select, levels, pre, gradeOpts, subjects, checked, formEnd: fe };
}

// 지점 하나를 걸렀을 때 막히는 것(모의 계산 — 페이지 스크립트와 같은 규칙)
function effectOf(m, facts) {
  if (!m) return null;
  let all = 0;
  for (const s of facts.subjects) all |= m[s] || 0;
  if (!all) return { fallback: true };
  const P = facts.levels.filter((l) => l in LM);
  const lvOff = P.filter((l) => !(all & LM[l]));
  const grOff = [];
  for (const l of P) { if (lvOff.includes(l)) continue; for (let n = 1; n <= LV_N[l]; n++) if (!(all & (1 << (LV[l] + n - 1)))) grOff.push(SEQ[LV[l] + n - 1]); }
  const subjNever = facts.subjects.filter((s) => !(m[s] || 0));
  const pmask = P.filter((l) => !lvOff.includes(l)).reduce((a, l) => a | LM[l], 0);
  const subjSome = facts.subjects.filter((s) => (m[s] || 0) && (all & pmask & ~m[s]));
  // 고를 수 있는 학년마다 고를 과목이 하나는 있어야 한다(접수가 막히면 안 됨)
  for (let i = 0; i < 12; i++) if ((all & pmask & (1 << i)) && !facts.subjects.some((s) => (m[s] || 0) & (1 << i))) fail('고를 과목이 없는 학년이 열림');
  return { lvOff, grOff, subjNever, subjSome, any: !!(lvOff.length || grOff.length || subjNever.length || subjSome.length) };
}

const plan = [];
const stat = {};
const bump = (k) => { stat[k] = (stat[k] || 0) + 1; };
const missingNames = new Map();
const countOf = (hay, needle) => hay.split(needle).length - 1;
const crlfOf = (t) => t.replace(/\n/g, '\r\n');

// ── 한 페이지: 폼 스크립트를 자료대로 맞춘 글을 돌려준다(바뀔 것이 없으면 받은 글 그대로) ────────────────
//   form_brand_group_2026-11-27.cjs 도 이 함수를 부른다(묶음 과목 단추를 더한 글을 넘겨 스크립트를 다시 맞춘다).
function fitPage(raw, r) {
  const kind = kindOf(r);
  let out = raw;
  if (kind === '홈') {
    // 원래 꼴(HOME_OLD)·2026-11-25 꼴(HOME_V1)·지금 꼴(HOME_NEW) 가운데 하나가 꼭 한 번 있어야 한다
    const hit = [];
    for (const v of [HOME_OLD, HOME_V1, HOME_NEW]) for (const t of [v, crlfOf(v)]) { const c = countOf(raw, t); if (c) hit.push({ v, t, c }); }
    if (hit.length !== 1 || hit[0].c !== 1) fail(`홈: wawaSyncSubjects 덩어리 ${hit.map((x) => x.c).join('+') || 0}곳`);
    if (hit[0].v !== HOME_NEW) { out = raw.replace(hit[0].t, () => (hit[0].t.includes('\r\n') ? crlfOf(HOME_NEW) : HOME_NEW)); bump('홈 바뀜'); } else bump('홈 이미 반영');
    plan.push([r, kind, '(BRANCHES)', '고른 지점 기준', '', '', ''].join('\t'));
  } else if (kind === '후기') {
    // 2026-11-25 꼴(REV_V1)과 지금 꼴(REV_NEW)은 원래 덩어리(REV_OLD)를 품고 있다. 그래서 뒤 판부터 센다
    let cur = null, neu = null, n = 0;
    for (const eol of [false, true]) {
      const [o, v1, nw] = [REV_OLD, REV_V1, REV_NEW].map((t) => (eol ? crlfOf(t) : t));
      const nNew = countOf(raw, nw), nV1 = countOf(raw, v1), nOld = countOf(raw, o) - nNew - nV1;
      n += nNew + nV1 + nOld;
      if (nNew + nV1 + nOld === 1) { cur = nNew ? nw : nV1 ? v1 : o; neu = nw; }
    }
    if (n !== 1 || !cur) fail(`후기: 학교-학년 연동 덩어리 ${n}곳`);
    if (cur !== neu) { out = raw.replace(cur, () => neu); bump('후기 바뀜'); } else bump('후기 이미 반영');
    plan.push([r, kind, '(BRANCHES)', '고른 지점 기준', '', '', ''].join('\t'));
  } else {
    const hits = [...raw.matchAll(RE_N)];
    if (!hits.length) { if (/var GRADES\b/.test(raw)) fail(`${r}: 학년 칸 스크립트 꼴이 다름`); if (/<form\b/.test(raw)) fail(`${r}: 폼은 있는데 학년 칸 스크립트가 없음`); return raw; }
    if (hits.length !== 1) fail(`${r}: 학년 칸 스크립트 ${hits.length}곳`);
    const h = raw.replace(/\r\n/g, '\n');
    const facts = formFacts(h, r);
    if (!facts) fail(`${r}: consultForm 이 없음`);
    if (h.indexOf("var GRADES = {'초등학교'") < facts.formEnd) fail(`${r}: 학년 칸 스크립트가 폼보다 앞`);
    // 이 폼의 지점들 → GR (자료 순서는 폼 선택지 순서, 과목은 국·영·수·사·과). 묶음에 든 지점은 묶음 합집합(2026-11-27)
    const GR = {};
    const eff = [];
    let grouped = false;
    for (const n of facts.names) {
      const m = groupMasksOf(n);
      if (!m) { missingNames.set(n, (missingNames.get(n) || 0) + 1); continue; }
      if (widened(n)) grouped = true;
      const e = effectOf(m, facts);
      eff.push([n, e]);
      GR[n] = m;
    }
    const any = eff.some(([, e]) => e && e.any);
    const want = any ? newN(JSON.stringify(GR), grouped) : ORIG_N;
    const cur = hits[0][0];
    const next = withEol(cur, want);
    if (cur !== next) out = raw.slice(0, hits[0].index) + next + raw.slice(hits[0].index + cur.length);
    bump(`${kind} ${any ? '거름' : '그대로(바뀔 것 없음)'}${facts.select ? ' · 지점 선택칸' : facts.hidden ? ' · 숨은 칸' : ''}`);
    if (any) {
      const fb = eff.filter(([, e]) => e && e.fallback).length;
      if (fb) bump(`  └ 단추 과목을 하나도 안 여는 지점(다 열어 둠) ${kind}`);
      if (grouped) bump(`  └ 묶음 합집합이 든 폼(${kind})`);
      if (facts.hidden && facts.pre && eff[0] && eff[0][1] && eff[0][1].lvOff && eff[0][1].lvOff.includes(facts.pre)) bump(`  └ 미리 고른 학교급을 지점이 안 염(${kind})`);
      if (facts.hidden && facts.checked.length && eff[0] && eff[0][1] && eff[0][1].subjNever && facts.checked.some((s) => eff[0][1].subjNever.includes(s))) bump(`  └ 미리 누른 과목을 지점이 안 염(${kind})`);
    }
    plan.push([r, kind, facts.names.join(','), facts.select ? '지점 선택칸' : facts.hidden ? '숨은 칸' : '없음',
      eff.map(([n, e]) => (e && !e.fallback ? `${n}:학교급[${e.lvOff.join('·')}] 학년[${e.grOff.join('·')}] 안여는과목[${e.subjNever.join('·')}] 일부학년과목[${e.subjSome.join('·')}]` : `${n}:-`)).join(' / '),
      facts.subjects.join('·'), any ? '거름' : '그대로'].join('\t'));
  }
  // 바꾼 인라인 스크립트가 문법에 맞는지 (스크립트 밖은 한 글자도 안 바뀐다)
  if (out !== raw) for (const m of out.matchAll(/<script>([\s\S]*?)<\/script>/g)) if (m[1].includes(MARK)) { try { new vm.Script(m[1]); } catch (e) { fail(`${r}: 스크립트 문법 오류 ${e.message}`); } }
  return out;
}

function main() {
  const changes = [];
  for (const f of walk(ROOT)) {
    const r = rel(f);
    const raw = fs.readFileSync(f, 'utf8');
    const out = fitPage(raw, r);
    if (out !== raw) changes.push({ f, r, kind: kindOf(r), raw, out });
  }
  const nonData = [...missingNames.keys()].filter((n) => n !== '일반문의');
  if (nonData.length) fail('자료에 없는 지점: ' + nonData.join(', '));

  console.log('페이지 종류별:');
  for (const [k, v] of Object.entries(stat).sort()) console.log(`  ${k}: ${v}`);
  const byKind = {};
  for (const c of changes) byKind[c.kind] = (byKind[c.kind] || 0) + 1;
  console.log(`바뀔 페이지 ${changes.length}장 ${JSON.stringify(byKind)} (폼 스크립트만 — 날짜는 그대로)`);
  if (missingNames.size) console.log('자료에 없는 지점 값(그대로 둠): ' + [...missingNames].map(([k, v]) => `${k} ${v}장`).join(', '));
  if (LIST) fs.writeFileSync(LIST, changes.map((c) => c.r).join('\n') + (changes.length ? '\n' : ''), 'utf8');
  if (PLAN) fs.writeFileSync(PLAN, ['경로\t종류\t지점\t지점 칸\t막히는 것(지점별)\t과목 단추\t결과', ...plan].join('\n') + '\n', 'utf8');
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
}

// 직접 돌리면 페이지를 훑고, require 로 불리면(form_brand_group_2026-11-27.cjs) 틀·셈만 내준다
module.exports = { ROOT, DATA, SEQ, SUBJ, MARK, MARK_G, GROUPS, masksOf, groupMasksOf, widened, walk, rel, kindOf, formFacts, effectOf, fitPage, fail, stat, plan, missingNames };
if (require.main === module) main();
