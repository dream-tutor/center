#!/usr/bin/env node
// 2026-10-27 와와 지점 데이터 반영 — 루트 branches.js(center·와와)와 와와 assets/main.js 의 BRANCHES 블록을
// 기준본(wstudycenter.com/data/branches.json)에 맞춘다. 바뀐 지점 17곳만 건드린다(마포2호점→마포점 이름·slug 포함).
// assets/branches.json 은 scripts/sync_branches_from_base.cjs(와와 저장소) 가 맡는다.
//
// 사용: node scripts/data_2026-10-27.cjs          → 차이만 보여 준다
//       node scripts/data_2026-10-27.cjs --write  → 파일을 다시 쓴다
'use strict';
const fs = require('fs');
const path = require('path');

const CENTER = path.resolve(__dirname, '..');
const GROUP = path.resolve(CENTER, '..');
const WAWA = path.join(GROUP, '와와(wawacenter.kr)');
const BASE = process.env.BRANCH_SRC || path.join(GROUP, 'wstudycenter.com', 'data', 'branches.json');
const WRITE = process.argv.includes('--write');

// 이번 시트(코칭센터_데이터_261027)에서 값이 바뀐 지점과 칸(반영보고 '바뀐 값' 그대로). 그 밖의 칸은 건드리지 않는다
// — 기준본과 띄어쓰기만 다른 open_time 등을 이 기회에 '정리'하면 시트에 없던 변경이 섞인다.
const GRADE_FIELDS = ['grade_kor', 'grade_eng', 'grade_math', 'grade_sci', 'grade_soc'];
const SCHOOL_FIELDS = ['school_elem', 'school_mid', 'school_high'];
const CHANGED_FIELDS = {
  '개신점': GRADE_FIELDS, '광명점': GRADE_FIELDS, '두호점': GRADE_FIELDS, '목동점': GRADE_FIELDS, '반달점': GRADE_FIELDS,
  '상동점': GRADE_FIELDS, '서신점': GRADE_FIELDS, '석동점': GRADE_FIELDS, '신방화점': GRADE_FIELDS, '운양점': GRADE_FIELDS,
  '제기점': GRADE_FIELDS, '종암점': GRADE_FIELDS, '평내점': GRADE_FIELDS, '호매실점': GRADE_FIELDS,
  '내발산점': [...SCHOOL_FIELDS, 'open_time', 'weekend', 'weekend_time'], // 주말불가 → 토요일 시간표(weekend_time) 비움
  '인창점': ['elem_time', 'mid_time', 'high_time'],
  '마포점': ['name', 'branch_en'],
};
const CHANGED = Object.keys(CHANGED_FIELDS);
const OLD_SLUG = { '마포점': 'mapo2ho' };

const base = JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, ''));

function fromBase(b, cur) {
  const g = b.grades_by_subject || {};
  const out = {
    name: b.name, address: b.address, region: b.region, district: b.district, dong: b.dong,
    lat: b.lat, lng: b.lng, office: b.office, reg: b.reg, nearby: b.nearby_text, link: b.kakao_link,
    school_elem: (b.schools_elem || []).join(', '), school_mid: (b.schools_mid || []).join(', '), school_high: (b.schools_high || []).join(', '),
    grade_kor: g['국어'] || '', grade_eng: g['영어'] || '', grade_math: g['수학'] || '', grade_sci: g['과학'] || '', grade_soc: g['사회'] || '',
    weekend: b.weekend, weekend_time: b.weekend === '주말불가' ? '' : (cur.weekend_time || ''), open_time: b.open_time,
    fee_type: b.fee_type, elem_time: String(b.time_elem), mid_time: String(b.time_mid), high_time: String(b.time_high),
    elem_price: b.price_elem, mid_price: b.price_mid, high_price: b.price_high,
    region_en: b.region_slug, district_en: b.district_slug, branch_en: b.branch_slug, fee_link: b.fee_link,
  };
  const allow = new Set(CHANGED_FIELDS[b.name]);
  const next = {};
  for (const k of Object.keys(cur)) next[k] = (allow.has(k) && k in out) ? out[k] : cur[k]; // 바뀐 칸만, 순서 그대로
  return next;
}

// 파이썬 json.dumps(ensure_ascii=False) 꼴: ', ' 와 ': ' 구분자, 한 줄
function dumpsArr(arr) {
  return '[' + arr.map(o => '{' + Object.keys(o).map(k => JSON.stringify(k) + ': ' + JSON.stringify(o[k])).join(', ') + '}').join(', ') + ']';
}

function patchArray(arr, label) {
  const lines = [];
  for (const name of CHANGED) {
    const b = base[name];
    if (!b) { lines.push(`  [경고] 기준본에 ${name} 없음`); continue; }
    const slug = OLD_SLUG[name] || b.branch_slug;
    let i = arr.findIndex(x => (x.branch_en ? x.branch_en === slug : (x.name === name || x.name === (b.aliases || [])[0])));
    if (i < 0) i = arr.findIndex(x => x.name === name || (b.aliases || []).includes(x.name));
    if (i < 0) { lines.push(`  [경고] ${label}에 ${name}(${slug}) 없음`); continue; }
    const next = fromBase(b, arr[i]);
    for (const k of Object.keys(next)) {
      if (JSON.stringify(next[k]) !== JSON.stringify(arr[i][k])) lines.push(`  ${name}.${k}: ${JSON.stringify(arr[i][k]).slice(0, 60)} → ${JSON.stringify(next[k]).slice(0, 60)}`);
    }
    arr[i] = next;
  }
  return lines;
}

function doBranchesJs(file) {
  const s = fs.readFileSync(file, 'utf8');
  const a = s.indexOf('['); const b = s.indexOf('];', a);
  const arr = JSON.parse(s.slice(a, b + 1));
  if (dumpsArr(arr) !== s.slice(a, b + 1)) throw new Error('형식이 예상과 다름: ' + file);
  const lines = patchArray(arr, path.relative(GROUP, file));
  console.log(`${path.relative(GROUP, file)}: 차이 ${lines.length}건`); if (lines.length) console.log(lines.join('\n'));
  if (WRITE && lines.length) { fs.writeFileSync(file, s.slice(0, a) + dumpsArr(arr) + s.slice(b + 1), 'utf8'); console.log('  → 다시 씀'); }
}

function doMainJs(file) {
  const s = fs.readFileSync(file, 'utf8');
  const m = /var BRANCHES = \[/.exec(s); if (!m) throw new Error('BRANCHES 없음: ' + file);
  const a = m.index + m[0].length - 1; const b = s.indexOf('];', a);
  const arr = JSON.parse(s.slice(a, b + 1));
  if (dumpsArr(arr) !== s.slice(a, b + 1)) throw new Error('형식이 예상과 다름: ' + file);
  const lines = patchArray(arr, path.relative(GROUP, file));
  console.log(`${path.relative(GROUP, file)}: 차이 ${lines.length}건`); if (lines.length) console.log(lines.join('\n'));
  if (WRITE && lines.length) { fs.writeFileSync(file, s.slice(0, a) + dumpsArr(arr) + s.slice(b + 1), 'utf8'); console.log('  → 다시 씀'); }
}

function doThumb(file) {
  const s = fs.readFileSync(file, 'utf8');
  const n = s.split('"branch": "마포2호점"').length - 1;
  console.log(`${path.relative(GROUP, file)}: 마포2호점 → 마포점 ${n}곳`);
  if (WRITE && n) fs.writeFileSync(file, s.split('"branch": "마포2호점"').join('"branch": "마포점"'), 'utf8');
}

doBranchesJs(path.join(CENTER, 'branches.js'));
doBranchesJs(path.join(WAWA, 'branches.js'));
doMainJs(path.join(WAWA, 'assets', 'main.js'));
doThumb(path.join(CENTER, '_thumb_test.json'));
doThumb(path.join(WAWA, '_thumb_test.json'));
if (!WRITE) console.log('\n--write 를 붙이면 위 차이대로 다시 씁니다.');
