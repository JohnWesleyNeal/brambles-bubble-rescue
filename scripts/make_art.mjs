import sharp from 'sharp';

for (const [name, width] of [['bramble', 440], ['bramble-blink', 440], ['bee', 160], ['bee-body', 160]]) {
  await sharp(`public/${name}.svg`, { density: 192 })
    .resize({ width })
    .png()
    .toFile(`public/${name}.png`);
}
