"""Generate the original X-shaped icon and Chrome Web Store graphics."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "store-assets"
SOURCE = ASSETS / "source"
BLACK = "#070809"
CARD = "#111417"
LINE = "#303840"
WHITE = "#f5f7fa"
MUTED = "#a6b0ba"
CYAN = "#75e4ef"
FONT = "/System/Library/Fonts/STHeiti Medium.ttc"
FONT_LIGHT = "/System/Library/Fonts/STHeiti Light.ttc"


def font(size, light=False):
    return ImageFont.truetype(FONT_LIGHT if light else FONT, size)


def icon(size):
    scale = 8
    im = Image.new("RGBA", (128 * scale, 128 * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    box = lambda values: tuple(round(v * scale) for v in values)
    draw.rounded_rectangle(box((8, 8, 120, 120)), radius=25 * scale, fill=BLACK,
                           outline=LINE, width=2 * scale)
    draw.polygon([box(p) for p in ((31, 34), (48, 34), (97, 94), (80, 94))], fill=WHITE)
    draw.polygon([box(p) for p in ((80, 34), (97, 34), (48, 94), (31, 94))], fill=WHITE)
    # The cyan terminal gives the letter its own small circuit-like signature.
    draw.polygon([box(p) for p in ((97, 26), (103, 32), (97, 38), (91, 32))], fill=CYAN)
    return im.resize((size, size), Image.Resampling.LANCZOS)


def label(draw, xy, value, size, color=WHITE, light=False):
    draw.text(xy, value, fill=color, font=font(size, light))


def backdrop(size):
    im = Image.new("RGB", size, BLACK)
    draw = ImageDraw.Draw(im)
    width, height = size
    for x in range(0, width, 44):
        draw.line((x, 0, x, height), fill="#12171b", width=1)
    for y in range(0, height, 44):
        draw.line((0, y, width, y), fill="#12171b", width=1)
    draw.rectangle((0, 0, width, 5), fill=CYAN)
    return im


def screenshot(number, filename, title, note):
    im = Image.open(SOURCE / filename).convert("RGB")
    draw = ImageDraw.Draw(im)
    draw.rectangle((0, 0, 1280, 86), fill=BLACK)
    draw.line((0, 86, 1280, 86), fill=LINE, width=1)
    mark = icon(54)
    im.paste(mark, (28, 15), mark)
    draw = ImageDraw.Draw(im)
    label(draw, (101, 18), title, 26)
    label(draw, (102, 56), note, 13, MUTED, True)
    draw.rectangle((1205, 24, 1250, 61), outline=LINE, width=1)
    label(draw, (1216, 29), f"0{number}", 18, CYAN)
    folder = ASSETS / "screenshots"
    folder.mkdir(exist_ok=True)
    im.save(folder / f"screenshot-0{number}-1280x800.png", optimize=True)


def small():
    im = backdrop((440, 280))
    mark = icon(79)
    im.paste(mark, (24, 30), mark)
    draw = ImageDraw.Draw(im)
    label(draw, (117, 40), "公众号文章", 23)
    label(draw, (118, 75), "→ Markdown → X", 21, CYAN)
    draw.line((32, 139, 407, 139), fill=LINE, width=2)
    label(draw, (34, 162), "把内容带到 X 文章", 30)
    label(draw, (36, 223), "本地保存 · 预览导入 · 继续创作", 15, MUTED, True)
    folder = ASSETS / "promo"
    folder.mkdir(exist_ok=True)
    im.save(folder / "small-promo-440x280.png", optimize=True)


def marquee():
    im = backdrop((1400, 560))
    draw = ImageDraw.Draw(im)
    mark = icon(112)
    im.paste(mark, (75, 54), mark)
    draw = ImageDraw.Draw(im)
    label(draw, (210, 75), "公众号 Markdown → X 文章", 36)
    label(draw, (81, 207), "从公众号到 X 文章", 57)
    label(draw, (85, 304), "微信文章转 Markdown，Markdown 导入 X 草稿。", 28, MUTED, True)
    draw.line((86, 395, 836, 395), fill=LINE, width=2)
    for x, value in ((86, "01  保存文章"), (335, "02  编辑 MD"), (584, "03  导入 X")):
        draw.rounded_rectangle((x, 426, x + 209, 487), radius=13, fill=CARD, outline=LINE, width=2)
        label(draw, (x + 18, 445), value, 18, CYAN)
    # Three thin document cards connect the source, local file and draft.
    for x, y in ((931, 102), (1050, 193), (930, 302)):
        draw.rounded_rectangle((x, y, x + 229, y + 150), radius=19, fill=CARD, outline="#3b4650", width=2)
        draw.line((x + 26, y + 37, x + 177, y + 37), fill=WHITE, width=9)
        draw.line((x + 26, y + 67, x + 190, y + 67), fill="#687682", width=5)
        draw.line((x + 26, y + 86, x + 135, y + 86), fill="#687682", width=5)
    draw.line((1045, 188, 1096, 242), fill=CYAN, width=3)
    draw.line((1076, 340, 1032, 371), fill=CYAN, width=3)
    im.save(ASSETS / "promo" / "marquee-promo-1400x560.png", optimize=True)


def main():
    (ASSETS / "icons").mkdir(exist_ok=True)
    icon(128).save(ASSETS / "icons" / "store-icon-128.png")
    for size in (16, 32, 48, 128):
        icon(size).save(ROOT / "icons" / f"icon{size}.png")
    screenshot(1, "demo-wechat-saved.png", "公众号文章，一键保存 Markdown", "真实插件界面 · 虚构文章示例")
    screenshot(2, "demo-x-picker.png", "在 X 文章页选择 Markdown 文件", "真实插件界面 · 虚构编辑区示意")
    screenshot(3, "demo-x-preview.png", "预览内容，导入 X 文章草稿", "真实插件界面 · 虚构编辑区示意")
    small()
    marquee()


if __name__ == "__main__":
    main()
