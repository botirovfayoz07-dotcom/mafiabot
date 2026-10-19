import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, S, N = 480, 270, 2, 36
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def font(sz): return ImageFont.truetype(BOLD, int(sz * S))
TAU = math.tau

def vgrad(top, bot):
    a = np.linspace(0, 1, H * S)[:, None, None]
    t = np.array(top)[None, None, :]; b = np.array(bot)[None, None, :]
    arr = (t + (b - t) * a).repeat(W * S, axis=1).astype(np.uint8)
    return Image.fromarray(arr, "RGB").convert("RGBA")

def lerp(c1, c2, k): return tuple(int(c1[i] + (c2[i] - c1[i]) * k) for i in range(3))

def glow_text(img, xy, text, f, fill, glow, anchor="la", blur=10, strength=2):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.text(xy, text, font=f, fill=glow + (255,), anchor=anchor)
    g = layer.filter(ImageFilter.GaussianBlur(blur * S / 2))
    for _ in range(strength): img.alpha_composite(g)
    d = ImageDraw.Draw(img)
    d.text((xy[0] + 2 * S, xy[1] + 2 * S), text, font=f, fill=(0, 0, 0, 150), anchor=anchor)
    d.text(xy, text, font=f, fill=fill + (255,), anchor=anchor)

def circle_glow(img, c, r, color, blur, alpha=255):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([c[0]-r, c[1]-r, c[0]+r, c[1]+r], fill=color + (alpha,))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(blur * S)))

rnd = random.Random(7)
def skyline(seed, base, hmin, hmax, wmin, wmax):
    r = random.Random(seed); x = -10; out = []
    while x < W + 10:
        w = r.randint(wmin, wmax); h = r.randint(hmin, hmax)
        out.append((x, w, h)); x += w + r.randint(0, 3)
    return out
BACK = skyline(3, 0, 60, 120, 22, 40)
FRONT = skyline(11, 0, 40, 95, 26, 48)
WIN_STATE = {}
for bi, (x, w, h) in enumerate(FRONT):
    for wy in range(0, h - 14, 12):
        for wx in range(6, w - 8, 10):
            WIN_STATE[(bi, wx, wy)] = rnd.random() < 0.55

def draw_skyline(d, blds, color, ground, win_fn=None, tag=0):
    for bi, (x, w, h) in enumerate(blds):
        d.rectangle([x*S, (ground-h)*S, (x+w)*S, H*S], fill=color)
        if win_fn:
            for wy in range(0, h - 14, 12):
                for wx in range(6, w - 8, 10):
                    c = win_fn(bi, wx, wy)
                    if c: d.rectangle([(x+wx)*S, (ground-h+8+wy)*S, (x+wx+4)*S, (ground-h+8+wy+6)*S], fill=c)

def to_frame(img): return img.resize((W, H), Image.LANCZOS).convert("RGB")

# ---------------- TUN ----------------
STARS = [(rnd.random()*W, rnd.random()*H*0.55, rnd.choice([1, 2]), rnd.random(), rnd.uniform(0.6, 1.6)) for _ in range(80)]
def night(i):
    t = i / N
    img = vgrad((6, 8, 32), (58, 32, 84))
    d = ImageDraw.Draw(img)
    for x, y, k, ph, sz in STARS:
        b = 0.5 + 0.5 * math.sin(TAU * (t * k + ph))
        c = lerp((60, 60, 100), (255, 255, 235), b)
        r = sz * S * (0.6 + 0.6 * b)
        d.ellipse([x*S-r, y*S-r, x*S+r, y*S+r], fill=c + (255,))
    mx, my = W * 0.80 * S, (H * 0.27 + 3 * math.sin(TAU * t)) * S
    circle_glow(img, (mx, my), 62 * S, (200, 210, 255), 22, 120)
    d = ImageDraw.Draw(img)
    d.ellipse([mx-36*S, my-36*S, mx+36*S, my+36*S], fill=(240, 240, 218, 255))
    for cx, cy, cr in [(-12, -10, 8), (10, 8, 11), (-8, 16, 5), (16, -16, 5)]:
        d.ellipse([mx+(cx-cr)*S, my+(cy-cr)*S, mx+(cx+cr)*S, my+(cy+cr)*S], fill=(214, 214, 192, 255))
    # yarasha
    bx = (-30 + t * (W + 60)) * S; by = (70 + 18 * math.sin(TAU * 2 * t)) * S
    fl = math.sin(TAU * 8 * t)
    wing = 16 * S
    d.polygon([(bx, by), (bx-wing, by-(8+8*fl)*S), (bx-wing*0.6, by+3*S)], fill=(10, 6, 20, 255))
    d.polygon([(bx, by), (bx+wing, by-(8+8*fl)*S), (bx+wing*0.6, by+3*S)], fill=(10, 6, 20, 255))
    d.ellipse([bx-4*S, by-4*S, bx+4*S, by+5*S], fill=(10, 6, 20, 255))
    # shahar
    draw_skyline(d, BACK, (34, 24, 64, 255), H - 8 + 0)
    def wf(bi, wx, wy):
        on = WIN_STATE[(bi, wx, wy)]
        if (bi + wx + wy) % 9 == 0 and (i // 9) % 2 == 1: on = not on
        return (255, 214, 110, 255) if on else None
    draw_skyline(d, FRONT, (12, 10, 28, 255), H, wf)
    # Mafia siluet (shlyapa, sigaret cho'g'i)
    bh = next(h for (x, w, h) in FRONT if x <= 112 <= x + w)
    px, py = 112 * S, (H - bh) * S
    d.rectangle([px-14*S, py-1*S, px+14*S, py+2*S], fill=(0, 0, 0, 255))
    d.polygon([(px-12*S, py), (px+12*S, py), (px+9*S, py-34*S), (px-9*S, py-34*S)], fill=(2, 2, 8, 255))
    d.ellipse([px-7*S, py-48*S, px+7*S, py-34*S], fill=(2, 2, 8, 255))
    d.ellipse([px-14*S, py-47*S, px+14*S, py-42*S], fill=(2, 2, 8, 255))
    d.rectangle([px-8*S, py-58*S, px+8*S, py-45*S], fill=(2, 2, 8, 255))
    ex, ey = px + 11 * S, py - 40 * S
    pulse = 0.5 + 0.5 * math.sin(TAU * 3 * t)
    circle_glow(img, (ex, ey), 3 * S, (255, 120, 20), 3 + 2 * pulse, int(160 + 90 * pulse))
    d = ImageDraw.Draw(img)
    d.ellipse([ex-1.4*S, ey-1.4*S, ex+1.4*S, ey+1.4*S], fill=(255, 190, 80, 255))
    # tuman
    fog = Image.new("RGBA", img.size, (0, 0, 0, 0)); fd = ImageDraw.Draw(fog)
    for k in range(4):
        fx = ((k * 140 + t * W * 1.0) % (W + 160) - 80) * S
        for off in (0, -(W + 160) * S):
            fd.ellipse([fx+off-90*S, (H-34+k*4)*S, fx+off+90*S, (H-6+k*4)*S], fill=(170, 160, 210, 46))
    img.alpha_composite(fog.filter(ImageFilter.GaussianBlur(9 * S)))
    glow_text(img, (26 * S, 26 * S), "TUN", font(58), (235, 235, 255), (120, 130, 255))
    d = ImageDraw.Draw(img)
    d.text((29 * S, 98 * S), "Shahar uyquga ketdi...", font=font(15), fill=(200, 200, 235, 255))
    return to_frame(img)

# ---------------- KUN ----------------
CLOUDS = [(rnd.random()*W, 30+rnd.random()*70, rnd.uniform(0.7, 1.3)) for _ in range(5)]
BIRDS = [(rnd.random(), 40 + rnd.random() * 60, rnd.randint(1, 2)) for _ in range(3)]
def day(i):
    t = i / N
    img = vgrad((86, 160, 236), (255, 222, 170))
    # bulutlar
    cl = Image.new("RGBA", img.size, (0, 0, 0, 0)); cd = ImageDraw.Draw(cl)
    for cx, cy, sc in CLOUDS:
        x = ((cx + t * W * 1.0) % (W + 160) - 80)
        for off in (0, -(W + 160)):
            X, Y = (x + off) * S, cy * S
            for dx, dy, r in [(-22, 4, 14), (-6, -6, 18), (14, -2, 16), (28, 5, 12), (0, 8, 16)]:
                rr = r * sc * S
                cd.ellipse([X+dx*sc*S-rr, Y+dy*sc*S-rr, X+dx*sc*S+rr, Y+dy*sc*S+rr], fill=(255, 255, 255, 235))
    img.alpha_composite(cl.filter(ImageFilter.GaussianBlur(1.2 * S)))
    sx, sy = W * 0.80 * S, H * 0.27 * S
    circle_glow(img, (sx, sy), 64 * S, (255, 236, 170), 18, 110)
    d = ImageDraw.Draw(img)
    rot = TAU * t / 16 * 2
    for k in range(16):
        a = rot + k * TAU / 16
        L = (58 if k % 2 == 0 else 46) * S + 3 * S * math.sin(TAU * t * 2 + k)
        a1, a2 = a - 0.07, a + 0.07
        d.polygon([(sx + math.cos(a1) * 34 * S, sy + math.sin(a1) * 34 * S), (sx + math.cos(a) * L, sy + math.sin(a) * L),
                   (sx + math.cos(a2) * 34 * S, sy + math.sin(a2) * 34 * S)], fill=(255, 226, 110, 255))
    pr = 30 * S * (1 + 0.03 * math.sin(TAU * t * 2))
    d.ellipse([sx-pr, sy-pr, sx+pr, sy+pr], fill=(255, 224, 90, 255))
    d.ellipse([sx-pr*0.7, sy-pr*0.7, sx+pr*0.7, sy+pr*0.7], fill=(255, 238, 140, 255))
    d = ImageDraw.Draw(img)
    # qushlar
    for bo, by0, k in BIRDS:
        bx = ((bo + t * k) % 1.0) * (W + 60) - 30; by = by0 + 8 * math.sin(TAU * (t * 2 + bo))
        fl = math.sin(TAU * 6 * t + bo * 5) * 5
        X, Y = bx * S, by * S
        d.line([(X-9*S, Y-fl*S), (X, Y+2*S), (X+9*S, Y-fl*S)], fill=(40, 50, 80, 255), width=int(2 * S))
    # shahar
    draw_skyline(d, BACK, (130, 150, 200, 255), H - 8)
    def wf(bi, wx, wy):
        on = WIN_STATE[(bi, wx, wy)]
        return (200, 225, 255, 255) if on else (90, 105, 150, 255)
    draw_skyline(d, FRONT, (72, 84, 130, 255), H, wf)
    glow_text(img, (26 * S, 26 * S), "KUN", font(58), (24, 36, 100), (255, 255, 255), strength=3)
    d = ImageDraw.Draw(img)
    d.text((30 * S, 99 * S), "Muhokama vaqti! Kim mafia?", font=font(15), fill=(40, 50, 90, 255))
    return to_frame(img)

# ---------------- OVOZ ----------------
def ballot(mark):
    b = Image.new("RGBA", (34 * S, 44 * S), (0, 0, 0, 0)); d = ImageDraw.Draw(b)
    d.rounded_rectangle([0, 0, 34*S-1, 44*S-1], radius=3*S, fill=(250, 246, 232, 255), outline=(180, 160, 120, 255), width=S)
    for k in range(3): d.line([(6*S, (30+k*4)*S), (28*S, (30+k*4)*S)], fill=(170, 160, 140, 255), width=S)
    if mark == "ok":
        d.line([(8*S, 14*S), (14*S, 21*S), (26*S, 7*S)], fill=(40, 150, 60, 255), width=int(3*S))
    else:
        d.line([(9*S, 7*S), (25*S, 22*S)], fill=(200, 40, 40, 255), width=int(3*S)); d.line([(25*S, 7*S), (9*S, 22*S)], fill=(200, 40, 40, 255), width=int(3*S))
    return b
BALLOTS = [ballot("ok"), ballot("no")]
def vote(i):
    t = i / N
    img = vgrad((20, 6, 14), (96, 22, 34))
    # spotlight
    sp = Image.new("RGBA", img.size, (0, 0, 0, 0)); sd = ImageDraw.Draw(sp)
    sd.polygon([(W*S/2-18*S, 0), (W*S/2+18*S, 0), (W*S/2+150*S, H*S), (W*S/2-150*S, H*S)], fill=(255, 235, 190, 46))
    img.alpha_composite(sp.filter(ImageFilter.GaussianBlur(10 * S)))
    cx = W * S / 2; top = 176 * S
    # tushayotgan byulletenlar
    for k in range(5):
        p = (t * 1 + k / 5) % 1.0
        y = (112 + p * (176 - 112 - 2)) * S
        x = cx + (math.sin(TAU * (p + k * 0.37)) * 14 + (k - 2) * 5) * S
        ang = math.sin(TAU * (p * 1 + k * 0.2)) * 14
        bl = BALLOTS[k % 2].rotate(ang, expand=True, resample=Image.BICUBIC)
        al = min(1.0, p / 0.18)
        bl = bl.copy(); bl.putalpha(bl.getchannel('A').point(lambda v: int(v * al)))
        img.alpha_composite(bl, (int(x - bl.width / 2), int(y - bl.height / 2)))
    d = ImageDraw.Draw(img)
    # quti (old devor — byulletenlarni yopadi)
    shake = 0
    for k in range(5):
        p = (t + k / 5) % 1.0
        if 0.93 < p < 1.0: shake = 1.5 * math.sin(TAU * 20 * t)
    bx0, bx1 = cx - 62 * S + shake * S, cx + 62 * S + shake * S
    d.polygon([(bx0, top), (bx1, top), (bx1 + 6*S, (top/S+70)*S), (bx0 - 6*S, (top/S+70)*S)], fill=(150, 20, 36, 255))
    d.rectangle([bx0 - 8*S, top - 7*S, bx1 + 8*S, top + 4*S], fill=(212, 168, 60, 255))
    d.rectangle([bx0 + 22*S, top - 9*S, bx1 - 22*S, top - 3*S], fill=(10, 2, 6, 255))
    d.rectangle([bx0 - 6*S, top + 52*S, bx1 + 6*S, top + 58*S], fill=(212, 168, 60, 255))
    # quti ustidagi yulduz
    sx, sy = cx + shake*S, top + 28 * S
    pts = []
    for k in range(10):
        r = (15 if k % 2 == 0 else 6.5) * S; a = -math.pi/2 + k * math.pi / 5
        pts.append((sx + math.cos(a) * r, sy + math.sin(a) * r))
    d.polygon(pts, fill=(255, 215, 90, 255))
    glow_text(img, (W * S / 2, 28 * S), "OVOZ BERISH", font(40), (255, 232, 160), (255, 150, 40), anchor="ma",
              blur=8 + 4 * math.sin(TAU * t))
    d = ImageDraw.Draw(img)
    d.text((W * S / 2, 78 * S), "Kimni osamiz?", font=font(18), fill=(255, 220, 220, 255), anchor="ma")
    return to_frame(img)

def save(name, fn):
    frames = [fn(i) for i in range(N)]
    pal = [f.quantize(colors=192, method=Image.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG) for f in frames]
    pal[0].save(name, save_all=True, append_images=pal[1:], duration=70, loop=0, optimize=True, disposal=2)
    print(name)

save("night.gif", night); save("day.gif", day); save("vote.gif", vote)
