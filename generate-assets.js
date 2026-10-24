// Okul logosu: assets/kaynak/okul-bayrak.png (O-K-U-L harfli dört bayrak) -> tüm uygulama varlıkları.
//   icon.png          1024, beyaz zemin, bayraklar 2×2 — kare simgede harfler okunaklı kalsın
//   adaptive-icon.png 1024, Android: aynı 2×2, güvenli alanın (ortadaki ~%66) içinde; zemin rengi app.json'da beyaz
//   favicon.png       196, web
//   splash.png        açılış ekranı: dört bayrak yan yana, beyaz zemin (app.json splash.backgroundColor beyaz)
// Çalıştır: node generate-assets.js   (sharp gerekir: npm i --no-save sharp; ya da SHARP_PATH ile yolunu ver)
const sharp = require(process.env.SHARP_PATH || 'sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'assets');
const SRC = path.join(OUT, 'kaynak', 'okul-bayrak.png');
const WHITE = '#FFFFFF';

// Kaynak görselde bayrak kartları (gölge dahil), 1600×800 üzerinde ölçüldü.
const CARDS = [
  { left: 150, top: 168, width: 322, height: 500 },
  { left: 493, top: 168, width: 306, height: 500 },
  { left: 810, top: 168, width: 322, height: 500 },
  { left: 1137, top: 168, width: 326, height: 500 },
];

const card = (i) => sharp(SRC).extract(CARDS[i]).png().toBuffer();

// size×size tuval, ortadaki box×box alana 2×2 bayrak.
async function grid(size, box, bg) {
  const gap = Math.round(box * 0.05);
  const scale = Math.min((box - gap) / 2 / 326, (box - gap) / 2 / 500);
  const w = Math.round(326 * scale);
  const h = Math.round(500 * scale);
  const x0 = Math.round((size - (2 * w + gap)) / 2);
  const y0 = Math.round((size - (2 * h + gap)) / 2);
  const layers = [];
  for (let row = 0; row < 2; row++) {
    const y = y0 + row * (h + gap);
    for (let col = 0; col < 2; col++) {
      const buf = await sharp(await card(row * 2 + col)).resize(w, h).png().toBuffer();
      layers.push({ input: buf, left: x0 + col * (w + gap), top: y });
    }
  }
  return sharp({ create: { width: size, height: size, channels: 4, background: bg } }).composite(layers);
}

async function main() {
  if (!fs.existsSync(SRC)) throw new Error(`Kaynak görsel yok: ${SRC}`);

  // App ikonu — opak (App Store alfa kabul etmez)
  await (await grid(1024, 900, WHITE)).flatten({ background: WHITE }).png().toFile(path.join(OUT, 'icon.png'));
  console.log('✓ icon.png');

  // Android adaptive foreground — içerik güvenli alanda (Android kenarları kırpar)
  await (await grid(1024, 620, WHITE)).png().toFile(path.join(OUT, 'adaptive-icon.png'));
  console.log('✓ adaptive-icon.png');

  // Favicon (web)
  await (await grid(196, 180, WHITE)).flatten({ background: WHITE }).png().toFile(path.join(OUT, 'favicon.png'));
  console.log('✓ favicon.png');

  // Açılış ekranı — dört bayrak yan yana, kare tuvalin ortasında (resizeMode: contain)
  const S = 1284;
  const strip = await sharp(SRC).extract({ left: 130, top: 150, width: 1350, height: 530 }).resize(1150).png().toBuffer();
  const meta = await sharp(strip).metadata();
  await sharp({ create: { width: S, height: S, channels: 4, background: WHITE } })
    .composite([{ input: strip, left: Math.round((S - meta.width) / 2), top: Math.round((S - meta.height) / 2) }])
    .flatten({ background: WHITE })
    .png()
    .toFile(path.join(OUT, 'splash.png'));
  console.log('✓ splash.png');

  console.log('\nTüm varlıklar üretildi -> assets/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
