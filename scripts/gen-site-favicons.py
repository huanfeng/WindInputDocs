#!/usr/bin/env python3
"""
从主 logo 派生各站点的标签页图标。

清风有五个站，此前共用同一枚 logo.png —— 开着好几个标签时根本分不出哪个是哪个。
这个脚本给主 logo 的右下角叠一枚彩色折角，每站一色；主体的蓝底白「风」字一像素
未改，品牌不让位，区分只是叠上去的一角。

    文档主站    不加折角，它是基准
    社区论坛    琥珀金 41°
    主题市场    翠绿   123°
    主题编辑器  青     168°
    辅助工具    红       6°

选色的两条规矩，都是被小面积逼出来的：

  · **色相要拉得比常规配色更开。** 折角只占图标约七分之一。面积一小，相近色相
    就被大脑归成一类 —— 扫一眼只记得「右下角是暖色的那个」。最初论坛用橙 30°，
    离工具站的红 6° 只有 24°，实测两者认不出区别，才换成琥珀金。

  · **饱和度和明度也得更极端。** 市场原定薰衣草紫 #9b59b6，色相位置其实最优
    （282°，离所有已定色都远），但它偏灰偏粉，压在小三角里显得发虚、撑不住。
    同一个颜色铺满大面积时「高级」，缩到七分之一就成了「脏」。

市场的翠绿（123°）和编辑器的青（168°）只差 45°，比其它几对近，但一个深一个亮，
靠明度又拉开一道，实际不会认混。

用法：

    python scripts/gen-site-favicons.py <主logo.png> <输出目录>

产物需要手工分发到各站的 public/（它们分属不同仓库）：

    <输出>/editor-128.png  → WindInputThemeEditor/public/favicon-editor.png
    <输出>/editor-180.png  → WindInputThemeEditor/public/apple-touch-icon-editor.png
    <输出>/market-128.png  → WindInputThemeEditor/public/favicon-market.png
    <输出>/market-180.png  → WindInputThemeEditor/public/apple-touch-icon-market.png
    <输出>/tools-128.png   → WindInputTools/public/favicon.png
    <输出>/tools-180.png   → WindInputTools/public/apple-touch-icon.png
    <输出>/forum-128.png   → WindInputForum 的 assets（另见那个仓库的 settings/）

⚠️ 不要拿这些图去替换各站的 logo.png。那个文件还被页面内当品牌标识用
（市场站导航栏、工具站侧边栏与首页），那些位置不该带站点角标。

依赖 Pillow：pip install pillow
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw

WHITE = (255, 255, 255, 255)

SITES = [
    # (文件名, 站点, 折角色, 色相)
    ("forum", "社区论坛", (249, 168, 37), 41),
    ("market", "主题市场", (46, 125, 50), 123),
    ("editor", "主题编辑器", (26, 188, 156), 168),
    ("tools", "辅助工具", (231, 76, 60), 6),
]

# 128 给标签页，180 给 iOS 主屏。原图 423 KB 当 favicon 实在浪费。
SIZES = [128, 180]


def make_fold(src: Image.Image, color) -> Image.Image:
    """
    右下角折角。

    先铺一层白，再盖彩色三角，等于给折角描一条白边 —— 没有这条边，暖色贴在蓝底
    上边界会发糊，尤其在 16×16 缩到只剩几个像素时。

    最后拿原图的 alpha 当蒙版：主体是圆角矩形，直角三角形会戳到圆角外面去，
    必须裁回轮廓内。

    绘制全在原图尺寸（688px）上做，再 LANCZOS 降采样到目标尺寸 —— Pillow 的
    draw 没有抗锯齿，靠这一步超采样来消锯齿，比直接在 128px 上画干净得多。
    """
    im = src.copy()
    w = im.width
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    cut = w * 0.46
    gap = w * 0.035
    d.polygon([(w - cut - gap, w), (w, w - cut - gap), (w, w)], fill=WHITE)
    d.polygon([(w - cut, w), (w, w - cut), (w, w)], fill=(*color, 255))

    layer.putalpha(Image.composite(layer.split()[3], Image.new("L", im.size, 0), im.split()[3]))
    return Image.alpha_composite(im, layer)


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__.strip().split("用法：")[1].split("产物")[0].strip(), file=sys.stderr)
        return 2

    src_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    if not src_path.is_file():
        print(f"找不到源图：{src_path}", file=sys.stderr)
        return 1

    out_dir.mkdir(parents=True, exist_ok=True)
    src = Image.open(src_path).convert("RGBA")
    print(f"源图 {src_path.name}  {src.width}×{src.height}  {src_path.stat().st_size / 1024:.0f} KB\n")

    for name, label, color, hue in SITES:
        img = make_fold(src, color)
        made = []
        for size in SIZES:
            path = out_dir / f"{name}-{size}.png"
            img.resize((size, size), Image.LANCZOS).save(path, optimize=True)
            made.append(f"{size}px {path.stat().st_size / 1024:.1f}KB")
        print(f"{label:8} {hue:3}° #{color[0]:02x}{color[1]:02x}{color[2]:02x}  {'  '.join(made)}")

    # 主站不加折角，只压尺寸 —— 它是这套图标的基准
    for size in SIZES:
        src.resize((size, size), Image.LANCZOS).save(out_dir / f"docs-{size}.png", optimize=True)
    print("\n文档主站   不加折角，仅压缩尺寸")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
