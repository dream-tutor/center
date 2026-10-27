#!/usr/bin/env node
// 2026-10-27 와와 지점 데이터(코칭센터_데이터_261027) → wcoachingcenter.com 페이지 반영
//   학년·과목 14곳, 내발산점 학교·운영시간·주말, 인창점 수업 시간. 기준본 wstudycenter.com/data/branches.json 을 읽는다.
//   - 지점 페이지: 과목·학년 표, 희망 과목 체크, 설명문 과목, 소개 문단 과목, 학교 목록, 운영시간·주말 행, 1회 수업 시간
//   - 동 허브: 제목·설명문·h1·과목 줄·과목 바로가기·학교 합집합·학년 범위·희망 과목
//   - 동×과목: 학년 범위·학년 목록·학교·다른 과목 바로가기·지점 카드(둘 이상이면 카드형+지점 선택)
//       · 과목이 빠진 동은 그 과목 페이지를 허브로 가는 이동 안내로, 과목이 생긴 동은 같은 동 형제 페이지를 복제해 과목만 바꾼다
//   - 시도·시군구 카드 가능 과목, 학교 페이지 과목(지점별 카드·합집합·희망 과목), 인창점 교습비 줄 1회 수업 시간
// 사용: node scripts/branch_changes_2026-10-27.cjs [--write]
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const GROUP = path.resolve(ROOT, '..');
const BASE = process.env.BRANCH_SRC || path.join(GROUP, 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');
const TODAY = '2026-10-27';

const base = JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, ''));
const BR = Object.values(base);
const bySlug = {}; for (const b of BR) bySlug[`${b.region_slug}/${b.district_slug}/${b.branch_slug}`] = b;

const SUBJ = ['국어', '영어', '수학', '과학', '사회'];
const TITLE_ORDER = ['수학', '영어', '국어', '과학', '사회'];
const SLUG = { 국어: 'korean', 영어: 'english', 수학: 'math', 과학: 'science', 사회: 'social' };
const SLUG_ORDER = ['korean', 'english', 'math', 'science', 'social'];
const SUBJ_OF = Object.fromEntries(Object.entries(SLUG).map(([k, v]) => [v, k]));
const CHIP_ICON = { 국어: '📖', 영어: '🔤', 수학: '🧮', 과학: '🔬', 사회: '🌏' };
const CARD_ICON = { 국어: '📖', 영어: '🔤', 수학: '🔢', 과학: '🔬', 사회: '🌏' };
const CLS = { 국어: 'kor', 영어: 'eng', 수학: 'math', 과학: 'sci', 사회: 'soc' };
const GRADES = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
const LEVEL = g => g[0] === '초' ? 'elem' : g[0] === '중' ? 'mid' : 'high';
const LEVEL_KO = { elem: '초등', mid: '중등', high: '고등' };

// 바뀐 지점(반영보고 '바뀐 값'). 학교 목록·운영시간/주말·수업 시간은 해당 지점만 건드린다.
const CHANGED = ['개신점', '광명점', '내발산점', '두호점', '목동점', '반달점', '상동점', '서신점', '석동점', '신방화점',
  '운양점', '인창점', '제기점', '종암점', '평내점', '호매실점'];
const SUBJ_CHANGED = ['개신점', '반달점', '서신점', '석동점', '신방화점', '운양점', '제기점', '평내점']; // 과목 자체가 바뀐 곳 → 카드·학교 페이지
const SCHOOL_CHANGED = ['내발산점'];
const HOURS_CHANGED = ['내발산점'];
const TIME_CHANGED = ['인창점'];

const out = new Map(); // file → html (LF 기준)
const crlf = new Set(); // 원본이 CRLF 인 파일(일부 페이지가 그렇다) — 쓸 때 되돌린다
const stat = { edited: new Set(), created: [], stubbed: [], warn: [] };
function read(f) {
  if (out.has(f)) return out.get(f);
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes('\r\n')) { crlf.add(f); return s.replace(/\r\n/g, '\n'); }
  return s;
}
function save(f, html, orig) { if (html !== orig) { out.set(f, html); stat.edited.add(f); } }
function writeOut(f, html) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, crlf.has(f) ? html.replace(/\n/g, '\r\n') : html, 'utf8'); }
const warn = m => { stat.warn.push(m); console.log('  [확인] ' + m); };
const rel = f => path.relative(ROOT, f).split(path.sep).join('/');
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const subjOf = b => SUBJ.filter(s => (b.subjects || []).includes(s));
const gradesOf = (b, s) => ((b.grades_by_subject || {})[s] || '').split(',').map(x => x.trim()).filter(Boolean);
const sortG = arr => [...new Set(arr)].sort((a, c) => GRADES.indexOf(a) - GRADES.indexOf(c));
function rangeStr(arr) { const g = sortG(arr); if (!g.length) return null; return g[0] === g[g.length - 1] ? g[0] : `${g[0]}~${g[g.length - 1]}`; }
const eul = s => /[1368]$/.test(s) ? '을' : '를'; // 일·삼·육·팔 받침 → 을
const RANGE_RE = /[초중고]\d~[초중고]\d/g;
const inDong = (r, d, dong) => BR.filter(b => b.region_slug === r && b.district_slug === d && b.dong === dong);
const schoolsOf = (b, lv) => b[`schools_${lv}`] || [];
function unionSchools(bs, lv) { return [...new Set(bs.flatMap(b => schoolsOf(b, lv)))].sort(); }

// ---- 공통 조각 ----
function replaceOnce(h, re, fn, what, f) {
  let n = 0; const r = h.replace(re, (...a) => { n++; return fn(...a); });
  if (!n) warn(`${what} 못 찾음: ${rel(f)}`);
  return r;
}
// 희망 과목 체크: 기존 순서·checked 를 지키고, 빠진 과목은 빼고 생긴 과목은 뒤에 붙인다. 동×과목 페이지는 그 과목만 미리 체크(checkedSubj)
function subjectChecks(h, subjects, f, checkedSubj) {
  return replaceOnce(h, /<div class="subject-checks">([\s\S]*?)<\/div>/, (m, inner) => {
    const found = [...inner.matchAll(/<label><input type="checkbox" name="과목" value="([^"]+)"( checked)?> [^<]*<\/label>/g)];
    const have = found.map(x => x[1]);
    const wasChecked = new Set(found.filter(x => x[2]).map(x => x[1]));
    const order = [...have.filter(s => subjects.includes(s)), ...subjects.filter(s => !have.includes(s))];
    const isChecked = s => checkedSubj !== undefined ? s === checkedSubj : wasChecked.has(s);
    const labels = order.map(s => `<label><input type="checkbox" name="과목" value="${s}"${isChecked(s) ? ' checked' : ''}> ${s}</label>`);
    if (inner.includes('\n')) return '<div class="subject-checks">' + labels.map(l => '\n          ' + l).join('') + '\n        </div>';
    return '<div class="subject-checks">' + labels.join('') + '</div>';
  }, '희망 과목 체크', f);
}
const SCHOOL_GROUPS_RE = /(<div class="school-section"><div class="school-section-title">[^<]*<\/div>)((?:<div class="school-group"><span class="school-group-label (?:elem|mid|high)">[^<]*<\/span><span class="school-list">[^<]*<\/span><\/div>)*)/;
function schoolGroups(h, lists, f) { // lists = {elem:[], mid:[], high:[]}
  return replaceOnce(h, SCHOOL_GROUPS_RE, (m, head) => head + ['elem', 'mid', 'high'].filter(lv => lists[lv].length)
    .map(lv => `<div class="school-group"><span class="school-group-label ${lv}">${LEVEL_KO[lv]}</span><span class="school-list">${lists[lv].join(', ')}</span></div>`).join(''), '학교 목록', f);
}
const chipA = (href, s, dong) => `<a href="${href}" style="display:inline-block;padding:10px 20px;background:#fff;border:2px solid #0369A1;color:#0369A1;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;">${CHIP_ICON[s]} ${dong} ${s}학원</a>`;
function titleSJ(subs) { return TITLE_ORDER.filter(s => subs.includes(s)); }
function descSJ(subs) { const t = titleSJ(subs); return t.length <= 2 ? t.map(s => s + '학원').join('·') : t.join('·') + ' 학원'; }

// ---- 1. 지점 페이지 ----
function editBranchPage(b) {
  const f = path.join(ROOT, b.region_slug, b.district_slug, b.branch_slug, 'index.html');
  const orig = read(f); let h = orig;
  if (!h.includes(`<title>와와학습코칭센터 ${b.name} |`)) throw new Error('지점 페이지 제목 불일치: ' + rel(f));
  const subs = subjOf(b);
  // 과목·학년 표
  const rows = subs.map(s => `<tr><td style="width:80px"><span class="subj-name subj-name-${CLS[s]}">${CARD_ICON[s]} ${s}</span></td><td><div class="grade-chips">` +
    gradesOf(b, s).map(g => `<span class="grade-chip grade-chip-${LEVEL(g)}">${g}</span>`).join('') + '</div></td></tr>').join('');
  h = replaceOnce(h, /<table class="subj-grade-table">[\s\S]*?<\/table>/, () =>
    `<table class="subj-grade-table">\n  <thead><tr><th>과목</th><th>수강 가능 학년</th></tr></thead>\n  <tbody>${rows}</tbody>\n</table>`, '과목·학년 표', f);
  h = subjectChecks(h, subs, f);
  // 설명문(meta·og) 과목 — 기존 설명문 틀 그대로, 앞 세 과목
  h = replaceOnce(h, /([가-힣]+(?:·[가-힣]+)*) 개별 진도 수업/g, (m, list) => {
    if (!list.split('·').every(x => SUBJ.includes(x))) throw new Error(`설명문 과목 아님 '${list}': ${rel(f)}`);
    return `${subs.slice(0, 3).join('·')} 개별 진도 수업`;
  }, '설명문 과목', f);
  // 소개 문단 과목
  h = replaceOnce(h, /([가-힣]+(?: · [가-힣]+)*) 수업을 진행하며/, () => `${subs.join(' · ')} 수업을 진행하며`, '소개 문단 과목', f);
  // 학교 목록(기준본 순서)
  if (SCHOOL_CHANGED.includes(b.name)) h = schoolGroups(h, { elem: schoolsOf(b, 'elem'), mid: schoolsOf(b, 'mid'), high: schoolsOf(b, 'high') }, f);
  // 운영시간·주말 행
  if (HOURS_CHANGED.includes(b.name)) {
    const rowRe = /[ \t]*<div class="info-row"><div class="info-icon">(?:⏰|📅)<\/div><div class="info-content"><div class="info-label">(?:운영시간|주말수업)<\/div><div class="info-value">[^<]*<\/div><\/div><\/div>\n?/g;
    const want = [];
    if (b.open_time) want.push(`<div class="info-row"><div class="info-icon">⏰</div><div class="info-content"><div class="info-label">운영시간</div><div class="info-value">${b.open_time}</div></div></div>`);
    if (b.weekend && b.weekend !== '주말불가') want.push(`<div class="info-row"><div class="info-icon">📅</div><div class="info-content"><div class="info-label">주말수업</div><div class="info-value">${b.weekend}</div></div></div>`);
    h = h.replace(rowRe, '');
    h = replaceOnce(h, /([ \t]*)(<div class="info-row info-row-subjects">)/, (m, ind, tag) => (want.length ? ind + want.join('') + '\n' : '') + ind + tag, '과목 행 앞', f);
  }
  // 1회 수업 시간
  if (TIME_CHANGED.includes(b.name)) h = replaceOnce(h, /1회 수업 시간: 초등 \d+분, 중등 \d+분, 고등 \d+분/, () =>
    `1회 수업 시간: 초등 ${b.time_elem}분, 중등 ${b.time_mid}분, 고등 ${b.time_high}분`, '1회 수업 시간', f);
  save(f, h, orig);
}

// ---- 2. 동 허브 ----
function editHub(r, d, dong) {
  const f = path.join(ROOT, r, d, 'dong', dong, 'index.html');
  if (!fs.existsSync(f)) { warn(`동 허브 없음 ${r}/${d}/${dong}`); return; }
  const bs = inDong(r, d, dong);
  const S = SUBJ.filter(s => bs.some(b => b.subjects.includes(s)));
  const G = rangeStr(bs.flatMap(b => subjOf(b).flatMap(s => gradesOf(b, s))));
  const orig = read(f); let h = orig;
  const T = titleSJ(S);
  // 제목·og:title: '동 수학학원·영어학원 추천 | …' 꼴
  h = replaceOnce(h, new RegExp('(<title>|<meta property="og:title" content=")' + esc(dong) + ' [^<"|]*? 추천', 'g'), (m, a) => `${a}${dong} ${T.map(s => s + '학원').join('·')} 추천`, '허브 제목', f);
  // 설명문(description·og:description 만): 과목 묶음 → 학년 범위 → 80자를 넘으면 학교 목록을 뒤에서부터 하나씩 덜어 낸다(_rewrite_desc 와 같은 길이 규칙)
  const sjRe = new RegExp('^' + esc(dong) + ' ((?:[가-힣]+학원(?:·[가-힣]+학원)*)|(?:[가-힣]+(?:·[가-힣]+)* 학원))([ ,])');
  let nDesc = 0;
  h = h.replace(/(<meta (?:name="description"|property="og:description") content=")([^"]*)(")/g, (m, a, c, z) => {
    if (sjRe.test(c)) { nDesc++; c = c.replace(sjRe, (mm, sj, sep) => `${dong} ${descSJ(S)}${sep}`); }
    if (G) c = c.replace(RANGE_RE, G);
    while (c.length > 80 && /(?:[가-힣]+·)+[가-힣]+ (?:가까운|학생 등록 가능)/.test(c)) c = c.replace(/((?:[가-힣]+·)*)([가-힣]+)·[가-힣]+( (?:가까운|학생 등록 가능))/, '$1$2$3');
    if (c.length > 80) warn(`설명문 ${c.length}자: ${rel(f)}`);
    return a + c + z;
  });
  if (nDesc !== 2) warn(`허브 설명문 과목 묶음 ${nDesc}곳: ${rel(f)}`);
  h = replaceOnce(h, new RegExp('(<h1>' + esc(dong) + ' <span>와와학습코칭센터</span><br>)([가-힣·]+) 학원</h1>'), (m, a) => `${a}${T.join('·')} 학원</h1>`, '허브 h1', f);
  // 소개 문단은 틀이 여러 가지 — 과목을 적는 두 가지 꼴만 바꾼다(없는 틀은 그대로)
  h = h.replace(/학생들의 ([가-힣·]+) 코칭을 하고 있습니다/, () => `학생들의 ${S.join('·')} 코칭을 하고 있습니다`);
  h = h.replace(/수업 과목은 ([가-힣·]+)입니다\./, () => `수업 과목은 ${S.join('·')}입니다.`);
  h = replaceOnce(h, /(<div class="info-label">수강 가능 과목<\/div>\s*<div class="info-value">)([^<]*)(<\/div>)/, (m, a, c, z) => a + S.join(' · ') + z, '허브 과목 줄', f);
  h = schoolGroups(h, { elem: unionSchools(bs, 'elem'), mid: unionSchools(bs, 'mid'), high: unionSchools(bs, 'high') }, f);
  h = replaceOnce(h, /(<!-- WAWA_AUTO_DONG_SUBJECT_LINKS_START -->[\s\S]*?)((?:<a href="(?:korean|english|math|science|social)\/"[^>]*>[^<]*<\/a>)+)/, (m, a) =>
    a + SLUG_ORDER.filter(sl => S.includes(SUBJ_OF[sl])).map(sl => chipA(sl + '/', SUBJ_OF[sl], dong)).join(''), '허브 과목 바로가기', f);
  h = h.replace(new RegExp('(<h2>[^<]*? ' + esc(dong) + ' )([가-힣·]+)( 학원 안내</h2>)'), (m, a, c, z) => a + S.join('·') + z); // 과목 없는 h2 틀도 있다
  h = subjectChecks(h, S, f);
  // 지점 블록의 ⏰ 줄(운영시간이 바뀐 지점만 — 다른 지점은 띄어쓰기만 다른 기준본 값으로 덮지 않는다)
  for (const b of bs.filter(x => HOURS_CHANGED.includes(x.name))) {
    const blockRe = new RegExp('(<div class="info-label">' + esc(b.name) + '</div>\\s*<div class="info-value">\\s*<a href="\\.\\./\\.\\./' + esc(b.branch_slug) + '/"[^>]*>→ ' + esc(b.name) + ' 자세히 보기</a><br><span style="font-size:13px;color:#64748B;">[^<]*(?:<br>[^<]*)?</span>)(<br>\\s*<span style="font-size:12px;color:#94A3B8;">⏰ [^<]*</span>)?(\\s*</div>)');
    h = replaceOnce(h, blockRe, (m, a, clock, z) => {
      const want = b.open_time ? `<br>\n            <span style="font-size:12px;color:#94A3B8;">⏰ ${b.open_time}</span>` : '';
      if ((clock || '').replace(/\s+/g, ' ') !== want.replace(/\s+/g, ' ')) console.log(`  허브 ${dong} ${b.name} ⏰: ${JSON.stringify(clock || '')} → ${JSON.stringify(want)}`);
      return a + want + z;
    }, `허브 지점 블록 ${b.name}`, f);
  }
  // 내발산점: 10-15 이전 주소가 그대로 남아 있던 줄
  if (bs.some(b => b.name === '내발산점')) h = h.replace('<span style="font-size:13px;color:#64748B;">서울 강서구 강서로 330 동아빌딩 4층</span>',
    '<span style="font-size:13px;color:#64748B;">📌 우장산힐스테이트아파트 인근 · 발산역 인근<br>서울 강서구 마곡중앙4로 74</span>');
  save(f, h, orig);
  return { bs, S };
}

// ---- 3. 동×과목 ----
const branchCard = (b, depth) => `        <a href="${'../'.repeat(depth)}${b.branch_slug}/" style="display:block;padding:14px;border:1px solid #E2E8F0;border-radius:12px;background:#fff;text-decoration:none;color:inherit;margin-bottom:10px;">
          <div style="font-weight:900;color:#1E293B;font-size:15px;margin-bottom:4px;">🏢 ${b.name}</div>
          <div style="font-size:12px;color:#64748B;line-height:1.5;">📌 ${b.nearby_text}${b.open_time ? '<br>⏰ ' + b.open_time : ''}</div>
          <div style="margin-top:8px;color:#0369A1;font-weight:700;font-size:12px;">→ 자세히 보기</div>
        </a>`;

function updateSubjectPage(f, h, r, d, dong, subj, bs) {
  const Bx = bs.filter(b => b.subjects.includes(subj));
  const S = SUBJ.filter(s => bs.some(b => b.subjects.includes(s)));
  const grades = sortG(Bx.flatMap(b => gradesOf(b, subj)));
  const G = rangeStr(grades);
  const primaryName = (h.match(/<title>[^<]*와와학습코칭센터 (\S+)<\/title>/) || [])[1];
  const primary = Bx.find(b => b.name === primaryName) || Bx[0];
  const ordered = [primary, ...Bx.filter(b => b !== primary)];
  // 학년 범위: head 전체 + 본문의 정해진 자리
  const hi = h.indexOf('</head>');
  h = h.slice(0, hi).replace(RANGE_RE, G) + h.slice(hi);
  h = h.replace(/<strong>[초중고]\d~[초중고]\d<\/strong>/g, `<strong>${G}</strong>`);
  h = h.replace(/[초중고]\d~[초중고]\d(?:을|를) 대상으로/g, `${G}${eul(G)} 대상으로`);
  h = replaceOnce(h, new RegExp('(<div class="info-icon">)([^<]*)(</div>\\s*<div class="info-content">\\s*<div class="info-label">' + subj + ' 수업 가능 학년</div>\\s*<div class="info-value">)([^<]*)(</div>)'),
    (m, a, icon, mid, list, z) => a + CHIP_ICON[subj] + mid + grades.join(' · ') + z, '과목 학년 줄', f);
  h = schoolGroups(h, { elem: unionSchools(Bx, 'elem'), mid: unionSchools(Bx, 'mid'), high: unionSchools(Bx, 'high') }, f);
  // 다른 과목 바로가기('전체 보기' 알약 앞의 과목 알약 묶음 — 과목이 하나뿐이던 동은 묶음이 비어 있다)
  h = replaceOnce(h, /((?:<a href="\.\.\/(?:korean|english|math|science|social)\/"[^>]*>[^<]*<\/a>)*)(?=<a href="\.\.\/" style="[^"]*">📍 )/, () =>
    SLUG_ORDER.filter(sl => S.includes(SUBJ_OF[sl]) && SUBJ_OF[sl] !== subj).map(sl => chipA('../' + sl + '/', SUBJ_OF[sl], dong)).join(''), '다른 과목 바로가기', f);
  h = subjectChecks(h, S, f, subj);
  // 지점 카드: 이미 있는 지점 카드는 그대로 두고(운영시간이 바뀐 지점만 다시 만든다), 새로 과목이 생긴 지점 카드만 보탠다
  const multiRe = /(<div style="grid-column:1\/-1;">\n\n)([\s\S]*?)(<\/div>\s*<div class="info-row info-row-subjects">)/;
  if (Bx.length >= 2) {
    const existing = {};
    for (const m of h.matchAll(/ {8}<a href="\.\.\/\.\.\/\.\.\/([a-z0-9]+)\/" style="display:block;padding:14px;[^"]*">[\s\S]*?<\/a>/g)) existing[m[1]] = m[0];
    const cards = ordered.map(b => (existing[b.branch_slug] && !HOURS_CHANGED.includes(b.name)) ? existing[b.branch_slug] : branchCard(b, 3)).join('\n');
    if (multiRe.test(h)) h = h.replace(multiRe, (m, a, c, z) => a + cards + z);
    else {
      h = replaceOnce(h, /(<div class="branch-info" style="grid-column:1\/-1;">)\s*<div class="info-row" style="border-bottom:1px solid #f0f0f0;padding-bottom:12px;margin-bottom:12px;">[\s\S]*?(?=\s*<div class="info-row info-row-subjects">)/,
        (m, a) => `${a}<div style="grid-column:1/-1;">\n\n${cards}</div>`, '지점 블록(단일→카드형)', f);
      // 폼: 숨은 지점 칸 → 지점 선택
      h = replaceOnce(h, /📍 신청 지점: <strong>[^<]*<\/strong><\/div>/, () => `📍 신청 지점: <strong>${dong} 인근 ${Bx.length}곳</strong> 중에서 선택해 주세요</div>`, '신청 지점 안내', f);
      h = replaceOnce(h, /[ \t]*<input type="hidden" name="지점" value="[^"]*">\n/, () => '', '숨은 지점 칸', f);
      h = replaceOnce(h, /([ \t]*<input type="hidden" name="동" value="[^"]*">\n)/, (m, a) => a +
        `      <div class="form-group">\n        <label class="form-label">희망 지점 <span style="color:red">*</span></label>\n        <select class="form-select" id="fs-branch" name="지점" required>\n          <option value="">지점 선택</option>\n` +
        ordered.map(b => `          <option value="${b.name}" data-sido="${b.region}" data-sgg="${b.district}" data-dong="${b.dong}">${b.district} ${b.dong} · ${b.name}</option>\n`).join('') +
        `        </select>\n      </div>\n`, '지점 선택 삽입', f);
    }
  } else if (multiRe.test(h)) warn(`카드형인데 지점 1곳 — 손으로 볼 것: ${rel(f)}`);
  else if (Bx.length === 1 && HOURS_CHANGED.includes(Bx[0].name)) {
    const b = Bx[0];
    h = replaceOnce(h, /(→ [^<]* 자세히 보기<\/a><br><span style="font-size:13px;color:#64748B;">[^<]*<\/span>)(<br>\s*<span style="font-size:12px;color:#94A3B8;">⏰ [^<]*<\/span>)?(\s*<\/div>)/, (m, a, clock, z) =>
      a + (b.open_time ? `<br>\n            <span style="font-size:12px;color:#94A3B8;">⏰ ${b.open_time}</span>` : '') + z, '단일 지점 ⏰', f);
  }
  for (const m of h.matchAll(/<meta name="description" content="([^"]*)"/g)) if (m[1].length > 80) warn(`설명문 ${m[1].length}자: ${rel(f)}`);
  return h;
}

const tipsPool = {};
function collectTips() {
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name.startsWith('.') || ['assets', 'scripts', 'node_modules'].includes(e.name)) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'index.html' && /[\\/]dong[\\/][^\\/]+[\\/](korean|english|math|science|social)[\\/]index\.html$/.test(p)) { const s = SUBJ_OF[p.match(/(korean|english|math|science|social)[\\/]index\.html$/)[1]]; const m = read(p).match(new RegExp(s + ' 학습에서 자주 보는 포인트</h2>\\s*</div>\\s*(<ul style="padding-left:20px;font-size:14px;">[\\s\\S]*?</ul>)')); if (m) (tipsPool[s] = tipsPool[s] || new Set()).add(m[1]); } } };
  walk(ROOT);
  for (const s of SUBJ) tipsPool[s] = [...(tipsPool[s] || [])];
}
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const hasFinal = ch => (ch.charCodeAt(0) - 0xac00) % 28 !== 0;
function josa(word, p) { const fin = hasFinal(word[word.length - 1]); return { 을: fin ? '을' : '를', 를: fin ? '을' : '를', 이: fin ? '이' : '가', 가: fin ? '이' : '가', 은: fin ? '은' : '는', 는: fin ? '은' : '는', 과: fin ? '과' : '와', 와: fin ? '과' : '와', 으로: fin ? '으로' : '로', 로: fin ? '으로' : '로' }[p]; }

function cloneSubjectPage(r, d, dong, subj, bs) {
  const dir = path.join(ROOT, r, d, 'dong', dong);
  const sib = ['math', 'english', 'korean', 'science', 'social'].map(sl => path.join(dir, sl, 'index.html')).find(p => fs.existsSync(p) && !read(p).includes('페이지 이동 안내'));
  if (!sib) { warn(`복제할 형제 페이지 없음 ${dong}/${SLUG[subj]}`); return; }
  const x0 = SUBJ_OF[path.basename(path.dirname(sib))];
  let h = read(sib);
  h = h.split('/' + SLUG[x0] + '/').join('/' + SLUG[subj] + '/');
  h = h.replace(new RegExp(x0 + '(으로|로|을|를|이|가|은|는|과|와)(?![가-힣])', 'g'), (m, p) => subj + josa(subj, p));
  h = h.split(x0).join(subj);
  // 학습 팁은 그 과목 것으로
  const pool = tipsPool[subj] || [];
  const tipRe = new RegExp('(' + subj + ' 학습에서 자주 보는 포인트</h2>\\s*</div>\\s*)(<ul style="padding-left:20px;font-size:14px;">[\\s\\S]*?</ul>)');
  if (tipRe.test(h) && pool.length) h = h.replace(tipRe, (m, a) => a + pool[hash(dong + subj) % pool.length]);
  else if (tipRe.test(h)) warn(`${subj} 학습 팁 풀이 비어 형제 것을 글자만 바꿔 둠: ${dong}`);
  const f = path.join(dir, SLUG[subj], 'index.html');
  h = updateSubjectPage(f, h, r, d, dong, subj, bs);
  h = h.replace(/data-iso="\d{4}-\d{2}-\d{2}"/, `data-iso="${TODAY}"`).replace(/📅 최종 업데이트: \d{4}\.\d{2}\.\d{2}/, `📅 최종 업데이트: ${TODAY.replace(/-/g, '.')}`);
  // 남은 옛 과목 글자 확인(다른 과목 바로가기·희망 과목 체크 안의 것만 허용)
  const stripped = h.replace(/<a href="\.\.\/(?:korean|english|math|science|social)\/"[^>]*>[^<]*<\/a>/g, '').replace(/<div class="subject-checks">[\s\S]*?<\/div>/, '');
  const left = (stripped.match(new RegExp(x0, 'g')) || []).length;
  if (left) warn(`복제 뒤 '${x0}' ${left}곳 남음: ${rel(f)}`);
  if (!h.includes(`<title>${dong} ${subj}학원`)) warn(`복제 제목 확인: ${rel(f)} → ${(h.match(/<title>[^<]*/) || [])[0]}`);
  out.set(f, h); stat.created.push(rel(f));
  console.log(`  + 새 페이지 ${rel(f)} (형제 ${x0} 복제)\n      ${(h.match(/<meta name="description" content="([^"]*)"/) || [])[1]}`);
}

function stubPage(f, target) {
  const html = `<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<title>페이지 이동 안내</title>\n<meta name="robots" content="noindex">\n<link rel="canonical" href="${target}">\n<meta http-equiv="refresh" content="0; url=${target}">\n<script>location.replace("${target}");</script>\n</head>\n<body>\n<p>페이지 주소가 변경되었습니다. <a href="${target}">이동하기</a></p>\n</body>\n</html>\n`;
  out.set(f, html); stat.stubbed.push(rel(f));
}

function editSubjectPages(r, d, dong, bs) {
  const dir = path.join(ROOT, r, d, 'dong', dong);
  const S = SUBJ.filter(s => bs.some(b => b.subjects.includes(s)));
  for (const sl of SLUG_ORDER) {
    const subj = SUBJ_OF[sl]; const f = path.join(dir, sl, 'index.html');
    const exists = fs.existsSync(f) && !read(f).includes('페이지 이동 안내');
    if (S.includes(subj)) {
      if (exists) { const orig = read(f); save(f, updateSubjectPage(f, orig, r, d, dong, subj, bs), orig); }
      else cloneSubjectPage(r, d, dong, subj, bs);
    } else if (exists) {
      stubPage(f, `https://wcoachingcenter.com/${r}/${d}/dong/${dong}/`);
      console.log(`  - 이동 안내로 ${rel(f)}`);
    }
  }
}

// ---- 4. 시도·시군구 카드 ----
function editCards(b) {
  for (const f of [path.join(ROOT, b.region_slug, 'index.html'), path.join(ROOT, b.region_slug, b.district_slug, 'index.html')]) {
    const orig = read(f); let h = orig;
    h = replaceOnce(h, new RegExp('(<a href="[^"]*/' + esc(b.district_slug) + '/' + esc(b.branch_slug) + '/" class="branch-card">[\\s\\S]*?<div class="branch-card-subjects">)([\\s\\S]*?)(</div>)'),
      (m, a, c, z) => a + subjOf(b).map(s => `<span class="branch-card-subj">${CARD_ICON[s]}${s}</span>`).join('') + z, `카드 ${b.name}`, f);
    save(f, h, orig);
  }
}

// ---- 5. 학교 페이지 ----
const SEQ_RE = /(국어|영어|수학|과학|사회)((?:·|\s·\s)(?:국어|영어|수학|과학|사회))+/g;
function editSchoolPages(b) {
  const dir = path.join(ROOT, b.region_slug, b.district_slug, 'school');
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const f = path.join(dir, name, 'index.html'); if (!fs.existsSync(f)) continue;
    const orig = read(f); if (orig.includes('페이지 이동 안내')) continue;
    const cardRe = /<a href="\.\.\/\.\.\/([a-z0-9]+)\/" style="background:#fff;border:1px solid #E2E8F0;border-radius:16px;[^"]*">[\s\S]*?<\/a>/g;
    const slugs = [...orig.matchAll(cardRe)].map(m => m[1]);
    if (!slugs.includes(b.branch_slug)) continue;
    const bsOn = slugs.map(sl => bySlug[`${b.region_slug}/${b.district_slug}/${sl}`]).filter(Boolean);
    if (bsOn.length !== slugs.length) { warn(`학교 페이지 지점 매칭 실패: ${rel(f)}`); continue; }
    const U = SUBJ.filter(s => bsOn.some(x => x.subjects.includes(s)));
    let h = '', last = 0;
    for (const m of orig.matchAll(cardRe)) {
      h += orig.slice(last, m.index).replace(SEQ_RE, (mm, first, rest) => U.join(rest.startsWith(' ') ? ' · ' : '·'));
      const bb = bySlug[`${b.region_slug}/${b.district_slug}/${m[1]}`];
      h += m[0].replace(/(<strong>📚 가능 과목:<\/strong> )([^<]*)(<\/div>)/, (x, a, c, z) => a + subjOf(bb).join(' · ') + z);
      last = m.index + m[0].length;
    }
    h += orig.slice(last).replace(SEQ_RE, (mm, first, rest) => U.join(rest.startsWith(' ') ? ' · ' : '·'));
    h = subjectChecks(h, U, f);
    save(f, h, orig);
  }
}

// ---- 6. 인창점 교습비 줄의 1회 수업 시간(시군구·동·학교 페이지) ----
function fixFeeLegalTimes(b) {
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'index.html') fix(p); } };
  const fix = f => {
    const orig = read(f); if (!orig.includes(`<b>${b.name}</b>`)) return;
    const h = orig.replace(new RegExp('(<b>' + esc(b.name) + '</b>[^<]*</span><span>1회 수업 시간: )([^<]*)(</span>)', 'g'), (m, a, t, z) =>
      a + t.replace(/초등 \d+분/, `초등 ${b.time_elem}분`).replace(/중등 \d+분/, `중등 ${b.time_mid}분`).replace(/고등 \d+분/, `고등 ${b.time_high}분`) + z);
    save(f, h, orig);
  };
  walk(path.join(ROOT, b.region_slug, b.district_slug));
  fix(path.join(ROOT, b.region_slug, 'index.html'));
}

// ---- 실행 ----
collectTips();
console.log('학습 팁 풀:', SUBJ.map(s => `${s} ${tipsPool[s].length}`).join(', '));
const dongs = new Map();
for (const name of CHANGED) {
  const b = base[name]; if (!b) throw new Error('기준본에 없음 ' + name);
  console.log(`\n## ${name} (${b.region_slug}/${b.district_slug}/${b.branch_slug}, ${b.dong}) 과목 ${subjOf(b).join('·')}`);
  editBranchPage(b);
  dongs.set(`${b.region_slug}/${b.district_slug}/${b.dong}`, b);
  if (SUBJ_CHANGED.includes(name)) { editCards(b); editSchoolPages(b); }
  if (TIME_CHANGED.includes(name)) fixFeeLegalTimes(b);
}
for (const [key, b] of dongs) {
  console.log(`\n## 동 ${key}`);
  const res = editHub(b.region_slug, b.district_slug, b.dong);
  if (res) editSubjectPages(b.region_slug, b.district_slug, b.dong, res.bs);
}
console.log(`\n수정 ${stat.edited.size}장 · 새 페이지 ${stat.created.length}장 · 이동 안내 ${stat.stubbed.length}장 · 확인 ${stat.warn.length}건`);
if (WRITE) {
  for (const [f, h] of out) writeOut(f, h);
  console.log('→ 썼습니다');
} else console.log('--write 를 붙이면 씁니다.');
