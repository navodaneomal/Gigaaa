"""Contact sheet of rendered pages: python3 scripts/contact.py build/preview out.png [first] [last] [cols]"""
import sys, glob
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(d + '/p-*.png'))
a = int(sys.argv[3]) if len(sys.argv) > 3 else 1
b = int(sys.argv[4]) if len(sys.argv) > 4 else len(files)
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 6
files = files[a - 1:b]
ims = [Image.open(f) for f in files]
w = 300
h = int(ims[0].height * w / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + 10) + 10, rows * (h + 26) + 10), (40, 38, 36))
dr = ImageDraw.Draw(sheet)
for i, im in enumerate(ims):
    x = 10 + (i % cols) * (w + 10)
    y = 10 + (i // cols) * (h + 26)
    sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y + 16))
    dr.text((x, y), f'p.{a + i}', fill=(220, 210, 190))
sheet.save(out)
print(out, sheet.size)
