"""Draw the original badger icon at the PWA's required sizes."""

from pathlib import Path
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SIZE = 512
image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)

draw.rounded_rectangle((0, 0, 511, 511), radius=118, fill="#1e6054")
draw.ellipse((72, 82, 440, 450), fill="#f3dfae")
draw.polygon([(117, 235), (91, 95), (152, 80), (245, 188), (267, 285)], fill="#344441")
draw.polygon([(395, 235), (421, 95), (360, 80), (267, 188), (245, 285)], fill="#344441")
draw.ellipse((112, 164, 400, 406), fill="#344441")
draw.polygon([(200, 151), (256, 121), (312, 151), (334, 380), (178, 380)], fill="#f5ead1")
draw.ellipse((168, 248, 203, 282), fill="#101d1a")
draw.ellipse((309, 248, 344, 282), fill="#101d1a")
draw.ellipse((246, 326, 278, 349), fill="#101d1a")
draw.arc((215, 328, 260, 375), 20, 145, fill="#101d1a", width=8)
draw.arc((260, 328, 305, 375), 35, 160, fill="#101d1a", width=8)
draw.ellipse((117, 368, 395, 434), fill="#2a3b36")

for size in (192, 512):
    image.resize((size, size), Image.Resampling.LANCZOS).save(ROOT / "public" / f"icon-{size}.png")
