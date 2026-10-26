# -*- coding: utf-8 -*-
"""wcoachingcenter.com 동 페이지용 네이버 썸네일 배너 — 사진형 (2026-10-26 사장님이 시안 4종 중 1안으로 고름).
_thumb_test.json(_thumb_test.js plan 이 만든 시험군 목록)을 읽어 assets/banner/*.jpg 를 그린다.
  py -I _thumb_banner.py        → 시험군 전부
  py -I _thumb_banner.py 3      → 앞 3장만(확인용)
글꼴은 Noto Sans KR(SIL OFL — 사이트 규칙상 OFL 글꼴만). 배경은 사이트에 이미 쓰는 교실 일러스트 4장.

교실 일러스트를 800x800 으로 꽉 채워 자르고, 아래쪽에 남색 그라데이션을 깔아
흰 글자를 크게 올린다. 동 이름이 가장 크고 과목 줄은 하늘색.

draw_banner(t, out_path) — t: line1(동 이름)·line2(과목 학원)·line3(개별 진도 수업)
                         ·foot(와와학습코칭센터 ○○점)·sub(학년 범위 · 수강료 공개)
"""
import json
import os
import sys
import zlib

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_PATH = os.environ.get("THUMB_FONT", r"C:\Windows\Fonts\NotoSansKR-VF.ttf")
ILLUST_DIR = os.environ.get("WAWA_ILLUST_DIR", os.path.join(HERE, "assets", "illust"))

S = 800                 # 캔버스 한 변
M = 60                  # 좌우 여백
BOTTOM = 54             # 아래 여백(맨 아래 줄 기준선까지)
TEXT_W = S - 2 * M      # 글자가 쓸 수 있는 폭

NAVY = (15, 42, 68)         # #0F2A44
INK = (30, 41, 59)          # #1E293B
SKY = (56, 189, 248)        # #38BDF8
SKY_MID = (14, 165, 233)    # #0EA5E9
BLUE = (3, 105, 161)        # #0369A1
WHITE = (255, 255, 255)

# 일러스트별 정사각형 자르기 상자(원본 좌표). 오른쪽 아래 AI 표시(w03·w13·w15)와
# w15 의 둥근 흰 테두리는 상자 밖으로 뺀다.
# - w10 은 뺐다: 주황 벽의 'WAWA' 로고와 '와와학습코칭학원' 글자가 동 이름 바로 위에
#   비쳐 겹치고, 필드에 없는 문구(센터가 아니라 '학원')가 그림 속에 들어간다.
#   같은 자리(두 번째)에 글자 없는 교실 그림 w03(문 너머 자습실, 뒷모습만)을 넣었다.
# - w13 은 화이트보드에 붙은 메모(알아볼 수 없는 가짜 글씨, x≈648~715)가 오른쪽 위에
#   보여서 화이트보드 앞(x<640)에서 자른다.
# - w15 는 분홍 옷 학생의 머리가 꼬리표 바로 위로 삐져나와(꼬리표가 머리를 가림)
#   오른쪽 부분(뒷모습 학생·칸막이)으로 옮겼다. 위 테두리 곡선·AI 표시(x≈850)는 밖.
PHOTOS = {
    "w05": (110, 0, 785, 675),
    "w03": (112, 0, 787, 675),
    "w13": (0, 0, 638, 638),
    "w15": (350, 16, 826, 492),
}
PHOTO_KEYS = ["w05", "w03", "w13", "w15"]

_font_cache = {}


def font(size, weight):
    key = (int(size), int(weight))
    f = _font_cache.get(key)
    if f is None:
        f = ImageFont.truetype(FONT_PATH, key[0])
        f.set_variation_by_axes([key[1]])
        _font_cache[key] = f
    return f


def pick_photo(name):
    """동 이름으로 고정 선택(프로세스마다 바뀌는 hash() 대신 crc32)."""
    return PHOTO_KEYS[zlib.crc32(name.encode("utf-8")) % len(PHOTO_KEYS)]


# ── 글자 재기·그리기(자간 조절 포함) ─────────────────────────────

# 이 글꼴의 가운뎃점(·)은 폭이 0.6em 이라 '국 · 영 · 수'처럼 벌어진다 → 칸을 좁혀 가운데 둔다
NARROW = {"·": 0.34}


def _adv(ch, f):
    """(차지하는 폭, 그릴 때 왼쪽으로 당길 양)"""
    a = f.getlength(ch)
    if ch in NARROW:
        slot = NARROW[ch] * f.size
        return slot, (a - slot) / 2
    return a, 0.0


_measure_cache = {}


def measure(text, f, track=0.0):
    """자간 track(px)을 준 한 줄의 실제 잉크 상자 (x0, y0, x1, y1), 원점 = (시작 x, 기준선).

    f.getbbox() 의 가로값은 글자 칸(advance) 기준이라 '반'·'중' 같은 글자의 왼쪽 여백
    (224px 에서 7~12px)이 빠진다 → 동 이름만 다른 줄보다 오른쪽으로 들어가 보였다.
    한 번 그려서 잉크를 직접 잰다.
    """
    key = (text, f.size, id(f), round(track, 3))
    hit = _measure_cache.get(key)
    if hit is not None:
        return hit
    pad = int(f.size * 1.5) + 8
    width = int(sum(_adv(ch, f)[0] + abs(track) for ch in text)) + 2 * pad
    m = Image.new("L", (width, pad * 2), 0)
    draw_tracked(ImageDraw.Draw(m), pad, pad, text, f, 255, track)
    bb = m.getbbox() or (pad, pad, pad, pad)
    box = (bb[0] - pad, bb[1] - pad, bb[2] - pad, bb[3] - pad)
    _measure_cache[key] = box
    return box


def draw_tracked(draw, x, baseline, text, f, fill, track=0.0):
    for ch in text:
        adv, shift = _adv(ch, f)
        draw.text((x - shift, baseline), ch, font=f, fill=fill, anchor="ls")
        x += adv + track


def fit(text, weight, max_w, max_size, min_size, track_em=0.0):
    """폭 max_w 안에 들어가는 가장 큰 글자 크기를 찾는다."""
    size = max_size
    while True:
        f = font(size, weight)
        box = measure(text, f, track_em * size)
        if box[2] - box[0] <= max_w or size <= min_size:
            return f, size, box
        size -= 2


class Line:
    """잉크 위쪽(top)을 기준으로 한 줄을 배치하기 위한 꾸러미."""

    def __init__(self, text, weight, max_w, max_size, min_size, track_em=0.0):
        self.text = text
        self.f, self.size, self.box = fit(text, weight, max_w, max_size, min_size, track_em)
        self.track = track_em * self.size
        self.h = self.box[3] - self.box[1]
        self.w = self.box[2] - self.box[0]

    def draw(self, draw, x_ink, y_ink_top, fill):
        x = x_ink - self.box[0]
        baseline = y_ink_top - self.box[1]
        draw_tracked(draw, x, baseline, self.text, self.f, fill, self.track)


# ── 배경 ────────────────────────────────────────────────────────

def load_photo(key):
    src = Image.open(os.path.join(ILLUST_DIR, key + ".jpg")).convert("RGB")
    im = src.crop(PHOTOS[key]).resize((S, S), Image.LANCZOS)
    # 형광 초록·주황이 하늘색 글자와 다투지 않게 채도를 조금 덜고 아주 살짝 어둡게
    gray = im.convert("L").convert("RGB")
    im = Image.blend(im, gray, 0.22)
    im = Image.blend(im, Image.new("RGB", (S, S), NAVY), 0.10)
    return im.convert("RGBA")


def gradient_mask(y_start, y_full, a_full=0.90, a_bottom=0.97):
    """y_start 위는 투명, y_full 에서 a_full, 맨 아래 a_bottom. 시작은 부드럽게."""
    col = []
    for y in range(S):
        if y <= y_start:
            a = 0.0
        elif y < y_full:
            t = (y - y_start) / (y_full - y_start)
            a = a_full * (t * t * (3 - 2 * t)) ** 0.75
        else:
            t = (y - y_full) / max(1, S - 1 - y_full)
            a = a_full + (a_bottom - a_full) * t
        col.append(int(round(255 * a)))
    m = Image.new("L", (1, S))
    m.putdata(col)
    return m.resize((S, S), Image.NEAREST)


# ── 본체 ────────────────────────────────────────────────────────

def draw_banner(t, out_path):
    line1 = t.get("line1", "").strip()
    line2 = t.get("line2", "").strip()
    line3 = t.get("line3", "").strip()
    foot = t.get("foot", "").strip()
    sub = t.get("sub", "").strip()

    # 1) 글자 크기부터 정한다(아래에서 위로 쌓는다)
    L1 = Line(line1, 900, TEXT_W, 224, 110, track_em=-0.045)
    L2 = Line(line2, 800, TEXT_W, 92, 50, track_em=-0.02)

    # 맨 아래 줄: 지점명(왼쪽) + 학년·수강료(오른쪽). 한 줄에 안 들어가면 두 줄.
    gap = 28
    row_size = 30
    while True:
        Fa = Line(foot, 700, TEXT_W, row_size, row_size, track_em=-0.01)
        Fb = Line(sub, 500, TEXT_W, row_size, row_size, track_em=-0.01)
        if Fa.w + gap + Fb.w <= TEXT_W or row_size <= 24:
            break
        row_size -= 1
    two_rows = Fa.w + gap + Fb.w > TEXT_W

    # 꼬리표(line3) — 32px 이면 110px 썸네일에서 글자 높이가 3px 남짓이라 안 읽혔다.
    # 52px(썸네일에서 약 7px)로 키우고 굵기도 올린다. 과목 줄(86~92px)보다는 작게.
    tag_size = 52
    tag_track = -0.01 * tag_size
    tag_f = font(tag_size, 800)
    tag_box = measure(line3, tag_f, tag_track)
    tag_pad_x, tag_pad_y = 24, 15
    tag_w = (tag_box[2] - tag_box[0]) + 2 * tag_pad_x
    tag_h = (tag_box[3] - tag_box[1]) + 2 * tag_pad_y

    # 2) 세로 배치 — 맨 아래 기준선에서 위로
    row_base = S - BOTTOM
    row_h = max(Fa.h, Fb.h)
    if two_rows:
        fb_top = row_base - Fb.h
        fa_top = fb_top - 14 - Fa.h
        row_top = fa_top
    else:
        row_top = row_base - row_h
        fa_top = row_base - Fa.h
        fb_top = row_base - Fb.h
    rule_y = row_top - 30
    l2_top = rule_y - 36 - L2.h
    l1_top = l2_top - 30 - L1.h
    tag_bottom = l1_top - 34
    tag_top = tag_bottom - tag_h

    # 3) 배경 + 그라데이션(글자 덩어리 위쪽에서 시작 — 화면 아래 약 60%)
    im = load_photo(pick_photo(line1))
    g_start = min(int(S * 0.40), tag_top + 10) - 30
    g_full = l1_top + int(L1.h * 0.55)
    shade = Image.new("RGBA", (S, S), NAVY + (255,))
    shade.putalpha(gradient_mask(g_start, g_full))
    im = Image.alpha_composite(im, shade)

    # 동 이름 뒤 은은한 그림자(밝은 그림 위에서도 흰 글자가 뜨게)
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    L1.draw(sd, M, l1_top + 4, (8, 24, 40, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    im = Image.alpha_composite(im, shadow)

    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # 꼬리표
    d.rounded_rectangle((M, tag_top, M + tag_w, tag_bottom), radius=8, fill=SKY + (255,))
    bx = M + tag_pad_x - tag_box[0]
    bb = tag_top + tag_pad_y - tag_box[1]
    draw_tracked(d, bx, bb, line3, tag_f, NAVY + (255,), tag_track)

    # 동 이름 · 과목 줄
    L1.draw(d, M, l1_top, WHITE + (255,))
    L2.draw(d, M, l2_top, SKY + (255,))

    # 구분선(가는 흰 줄 + 왼쪽 하늘색 짧은 줄)
    d.rectangle((M, rule_y, S - M, rule_y + 1), fill=(255, 255, 255, 56))
    d.rectangle((M, rule_y - 1, M + 72, rule_y + 2), fill=SKY + (255,))

    # 맨 아래 줄
    Fa.draw(d, M, fa_top, (255, 255, 255, 240))
    if two_rows:
        Fb.draw(d, M, fb_top, (255, 255, 255, 190))
    else:
        Fb.draw(d, S - M - Fb.w, fb_top, (255, 255, 255, 190))

    im = Image.alpha_composite(im, layer).convert("RGB")

    ext = os.path.splitext(out_path)[1].lower()
    if ext in (".jpg", ".jpeg"):
        im.save(out_path, "JPEG", quality=82, optimize=True, progressive=True, subsampling="4:2:0")
    else:
        im.save(out_path, optimize=True)
    return out_path


def main():
    plan = json.load(open(os.path.join(HERE, "_thumb_test.json"), encoding="utf-8"))
    items = plan["test"][: int(sys.argv[1])] if len(sys.argv) > 1 else plan["test"]
    total, used = 0, {}
    for t in items:
        out = os.path.join(HERE, t["banner"].replace("/", os.sep))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        draw_banner(t["text"], out)
        total += os.path.getsize(out)
        k = pick_photo(t["text"]["line1"])
        used[k] = used.get(k, 0) + 1
    print("banner %d, total %dKB, avg %dKB, photos %s" % (len(items), total // 1024, total // max(1, len(items)) // 1024, used))


if __name__ == "__main__":
    main()
