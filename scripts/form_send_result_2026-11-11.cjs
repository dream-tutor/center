#!/usr/bin/env node
// 2026-11-11 — 상담 폼: 서버에 닿았을 때만 완료 화면 (사장님 결정 11-11 「와와 코칭센터 … 상담 폼 — 고쳐줘」, 점검 wawa-B-10).
//   전에는 하위 페이지 2,295장이 new Image() 로, 홈 폼 두 개(본문·모달)가 숨은 form+iframe 으로 GAS 에 GET 을 보낸 뒤
//   0.8초(하위)·1.5초(홈 본문)·바로(홈 모달) 무조건 '신청 완료'를 띄웠다 — 통신이 끊겨도 학부모는 접수된 줄 알았다.
//   이제 fetch(…, {mode:'no-cors', cache:'no-store'}) 가 resolve(서버에 닿음) 하면 예전 완료 동작을 그대로, reject 하거나 10초 안에
//   끝나지 않으면 버튼을 되살리고 안내 창(와와 학습학원 52a4070fb7 과 같은 글)을 띄운다. 와와 학습학원·와와센터·학습가이드(11-10)와 같은 방식.
//   GAS 안쪽 오류·한도 초과는 no-cors 로도 못 가린다(응답을 못 읽음).
//   지키는 것: GAS 주소·키·값·순서는 그대로 — 하위 페이지는 같은 params 문자열(encodeURIComponent)을 그대로 쓰고, 홈 두 폼은 숨은 form 이 보내던
//   것과 같은 바이트가 되게 URLSearchParams(= 브라우저 폼 GET 직렬화) + 줄바꿈 CRLF 로 만든다. fetch 나 URLSearchParams 가 없는 브라우저는
//   예전 코드(이미지·숨은 form)가 그대로 돈다. 칸 id·name·마크업은 건드리지 않는다(t.js WF 표가 칸 id 를 읽는다). t.js 는 fetch 도
//   script.google.com/macros 면 form 으로 센다 — 한 번의 제출에 fetch 나 예전 방식 중 하나만 나가므로 한 번만 센다.
//   폼 스크립트만 바뀌므로 data-iso·사이트맵 lastmod 는 올리지 않는다. 줄끝(CRLF/LF)은 파일마다 원래대로.
//   생성기(git 밖 와와(wawacenter.kr) 의 _gen_dong.py·scripts/build_extra_pages.py·generate_pages.py)도 --gen 으로 같은 글자로 맞춘다
//   (f-string 인 두 파일은 중괄호를 두 겹으로). 쌍둥이 와와 저장소의 html 은 옛 도메인(301)이라 손대지 않는다(10-28 과 같음).
// 사용: node scripts/form_send_result_2026-11-11.cjs                  → 바뀔 곳만 세어 보여 준다(아무것도 안 씀)
//       node scripts/form_send_result_2026-11-11.cjs --write          → 이 저장소 html 을 다시 쓴다
//       node scripts/form_send_result_2026-11-11.cjs --gen [--write]  → 생성기 세 파일(기본 ../와와(wawacenter.kr), WAWA_GEN_DIR 로 덮어쓰기)
//       --emit <폴더> --sample <상대경로,…> → 그 페이지들의 고친 사본만 <폴더>/<상대경로> 에 쓴다(시험용, 저장소는 안 건드림)
//   다시 돌려도 안전: 이미 고친 곳은 '이미 반영'으로 세고 넘어간다. 셈이 하나라도 어긋나면 아무것도 쓰지 않고 멈춘다.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.env.CENTER_ROOT ? path.resolve(process.env.CENTER_ROOT) : path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const GEN = args.includes('--gen');
const argv = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const EMIT = argv('--emit');
const SAMPLE = (argv('--sample') || '').split(',').map(s => s.trim()).filter(Boolean);
const GEN_DIR = process.env.WAWA_GEN_DIR ? path.resolve(process.env.WAWA_GEN_DIR) : path.resolve(ROOT, '..', '와와(wawacenter.kr)');

const GAS = 'https://script.google.com/macros/s/AKfycbybsuTZMjzlp3HkkVaUX0IUFnNlSfnnN0DGThb-2BOIwZ8IyZNnMgkwoWOb_muHCEx5/exec';
const BTN = '📋 지금 상담 신청하기';
const FAIL_MSG = '접수가 전달되지 않았습니다. 인터넷 연결을 확인하고 다시 보내 주세요. 급하시면 전화로 연락 주셔도 됩니다.'; // 와와 학습학원 52a4070fb7 과 같은 글
const MARK = '서버에 닿았을 때만 완료 화면(2026-11-11)';                                                                   // 이미 반영 표시
const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', 'scripts', 'assets']);

// ── 하위 페이지(2,295장) ───────────────────────────────────────────────
// 완료 동작 두 꼴 — A: 동·동×과목·학교·후기(폼 숨기고 consultSuccess, 2.5초 뒤 창 닫기)  B: 지점·시도·시군구·상담(successModal, 폼 비우고 버튼 복구)
const INNER_A = [
  "      form.style.display='none';",
  "      document.getElementById('consultSuccess').style.display='block';",
  '      if(window.wcs){var _n={};_n["cnv"]=wcs.cnv("2","1");wcs_do(_n);}',
  '      setTimeout(closeConsult, 2500);',
].join('\n');
const INNER_B = [
  "      document.getElementById('successModal').classList.add('active');",
  '      form.reset();',
  "      btn.textContent = '" + BTN + "';",
  '      btn.disabled = false;',
].join('\n');
const SUB_OLD_RE = /^    var img = new Image\(\);\n    img\.src = '([^']*)\?'\+params;\n    setTimeout\(function\(\)\{\n([\s\S]*?)\n    \}, 800\);$/gm;
function subNew(urlExpr, inner) {               // urlExpr: "'https://…/exec?'" (페이지) 또는 "'{SCRIPT_URL}?'" (generate_pages.py)
  return [
    '    /* ' + MARK + ': GAS 는 응답을 못 읽지만 no-cors fetch 는 서버에 닿으면 resolve, 못 닿으면 reject 다.',
    '       못 닿거나 10초 안에 끝나지 않으면 버튼을 되살리고 안내한다. fetch 가 없는 브라우저만 예전처럼 이미지로 보낸다. */',
    '    var url = ' + urlExpr + '+params, settled = false;',
    '    function finish(ok){',
    '      if(settled) return;',
    '      settled = true;',
    '      if(ok){',
    inner.split('\n').map(l => '  ' + l).join('\n'),
    '      } else {',
    "        btn.textContent = '" + BTN + "';",
    '        btn.disabled = false;',
    "        alert('" + FAIL_MSG + "');",
    '      }',
    '    }',
    '    var timer = setTimeout(function(){ finish(false); }, 10000);',
    '    if(window.fetch){',
    "      fetch(url, {mode:'no-cors', cache:'no-store'}).then(function(){ clearTimeout(timer); finish(true); }, function(){ clearTimeout(timer); finish(false); });",
    '    } else {',
    '      var img = new Image();',
    '      img.src = url;',
    '      setTimeout(function(){ clearTimeout(timer); finish(true); }, 800);',
    '    }',
  ].join('\n');
}
function subOld(urlLit, inner) {
  return ['    var img = new Image();', "    img.src = '" + urlLit + "?'+params;", '    setTimeout(function(){', inner, '    }, 800);'].join('\n');
}

// ── 홈(index.html) 두 폼 — 예전 숨은 form 코드 바로 앞에 fetch 갈래를 끼운다(예전 코드는 fetch·URLSearchParams 없는 브라우저용으로 그대로 남음) ──
const HOME_INLINE_ANCHOR = "      var iframeId = 'gas_iframe_' + Date.now();\n";   // 본문 폼(6칸 들여쓰기) — 한 번만 나온다
const HOME_MODAL_ANCHOR = "  var iframeId = 'gas_iframe_' + Date.now();\n";       // 모달(2칸) — 한 번만 나온다
const HOME_INLINE_NEW = [
  '      /* ' + MARK + ': 숨은 form 이 보내던 것과 같은 주소·바이트(URLSearchParams = 브라우저 폼 GET 직렬화, 줄바꿈 CRLF)를 fetch(no-cors)로 보낸다.',
  '         서버에 닿으면 예전 완료 동작(showSuccess), 못 닿거나 10초 안에 끝나지 않으면 버튼을 되살리고 안내한다. 둘 중 하나가 없는 브라우저는 아래 예전 코드. */',
  '      if (window.fetch && window.URLSearchParams) {',
  '        var gasQs = new URLSearchParams();',
  "        Object.keys(data).forEach(function(k){ gasQs.append(k, String(data[k]).replace(/\\r\\n|\\r|\\n/g, '\\r\\n')); });",
  '        var gasSettled = false;',
  '        var gasFinish = function(ok){',
  '          if (gasSettled) return;',
  '          gasSettled = true;',
  '          if (ok) { showSuccess(); return; }',
  "          btn.textContent = '" + BTN + "';",
  '          btn.disabled = false;',
  "          alert('" + FAIL_MSG + "');",
  '        };',
  '        var gasTimer = setTimeout(function(){ gasFinish(false); }, 10000);',
  "        fetch(SCRIPT_URL + '?' + gasQs.toString(), {mode:'no-cors', cache:'no-store'}).then(function(){ clearTimeout(gasTimer); gasFinish(true); }, function(){ clearTimeout(gasTimer); gasFinish(false); });",
  '        return;',
  '      }',
  '',
].join('\n');
const HOME_MODAL_NEW = [
  '  /* ' + MARK + ': 본문 폼과 같은 방식. 보내는 동안 버튼을 막아 두 번 눌러도 한 번만 간다. 둘 중 하나가 없는 브라우저는 아래 예전 코드. */',
  '  if (window.fetch && window.URLSearchParams) {',
  "    var gasBtn = form.querySelector('.form-submit');",
  '    var gasQs = new URLSearchParams();',
  "    Object.keys(data).forEach(function(k){ gasQs.append(k, String(data[k]).replace(/\\r\\n|\\r|\\n/g, '\\r\\n')); });",
  "    if (gasBtn) { gasBtn.disabled = true; gasBtn.textContent = '⏳ 전송 중...'; }",
  '    var gasSettled = false;',
  '    var gasFinish = function(ok){',
  '      if (gasSettled) return;',
  '      gasSettled = true;',
  '      if (ok) {',
  "        form.style.display='none';",
  "        document.getElementById('consultModalSuccess').style.display='block';",
  '        if(window.wcs){ var _nasa3={}; _nasa3["cnv"]=wcs.cnv("2","1"); wcs_do(_nasa3); }',
  '        setTimeout(closeConsultModal,3000);',
  '        return;',
  '      }',
  "      if (gasBtn) { gasBtn.disabled = false; gasBtn.textContent = '" + BTN + "'; }",
  "      alert('" + FAIL_MSG + "');",
  '    };',
  '    var gasTimer = setTimeout(function(){ gasFinish(false); }, 10000);',
  "    fetch(SCRIPT_URL + '?' + gasQs.toString(), {mode:'no-cors', cache:'no-store'}).then(function(){ clearTimeout(gasTimer); gasFinish(true); }, function(){ clearTimeout(gasTimer); gasFinish(false); });",
  '    return;',
  '  }',
  '',
].join('\n');

// ── 공통 도우미 ──
const problems = [];
const out = new Map();          // 절대경로 → 새 글(LF)
const crlf = new Set();
const stat = { pages: 0, forms: 0, A: 0, B: 0, home: 0, already: 0 };
const rel = f => path.relative(ROOT, f).split(path.sep).join('/');
const count = (s, needle) => s.split(needle).length - 1;
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) yield* walk(path.join(dir, e.name)); }
    else if (e.name.endsWith('.html')) yield path.join(dir, e.name);
  }
}
const FORM_RE = /<select class="form-input" name="연락처앞"/g;            // 폼 하나에 하나(10-28 스크립트와 같은 셈)
// 고친 뒤 MARK 가 든 인라인 <script> 를 문법 검사(돌리지는 않음)
function syntaxCheck(f, h) {
  const re = /<script>([\s\S]*?)<\/script>/g; let m, n = 0;
  while ((m = re.exec(h))) {
    if (m[1].indexOf(MARK) < 0) continue;
    n++;
    try { new vm.Script(m[1], { filename: rel(f) }); } catch (e) { problems.push([f, '고친 스크립트 문법 오류: ' + e.message]); }
  }
  return n;
}

function processSub(f, h, forms) {
  if (forms !== 1) { problems.push([f, `폼 ${forms}개(하위 페이지는 1개여야 함)`]); return null; }
  const done = count(h, MARK);
  const olds = [...h.matchAll(SUB_OLD_RE)];
  if (!olds.length && done === 1) { stat.already++; return h; }
  if (olds.length !== 1 || done !== 0) { problems.push([f, `옛 전송 블록 ${olds.length}개·이미 반영 ${done}개`]); return null; }
  const [whole, url, inner] = olds[0];
  if (url !== GAS) { problems.push([f, 'GAS 주소가 다름: ' + url]); return null; }
  const v = inner === INNER_A ? 'A' : inner === INNER_B ? 'B' : null;
  if (!v) { problems.push([f, '완료 동작이 두 꼴(A·B) 어느 것과도 다름']); return null; }
  const hs = h.lastIndexOf("addEventListener('submit'", olds[0].index);
  const handler = h.slice(hs, olds[0].index);
  if (!/var btn = form\.querySelector\('\.form-submit'\);\n    btn\.textContent = '⏳ 전송 중\.\.\.';\n    btn\.disabled = true;/.test(handler)) { problems.push([f, '제출 처리 앞부분(btn 막기)이 예상과 다름']); return null; }
  if (/\b(url|settled|timer|finish)\b/.test(handler)) { problems.push([f, '제출 처리에 같은 이름(url·settled·timer·finish)이 이미 있음']); return null; }
  stat[v]++;
  return h.replace(whole, () => subNew("'" + GAS + "?'", inner));
}
function processHome(f, h) {
  const done = count(h, MARK);
  const ia = count(h, HOME_INLINE_ANCHOR), ma = count(h, HOME_MODAL_ANCHOR) - ia; // 6칸 줄도 2칸 줄을 품는다
  if (done === 2 && h.includes(HOME_INLINE_NEW + HOME_INLINE_ANCHOR)) { stat.already++; return h; }
  if (done !== 0 || ia !== 1 || ma !== 1) { problems.push([f, `홈 앵커 본문 ${ia}·모달 ${ma}·이미 반영 ${done}`]); return null; }
  if (count(h, "var SCRIPT_URL = '" + GAS + "';") !== 2) { problems.push([f, '홈 SCRIPT_URL 이 GAS 와 다름']); return null; }
  if (!/^      setTimeout\(function\(\)\{ showSuccess\(\); document\.body\.removeChild\(iframe\); document\.body\.removeChild\(hf\); \}, 1500\);$/m.test(h)) { problems.push([f, '홈 본문 폼 끝줄이 예상과 다름']); return null; }
  h = h.replace(HOME_INLINE_ANCHOR, () => HOME_INLINE_NEW + HOME_INLINE_ANCHOR);
  const mi = h.indexOf('\n' + HOME_MODAL_ANCHOR) + 1;                          // 줄 머리의 2칸 줄(본문 6칸 줄이 아닌 것)
  if (mi <= 0) { problems.push([f, '홈 모달 앵커를 못 찾음']); return null; }
  h = h.slice(0, mi) + HOME_MODAL_NEW + h.slice(mi);
  stat.home++;
  return h;
}

function processPage(f) {
  let raw = fs.readFileSync(f, 'utf8');
  const forms = (raw.match(FORM_RE) || []).length;
  if (!forms) return;
  stat.pages++; stat.forms += forms;
  if (raw.includes('\r\n')) crlf.add(f);
  const h0 = raw.replace(/\r\n/g, '\n');
  const isHome = rel(f) === 'index.html';
  const before = problems.length;
  const h = isHome ? (forms === 2 ? processHome(f, h0) : (problems.push([f, '홈 폼 수 ' + forms]), null)) : processSub(f, h0, forms);
  if (h == null || problems.length > before) return;
  if (h === h0) return;
  const marks = count(h, MARK), want = isHome ? 2 : 1;
  if (marks !== want) { problems.push([f, `반영 표시 ${marks}개(기대 ${want})`]); return; }
  if (count(h, "mode:'no-cors'") !== want) { problems.push([f, 'no-cors fetch 수가 폼 수와 다름']); return; }
  const checked = syntaxCheck(f, h);
  if (checked !== want) { problems.push([f, `문법 검사한 스크립트 ${checked}개(기대 ${want})`]); return; }
  out.set(f, h);
}

// ── 생성기(git 밖) ──
const GEN_FILES = [
  { file: '_gen_dong.py', fstring: true, inner: INNER_A, urlLit: GAS, urlExpr: "'" + GAS + "?'" },
  { file: path.join('scripts', 'build_extra_pages.py'), fstring: false, inner: INNER_A, urlLit: GAS, urlExpr: "'" + GAS + "?'" },
  { file: 'generate_pages.py', fstring: true, inner: INNER_B, urlLit: '{SCRIPT_URL}', urlExpr: "'{SCRIPT_URL}?'" },
];
const genOut = new Map();
function dbl(s) {                                     // f-string 용: 중괄호 두 겹, 단 {SCRIPT_URL} 자리표시는 그대로
  return s.replace(/\{SCRIPT_URL\}/g, '\u0000').replace(/\{/g, '{{').replace(/\}/g, '}}').replace(/\u0000/g, '{SCRIPT_URL}');
}
function processGen() {
  for (const g of GEN_FILES) {
    const f = path.join(GEN_DIR, g.file);
    if (!fs.existsSync(f)) { problems.push([f, '생성기 파일 없음']); continue; }
    const raw = fs.readFileSync(f, 'utf8');
    if (raw.includes('\r\n')) crlf.add(f);
    const h = raw.replace(/\r\n/g, '\n');
    const oldS = subOld(g.urlLit, g.inner), newS = subNew(g.urlExpr, g.inner);
    const oldT = g.fstring ? dbl(oldS) : oldS, newT = g.fstring ? dbl(newS) : newS;
    const no = count(h, oldT), nn = count(h, newT);
    if (no === 0 && nn === 1) { stat.already++; continue; }
    if (no !== 1 || nn !== 0) { problems.push([f, `생성기 옛 블록 ${no}·새 블록 ${nn}`]); continue; }
    genOut.set(f, h.replace(oldT, () => newT));
  }
}

// ── 실행 ──
if (GEN) processGen();
else for (const f of walk(ROOT)) processPage(f);

if (GEN) console.log(`생성기 ${GEN_FILES.length}개 (${GEN_DIR}) → 바뀔 파일 ${genOut.size} · 이미 반영 ${stat.already}`);
else {
  console.log(`폼 페이지 ${stat.pages}장 · 폼 ${stat.forms}개 → 바뀔 파일 ${out.size} (하위 A ${stat.A} · 하위 B ${stat.B} · 홈 ${stat.home} · 이미 반영 ${stat.already})`);
  console.log(`  줄끝 CRLF 로 되돌려 쓸 파일 ${[...out.keys()].filter(f => crlf.has(f)).length} · LF 그대로 ${[...out.keys()].filter(f => !crlf.has(f)).length}`);
}
if (problems.length) {
  console.log(`\n[멈춤] ${problems.length}건 — 아무것도 쓰지 않았습니다.`);
  for (const [f, why] of problems.slice(0, 50)) console.log(`  ${f}: ${why}`);
  process.exit(1);
}
const writeOne = (f, h, dest) => fs.writeFileSync(dest || f, crlf.has(f) ? h.replace(/\n/g, '\r\n') : h, 'utf8');
if (EMIT && SAMPLE.length) {
  for (const r of SAMPLE) {
    const f = path.join(ROOT, r);
    const h = out.get(f);
    if (!h) { console.log(`  (사본 없음 — 바뀌지 않는 페이지) ${r}`); continue; }
    const dest = path.join(EMIT, r);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    writeOne(f, h, dest);
  }
  console.log(`→ 사본 ${SAMPLE.length}장을 ${EMIT} 에 썼습니다(저장소는 그대로).`);
} else if (WRITE) {
  const m = GEN ? genOut : out;
  for (const [f, h] of m) writeOne(f, h);
  console.log(`→ ${m.size}개 파일을 다시 썼습니다.`);
} else console.log('--write 를 붙이면 씁니다.');
