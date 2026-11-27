#!/usr/bin/env node
// 2026-11-25 학교 페이지(/{시도}/{시군구}/school/{학교}/)의 과목 목록·'전 과목'·'수능' 낱말을 그 페이지 지점 자료(기준본
//   wstudycenter.com/data/branches.json 의 subjects·grades_by_subject)에 맞춘다 — 사장님 11-25 "최대한 보수적으로".
// 왜: 생성기(쌍둥이 와와 저장소 scripts/build_extra_pages.py, git 밖)가 학교 페이지 과목을 카드 지점 과목의 합집합으로만 만들고
//   학교급으로 거르지 않았다(금곡고(고등) 페이지에 화명점이 중학생에게만 여는 과학). 과목 수와 상관없이 '… 전 과목 학년별 코칭'을
//   붙였고, 본문 변주 문장은 대표 지점 이름 옆에 다른 지점 과목까지 붙였다('은평점의 코치는 … 국어 · 영어 · 수학 풀이').
//   고3 을 열지 않는 지점 문장에도 '수능'이 나갔다(2026-11-25 점검 school-jeon-gwamok·school-subject-level·
//   named-branch-union-subjects·suneung-no-go3).
// 무엇을: 틀린 낱말만 빼거나 바꾼다. 문장 틀·칸·순서는 그대로이고, 목록에 빠진 과목을 새로 보태지는 않는다.
//   '학교급 과목' = 카드 지점 가운데 하나라도 그 학교급(초·중·고) 학년을 여는 과목.
//   ① 설명문·og 설명문, 첫 화면 문단, '○○ 학생 코칭 안내' 문단, '코칭 방식' 문장의 과목 목록에서 학교급 과목이 아닌 과목을 뺀다.
//      지점 이름을 든 문장은 그 지점이 이 학교급에서 여는 과목만 남긴다(하나도 안 남으면 그 지점이 이 학교급에서 여는 과목
//      앞 세 개로 바꾼다 — 문장이 비지 않게). 동 이름을 든 문장('{동}에서는 {과목} 수업과 함께 …')은 그 동에 있는 지점이
//      이 학교급에서 여는 과목만 남긴다(숭신여고 — 성남동에는 영어·수학만 여는 수진점뿐인데 단대동 단대점의 국어까지 적혀 있었다).
//   ② '{과목} 전 과목 학년별 코칭을 진행합니다'는 목록이 다섯 과목일 때만 그대로 — 아니면 '전 과목'만 뺀다.
//   ③ 지점 카드 '📚 가능 과목'에서 그 지점이 이 학교급에서 열지 않는 과목을 뺀다.
//   ④ '○○ 학생, 이 과목들로 수업 가능합니다' 단추('{동} {과목}학원')는 단추마다 본다 — 학교급 과목이 아닌 과목 단추와,
//      그 단추가 가는 동×과목 페이지(dong/{동}/{과목}/)의 카드 지점이 이 학교급에서 그 과목을 열지 않는 단추만 뺀다
//      (세교고의 '금암동 국어학원' — 금암동 세교점 국어는 중3까지이고 고등 국어는 다른 동 오산대역점이 연다). 남은 단추 순서 그대로.
//   ⑤ '수능' 세 문장(내신 대비부터 수능 실전까지 / 수능 영역별 출제 흐름과 / 내신과 수능 두 트랙을)은 문장에 이름이 나온 지점이
//      고3 을 열지 않으면(앞의 둘은 문장의 과목 가운데 하나라도) '수능'·'수능 실전'을 '모의고사'로(사장님 11-25 — 고3 을 열지 않는
//      곳은 수능을 말하지 않음). 고3 을 열게 되면 원문으로 되돌린다. 첫 문장은 적힌 과목 가운데 그 지점이 고등을 열지 않는
//      과목이 있으면 '내신 대비를 학년별 커리큘럼으로 …'(모의고사도 말하지 않는다 — 동×과목 페이지의 같은 문장과 같은 꼴.
//      위례한빛중: 위례점 국어는 중3까지).
//   그대로 두는 것: 제목·JSON-LD(과목이 없다), 상담 폼(<form>, 폼 스크립트 — E 단계), '○등 시기 {과목} 학습 포인트' 칸(일반 조언),
//   수강료 표의 학원 명칭, 목록에서 빠진 여는 과목.
//   원문과 이 스크립트가 쓴 꼴을 다 알아보므로 다시 돌리면 0장, 기준본이 바뀌면 새 자료대로 다시 뺀다(뺀 과목을 되살리지는 않는다).
//   바뀐 페이지만 page-updated(data-iso·최종 업데이트)를 TODAY 로. 사이트맵 lastmod 는 따로 맞춘다(scripts/_README.md).
//   이동 안내(noindex) 페이지는 건너뛴다. 줄 끝(CRLF/LF)은 파일마다 원래대로 둔다.
//   ④는 동×과목 페이지의 지점 카드를 읽기만 한다(그 페이지를 고치지 않는다 — 카드는 다른 스크립트가 바꾸지 않으니 순서와 무관).
//   (2026-11-27 검토 반영: ④ 단추마다 보기 17개·12장, ① 동 이름 문장 1장, ⑤ 고등 없는 과목 1장 — 모두 이미 바뀐 페이지.)
// 생성기는 옛 글을 그대로 낸다 — 페이지를 다시 만들면 이 스크립트를 다시 돌린다(scripts/_README.md).
// 사용: node scripts/school_text_2026-11-25.cjs [--write] [--plan-out 파일] [--changed-out 파일]
//   --write 가 없으면 모의(바뀔 페이지 수와 자리별 묶음만). 다른 날 돌릴 땐 TODAY 를 그날로 고친다.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.BRANCH_SRC || path.join(ROOT, '..', 'wstudycenter.com', 'data', 'branches.json');
const ARGS = process.argv.slice(2);
const WRITE = ARGS.includes('--write');
const argOf = (k) => { const i = ARGS.indexOf(k); return i >= 0 ? ARGS[i + 1] : null; };
const PLAN_OUT = argOf('--plan-out');
const CHANGED_OUT = argOf('--changed-out');
const TODAY = '2026-11-27'; // 11-25 에 고쳐 11-27 에 배포 — 페이지 수정일은 배포일
const ORDER = ['국어', '영어', '수학', '과학', '사회']; // 생성기 과목 순서
const S_ = '(?:국어|영어|수학|과학|사회)';
const RE_LIST = new RegExp(`(?<![가-힣])${S_}(?:\\s*·\\s*${S_})*(?![가-힣])`, 'g');
const LVNAME = { 초등학교: '초', 중학교: '중', 고등학교: '고' };

const fail = (m) => { throw new Error(m); };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

// ── 자료 ──
const base = Object.values(JSON.parse(fs.readFileSync(BASE, 'utf8').replace(/^﻿/, '')));
const byRB = new Map(base.map((b) => [b.region_slug + '/' + b.branch_slug, b]));
const gradesOf = (b, s) => String((b.grades_by_subject || {})[s] || '').split(',').map((x) => x.trim()).filter(Boolean);
const opensLv = (b, s, lv) => (b.subjects || []).includes(s) && gradesOf(b, s).some((g) => g[0] === lv);
const lvSubj = (b, lv) => ORDER.filter((s) => opensLv(b, s, lv));
const has3 = (b, s) => (b.subjects || []).includes(s) && gradesOf(b, s).includes('고3');
const allNames = [...new Set(base.map((b) => b.name))].sort((a, b) => b.length - a.length);

// 동×과목 페이지(/{시도}/{시군구}/dong/{동}/{과목}/)의 카드 지점 — 읽기만 한다. 없거나 이동 안내면 null.
//   카드 = 지점 칸 안의 '../../../{지점}/' 링크(scripts/subject_text_2026-11-25.cjs 와 같은 읽기).
const subjCardCache = new Map();
function dongSubjectCards(region, district, dong, slug) {
  const key = [region, district, dong, slug].join('/');
  if (subjCardCache.has(key)) return subjCardCache.get(key);
  let v = null;
  const f = path.join(ROOT, region, district, 'dong', dong, slug, 'index.html');
  if (fs.existsSync(f)) {
    const h = fs.readFileSync(f, 'utf8');
    const gi = h.indexOf('<div class="branch-detail-grid">');
    const gj = gi < 0 ? -1 : h.indexOf('<div class="shuttle-note">', gi);
    if (!h.includes('페이지 이동 안내') && gi >= 0 && gj >= 0) {
      const slugs = [...new Set([...h.slice(gi, gj).matchAll(/<a href="\.\.\/\.\.\/\.\.\/([a-z0-9-]+)\/"/g)].map((m) => m[1]))];
      const bs = slugs.map((s) => byRB.get(region + '/' + s) || fail(`${key}: 카드 지점을 기준본에서 못 찾음 ${s}`));
      if (bs.length) v = bs;
    }
  }
  subjCardCache.set(key, v);
  return v;
}

const split = (list) => list.split(/\s*·\s*/);
const sepOf = (list) => (/ · /.test(list) ? ' · ' : '·');

// ── '수능' 세 문장: [원문 낱말, 바꾼 낱말, 앞뒤] — 낱말만 바꾼다 ──
//   none = 적힌 과목 가운데 그 지점이 고등을 열지 않는 과목이 있을 때의 꼴(첫 문장만 — 모의고사도 말하지 않는다)
const SUN = [
  { id: '수능 실전까지', re: /(내신 대비)(부터 수능 실전까지|부터 모의고사까지|를)( 학년별 커리큘럼으로 함께 준비합니다)/, orig: '부터 수능 실전까지', alt: '부터 모의고사까지', none: '를', perSubject: true },
  { id: '수능 영역별', re: /(^|[^가-힣])(수능|모의고사)( 영역별 출제 흐름과 )/, orig: '수능', alt: '모의고사', perSubject: true },
  { id: '내신과 수능 두 트랙', re: /(내신과 )(수능|모의고사)( 두 트랙을 분리하지 않고)/, orig: '수능', alt: '모의고사', perSubject: false },
];

// ── 기록 ──
const groups = new Map();
const note = (k) => groups.set(k, (groups.get(k) || 0) + 1);
const warns = [];
const plan = [];

// 한 문장 안 지점 이름(카드 지점, 긴 이름 먼저 — '은평점(W+)'가 '은평점'보다 먼저). 이름 앞이 한글이거나 뒤가 '('·'2' 면
//   다른 지점 이름의 일부다('신중동점' 안의 '중동점', '은평점(W+)' 안의 '은평점', '대구역점2호관' 안의 '대구역점').
const hasName = (s, n) => new RegExp(`(?<![가-힣])${esc(n)}(?![(2])`).test(s);
function namedIn(sentence, ctx) {
  for (const n of ctx.cardNames) if (hasName(sentence, n)) return ctx.byName.get(n);
  const other = allNames.find((n) => hasName(sentence, n));
  if (other) warns.push(`${ctx.rel}: 카드에 없는 지점 이름 '${other}' — 학교급 과목으로 봄: ${sentence.replace(/<[^>]+>/g, '').slice(0, 80)}`);
  return null;
}

// 과목 목록 하나를 허용 과목으로 줄인다. 다 빠지면 fallback(없으면 그대로 두고 알림).
function shrink(list, allowed, fallback, ctx, where, changes, sentence) {
  const items = split(list);
  const kept = items.filter((s) => allowed.includes(s));
  if (kept.length === items.length) return list;
  let out;
  if (kept.length) out = kept.join(sepOf(list));
  else if (fallback && fallback.length) out = fallback.slice(0, 3).join(sepOf(list));
  else { warns.push(`${ctx.rel} ${where}: 남는 과목이 없어 그대로 — ${list}`); return list; }
  changes.push({ where, old: list, new: out, ctx: (sentence || '').replace(/<[^>]+>/g, '').slice(0, 140) });
  return out;
}

// 본문 문장들(지점 이름이 있으면 그 지점, '{동}에서는 {과목} …'이면 그 동 지점, 없으면 학교급 과목)과 '수능' 낱말
const RE_DONG = new RegExp(`(?<![가-힣])([가-힣0-9]+)에서는 (?=${S_})`);
function fixSentences(text, ctx, where, changes) {
  return text.split(/(?<=\.)(?=\s)/).map((sent) => {
    const named = namedIn(sent, ctx);
    const dm = named ? null : sent.match(RE_DONG);
    const dongSubj = dm ? ctx.dongU(dm[1]) : null; // 카드 지점의 동이 아니면 null — 학교급 과목으로 본다
    const allowed = named ? lvSubj(named, ctx.lv) : dongSubj || ctx.U;
    const fallback = named ? lvSubj(named, ctx.lv) : null;
    const label = named ? `${where} · 지점 문장(${named.name})` : dongSubj ? `${where} · 동 문장(${dm[1]})` : `${where} · 문장`;
    let out = sent.replace(RE_LIST, (m) => shrink(m, allowed, fallback, ctx, label, changes, sent));
    for (const T of SUN) {
      const m = out.match(T.re);
      if (!m) continue;
      if (!named) { warns.push(`${ctx.rel}: '${T.id}' 문장에 지점 이름이 없음 — 그대로`); continue; }
      let keep, noHigh = false;
      if (T.perSubject) {
        const lists = out.match(RE_LIST) || [];
        const subs = lists.flatMap(split);
        if (!subs.length) { warns.push(`${ctx.rel}: '${T.id}' 문장에 과목이 없음 — 그대로`); continue; }
        keep = subs.every((s) => has3(named, s));
        noHigh = !!T.none && subs.some((s) => !opensLv(named, s, '고'));
      } else keep = ORDER.some((s) => has3(named, s));
      const want = keep ? T.orig : noHigh ? T.none : T.alt;
      if (m[2] === want) continue;
      const before = out;
      out = out.replace(T.re, (x, a, w, z) => a + want + z);
      changes.push({ where: `${where} · '${T.id}'`, old: before.replace(/<[^>]+>/g, ''), new: out.replace(/<[^>]+>/g, ''), kind: keep ? '수능 원문으로' : noHigh ? '고등 없는 과목이 있어 내신 대비를' : '수능 → 모의고사' });
    }
    return out;
  }).join('');
}

function fixPage(f, rel) {
  const raw = fs.readFileSync(f, 'utf8');
  const crlf = raw.includes('\r\n');
  const orig = crlf ? raw.replace(/\r\n/g, '\n') : raw;
  if (orig.includes('페이지 이동 안내')) return { skip: 'moved' };
  const parts = rel.split('/');
  const lvm = orig.match(/"description": "[^"]* 소재 (초등학교|중학교|고등학교)"/);
  if (!lvm) { warns.push(`${rel}: 학교급을 못 찾음 — 건너뜀`); return { skip: 'nolevel' }; }
  const lv = LVNAME[lvm[1]];

  // 카드 지점
  const CARD_START = '<!-- 학교 커버 지점 -->';
  const ci = orig.indexOf(CARD_START);
  const cj = ci < 0 ? -1 : orig.indexOf('</section>', ci);
  if (ci < 0 || cj < 0) { warns.push(`${rel}: 카드 칸 없음 — 건너뜀`); return { skip: 'nocards' }; }
  const cardBlock = orig.slice(ci, cj);
  const cardRe = /<a href="([^"]+)" style="background:#fff;border:1px solid #E2E8F0;border-radius:16px;[^"]*">([\s\S]*?)<\/a>/g;
  const cards = [];
  for (const m of cardBlock.matchAll(cardRe)) {
    const href = m[1];
    let b = null;
    let mm = href.match(/^\.\.\/\.\.\/([a-z0-9-]+)\/$/);
    if (mm) b = byRB.get(parts[0] + '/' + mm[1]);
    else if ((mm = href.match(/^\/([a-z0-9-]+)\/[a-z0-9-]+\/([a-z0-9-]+)\/$/))) b = byRB.get(mm[1] + '/' + mm[2]);
    const nm = (m[2].match(/🏢 ([^<]+)<\/div>/) || [])[1];
    if (!b) fail(`${rel}: 카드 지점을 기준본에서 못 찾음 ${href}`);
    if (nm !== b.name) fail(`${rel}: 카드 이름 ${nm} ≠ 기준본 ${b.name}`);
    cards.push(b);
  }
  if (!cards.length) fail(`${rel}: 카드 0장`);
  const uniq = [...new Map(cards.map((b) => [b.region_slug + '/' + b.branch_slug, b])).values()];
  const U = ORDER.filter((s) => uniq.some((b) => opensLv(b, s, lv)));
  if (!U.length) fail(`${rel}: 학교급 과목 0`);
  const ctx = {
    rel, lv, U,
    cardNames: uniq.map((b) => b.name).sort((a, b) => b.length - a.length),
    byName: new Map(uniq.map((b) => [b.name, b])),
    // 그 동에 있는 지점(카드 지점의 동일 때만 — 같은 시군구의 그 동 지점 전부)이 이 학교급에서 여는 과목
    dongU: (D) => {
      const keys = new Set(uniq.filter((b) => b.dong === D).map((b) => b.region_slug + '/' + b.district_slug));
      if (!keys.size) return null;
      const inDong = base.filter((b) => b.dong === D && keys.has(b.region_slug + '/' + b.district_slug));
      return ORDER.filter((s) => inDong.some((b) => opensLv(b, s, lv)));
    },
  };
  const changes = [];
  let h = orig;

  // ① 설명문·og 설명문
  {
    let nd = 0;
    h = h.replace(/(<meta (?:name="description"|property="og:description") content=")([^"]*)(")/g, (m, a, c, z) => {
      nd++;
      const lists = c.match(RE_LIST) || [];
      if (lists.length !== 1) fail(`${rel}: 설명문 과목 목록 ${lists.length}곳`);
      const v = c.replace(RE_LIST, (l) => shrink(l, U, null, ctx, '설명문', changes, c));
      return a + v + z;
    });
    if (nd !== 2) fail(`${rel}: 설명문 ${nd}곳`);
  }

  // ① 첫 화면 문단
  h = one(h, new RegExp(`(학생을 등록받고 있으며, )(${S_}(?:\\s*·\\s*${S_})*)( (?:내신 대비와|교과 복습과) 학년별 진도 관리)`), (m, a, l, z) => a + shrink(l, U, null, ctx, '첫 화면', changes, m) + z, `${rel} 첫 화면`);

  // ③ 지점 카드 '📚 가능 과목'
  {
    let i = 0;
    const nb = cardBlock.replace(/(<strong>📚 가능 과목:<\/strong> )([^<]*)(<\/div>)/g, (m, a, list, z) => {
      const b = cards[i++];
      return a + shrink(list, lvSubj(b, lv), null, ctx, `카드(${b.name})`, changes, m) + z;
    });
    if (i !== cards.length) fail(`${rel}: 카드 과목 칸 ${i} ≠ 카드 ${cards.length}`);
    if (nb !== cardBlock) h = h.replace(cardBlock, () => nb);
  }

  // ① '코칭 방식' 문장
  {
    const mi = h.indexOf('<!-- 코칭 방식 -->');
    const mj = mi < 0 ? -1 : h.indexOf('</section>', mi);
    if (mi < 0 || mj < 0) fail(`${rel}: 코칭 방식 칸 없음`);
    const blk = h.slice(mi, mj);
    const nb = blk.replace(/(<p style="font-size:15px;[^"]*">)([\s\S]*?)(<\/p>)/g, (m, a, t, z) => a + fixSentences(t, ctx, '코칭 방식', changes) + z);
    if (nb !== blk) h = h.slice(0, mi) + nb + h.slice(mj);
  }

  // ④ 과목 단추
  {
    const LRE = /(이 과목들로 수업 가능합니다<\/h2><\/div><div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">)([\s\S]*?)(<\/div><\/div><\/section>)/;
    const lm = h.match(LRE);
    if (lm) {
      // x[1] 동, x[2] 과목 주소, x[3] 단추 글
      const links = [...lm[2].matchAll(/<a href="\.\.\/\.\.\/dong\/([^/"]+)\/([a-z]+)\/" style="[^"]*">([^<]*)<\/a>/g)];
      if (links.length !== (lm[2].match(/<a /g) || []).length) fail(`${rel}: 과목 단추 꼴을 못 읽음`);
      const SLUG2S = { korean: '국어', english: '영어', math: '수학', science: '과학', social: '사회' };
      // 학교급 과목이 아닌 단추
      const goneU = links.filter((x) => !U.includes(SLUG2S[x[2]] || fail(`${rel}: 모르는 과목 주소 ${x[2]}`)));
      // 그 단추가 가는 동×과목 페이지의 카드 지점이 이 학교급에서 그 과목을 열지 않는 단추
      const goneD = links.filter((x) => {
        if (goneU.includes(x)) return false;
        const tc = dongSubjectCards(parts[0], parts[1], x[1], x[2]);
        if (!tc) { warns.push(`${rel}: 단추 '${x[3]}'가 가는 페이지를 못 읽음 — 그대로`); return false; }
        return !tc.some((b) => opensLv(b, SLUG2S[x[2]], lv));
      });
      const gone = [...goneU, ...goneD];
      if (gone.length === links.length) warns.push(`${rel}: 과목 단추가 다 빠짐 — 그대로`);
      else if (gone.length) {
        let inner = lm[2];
        for (const g of gone) inner = inner.replace(g[0], '');
        const names = (l) => l.map((x) => x[3]).join(', ');
        if (goneU.length) changes.push({ where: '과목 단추', old: names(links), new: names(links.filter((x) => !goneU.includes(x))) });
        if (goneD.length) changes.push({ where: '과목 단추', kind: '그 동 지점이 이 학교급에서 안 엶', old: names(links.filter((x) => !goneU.includes(x))), new: names(links.filter((x) => !gone.includes(x))) });
        h = h.replace(LRE, (m, a, x, z) => a + inner + z);
      }
    }
  }

  // ①② '○○ 학생 코칭 안내' 문단
  {
    const si = h.indexOf('<section class="seo-content">');
    const sj = si < 0 ? -1 : h.indexOf('</section>', si);
    if (si < 0 || sj < 0) fail(`${rel}: 코칭 안내 칸 없음`);
    let blk = h.slice(si, sj);
    const before = blk;
    // 첫 문단: 과목 목록 + '전 과목'
    blk = one(blk, new RegExp(`(에서 등록받고 있으며, )(${S_}(?:\\s*·\\s*${S_})*)( 전 과목)?( 학년별 코칭을 진행합니다\\.)`), (m, a, l, jg, z) => {
      const l2 = shrink(l, U, null, ctx, '안내 첫 문단', changes, m);
      const five = split(l2).length === ORDER.length;
      if (jg && !five) changes.push({ where: '안내 첫 문단 · 전 과목', old: `${l2} 전 과목`, new: l2 });
      return a + l2 + (jg && five ? jg : '') + z;
    }, `${rel} 안내 첫 문단`);
    // 나머지 문단
    let k = 0;
    blk = blk.replace(/(<p>)([\s\S]*?)(<\/p>)/g, (m, a, t, z) => (k++ === 0 ? m : a + fixSentences(t, ctx, '안내 문단', changes) + z));
    if (blk !== before) h = h.slice(0, si) + blk + h.slice(sj);
  }

  if (h === orig) return { same: true, lv, U, cards: uniq.map((b) => b.name) };
  h = bumpDate(h, rel);
  for (const c of changes) note(c.kind ? `${c.where} (${c.kind})` : c.where.replace(/\(.*\)/, '').trim());
  plan.push({ rel, lv, U: U.join('·'), cards: cards.map((b) => b.name), changes });
  return { h: crlf ? h.replace(/\n/g, '\r\n') : h };
}

// ── 실행 ──
const writes = new Map();
let seen = 0, moved = 0;
for (const r of fs.readdirSync(ROOT).sort()) {
  const rp = path.join(ROOT, r);
  if (!fs.statSync(rp).isDirectory() || /^[._]/.test(r) || ['assets', 'scripts', 'node_modules'].includes(r)) continue;
  for (const d of fs.readdirSync(rp).sort()) {
    const sp = path.join(rp, d, 'school');
    if (!fs.existsSync(sp) || !fs.statSync(sp).isDirectory()) continue;
    for (const s of fs.readdirSync(sp).sort()) {
      const f = path.join(sp, s, 'index.html');
      if (!fs.existsSync(f)) continue;
      const rel = [r, d, 'school', s].join('/');
      const res = fixPage(f, rel);
      if (res.skip === 'moved') { moved++; continue; }
      seen++;
      if (res.h) writes.set(f, { rel: rel + '/index.html', h: res.h });
    }
  }
}
const lvCount = {};
for (const p of plan) lvCount[p.lv] = (lvCount[p.lv] || 0) + 1;
console.log(`학교 페이지 ${seen}장(이동 안내 ${moved}장은 건너뜀) → 바뀔 페이지 ${writes.size}장 (초 ${lvCount['초'] || 0} · 중 ${lvCount['중'] || 0} · 고 ${lvCount['고'] || 0})`);
console.log('\n자리별 고침(건수):');
for (const [k, n] of [...groups].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
if (warns.length) { console.log(`\n[확인] ${warns.length}건`); for (const w of warns) console.log('  ' + w); }
const changedRel = [...writes.values()].map((x) => x.rel);
if (CHANGED_OUT) fs.writeFileSync(CHANGED_OUT, changedRel.join('\n') + (changedRel.length ? '\n' : ''), 'utf8');
if (PLAN_OUT) fs.writeFileSync(PLAN_OUT, JSON.stringify({ pages: plan, warns }, null, 1), 'utf8');
if (WRITE) { for (const [f, x] of writes) fs.writeFileSync(f, x.h, 'utf8'); console.log(`\n→ ${writes.size}개 파일을 썼습니다.`); }
else console.log('\n--write 를 붙이면 씁니다.');
