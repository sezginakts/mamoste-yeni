// Uygulama içi logo (renkli bant üstünde): bayraklı OKUL görselinden saydam zeminli PNG.
// Kaynak assets/kaynak/okul-bayrak.png: kenarlardan başlayıp zemine (neredeyse beyaz) yayılan doldurma ile zemin saydam
// yapılır; bayrakların gölgesi sınır olur, bayrakların içi (beyaz kart) korunur. Sonra boş kenarlar kırpılır.
// Çalıştır: node tools/logo-saydam.js [bayrak]   (sharp gerekir; SHARP_PATH ile yolunu verebilirsin)
const sharp = require(process.env.SHARP_PATH || 'sharp');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets/kaynak/okul-bayrak.png');
const OUT = path.join(ROOT, process.argv[2] === 'bayrak' ? 'assets/logo-bayrak.png' : 'assets/logo.png');
const BG_MIN = 249; // bu ve üstü (her kanal) zemin sayılır

// "harf" modu (varsayılan): bayrak kartları yok, yalnız karakalem harfler BEYAZ (renkli bant üstünde) → assets/logo.png
// "bayrak" modu: beyaz bayrak kartlarıyla, zemin saydam → assets/logo-bayrak.png
const MODE = process.argv[2] === 'bayrak' ? 'bayrak' : 'harf';

async function letters() {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const out = Buffer.alloc(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    const lum = (data[p * 3] + data[p * 3 + 1] + data[p * 3 + 2]) / 3;
    // koyu mürekkep → opak beyaz; açık kâğıt / gölge → saydam (arada yumuşak geçiş)
    const a = Math.max(0, Math.min(1, (190 - lum) / 120));
    out[p * 4] = 255;
    out[p * 4 + 1] = 255;
    out[p * 4 + 2] = 255;
    out[p * 4 + 3] = Math.round(a * 255);
  }
  // Harfler bayrak aralığı kadar seyrek: her harfi ayrı kesip aralarını daraltarak yan yana diz.
  const LETTERS = [[184, 422], [530, 742], [861, 1074], [1206, 1391]]; // kaynakta harflerin x aralığı
  const TOP = 268; // 196–226 arası bayrak delikleri; harfler 272'de başlar
  const HGT = 556 - TOP + 1;
  const GAP = 38;
  const img = sharp(out, { raw: { width: W, height: H, channels: 4 } });
  const parts = [];
  let x = 0;
  for (const [a0, a1] of LETTERS) {
    const w = a1 - a0 + 1;
    parts.push({ input: await img.clone().extract({ left: a0, top: TOP, width: w, height: HGT }).png().toBuffer(), left: x, top: 0 });
    x += w + GAP;
  }
  await sharp({ create: { width: x - GAP, height: HGT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(parts)
    .png()
    .toBuffer()
    .then((buf) => sharp(buf).resize({ height: 200 }).png().toFile(OUT));
  const m = await sharp(OUT).metadata();
  console.log('✓ assets/logo.png (harfler, beyaz)', m.width + '×' + m.height);
}

(async () => {
  if (MODE === 'harf') return letters();
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    out[i * 4] = data[i * 3];
    out[i * 4 + 1] = data[i * 3 + 1];
    out[i * 4 + 2] = data[i * 3 + 2];
    out[i * 4 + 3] = 255;
  }
  const isBg = (p) => data[p * 3] >= BG_MIN && data[p * 3 + 1] >= BG_MIN && data[p * 3 + 2] >= BG_MIN;
  const seen = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p] || !isBg(p)) continue;
    seen[p] = 1;
    out[p * 4 + 3] = 0;
    const x = p % W;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (p >= W) stack.push(p - W);
    if (p < W * (H - 1)) stack.push(p + W);
  }
  // Gölgenin açık kısmı yarı saydam: zemine yakın gri pikselleri yumuşat (bant renginde kirli kenar kalmasın).
  for (let p = 0; p < W * H; p++) {
    if (out[p * 4 + 3] === 0) continue;
    const v = Math.min(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]);
    const nearBg = [p - 1, p + 1, p - W, p + W].some((q) => q >= 0 && q < W * H && out[q * 4 + 3] === 0);
    if (nearBg && v > 200 && v < BG_MIN) out[p * 4 + 3] = Math.round(((BG_MIN - v) / (BG_MIN - 200)) * 255);
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).trim().resize({ height: 240 }).png().toFile(OUT);
  const m = await sharp(OUT).metadata();
  console.log('✓ assets/logo-bayrak.png', m.width + '×' + m.height);
})();
