// 이동 안내 페이지가 주소 뒤 꼬리표(쿼리·해시)를 새 주소로 넘기게 (2026-11-16)
//
//   옛 주소에 남은 '페이지 이동 안내'(noindex·canonical·meta refresh·location.replace)는 새 주소를 글자 그대로 열어
//   utm_*·n_media·NaPm·gclid 같은 꼬리표를 버렸다. 광고가 옛 주소로 연결돼 있으면(네이버 '와와학습코칭센터' 캠페인의
//   [지점]청라점·[지점]루원시티점·[시군구]인천 서구·[지점]마포2호점 — wawacenter.kr 이 같은 경로로 301 해 여기로 온다)
//   새 페이지의 첫 방문 기록에 광고 꼬리표가 없어 대시보드가 광고 유입으로 세지 못한다.
//
//   고침: <script>location.replace("새 주소");</script>
//      → <script>location.replace("새 주소"+location.search+location.hash);</script>
//   새 주소는 페이지에 박힌 우리 도메인 그대로이고 뒤에 지금 주소의 쿼리·해시만 붙는다(다른 사이트로 넘어갈 수 없다).
//   meta refresh(스크립트를 안 돌리는 수집기용)·canonical·noindex 는 그대로 둔다. 날짜·사이트맵과 무관(이동 안내는 사이트맵에 없다).
//
//   돌리기(저장소 폴더에서): node scripts/move_notice_query_2026-11-16.cjs          ← 모의(바뀔 장 수만)
//                            node scripts/move_notice_query_2026-11-16.cjs --write  ← 적용
//   다시 돌려도 된다(이미 고친 장은 건너뛴다). 새 이동 안내를 만드는 스크립트는 처음부터 이 꼴로 쓸 것.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WRITE = process.argv.includes('--write');
const SKIP = new Set(['.git', 'node_modules', 'scripts', 'assets', '.github']);
const MARK = '<title>페이지 이동 안내</title>';
const OLD = /<script>location\.replace\("(https:\/\/wcoachingcenter\.com\/[^"]*)"\);<\/script>/;
const NEW = /<script>location\.replace\("https:\/\/wcoachingcenter\.com\/[^"]*"\+location\.search\+location\.hash\);<\/script>/;

let stubs = 0, changed = 0, already = 0;
const odd = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(path.join(dir, e.name)); continue; }
    if (e.name !== 'index.html') continue;
    const f = path.join(dir, e.name);
    const html = fs.readFileSync(f, 'utf8');
    if (!html.includes(MARK)) continue;
    stubs++;
    if (NEW.test(html)) { already++; continue; }
    const m = OLD.exec(html);
    if (!m) { odd.push(path.relative(ROOT, f)); continue; }
    // canonical·meta refresh 가 같은 새 주소를 가리키는 장만 고친다(꼴이 다른 장은 손대지 않고 알린다)
    if (!html.includes(`<link rel="canonical" href="${m[1]}">`) || !html.includes(`content="0; url=${m[1]}"`)) { odd.push(path.relative(ROOT, f)); continue; }
    const out = html.replace(OLD, `<script>location.replace("${m[1]}"+location.search+location.hash);</script>`);
    changed++;
    if (WRITE) fs.writeFileSync(f, out);
  }
})(ROOT);

console.log(`이동 안내 ${stubs}장 — ${WRITE ? '고침' : '고칠 것'} ${changed}장 · 이미 고친 장 ${already}장 · 꼴이 달라 건너뛴 장 ${odd.length}장`);
for (const f of odd) console.log('  ? ' + f);
if (!WRITE && changed) console.log('(모의 — 적용하려면 --write)');
