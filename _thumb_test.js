// 네이버 검색 썸네일 시험 (2026-10-26 사장님 지시 "동 페이지 일부에 글자 배너 그림을 넣어서 시험해 봐. 금지어는 빼고")
// 배경: 같은 검색 화면에서 사진이 붙은 경쟁 와와 페이지(solution-class·jumpedu·WAWAEDU)는 전부 검색어가 크게 쓰인 정사각형 배너였다.
//       우리 페이지는 글자 없는 AI 일러스트(가로형)라 한 번도 안 붙었다. 메모리 naver-thumbnail-findings 참고.
// 하는 일: 동 메인 페이지 183장을 주소 해시로 시험군/비교군 반씩 나눈다. 시험군만
//   ① 본문 일러스트 자리(WAWA_ILLUST)에 그 동 전용 글자 배너(800x800 JPEG, 사진형)를 넣고
//   ② og:image 를 그 배너로 바꾼다. 비교군은 그대로 둔다.
// 배너 글자는 그 페이지에 이미 적힌 사실(동 이름·지점명·과목·학년 범위)만 쓴다. 금지어는 BANNED 로 막는다.
//
//   node _thumb_test.js plan            → 시험군·비교군 목록(_thumb_test.json)과 배너 문구만 만든다
//   node _thumb_test.js apply <저장소>   → <저장소>의 시험군 페이지에 배너 img·og 를 넣는다(center·와와 둘 다 이 스크립트로)
// 배너 그림 자체는 _thumb_banner.py(사진형 — 2026-10-26 시안 4종 중 1안)가 _thumb_test.json 을 읽어 assets/banner/ 에 그린다.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DOMAIN = 'https://wcoachingcenter.com';
const PLAN = path.join(ROOT, '_thumb_test.json');
// 와와 금지어(_gen_dong.py BANNED_WORDS 와 같은 목록 + 과장 표현)
const BANNED = ['1:1', '일대일', '입시', '대입', '진로', '진학', '컨설팅', '선행', '연계학습', '과외', '교습소', '공부방', '종합학원', '단과학원', '최고', '최대', '제일', '유일', '일타', '100%', '1등', '보장'];
const SUBJ_ORDER = ['국어', '영어', '수학', '과학', '사회'];
const SUBJ_ABBR = { 국어: '국', 영어: '영', 수학: '수', 과학: '과', 사회: '사' };

function listDongPages(root) {
  const out = [];
  for (const r of fs.readdirSync(root)) {
    const rp = path.join(root, r);
    if (!fs.statSync(rp).isDirectory() || r.startsWith('.') || r.startsWith('_') || r === 'assets' || r === 'node_modules') continue;
    for (const d of fs.readdirSync(rp)) {
      const dongDir = path.join(rp, d, 'dong');
      if (!fs.existsSync(dongDir)) continue;
      for (const dong of fs.readdirSync(dongDir)) {
        const f = path.join(dongDir, dong, 'index.html');
        if (fs.existsSync(f)) out.push({ region: r, district: d, dong, rel: `${r}/${d}/dong/${dong}/` });
      }
    }
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

// 과목·학년은 와와 지점 기준본(wstudycenter.com/data/branches.json)에서 가져온다 (2026-10-26 배포 전 검수).
// 처음엔 h1 에서 뽑았는데, h1·제목은 검색어 나열이라 영천동 배너에 영천점에 없는 국어가 들어갔고,
// 지점이 여럿인 동(중동·마곡동·상동·진관동)은 동 전체 과목을 제목의 지점 한 곳 과목처럼 적었다.
// 그래서 과목 = 제목 지점의 기준본 과목 ∩ 그 페이지 '수강 가능 과목' 줄 — 지점이 안 가르치는 과목도, 페이지에 안 보이는 과목도 넣지 않는다.
// 학년 = 그 과목들의 기준본 학년을 합친 범위(설명문의 학년은 수학 과목 범위라 지점 범위와 다를 수 있다).
const BRANCH_SRC = process.env.BRANCH_SRC || path.join(ROOT, '..', 'wstudycenter.com', 'data', 'branches.json');
const BRANCHES = JSON.parse(fs.readFileSync(BRANCH_SRC, 'utf8'));
const GRADE_SEQ = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];

function readFacts(p) {
  const html = fs.readFileSync(path.join(ROOT, p.rel, 'index.html'), 'utf8');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const branch = (title.match(/와와학습코칭센터\s+(\S+점)\s*$/) || [])[1] || '';
  const src = BRANCHES[branch];
  const pageLine = (html.match(/<div class="info-label">수강 가능 과목<\/div>\s*<div class="info-value">([^<]*)<\/div>/) || [])[1] || '';
  const pageSubj = SUBJ_ORDER.filter((s) => pageLine.includes(s));
  const subjects = src ? SUBJ_ORDER.filter((s) => (src.subjects || []).includes(s) && (!pageSubj.length || pageSubj.includes(s))) : [];
  const idx = new Set();
  for (const s of subjects) for (const g of String((src.grades_by_subject || {})[s] || '').split(',')) { const i = GRADE_SEQ.indexOf(g.trim()); if (i >= 0) idx.add(i); }
  const gi = [...idx].sort((a, b) => a - b);
  const grades = gi.length ? `${GRADE_SEQ[gi[0]]}~${GRADE_SEQ[gi[gi.length - 1]]}` : '';
  const robots = (html.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || '';
  return { title, branch, inSource: !!src, pageSubj, grades, subjects, robots, hasIllust: html.includes('<!-- WAWA_ILLUST_START -->') };
}

function bannerText(p, f) {
  const subjLine = f.subjects.length <= 2
    ? f.subjects.join('·') + ' 학원'
    : f.subjects.map((s) => SUBJ_ABBR[s]).join('·') + ' 학원';
  const foot = ['와와학습코칭센터', f.branch].filter(Boolean).join(' ');
  const sub = [f.grades, '수강료 공개'].filter(Boolean).join(' · ');
  const alt = `${p.dong} ${f.subjects.join('·')} 학원 와와학습코칭센터${f.branch ? ' ' + f.branch : ''} 개별 진도 수업 안내 (${sub})`;
  return { line1: p.dong, line2: subjLine, line3: '개별 진도 수업', foot, sub, alt };
}

function hashKey(rel) { return crypto.createHash('md5').update(rel).digest('hex'); }

function plan() {
  const pages = listDongPages(ROOT).map((p) => ({ ...p, f: readFacts(p) }));
  const bad = pages.filter((p) => !p.f.branch || !p.f.subjects.length || !p.f.hasIllust || /noindex/.test(p.f.robots));
  let test = [], control = [];
  const prev = fs.existsSync(PLAN) ? JSON.parse(fs.readFileSync(PLAN, 'utf8')) : null;
  if (prev && prev.test && prev.control) {
    // 이미 정한 배정은 바꾸지 않는다(문구만 다시 만든다) — 배정이 흔들리면 기준 숫자와 비교할 수 없다
    const byRel = new Map(pages.map((p) => [p.rel, p]));
    test = prev.test.map((t) => byRel.get(t.rel)).filter(Boolean);
    control = prev.control.map((t) => byRel.get(t.rel)).filter(Boolean);
    const lost = test.filter((p) => bad.includes(p));
    if (lost.length) throw new Error('배정된 시험군 페이지가 쓸 수 없게 됨: ' + lost.map((p) => p.rel).join(' '));
  } else {
    // 해시 순으로 정렬해 번갈아 배정 — 지역·이름 순서와 무관하게 반반
    const usable = pages.filter((p) => !bad.includes(p)).sort((a, b) => hashKey(a.rel).localeCompare(hashKey(b.rel)));
    usable.forEach((p, i) => (i % 2 === 0 ? test : control).push(p));
  }
  const out = {
    started: '2026-10-26',
    note: '시험군만 동 전용 글자 배너(본문 + og:image). 비교군은 기존 일러스트·og.png 그대로. 효과는 네이버 검색 썸네일 유무와 대시보드 네이버 유입으로 비교.',
    test: test.map((p) => ({ rel: p.rel, dong: p.dong, branch: p.f.branch, grades: p.f.grades, subjects: p.f.subjects, banner: `assets/banner/${p.region}-${p.district}-${p.dong}.jpg`, text: bannerText(p, p.f) })),
    control: control.map((p) => ({ rel: p.rel, dong: p.dong, branch: p.f.branch })),
    skipped: bad.map((p) => ({ rel: p.rel, why: [!p.f.branch && '지점명 없음', p.f.branch && !p.f.inSource && '기준본에 지점 없음', !p.f.subjects.length && '과목 없음', !p.f.hasIllust && '일러스트 자리 없음', /noindex/.test(p.f.robots) && 'noindex'].filter(Boolean).join(',') })),
  };
  // 금지어 검사 — 배너 글자·alt 어디에도 있으면 멈춘다
  for (const t of out.test) {
    const s = Object.values(t.text).join(' ');
    const hit = BANNED.filter((w) => s.includes(w));
    if (hit.length) throw new Error(`금지어 ${hit.join(',')} — ${t.rel}: ${s}`);
  }
  fs.writeFileSync(PLAN, JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log(`동 페이지 ${pages.length} → 시험군 ${test.length} · 비교군 ${control.length} · 제외 ${bad.length}`);
  if (bad.length) console.log('제외:', out.skipped.map((s) => `${s.rel}(${s.why})`).join(' '));
  console.log('예시:', JSON.stringify(out.test.slice(0, 3).map((t) => t.text), null, 1));
}

// 저장소마다 og 주소가 다를 수 있어 og:image 줄 전체를 바꾼다. 본문은 WAWA_ILLUST 구역의 <img> 하나만 바꾼다.
function apply(repo) {
  const P = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  let n = 0, miss = [];
  for (const t of P.test) {
    const f = path.join(repo, t.rel, 'index.html');
    if (!fs.existsSync(f)) { miss.push(t.rel + ' (파일 없음)'); continue; }
    let html = fs.readFileSync(f, 'utf8');
    if (html.includes('assets/banner/')) continue; // 이미 적용됨(다시 돌려도 그대로)
    // 한글 파일 이름은 퍼센트 인코딩해서 넣는다 — GitHub Pages 는 인코딩 안 된 UTF-8 경로 요청에 400 을 준다(배포 전 검수에서 실측)
    const url = encodeURI(`${DOMAIN}/${t.banner}`);
    const img = `<img src="${url}" alt="${t.text.alt}" width="800" height="800" loading="lazy" style="width:100%;max-width:420px;border-radius:14px;display:block;margin:0 auto;">`;
    const before = html;
    html = html.replace(/(<!-- WAWA_ILLUST_START -->[\s\S]*?)<img [^>]*>([\s\S]*?<!-- WAWA_ILLUST_END -->)/, `$1${img}$2`);
    html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${url}">\n<meta property="og:image:width" content="800">\n<meta property="og:image:height" content="800">`);
    if (html === before || !html.includes(img) || !html.includes(`og:image" content="${url}"`)) { miss.push(t.rel + ' (자리 못 찾음)'); continue; }
    fs.writeFileSync(f, html, 'utf8');
    n++;
  }
  console.log(`${repo}: 시험군 ${n}장 적용`, miss.length ? `· 못 한 것 ${miss.length}: ${miss.join(' ')}` : '');
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'plan') plan();
else if (cmd === 'apply') apply(path.resolve(arg || ROOT));
else console.log('사용법: node _thumb_test.js plan | apply <저장소>');
