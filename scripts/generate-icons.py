#!/usr/bin/env python3
"""
generate-icons.py — F-20 アプリアイコン生成（spec-v11.md v1.2 §F-20、
design-v11/components.md §29、system.md §1.16）。

生成するアセット：
  - assets/icon.png                          (1024×1024、iOS / 共通マスター)
  - assets/adaptive-icon-foreground.png     (1024×1024、Android adaptive 前景)
  - assets/adaptive-icon-background.png     (1024×1024、Android adaptive 背景、単色)
  - assets/favicon.png                       (196×196、Web favicon)
  - assets/pwa-192.png                       (192×192、PWA)
  - assets/pwa-512.png                       (512×512、PWA)
  - assets/splash-icon.png                   (1024×1024、Expo splash)
  - assets/icons/app/icon-source.svg        (原画 SVG マスター)

図柄定義（system.md §1.16.1）：
  - ガボールパッチを 45°（左下→右上、時計回り 45°）に固定
  - コントラスト 0.7〜0.8、暗背景 #1A1D24
  - パッチサイズはマスター 80%（820px 角）
  - 縞は 4 周期（cpd ≒ 4）程度、ガウス窓

Usage:
  python3 scripts/generate-icons.py
"""

import math
import os
from PIL import Image

# Brand colors（system.md §1.4 / mockup 07-postsession.html token）
BG_COLOR = (0x1A, 0x1D, 0x24)       # #1A1D24 (dark surface)
PATCH_BG_GRAY = 128                  # ガボール背景灰（中性）
STRIPE_AMP = 0.78                    # コントラスト 0.78（範囲内）
ANGLE_DEG = 45                       # 45°（左下 → 右上、時計回り）
WAVELENGTH_RATIO = 0.16              # マスター長辺に対する縞 1 周期幅（≒6 周期）
SIGMA_RATIO = 0.28                   # ガウス窓 sigma：マスター長辺に対する比

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(REPO_ROOT, "assets")
ICONS_DIR = os.path.join(ASSETS_DIR, "icons", "app")


def gabor_patch(size: int, with_bg: bool = True) -> Image.Image:
    """ガボールパッチを生成して PIL Image (RGB) で返す。

    - 中央 80% にパッチ。残りは背景色（暗）または透明
    - 角度 45°、時計回り（左下→右上）の縞模様
    - ガウス窓
    """
    if with_bg:
        img = Image.new("RGB", (size, size), BG_COLOR)
    else:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # ガボール本体は中央 80% × 80%
    patch_size = int(size * 0.8)
    cx = size / 2
    cy = size / 2
    angle = math.radians(ANGLE_DEG)
    cos_a = math.cos(angle)
    sin_a = math.sin(angle)
    wavelength = max(2.0, patch_size * WAVELENGTH_RATIO)
    sigma = patch_size * SIGMA_RATIO
    radius = patch_size / 2

    pixels = img.load()
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            # 角度に従って周期座標を計算（cos(2π * (dx*cos+dy*sin) / λ)）
            phase = (dx * cos_a + dy * sin_a) / wavelength
            stripe = math.cos(2 * math.pi * phase)
            # ガウス窓（円形 envelope）
            r2 = dx * dx + dy * dy
            envelope = math.exp(-r2 / (2 * sigma * sigma))
            # マスク（パッチ領域外は背景）
            if r2 > radius * radius:
                if with_bg:
                    continue
                # 透明はそのまま
                continue
            value = PATCH_BG_GRAY + stripe * envelope * STRIPE_AMP * 127
            value = max(0, min(255, int(round(value))))
            if with_bg:
                pixels[x, y] = (value, value, value)
            else:
                # alpha は envelope（パッチ中心が不透明、端は透明）
                alpha = int(round(min(1.0, envelope * 1.2) * 255))
                pixels[x, y] = (value, value, value, alpha)
    return img


def make_solid_bg(size: int, color: tuple) -> Image.Image:
    return Image.new("RGB", (size, size), color)


def write_svg_source(path: str) -> None:
    """マスター SVG を書き出す（編集用、図柄は概念的近似のみ）。"""
    svg = f"""<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!--
GaborEye App Icon — マスター SVG（v1.2 Stage 3）
spec-v11.md v1.2 §F-20、design-v11/components.md §29、system.md §1.16

図柄：ガボールパッチ 45°（左下→右上、時計回り）
背景：#1A1D24
パッチ中心 (512, 512)、半径 410（マスター 80%）
縞模様は angle=45°、コントラスト 0.78、ガウス窓 sigma=287

注：本 SVG はビルド時に scripts/generate-icons.py で PNG に変換される。
SVG を SVG のまま使う場合は Native では rasterize できないため非推奨。
-->
<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 1024 1024\">
  <rect width=\"1024\" height=\"1024\" fill=\"#1A1D24\" />
  <defs>
    <radialGradient id=\"gauss\" cx=\"50%\" cy=\"50%\" r=\"50%\">
      <stop offset=\"0%\" stop-color=\"white\" stop-opacity=\"1\" />
      <stop offset=\"100%\" stop-color=\"white\" stop-opacity=\"0\" />
    </radialGradient>
    <pattern id=\"stripe\" patternUnits=\"userSpaceOnUse\"
             width=\"131\" height=\"131\" patternTransform=\"rotate(45)\">
      <rect x=\"0\" y=\"0\" width=\"131\" height=\"65.5\" fill=\"#E8E8E8\" />
      <rect x=\"0\" y=\"65.5\" width=\"131\" height=\"65.5\" fill=\"#181818\" />
    </pattern>
    <mask id=\"gaussMask\">
      <circle cx=\"512\" cy=\"512\" r=\"410\" fill=\"url(#gauss)\" />
    </mask>
  </defs>
  <g mask=\"url(#gaussMask)\">
    <rect width=\"1024\" height=\"1024\" fill=\"url(#stripe)\" />
  </g>
</svg>
"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(svg)


def main() -> None:
    os.makedirs(ASSETS_DIR, exist_ok=True)
    os.makedirs(ICONS_DIR, exist_ok=True)

    print("Generating master gabor patch (1024×1024)…")
    master = gabor_patch(1024, with_bg=True)
    master_fg = gabor_patch(1024, with_bg=False)

    targets = [
        (os.path.join(ASSETS_DIR, "icon.png"), 1024, master, "RGB"),
        (
            os.path.join(ASSETS_DIR, "adaptive-icon-foreground.png"),
            1024,
            master_fg,
            "RGBA",
        ),
        (os.path.join(ASSETS_DIR, "splash-icon.png"), 1024, master, "RGB"),
        (os.path.join(ASSETS_DIR, "pwa-512.png"), 512, master, "RGB"),
        (os.path.join(ASSETS_DIR, "pwa-192.png"), 192, master, "RGB"),
        (os.path.join(ASSETS_DIR, "favicon.png"), 196, master, "RGB"),
    ]

    for path, size, source, mode in targets:
        if size == 1024:
            img = source
        else:
            img = source.resize((size, size), Image.LANCZOS)
        if mode == "RGB" and img.mode != "RGB":
            # 透明部分を BG_COLOR に flatten
            bg = Image.new("RGB", img.size, BG_COLOR)
            bg.paste(img, (0, 0), img if img.mode == "RGBA" else None)
            img = bg
        img.save(path, optimize=True)
        print(f"  wrote {path} ({size}×{size}, {os.path.getsize(path)} bytes)")

    # Adaptive icon background：単色 #1A1D24
    bg_path = os.path.join(ASSETS_DIR, "adaptive-icon-background.png")
    Image.new("RGB", (1024, 1024), BG_COLOR).save(bg_path, optimize=True)
    print(
        f"  wrote {bg_path} (1024×1024, {os.path.getsize(bg_path)} bytes)"
    )

    # マスター SVG
    svg_path = os.path.join(ICONS_DIR, "icon-source.svg")
    write_svg_source(svg_path)
    print(f"  wrote {svg_path} (master SVG)")

    print("Done.")


if __name__ == "__main__":
    main()
