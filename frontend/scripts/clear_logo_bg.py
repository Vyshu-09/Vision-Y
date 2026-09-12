from PIL import Image

path = r"c:\Users\vyshn\OneDrive\Desktop\vision-y\frontend\public\images\vignan-logo.png"
im = Image.open(path).convert("RGBA")
pixels = im.load()
w, h = im.size
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if r < 35 and g < 35 and b < 35:
            pixels[x, y] = (r, g, b, 0)
im.save(path)
print("logo processed", w, h)
