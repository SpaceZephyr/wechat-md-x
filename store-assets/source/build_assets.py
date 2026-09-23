"""Build the store graphics from captured real extension UI and synthetic content."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / 'store-assets'
SOURCE = ASSETS / 'source'
INK = '#142638'
CORAL = '#ef765e'
TEAL = '#336f67'
CREAM = '#fff8ed'
FONT = '/System/Library/Fonts/STHeiti Medium.ttc'
FONT_LIGHT = '/System/Library/Fonts/STHeiti Light.ttc'

def font(size, light=False):
    return ImageFont.truetype(FONT_LIGHT if light else FONT, size)

def icon(size):
    s = 8
    im = Image.new('RGBA', (128*s,128*s), (0,0,0,0))
    d = ImageDraw.Draw(im)
    box = lambda a: tuple(int(v*s) for v in a)
    d.rounded_rectangle(box((16,16,112,112)), radius=22*s, fill=INK)
    d.rounded_rectangle(box((31,33,72,87)), radius=6*s, fill=CREAM)
    d.rounded_rectangle(box((56,41,97,96)), radius=6*s, fill=CORAL)
    d.line(box((38,47,59,47)), fill=INK, width=5*s)
    d.line(box((38,57,53,57)), fill=INK, width=5*s)
    d.polygon([box((45,65)),box((75,65)),box((75,58)),box((88,73)),box((75,88)),box((75,81)),box((45,81))], fill=CREAM)
    return im.resize((size,size), Image.Resampling.LANCZOS)

def text(d, xy, value, size, color='#ffffff', light=False):
    d.text(xy, value, font=font(size,light), fill=color)

def gradient(size):
    im = Image.new('RGB', size)
    d = ImageDraw.Draw(im)
    for y in range(size[1]):
        t=y/max(1,size[1]-1)
        a=(25,50,71); b=(37,75,77)
        d.line((0,y,size[0],y), fill=tuple(round(a[i]*(1-t)+b[i]*t) for i in range(3)))
    return im

def screenshot(i, filename, title, note):
    im = Image.open(SOURCE / filename).convert('RGB')
    d = ImageDraw.Draw(im)
    d.rectangle((0,0,1280,89), fill=INK)
    mark = icon(60)
    im.paste(mark,(34,15),mark)
    d = ImageDraw.Draw(im)
    text(d,(108,23),title,27)
    text(d,(108,62),note,13,'#bdd5ce',True)
    (ASSETS/'screenshots').mkdir(exist_ok=True)
    im.save(ASSETS/'screenshots'/f'screenshot-0{i}-1280x800.png', optimize=True)

def small():
    im=gradient((440,280));d=ImageDraw.Draw(im)
    d.ellipse((260,-80,520,180),fill='#315a59')
    mark=icon(95);im.paste(mark,(34,27),mark)
    d=ImageDraw.Draw(im)
    text(d,(146,42),'公众号 Markdown',22)
    text(d,(146,75),'→ X 文章',24)
    d.line((38,148,400,148), fill='#85a3a0', width=2)
    text(d,(40,174),'保存，再导入',33)
    text(d,(41,229),'公众号 → Markdown → X 草稿',16,'#d3e2dc',True)
    (ASSETS/'promo').mkdir(exist_ok=True)
    im.save(ASSETS/'promo'/'small-promo-440x280.png',optimize=True)

def marquee():
    im=gradient((1400,560));d=ImageDraw.Draw(im)
    d.ellipse((900,-190,1520,430),fill='#315a59')
    mark=icon(132);im.paste(mark,(75,67),mark)
    d=ImageDraw.Draw(im)
    text(d,(232,112),'公众号 Markdown → X 文章',35)
    text(d,(81,267),'从公众号到 Markdown，再到 X 草稿',49)
    text(d,(85,362),'把图文存成可编辑的文件，再一键导入文章草稿。',25,'#d3e2dc',True)
    for x,y,w,h in ((955,102,246,115),(1055,223,246,115),(945,343,246,115)):
        d.rounded_rectangle((x,y,x+w,y+h),radius=18,fill=CREAM)
    d.line((985,141,1160,141),fill=INK,width=8)
    d.line((985,169,1120,169),fill='#78918e',width=7)
    text(d,(1085,247),'# Markdown',21,INK)
    d.line((1085,288,1250,288),fill='#78918e',width=6)
    d.line((975,383,1145,383),fill=INK,width=8)
    d.line((975,412,1095,412),fill='#78918e',width=7)
    im.save(ASSETS/'promo'/'marquee-promo-1400x560.png',optimize=True)

def main():
    (ASSETS/'icons').mkdir(exist_ok=True)
    icon(128).save(ASSETS/'icons'/'store-icon-128.png')
    for size in (16,32,48,128):
        icon(size).save(ROOT/'icons'/f'icon{size}.png')
    screenshot(1,'demo-wechat-saved.png','公众号文章，连图片一起存为 Markdown','真实插件界面 · 虚构文章示例')
    screenshot(2,'demo-x-picker.png','在 X 文章页选择本地 Markdown 文件夹','真实插件界面 · 虚构编辑区示意')
    screenshot(3,'demo-x-preview.png','预览标题、封面和图片，再导入草稿','真实插件界面 · 虚构编辑区示意')
    small();marquee()

if __name__=='__main__':
    main()
