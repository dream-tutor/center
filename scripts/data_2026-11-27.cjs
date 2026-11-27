#!/usr/bin/env node
// 2026-11-27 코칭센터_데이터_261127 → wcoachingcenter.com 반영 (사장님 11-27 "최신자료 반영 — 기존에 실수나 오자가 그대로 있는 경우는 기존 방향을 그대로",
//   학교 목록 "시트대로", 야탑점 여수초 "성남여수초로 바꿈"). 기준본 wstudycenter.com/data/branches.json 에서 바뀐 10곳의 값을 읽는다
//   (독립 검토 뒤 행신점 주말 '…일요일은 시험 4주 전부터 자습실 운영'·동백점 소개 글 '같은 센터에서' 뺌을 더함).
//   이 스크립트가 맡는 것(구조·자료) — 글 단위 손질은 뒤에 돌리는 11-25 스크립트들이 기준본을 읽어 다시 맞춘다(scripts/_README.md):
//   - 자료 사본: assets/branches.json(center·쌍둥이 와와, 바뀐 칸만), 루트 branches.js 의 학년·학교·운영시간·주말 칸
//   - 지점 페이지 9장: 과목·학년 표, 희망 과목 체크, 설명문 앞 세 과목, 소개 문단 과목·가까운 학교, 인근 학교 묶음, 운영시간·주말수업 줄
//   - 동 허브: 과목이 바뀐 동(신현동·염창동·월성동·이충동)의 제목·설명문·h1·과목 줄·과목 바로가기·희망 과목, 학교가 바뀐 동(별내동·여수동)의 인근 학교 묶음,
//     별내점 ⏰ 줄, 여수초 → 성남여수초 글자
//   - 동×과목: 과목이 빠진 동은 그 과목 페이지를 동 허브로 가는 이동 안내로(신현동·염창동 국어), 생긴 동은 같은 동 형제 페이지를 복제(월성동 사회·이충동 국어),
//     과목이 바뀐 동의 다른 과목 바로가기·희망 과목, 학교가 바뀐 동의 인근 학교 묶음, 별내점 ⏰ 줄, 여수초 글자
//   - 시도·시군구 지점 카드의 가능 과목(과목이 바뀐 4곳)
//   - 학교 페이지: 과목이 바뀐 지점 카드의 가능 과목·과목 합집합 글·희망 과목(학교급 거르기는 뒤의 school_text_2026-11-25.cjs),
//     주요 학교에서 빠져 어느 지점 목록에도 없게 된 학교(화접초·한삼중·한삼고·야탑초)는 그 지점 페이지로 가는 이동 안내,
//     여수초 → 성남여수초 는 새 주소에 같은 페이지(이름만 바꿈)를 만들고 옛 주소는 이동 안내
//   그대로 두는 것: 남는 학교 페이지의 지점 카드 구성(덕송초·한별초·퇴계원고등학교의 별내점 카드, 태원고·돌마고·송림고·화접중에 새로 들 지점 카드) —
//     카드 수가 바뀌면 폼(숨은 지점 칸 ↔ 지점 고르기)·교습비 줄까지 바뀌어 따로 본다. 새 주요 학교(하탑중·야탑고·영덕여고)는 학교 페이지가 없어 만들지 않는다
//     (10-27 내발산점 새 학교와 같은 판단). 학년 범위 글자(동×과목 대표 지점·동 단위)는 subject_text_2026-11-25.cjs ③, 지점 문단 범위는 branch_text, 허브 설명문 범위는
//     hub_text, 소개 문단(strengths)은 strengths_2026-10-27.cjs, '학년별 맞춤 프로그램' 칸은 grade_block_2026-11-24.cjs, 폼 학년 끄기 자료는 form_grade_filter_2026-11-25.cjs.
//   바뀐 페이지만 page-updated(data-iso·최종 업데이트)를 TODAY 로. 새 페이지(복제·이름 바꿈)도 TODAY. 사이트맵은 py -I _gen_sitemap.py.
// 사용: node scripts/data_2026-11-27.cjs [--write]   (작업 폴더 밖에서 돌릴 땐 CENTER_ROOT 로 저장소 위치)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.env.CENTER_ROOT || path.resolve(__dirname, '..');
const GROUP = path.resolve(ROOT, '..');
const WAWA = path.join(GROUP, '와와(wawacenter.kr)');
const BASE = process.env.BRANCH_SRC || path.join(GROUP, 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');
const TODAY = '2026-11-27';
const SITE = 'https://wcoachingcenter.com';

const base = JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, ''));
const BR = Object.values(base);
const bySlug = {}; for (const b of BR) bySlug[`${b.region_slug}/${b.district_slug}/${b.branch_slug}`] = b;

// 바뀐 지점과 할 일(값은 기준본에서 읽는다)
const CH = {
  두호점: { grades: true },
  하남풍산점: { grades: true },
  루원시티점: { subj: true },
  염창점: { subj: true },
  신월성점: { subj: true },
  이충점: { subj: true },
  별내점: { schools: true, open: true },
  야탑점: { schools: true },
  행신점: { weekend: true },
  동백점: {}, // 소개 글(strengths)만 — 자료 사본만 맞추고, 페이지 소개 문단은 strengths_2026-10-27.cjs 가 기준본에서 다시 쓴다
};
const DATA_FIELDS = ['subjects', 'grades_by_subject', 'schools_elem', 'schools_mid', 'schools_high', 'location_guide', 'open_time', 'weekend', 'strengths'];
const SCHOOL_RENAME = { 'gyeonggi/seongnam': { 여수초: '성남여수초' } };
const RENAME_RE = /(?<!성남)여수초/g; // '여수초' → '성남여수초' (이미 바뀐 글자는 그대로)
const SCHOOL_GONE = { 'gyeonggi/namyangju': { to: 'byeolnae', names: ['화접초', '한삼중', '한삼고'] }, 'gyeonggi/seongnam': { to: 'yatab', names: ['야탑초'] } };

const SUBJ = ['국어', '영어', '수학', '과학', '사회'];
const FORM_ORDER = ['국어', '영어', '수학', '사회', '과학']; // 상담 폼 과목 단추 순서(10-28)
const TITLE_ORDER = ['수학', '영어', '국어', '과학', '사회'];
const SLUG = { 국어: 'korean', 영어: 'english', 수학: 'math', 과학: 'science', 사회: 'social' };
const SLUG_ORDER = ['korean', 'english', 'math', 'science', 'social'];
const SUBJ_OF = Object.fromEntries(Object.entries(SLUG).map(([k, v]) => [v, k]));
const CHIP_ICON = { 국어: '📖', 영어: '🔤', 수학: '🧮', 과학: '🔬', 사회: '🌏' };
const CARD_ICON = { 국어: '📖', 영어: '🔤', 수학: '🔢', 과학: '🔬', 사회: '🌏' };
const CLS = { 국어: 'kor', 영어: 'eng', 수학: 'math', 과학: 'sci', 사회: 'soc' };
const GRADES = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
const LEVEL = (g) => (g[0] === '초' ? 'elem' : g[0] === '중' ? 'mid' : 'high');
const LEVEL_KO = { elem: '초등', mid: '중등', high: '고등' };

// ---- 입출력 ----
const out = new Map(); const crlf = new Set();
const stat = { edited: new Set(), created: [], stubbed: [], warn: [], notes: [] };
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const warn = (m) => { stat.warn.push(m); };
const note = (m) => { stat.notes.push(m); };
function read(f) {
  if (out.has(f)) return out.get(f);
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes('\r\n')) { crlf.add(f); return s.replace(/\r\n/g, '\n'); }
  return s;
}
function one(h, re, fn, what) {
  let n = 0; const r = h.replace(re, (...a) => { n++; return fn(...a); });
  if (n !== 1) throw new Error(`${what}: ${n}곳`);
  return r;
}
function bumpDate(h, f) {
  if (!/<div class="page-updated" data-iso="\d{4}-\d{2}-\d{2}"/.test(h)) throw new Error('page-updated 없음 ' + rel(f));
  h = h.replace(/(<div class="page-updated" data-iso=")\d{4}-\d{2}-\d{2}(")/, (x, a, z) => a + TODAY + z);
  return h.replace(/📅 최종 업데이트: \d{4}\.\d{2}\.\d{2}/, `📅 최종 업데이트: ${TODAY.replace(/-/g, '.')}`);
}
function save(f, h, orig, what) {
  if (h === orig) return;
  out.set(f, bumpDate(h, f)); stat.edited.add(f); if (what) note(`${rel(f)}  ${what}`);
}
const enc = (p) => p.split('/').map((x) => encodeURIComponent(x)).join('/');
function stubPage(target) {
  return `<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<title>페이지 이동 안내</title>\n<meta name="robots" content="noindex">\n<link rel="canonical" href="${target}">\n<meta http-equiv="refresh" content="0; url=${target}">\n<script>location.replace("${target}"+location.search+location.hash);</script>\n</head>\n<body>\n<p>페이지 주소가 변경되었습니다. <a href="${target}">이동하기</a></p>\n</body>\n</html>\n`;
}
function makeStub(f, target) { out.set(f, stubPage(target)); stat.stubbed.push(`${rel(f)} → ${decodeURIComponent(target)}`); }
const isStub = (f) => fs.existsSync(f) && read(f).includes('페이지 이동 안내');

// ---- 자료 ----
const subjOf = (b) => SUBJ.filter((s) => (b.subjects || []).includes(s));
const gradesOf = (b, s) => ((b.grades_by_subject || {})[s] || '').split(',').map((x) => x.trim()).filter(Boolean);
const sortG = (arr) => [...new Set(arr)].sort((a, c) => GRADES.indexOf(a) - GRADES.indexOf(c));
const rangeStr = (arr) => { const g = sortG(arr); return !g.length ? null : g[0] === g[g.length - 1] ? g[0] : `${g[0]}~${g[g.length - 1]}`; };
const eul = (s) => (/[1368]$/.test(s) ? '을' : '를');
const RANGE_RE = /[초중고]\d~[초중고]\d/g;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const inDong = (r, d, dong) => BR.filter((b) => b.region_slug === r && b.district_slug === d && b.dong === dong);
const schoolsOf = (b, lv) => b[`schools_${lv}`] || [];
const unionSchools = (bs, lv) => [...new Set(bs.flatMap((b) => schoolsOf(b, lv)))].sort();
const titleSJ = (subs) => TITLE_ORDER.filter((s) => subs.includes(s));
const descSJ = (subs) => { const t = titleSJ(subs); return t.length <= 2 ? t.map((s) => s + '학원').join('·') : t.join('·') + ' 학원'; };
const chipA = (href, s, dong) => `<a href="${href}" style="display:inline-block;padding:10px 20px;background:#fff;border:2px solid #0369A1;color:#0369A1;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;">${CHIP_ICON[s]} ${dong} ${s}학원</a>`;

// 희망 과목 체크: 지금 꼴(줄바꿈·들여쓰기 또는 한 줄, label class·checked)을 지키고 빠진 과목은 빼고 생긴 과목은 폼 순서 자리에 넣는다
function subjectChecks(h, subjects, what, checkedSubj) {
  return one(h, /<div class="subject-checks">([\s\S]*?)<\/div>/, (m, inner) => {
    const found = [...inner.matchAll(/<label( class="checked")?><input type="checkbox" name="과목" value="([^"]+)"( checked)?>([^<]*)<\/label>/g)];
    if (!found.length) throw new Error('희망 과목 label 없음 ' + what);
    const have = new Map(found.map((x) => [x[2], x[0]]));
    const lab = (s) => have.get(s) || (checkedSubj === s ? `<label class="checked"><input type="checkbox" name="과목" value="${s}" checked>${s}</label>` : `<label><input type="checkbox" name="과목" value="${s}">${s}</label>`);
    const order = FORM_ORDER.filter((s) => subjects.includes(s));
    const multi = inner.includes('\n');
    if (multi) { const ind = (inner.match(/\n([ \t]*)<label/) || [])[1] || '          '; const tail = (inner.match(/\n([ \t]*)$/) || [])[1] || '        '; return '<div class="subject-checks">' + order.map((s) => '\n' + ind + lab(s)).join('') + '\n' + tail + '</div>'; }
    const sep = /<\/label>\s+<label/.test(inner) ? ' ' : '';
    const lead = inner.match(/^\s*/)[0], trail = inner.match(/\s*$/)[0];
    return '<div class="subject-checks">' + lead + order.map(lab).join(sep) + trail + '</div>';
  }, '희망 과목 ' + what);
}
const SCHOOL_GROUPS_RE = /(<div class="school-section"><div class="school-section-title">[^<]*<\/div>)((?:<div class="school-group"><span class="school-group-label (?:elem|mid|high)">[^<]*<\/span><span class="school-list">[^<]*<\/span><\/div>)*)/;
function schoolGroups(h, lists, what) {
  return one(h, SCHOOL_GROUPS_RE, (m, head) => head + ['elem', 'mid', 'high'].filter((lv) => lists[lv].length)
    .map((lv) => `<div class="school-group"><span class="school-group-label ${lv}">${LEVEL_KO[lv]}</span><span class="school-list">${lists[lv].join(', ')}</span></div>`).join(''), '학교 묶음 ' + what);
}
// '집중 학교' 알약 묶음(WAWA_AUTO_SCHOOL_PAGE_LINKS): 주요 학교 가운데 학교 페이지가 있는 것만, 학교급별 가나다순.
//   짧은 이름(퇴계원고)은 긴 이름 페이지(퇴계원고등학교)로 잇는다 — 생성기와 같은 짝. 이동 안내가 된 페이지는 뺀다.
const LONG = [[/여고$/, '여자고등학교'], [/여중$/, '여자중학교'], [/초$/, '초등학교'], [/중$/, '중학교'], [/고$/, '고등학교']];
function schoolPageName(dir, n) {
  const ok = (x) => { const f = path.join(ROOT, dir, 'school', x, 'index.html'); return (out.has(f) && !out.get(f).includes('페이지 이동 안내')) || (fs.existsSync(f) && !isStub(f)); };
  if (ok(n)) return n;
  for (const [re, to] of LONG) if (re.test(n)) { const x = n.replace(re, to); if (ok(x)) return x; }
  return null;
}
function schoolChips(h, dir, bs, prefix, what) {
  const names = { elem: [], mid: [], high: [] };
  for (const lv of ['elem', 'mid', 'high']) for (const n of unionSchools(bs, lv)) { const p = schoolPageName(dir, n); if (p && !names[lv].includes(p)) names[lv].push(p); }
  for (const lv of ['elem', 'mid', 'high']) names[lv].sort();
  const list = [...names.elem, ...names.mid, ...names.high];
  return one(h, /(<!-- WAWA_AUTO_SCHOOL_PAGE_LINKS_START -->[\s\S]*?<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:600px;margin:0 auto;">)([\s\S]*?)(<\/div>\s*<p class="section-sub")/, (m, a, inner, z) => {
    const chips = [...inner.matchAll(/<a href="[^"]*school\/[^/"]+\/"[^>]*>🏫 [^<]*<\/a>/g)];
    const style = chips.length ? (chips[0][0].match(/ style="[^"]*"/) || [''])[0] : ' style="display:inline-block;padding:9px 16px;background:#fff;border:1.5px solid #0EA5E9;color:#0EA5E9;border-radius:50px;text-decoration:none;font-weight:700;font-size:13px;"';
    const sep = (inner.match(/<\/a>(\s+)<a/) || [])[1] || '';
    const lead = inner.match(/^\s*/)[0], trail = inner.match(/\s*$/)[0];
    return a + lead + list.map((n) => `<a href="${prefix}school/${n}/"${style}>🏫 ${n} 학원</a>`).join(sep) + trail + z;
  }, '집중 학교 알약 ' + what);
}
const nearSchoolsText = (b) => { const all = [...schoolsOf(b, 'elem'), ...schoolsOf(b, 'mid'), ...schoolsOf(b, 'high')]; return all.length > 4 ? `${all.slice(0, 4).join(', ')} 등입니다.` : `${all.join(', ')}입니다.`; };

// ---- 0. 자료 사본 ----
function syncJson(file, indent) {
  const raw = fs.readFileSync(file, 'utf8');
  const nl = raw.endsWith('\n') ? '\n' : '';
  const j = JSON.parse(raw.replace(/^﻿/, ''));
  if (JSON.stringify(j, null, indent) + nl !== raw) throw new Error('형식이 예상과 다름 ' + file);
  const lines = [];
  for (const name of Object.keys(CH)) {
    const b = base[name], c = j[name];
    if (!c) throw new Error(`${file} 에 ${name} 없음`);
    if (c.branch_slug !== b.branch_slug) throw new Error(`${name} slug 다름 ${c.branch_slug}/${b.branch_slug}`);
    for (const k of DATA_FIELDS) {
      if (JSON.stringify(c[k]) === JSON.stringify(b[k])) continue;
      lines.push(`${name}.${k}: ${JSON.stringify(c[k] === undefined ? null : c[k]).slice(0, 70)} → ${JSON.stringify(b[k] === undefined ? null : b[k]).slice(0, 70)}`);
      if (b[k] === undefined) delete c[k]; else c[k] = b[k];
    }
  }
  if (lines.length) { out.set(file, JSON.stringify(j, null, indent) + nl); stat.edited.add(file); }
  note(`${path.relative(GROUP, file)}: 바뀐 칸 ${lines.length}` + (lines.length ? '\n    ' + lines.join('\n    ') : ''));
}
function dumpsArr(arr) { return '[' + arr.map((o) => '{' + Object.keys(o).map((k) => JSON.stringify(k) + ': ' + JSON.stringify(o[k])).join(', ') + '}').join(', ') + ']'; }
function syncBranchesJs(file) {
  const s = fs.readFileSync(file, 'utf8');
  const a = s.indexOf('['); const z = s.indexOf('];', a);
  const arr = JSON.parse(s.slice(a, z + 1));
  if (dumpsArr(arr) !== s.slice(a, z + 1)) throw new Error('branches.js 형식이 예상과 다름');
  const lines = [];
  for (const name of Object.keys(CH)) {
    const b = base[name];
    const i = arr.findIndex((x) => x.branch_en === b.branch_slug && x.region_en === b.region_slug && x.district_en === b.district_slug);
    if (i < 0) throw new Error('branches.js 에 ' + name + ' 없음');
    const x = arr[i], g = b.grades_by_subject || {};
    const want = {
      grade_kor: g['국어'] || '', grade_eng: g['영어'] || '', grade_math: g['수학'] || '', grade_sci: g['과학'] || '', grade_soc: g['사회'] || '',
      school_elem: schoolsOf(b, 'elem').join(', '), school_mid: schoolsOf(b, 'mid').join(', '), school_high: schoolsOf(b, 'high').join(', '),
      open_time: b.open_time, weekend: b.weekend,
    };
    if (b.weekend === '주말불가' && 'weekend_time' in x) want.weekend_time = '';
    for (const [k, v] of Object.entries(want)) {
      if (!(k in x)) { if (v) warn(`branches.js ${name} 에 ${k} 칸 없음`); continue; }
      if (x[k] !== v) { lines.push(`${name}.${k}: ${JSON.stringify(x[k]).slice(0, 60)} → ${JSON.stringify(v).slice(0, 60)}`); x[k] = v; }
    }
  }
  if (lines.length) { out.set(file, s.slice(0, a) + dumpsArr(arr) + s.slice(z + 1)); stat.edited.add(file); }
  note(`branches.js: 바뀐 칸 ${lines.length}` + (lines.length ? '\n    ' + lines.join('\n    ') : ''));
}

// ---- 1. 지점 페이지 ----
function editBranchPage(b, c) {
  const f = path.join(ROOT, b.region_slug, b.district_slug, b.branch_slug, 'index.html');
  const orig = read(f); let h = orig; const did = [];
  if (!h.includes(`<title>와와학습코칭센터 ${b.name} |`)) throw new Error('지점 페이지 제목 불일치 ' + rel(f));
  const subs = subjOf(b);
  if (c.grades || c.subj) {
    const rows = subs.map((s) => `<tr><td style="width:80px"><span class="subj-name subj-name-${CLS[s]}">${CARD_ICON[s]} ${s}</span></td><td><div class="grade-chips">`
      + gradesOf(b, s).map((g) => `<span class="grade-chip grade-chip-${LEVEL(g)}">${g}</span>`).join('') + '</div></td></tr>').join('');
    h = one(h, /<table class="subj-grade-table">[\s\S]*?<\/table>/, () => `<table class="subj-grade-table">\n  <thead><tr><th>과목</th><th>수강 가능 학년</th></tr></thead>\n  <tbody>${rows}</tbody>\n</table>`, '과목·학년 표 ' + rel(f));
    did.push('표');
  }
  if (c.subj) {
    h = subjectChecks(h, subs, rel(f)); did.push('희망 과목');
    let nd = 0;
    h = h.replace(/([가-힣]+(?:·[가-힣]+)*) 개별 진도 수업/g, (m, list) => {
      if (!list.split('·').every((x) => SUBJ.includes(x))) return m;
      nd++; return `${subs.slice(0, 3).join('·')} 개별 진도 수업`;
    });
    if (nd < 2) warn(`지점 설명문 과목 ${nd}곳(2곳 기대): ${rel(f)}`);
    h = one(h, /([가-힣]+(?: · [가-힣]+)*) 수업을 진행하며/, () => `${subs.join(' · ')} 수업을 진행하며`, '소개 문단 과목 ' + rel(f));
    did.push('설명문·소개 과목');
  }
  if (c.schools) {
    h = schoolGroups(h, { elem: schoolsOf(b, 'elem'), mid: schoolsOf(b, 'mid'), high: schoolsOf(b, 'high') }, rel(f));
    h = one(h, /가까운 학교는 [^<]*?(?:등입니다|입니다)\./, () => `가까운 학교는 ${nearSchoolsText(b)}`, '소개 문단 가까운 학교 ' + rel(f));
    h = schoolChips(h, `${b.region_slug}/${b.district_slug}`, [b], '../', rel(f));
    did.push('학교');
  }
  if (c.open) {
    h = one(h, /(<div class="info-label">운영시간<\/div><div class="info-value">)([^<]*)(<\/div>)/, (m, a, v, z) => a + b.open_time + z, '운영시간 ' + rel(f));
    did.push('운영시간');
  }
  if (c.weekend) {
    const row = `<div class="info-row"><div class="info-icon">📅</div><div class="info-content"><div class="info-label">주말수업</div><div class="info-value">${b.weekend}</div></div></div>`;
    if (/<div class="info-label">주말수업<\/div>/.test(h)) h = one(h, /(<div class="info-label">주말수업<\/div><div class="info-value">)([^<]*)(<\/div>)/, (m, a, v, z) => a + b.weekend + z, '주말수업 ' + rel(f));
    else h = one(h, /(<div class="info-row"><div class="info-icon">⏰<\/div><div class="info-content"><div class="info-label">운영시간<\/div><div class="info-value">[^<]*<\/div><\/div><\/div>)/, (m, a) => a + row, '운영시간 줄 뒤 주말수업 ' + rel(f));
    did.push('주말수업');
  }
  // 여수초 → 성남여수초(지점 페이지의 학교 글자)
  if (SCHOOL_RENAME[`${b.region_slug}/${b.district_slug}`]) { const n = (h.match(RENAME_RE) || []).length; if (n) { h = h.replace(RENAME_RE, '성남여수초'); did.push(`여수초 글자 ${n}`); } }
  save(f, h, orig, '지점: ' + did.join('·'));
}

// ---- 2. 동 허브 ----
function editHub(r, d, dong, flags) {
  const f = path.join(ROOT, r, d, 'dong', dong, 'index.html');
  if (!fs.existsSync(f)) { warn(`동 허브 없음 ${r}/${d}/${dong}`); return null; }
  const bs = inDong(r, d, dong);
  const S = SUBJ.filter((s) => bs.some((b) => (b.subjects || []).includes(s)));
  const orig = read(f); let h = orig; const did = [];
  if (flags.subj) {
    const T = titleSJ(S);
    h = h.replace(new RegExp('(<title>|<meta property="og:title" content=")' + esc(dong) + ' [^<"|]*? 추천', 'g'), (m, a) => `${a}${dong} ${T.map((s) => s + '학원').join('·')} 추천`);
    const sjRe = new RegExp('^' + esc(dong) + ' ((?:[가-힣]+학원(?:·[가-힣]+학원)*)|(?:[가-힣]+(?:·[가-힣]+)* 학원))([ ,])');
    let nDesc = 0;
    h = h.replace(/(<meta (?:name="description"|property="og:description") content=")([^"]*)(")/g, (m, a, c0, z) => {
      let c1 = c0;
      if (sjRe.test(c1)) { nDesc++; c1 = c1.replace(sjRe, (mm, sj, sep) => `${dong} ${descSJ(S)}${sep}`); }
      if (c1.length > 80) warn(`허브 설명문 ${c1.length}자: ${rel(f)}`);
      return a + c1 + z;
    });
    if (nDesc !== 2) warn(`허브 설명문 과목 묶음 ${nDesc}곳(2 기대): ${rel(f)}`);
    h = one(h, new RegExp('(<h1>' + esc(dong) + ' <span>와와학습코칭센터</span><br>)([가-힣·]+) 학원</h1>'), (m, a) => `${a}${T.join('·')} 학원</h1>`, '허브 h1 ' + rel(f));
    h = h.replace(/학생들의 ([가-힣·]+) 코칭을 하고 있습니다/, () => `학생들의 ${S.join('·')} 코칭을 하고 있습니다`);
    h = h.replace(/수업 과목은 ([가-힣·]+)입니다\./, () => `수업 과목은 ${S.join('·')}입니다.`);
    h = one(h, /(<div class="info-label">수강 가능 과목<\/div>\s*<div class="info-value">)([^<]*)(<\/div>)/, (m, a, c0, z) => a + S.join(' · ') + z, '허브 과목 줄 ' + rel(f));
    h = one(h, /(<!-- WAWA_AUTO_DONG_SUBJECT_LINKS_START -->[\s\S]*?)((?:<a href="(?:korean|english|math|science|social)\/"[^>]*>[^<]*<\/a>\s*)+)/, (m, a, chips) => {
      const sep = (chips.match(/<\/a>(\s+)<a/) || [])[1] || '';
      const trail = chips.match(/\s*$/)[0];
      return a + SLUG_ORDER.filter((sl) => S.includes(SUBJ_OF[sl])).map((sl) => chipA(sl + '/', SUBJ_OF[sl], dong)).join(sep) + trail;
    }, '허브 과목 바로가기 ' + rel(f));
    h = h.replace(new RegExp('(<h2>[^<]*? ' + esc(dong) + ' )([가-힣·]+)( 학원 안내</h2>)'), (m, a, c0, z) => a + S.join('·') + z);
    h = subjectChecks(h, S, rel(f));
    did.push('과목 ' + S.join('·'));
  }
  if (flags.schools) {
    h = schoolGroups(h, { elem: unionSchools(bs, 'elem'), mid: unionSchools(bs, 'mid'), high: unionSchools(bs, 'high') }, rel(f));
    h = schoolChips(h, `${r}/${d}`, bs, '../../', rel(f));
    did.push('학교 합집합');
  }
  if (flags.rename) { const n = (h.match(RENAME_RE) || []).length; if (n) { h = h.replace(RENAME_RE, '성남여수초'); did.push(`여수초 글자 ${n}`); } }
  for (const b of bs.filter((x) => CH[x.name] && CH[x.name].open)) {
    const re = new RegExp('(<div class="info-label">' + esc(b.name) + '</div>\\s*<div class="info-value">\\s*<a href="\\.\\./\\.\\./' + esc(b.branch_slug) + '/"[^>]*>→ ' + esc(b.name) + ' 자세히 보기</a><br><span style="font-size:13px;color:#64748B;">[^<]*(?:<br>[^<]*)?</span><br>\\s*<span style="font-size:12px;color:#94A3B8;">⏰ )([^<]*)(</span>)');
    h = one(h, re, (m, a, v, z) => a + b.open_time + z, `허브 ${b.name} ⏰ ` + rel(f)); did.push(`${b.name} ⏰`);
  }
  save(f, h, orig, '허브: ' + did.join('·'));
  return { bs, S };
}

// ---- 3. 동×과목 ----
const tipsPool = {};
function collectTips() {
  const walk = (dd) => { for (const e of fs.readdirSync(dd, { withFileTypes: true })) { if (e.name.startsWith('.') || e.name.startsWith('_') || ['assets', 'scripts', 'node_modules'].includes(e.name)) continue; const p = path.join(dd, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'index.html' && /[\\/]dong[\\/][^\\/]+[\\/](korean|english|math|science|social)[\\/]index\.html$/.test(p)) { const s = SUBJ_OF[p.match(/(korean|english|math|science|social)[\\/]index\.html$/)[1]]; const m = read(p).match(new RegExp(s + ' 학습에서 자주 보는 포인트</h2>\\s*</div>\\s*(<ul style="padding-left:20px;font-size:14px;">[\\s\\S]*?</ul>)')); if (m) (tipsPool[s] = tipsPool[s] || new Set()).add(m[1]); } } };
  walk(ROOT);
  for (const s of SUBJ) tipsPool[s] = [...(tipsPool[s] || [])].sort();
}
const hash = (s) => { let x = 2166136261; for (const ch of s) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
const hasFinal = (ch) => (ch.charCodeAt(0) - 0xac00) % 28 !== 0;
const josa = (word, p) => { const fin = hasFinal(word[word.length - 1]); return { 을: fin ? '을' : '를', 를: fin ? '을' : '를', 이: fin ? '이' : '가', 가: fin ? '이' : '가', 은: fin ? '은' : '는', 는: fin ? '은' : '는', 과: fin ? '과' : '와', 와: fin ? '과' : '와', 으로: fin ? '으로' : '로', 로: fin ? '으로' : '로' }[p]; };

function updateSubjectPage(f, h, ctx, subj, opts) {
  const { r, d, dong, bs } = ctx;
  const Bx = bs.filter((b) => (b.subjects || []).includes(subj));
  const S = SUBJ.filter((s) => bs.some((b) => (b.subjects || []).includes(s)));
  const did = [];
  if (opts.ranges) {
    const grades = sortG(Bx.flatMap((b) => gradesOf(b, subj)));
    const G = rangeStr(grades);
    const hi = h.indexOf('</head>');
    h = h.slice(0, hi).replace(RANGE_RE, G) + h.slice(hi);
    h = h.replace(/<strong>[초중고]\d~[초중고]\d<\/strong>/g, `<strong>${G}</strong>`);
    h = h.replace(/[초중고]\d~[초중고]\d(?:을|를) 대상으로/g, `${G}${eul(G)} 대상으로`);
    h = one(h, new RegExp('(<div class="info-icon">)([^<]*)(</div>\\s*<div class="info-content">\\s*<div class="info-label">' + subj + ' 수업 가능 학년</div>\\s*<div class="info-value">)([^<]*)(</div>)'), (m, a, icon, mid, list, z) => a + CHIP_ICON[subj] + mid + grades.join(' · ') + z, '과목 학년 줄 ' + rel(f));
    did.push(`범위 ${G}`);
  }
  if (opts.schools || opts.ranges) { h = schoolGroups(h, { elem: unionSchools(Bx, 'elem'), mid: unionSchools(Bx, 'mid'), high: unionSchools(Bx, 'high') }, rel(f)); did.push('학교'); }
  if (opts.subj) {
    h = one(h, /((?:<a href="\.\.\/(?:korean|english|math|science|social)\/"[^>]*>[^<]*<\/a>)*)(?=<a href="\.\.\/" style="[^"]*">📍 )/, () => SLUG_ORDER.filter((sl) => S.includes(SUBJ_OF[sl]) && SUBJ_OF[sl] !== subj).map((sl) => chipA('../' + sl + '/', SUBJ_OF[sl], dong)).join(''), '다른 과목 바로가기 ' + rel(f));
    h = subjectChecks(h, S, rel(f), subj);
    did.push('다른 과목·희망 과목');
  }
  if (opts.rename) { const n = (h.match(RENAME_RE) || []).length; if (n) { h = h.replace(RENAME_RE, '성남여수초'); did.push(`여수초 글자 ${n}`); } }
  for (const b of Bx.filter((x) => CH[x.name] && CH[x.name].open)) {
    let n = 0;
    const blk = new RegExp('(🏢 ' + esc(b.name) + '</div>\\s*<div style="font-size:12px;color:#64748B;line-height:1.5;">📌 [^<]*<br>⏰ )([^<]*)(</div>)');
    if (blk.test(h)) { h = h.replace(blk, (m, a, v, z) => { n++; return a + b.open_time + z; }); }
    const single = new RegExp('(→ ' + esc(b.name) + ' 자세히 보기</a><br><span style="font-size:13px;color:#64748B;">[^<]*(?:<br>[^<]*)?</span><br>\\s*<span style="font-size:12px;color:#94A3B8;">⏰ )([^<]*)(</span>)');
    if (single.test(h)) { h = h.replace(single, (m, a, v, z) => { n++; return a + b.open_time + z; }); }
    if (!n) warn(`동×과목 ${b.name} ⏰ 자리를 못 찾음: ${rel(f)}`); else did.push(`${b.name} ⏰`);
  }
  return { h, did };
}

function cloneSubjectPage(ctx, subj) {
  const { r, d, dong } = ctx;
  const dir = path.join(ROOT, r, d, 'dong', dong);
  const sib = ['math', 'english', 'korean', 'science', 'social'].map((sl) => path.join(dir, sl, 'index.html')).find((p) => fs.existsSync(p) && !isStub(p) && p !== path.join(dir, SLUG[subj], 'index.html'));
  if (!sib) { warn(`복제할 형제 페이지 없음 ${dong}/${SLUG[subj]}`); return; }
  const x0 = SUBJ_OF[path.basename(path.dirname(sib))];
  let h = read(sib);
  h = h.split('/' + SLUG[x0] + '/').join('/' + SLUG[subj] + '/');
  h = h.replace(new RegExp(x0 + '(으로|로|을|를|이|가|은|는|과|와)(?![가-힣])', 'g'), (m, p) => subj + josa(subj, p));
  h = h.split(x0).join(subj);
  const pool = tipsPool[subj] || [];
  const tipRe = new RegExp('(' + subj + ' 학습에서 자주 보는 포인트</h2>\\s*</div>\\s*)(<ul style="padding-left:20px;font-size:14px;">[\\s\\S]*?</ul>)');
  if (tipRe.test(h) && pool.length) h = h.replace(tipRe, (m, a) => a + pool[hash(dong + subj) % pool.length]);
  else if (tipRe.test(h)) warn(`${subj} 학습 팁 풀이 비어 형제 것을 글자만 바꿔 둠: ${dong}`);
  const f = path.join(dir, SLUG[subj], 'index.html');
  const res = updateSubjectPage(f, h, ctx, subj, { ranges: true, subj: true, schools: true, rename: ctx.flags.rename });
  h = res.h;
  h = h.replace(/(<div class="page-updated" data-iso=")\d{4}-\d{2}-\d{2}(")/, (m, a, z) => a + TODAY + z).replace(/📅 최종 업데이트: \d{4}\.\d{2}\.\d{2}/, `📅 최종 업데이트: ${TODAY.replace(/-/g, '.')}`);
  const stripped = h.replace(/<a href="\.\.\/(?:korean|english|math|science|social)\/"[^>]*>[^<]*<\/a>/g, '').replace(/<div class="subject-checks">[\s\S]*?<\/div>/, '');
  const left = (stripped.match(new RegExp(x0, 'g')) || []).length;
  if (left) warn(`복제 뒤 '${x0}' ${left}곳 남음: ${rel(f)}`);
  if (!h.includes(`<title>${dong} ${subj}학원`)) warn(`복제 제목 확인: ${rel(f)} → ${(h.match(/<title>[^<]*/) || [])[0]}`);
  out.set(f, h); stat.created.push(`${rel(f)} (형제 ${x0} 복제)`);
}

function editSubjectPages(ctx) {
  const { r, d, dong, bs, flags } = ctx;
  const dir = path.join(ROOT, r, d, 'dong', dong);
  const S = SUBJ.filter((s) => bs.some((b) => (b.subjects || []).includes(s)));
  for (const sl of SLUG_ORDER) {
    const subj = SUBJ_OF[sl]; const f = path.join(dir, sl, 'index.html');
    const exists = fs.existsSync(f) && !isStub(f);
    if (S.includes(subj)) {
      if (exists) {
        const orig = read(f);
        const res = updateSubjectPage(f, orig, ctx, subj, { subj: flags.subj, schools: flags.schools, rename: flags.rename, ranges: flags.grades });
        save(f, res.h, orig, '동×과목: ' + res.did.join('·'));
      } else if (flags.subj) cloneSubjectPage(ctx, subj);
    } else if (exists) {
      makeStub(f, `${SITE}/${enc(`${r}/${d}/dong/${dong}/`)}`);
    }
  }
}

// ---- 4. 시도·시군구 카드 ----
function editCards(b) {
  for (const f of [path.join(ROOT, b.region_slug, 'index.html'), path.join(ROOT, b.region_slug, b.district_slug, 'index.html')]) {
    const orig = read(f);
    const h = one(orig, new RegExp('(<a href="[^"]*/' + esc(b.district_slug) + '/' + esc(b.branch_slug) + '/" class="branch-card">[\\s\\S]*?<div class="branch-card-subjects">)([\\s\\S]*?)(</div>)'),
      (m, a, c0, z) => a + subjOf(b).map((s) => `<span class="branch-card-subj">${CARD_ICON[s]}${s}</span>`).join('') + z, `카드 ${b.name} ${rel(f)}`);
    save(f, h, orig, `카드 ${b.name}`);
  }
}

// ---- 5. 학교 페이지 ----
// 학교 페이지의 학교급(이름 끝 글자 — 퇴계원고등학교·영덕여고 꼴 포함)
const schoolLevel = (n) => (/(초|초등학교)$/.test(n) ? 'elem' : /(중|여중|중학교)$/.test(n) ? 'mid' : /(고|여고|고등학교)$/.test(n) ? 'high' : null);
const CARD_RE = /<a href="\.\.\/\.\.\/([a-z0-9-]+)\/" style="background:#fff;border:1px solid #E2E8F0;border-radius:16px;[^"]*">[\s\S]*?<\/a>/g;
// 과목이 바뀐 지점의 카드 '📚 가능 과목'을 그 지점이 이 학교급에서 여는 과목으로(school_text_2026-11-25.cjs ③과 같은 기준),
//   폼 희망 과목은 카드 지점들의 과목 합집합으로(10-27 과 같은 기준 — 학년별 끄기는 form_grade_filter). 본문 과목 나열 글은 여기서 보태지 않는다
//   (빼는 쪽은 school_text ①이 기준본을 보고 뺀다. 없는 과목을 말하지 않는 한 빠진 과목을 보태지 않는다 — 사장님 11-25 결정 3).
function editSchoolPagesSubj(b) {
  const dir = path.join(ROOT, b.region_slug, b.district_slug, 'school');
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const f = path.join(dir, name, 'index.html'); if (!fs.existsSync(f) || isStub(f)) continue;
    const orig = read(f);
    const slugs = [...orig.matchAll(CARD_RE)].map((m) => m[1]);
    if (!slugs.includes(b.branch_slug)) continue;
    const bsOn = slugs.map((sl) => bySlug[`${b.region_slug}/${b.district_slug}/${sl}`]).filter(Boolean);
    if (bsOn.length !== slugs.length) { warn(`학교 페이지 지점 매칭 실패: ${rel(f)}`); continue; }
    const lv = schoolLevel(name);
    if (!lv) { warn(`학교급을 모름: ${rel(f)}`); continue; }
    const atLv = (x) => subjOf(x).filter((s) => gradesOf(x, s).some((g) => LEVEL(g) === lv));
    const U = SUBJ.filter((s) => bsOn.some((x) => (x.subjects || []).includes(s)));
    let h = orig.replace(CARD_RE, (m, sl) => {
      if (sl !== b.branch_slug) return m;
      return m.replace(/(<strong>📚 가능 과목:<\/strong> )([^<]*)(<\/div>)/, (x, a, c0, z) => a + atLv(b).join(' · ') + z);
    });
    h = subjectChecks(h, U, rel(f));
    save(f, h, orig, `학교: ${b.name} 카드 과목 ${atLv(b).join('·')} · 폼 과목 ${U.join('·')}`);
  }
}
function schoolStubs() {
  for (const [dir, { to, names }] of Object.entries(SCHOOL_GONE)) {
    for (const n of names) {
      const f = path.join(ROOT, dir, 'school', n, 'index.html');
      if (!fs.existsSync(f)) { note(`학교 페이지 없음(이동 안내 안 만듦): ${dir}/school/${n}`); continue; }
      if (isStub(f)) continue;
      const still = BR.filter((x) => `${x.region_slug}/${x.district_slug}` === dir && ['elem', 'mid', 'high'].some((lv) => schoolsOf(x, lv).includes(n)));
      if (still.length) { warn(`${n} 를 아직 적은 지점이 있어 이동 안내로 바꾸지 않음: ${still.map((x) => x.name).join(',')}`); continue; }
      makeStub(f, `${SITE}/${enc(`${dir}/${to}/`)}`);
    }
  }
}
function schoolRenames() {
  for (const [dir, map] of Object.entries(SCHOOL_RENAME)) {
    for (const [from, to] of Object.entries(map)) {
      const fOld = path.join(ROOT, dir, 'school', from, 'index.html');
      const fNew = path.join(ROOT, dir, 'school', to, 'index.html');
      if (!fs.existsSync(fOld) || isStub(fOld)) { note(`이름 바꿀 학교 페이지 없음: ${dir}/school/${from}`); continue; }
      if (fs.existsSync(fNew)) { warn(`새 이름 학교 페이지가 이미 있음: ${rel(fNew)}`); continue; }
      let h = read(fOld);
      const encFrom = encodeURIComponent(from), encTo = encodeURIComponent(to);
      const nEnc = h.split(encFrom).length - 1;
      h = h.split(encFrom).join(encTo);
      const nTxt = (h.match(RENAME_RE) || []).length;
      h = h.replace(RENAME_RE, to);
      h = h.replace(/(<div class="page-updated" data-iso=")\d{4}-\d{2}-\d{2}(")/, (m, a, z) => a + TODAY + z).replace(/📅 최종 업데이트: \d{4}\.\d{2}\.\d{2}/, `📅 최종 업데이트: ${TODAY.replace(/-/g, '.')}`);
      if (h.includes(`school/${from}/`)) warn(`새 페이지에 옛 주소 글자가 남음: ${rel(fNew)}`);
      out.set(fNew, h); if (crlf.has(fOld)) crlf.add(fNew);
      stat.created.push(`${rel(fNew)} (${from} 페이지에서 이름만 바꿈 — 글자 ${nTxt}·인코딩 주소 ${nEnc})`);
      makeStub(fOld, `${SITE}/${enc(`${dir}/school/${to}/`)}`);
    }
  }
}

// ---- 실행 ----
collectTips();
note('학습 팁 풀: ' + SUBJ.map((s) => `${s} ${tipsPool[s].length}`).join(', '));
syncJson(path.join(ROOT, 'assets', 'branches.json'), 2);
syncJson(path.join(WAWA, 'assets', 'branches.json'), 1);
syncBranchesJs(path.join(ROOT, 'branches.js'));
const dongs = new Map();
for (const [name, c] of Object.entries(CH)) {
  const b = base[name]; if (!b) throw new Error('기준본에 없음 ' + name);
  editBranchPage(b, c);
  const key = `${b.region_slug}/${b.district_slug}/${b.dong}`;
  const fl = dongs.get(key) || { r: b.region_slug, d: b.district_slug, dong: b.dong, flags: { subj: false, schools: false, rename: false, grades: false, open: false } };
  if (c.subj) fl.flags.subj = true;
  if (c.schools) fl.flags.schools = true;
  if (c.grades) fl.flags.grades = true;
  if (c.open) fl.flags.open = true;
  if (SCHOOL_RENAME[`${b.region_slug}/${b.district_slug}`] && c.schools) fl.flags.rename = true;
  dongs.set(key, fl);
  if (c.subj) { editCards(b); editSchoolPagesSubj(b); }
}
for (const [key, x] of dongs) {
  const f = x.flags;
  if (!f.subj && !f.schools && !f.rename && !f.grades && !f.open) continue; // 행신동(주말만 — 허브·동×과목에 주말 줄이 없다)
  const res = editHub(x.r, x.d, x.dong, f);
  if (res) editSubjectPages({ ...x, bs: res.bs });
}
// 학교 페이지 이동 안내·이름 바꿈을 먼저 정해 두고(알약 묶음이 그 결과를 본다) 지점·허브를 고친다 — 아래 순서를 바꾸지 말 것
// (위 루프가 이미 지점·허브를 고쳤으므로, 알약 묶음만 다시 맞춘다)
schoolStubs();
schoolRenames();
for (const [name, c] of Object.entries(CH)) {
  if (!c.schools) continue;
  const b = base[name];
  const f = path.join(ROOT, b.region_slug, b.district_slug, b.branch_slug, 'index.html');
  const h0 = out.get(f); if (h0) out.set(f, schoolChips(h0, `${b.region_slug}/${b.district_slug}`, [b], '../', rel(f)));
  const fh = path.join(ROOT, b.region_slug, b.district_slug, 'dong', b.dong, 'index.html');
  const hh = out.get(fh); if (hh) out.set(fh, schoolChips(hh, `${b.region_slug}/${b.district_slug}`, inDong(b.region_slug, b.district_slug, b.dong), '../../', rel(fh)));
}
// 남은 글자 검사: 고친(만든) 페이지에 목록에서 빠진 학교 이름이 남았는지(이동 안내 제외) — '가까운 학교'로 쓴 설명문·소개 글일 수 있어 알리기만 한다
const GONE_NAMES = ['화접초', '한삼중', '한삼고', '청학고', '야탑초', '덕송초', '한별초'];
for (const [f, h] of out) {
  if (!f.endsWith('.html') || h.includes('페이지 이동 안내')) continue;
  const dirKey = path.relative(ROOT, f).split(path.sep).slice(0, 2).join('/');
  if (!['gyeonggi/namyangju', 'gyeonggi/seongnam'].includes(dirKey)) continue;
  const left = GONE_NAMES.filter((n) => h.includes(n));
  if (left.length) note(`남은 학교 글자 ${rel(f)}: ${left.map((n) => `${n}×${h.split(n).length - 1}`).join(', ')}`);
}

console.log(stat.notes.join('\n'));
console.log(`\n수정 ${stat.edited.size}개 · 새 페이지 ${stat.created.length} · 이동 안내 ${stat.stubbed.length} · 확인 ${stat.warn.length}`);
for (const x of stat.created) console.log('  + ' + x);
for (const x of stat.stubbed) console.log('  - ' + x);
for (const x of stat.warn) console.log('  [확인] ' + x);
if (WRITE) {
  for (const [f, h] of out) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, crlf.has(f) ? h.replace(/\n/g, '\r\n') : h, 'utf8'); }
  console.log(`→ ${out.size}개 파일을 썼습니다.`);
} else console.log('--write 를 붙이면 씁니다.');
