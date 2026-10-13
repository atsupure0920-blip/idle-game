#!/usr/bin/env python3
"""ユーザーが作った絵を、ゲームで使える形に整える（art-in の手順で使う）。

    python3 scripts/art/process.py <受け取った絵のフォルダ> [--out src/assets/img]

- ファイル名（拡張子を除く）が、絵の id になる。知らない id の絵は使わずに知らせる。
  団員は h_*、相棒（ボス）は c_*、敵は e_*、章の背景は bg_ch1〜bg_ch4。
- 団員・相棒・敵: 背景が透明でなければ、四隅の色に近い部分を透明にする。余白を切り詰め、
  512×512 の正方形の中央（足元をそろえるため、下寄せ）に収めて、webp で保存する。
- 背景: 横3:縦2 に切りそろえ、1200×800 にして、webp で保存する。
- 1枚ずつ、大きさと、気をつけることを表示する。終了コード: 0 = すべて使えた、1 = 使えなかったものがある。
"""

from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CHAR_SIZE = 512
BG_SIZE = (1200, 800)
MAX_KB = 200


def known_ids() -> set[str]:
    ids: set[str] = set()
    for m in json.loads((ROOT / "params/members.json").read_text(encoding="utf-8")):
        ids.add(m["id"])
    for c in json.loads((ROOT / "params/companions.json").read_text(encoding="utf-8")):
        ids.add(c["id"])
    ids.update(["e_bat", "e_mushroom", "e_rat", "e_thorn", "e_scarecrow", "e_wisp"])
    ids.update([f"bg_ch{i}" for i in range(1, 5)])
    return ids


def has_transparency(im: Image.Image) -> bool:
    if im.mode != "RGBA":
        return False
    alpha = im.getchannel("A")
    lo, _hi = alpha.getextrema()
    return lo < 250


def remove_flat_background(im: Image.Image, tolerance: int = 28) -> Image.Image:
    """四隅からつながっている、四隅の色に近い部分を透明にする（単色の背景の絵のため）。"""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    ref = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    def near(c: tuple[int, int, int, int]) -> bool:
        return abs(c[0] - ref[0]) + abs(c[1] - ref[1]) + abs(c[2] - ref[2]) <= tolerance * 3

    seen = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        q.append((x, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        i = y * w + x
        if seen[i]:
            continue
        seen[i] = 1
        c = px[x, y]
        if not near(c):
            continue
        px[x, y] = (c[0], c[1], c[2], 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im


def fit_character(im: Image.Image) -> Image.Image:
    bbox = im.getchannel("A").point(lambda a: 255 if a > 12 else 0).getbbox()
    if bbox:
        im = im.crop(bbox)
    w, h = im.size
    inner = int(CHAR_SIZE * 0.94)
    scale = min(inner / w, inner / h)
    im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (CHAR_SIZE, CHAR_SIZE), (0, 0, 0, 0))
    x = (CHAR_SIZE - im.size[0]) // 2
    y = CHAR_SIZE - im.size[1] - (CHAR_SIZE - inner) // 2
    canvas.paste(im, (x, y), im)
    return canvas


def fit_background(im: Image.Image) -> Image.Image:
    im = im.convert("RGB")
    w, h = im.size
    target = BG_SIZE[0] / BG_SIZE[1]
    if w / h > target:
        nw = round(h * target)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:
        nh = round(w / target)
        # 足元（下）を残すように、上を多めに切る
        im = im.crop((0, h - nh, w, h))
    return im.resize(BG_SIZE, Image.LANCZOS)


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    src = Path(sys.argv[1])
    out = ROOT / "src/assets/img"
    if "--out" in sys.argv:
        out = Path(sys.argv[sys.argv.index("--out") + 1])
    out.mkdir(parents=True, exist_ok=True)
    ids = known_ids()
    ok = True
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"))
    if not files:
        print("絵が見つかりません。")
        return 1
    for path in files:
        art_id = path.stem
        if art_id not in ids:
            print(f"✘ {path.name}: 知らない名前です（使える名前は art/ART_GUIDE.md の一覧）")
            ok = False
            continue
        im = Image.open(path)
        notes: list[str] = []
        if min(im.size) < 512:
            notes.append(f"元の絵が小さい（{im.size[0]}×{im.size[1]}）")
        if art_id.startswith("bg_"):
            result = fit_background(im)
            result.save(out / f"{art_id}.webp", "WEBP", quality=80, method=6)
        else:
            im = im.convert("RGBA")
            if not has_transparency(im):
                im = remove_flat_background(im)
                notes.append("背景が透明でなかったので、四隅の色を消した（縁を確かめる）")
            result = fit_character(im)
            result.save(out / f"{art_id}.webp", "WEBP", quality=86, method=6)
        kb = (out / f"{art_id}.webp").stat().st_size / 1024
        if kb > MAX_KB:
            notes.append(f"大きい（{kb:.0f}KB。{MAX_KB}KB 以下にしたい）")
            ok = False
        print(f"✔ {path.name} → {art_id}.webp（{result.size[0]}×{result.size[1]}、{kb:.0f}KB）" + (f"  ※{'、'.join(notes)}" if notes else ""))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
