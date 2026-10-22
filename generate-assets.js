// Y2 logosu (tam yuvarlak mavi daire + beyaz "ing") -> tüm uygulama varlıkları.
// Çalıştır: node generate-assets.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'assets');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const BLUE1 = '#3B82F6';
const BLUE2 = '#2563EB';
const DARK = '#0F172A';

// Daire + "ing" SVG. bg: arka plan ('transparent' | renk). pad: dairenin kenardan boşluğu (oran).
function logoSVG(size, { bg = 'transparent', circle = true } = {}) {
  const cx = size / 2;
  const r = size * 0.46;
  const fontSize = size * 0.34;
  const bgRect = bg === 'transparent' ? '' : `<rect width="${size}" height="${size}" fill="${bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${BLUE1}"/><stop offset="1" stop-color="${BLUE2}"/></linearGradient></defs>
  ${bgRect}
  ${circle ? `<circle cx="${cx}" cy="${cx}" r="${r}" fill="url(#g)"/>` : ''}
  <text x="${cx}" y="${cx + fontSize * 0.35}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="${-size * 0.015}">ing</text>
</svg>`;
}

// Splash SVG: koyu zemin, ortada logo + alt yazı yok (Expo metni ayrı ekler; sade bırakıyoruz)
function splashSVG(w, h, bg) {
  const cx = w / 2, cy = h / 2;
  const r = Math.min(w, h) * 0.13;
  const fontSize = r * 0.74;
  const textColor = bg === DARK ? '#F1F5F9' : '#0F172A';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${BLUE1}"/><stop offset="1" stop-color="${BLUE2}"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="${bg}"/>
  <circle cx="${cx}" cy="${cy - r * 0.4}" r="${r}" fill="url(#g)"/>
  <text x="${cx}" y="${cy - r * 0.4 + fontSize * 0.35}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="${-r * 0.03}">ing</text>
  <text x="${cx}" y="${cy + r * 1.5}" font-family="Arial, Helvetica, sans-serif" font-size="${r * 0.42}" font-weight="800" fill="${textColor}" text-anchor="middle">Mamoste</text>
</svg>`;
}

async function png(svg, file, size, { flatten = false } = {}) {
  let img = sharp(Buffer.from(svg)).resize(size, size);
  // App Store ikonu alfa/şeffaflık kabul etmez -> opak zemine yatır.
  if (flatten) img = img.flatten({ background: DARK });
  await img.png().toFile(path.join(OUT, file));
  console.log('✓', file);
}

async function main() {
  // App ikonu (iOS/genel) — 1024, opak (alfa YOK; App Store şartı)
  await png(logoSVG(1024, { bg: DARK }), 'icon.png', 1024, { flatten: true });

  // Android adaptive foreground — şeffaf zemin, sadece daire (Android kendi maskeler)
  await png(logoSVG(1024, { bg: 'transparent' }), 'adaptive-icon.png', 1024);

  // Favicon (web)
  await png(logoSVG(196, { bg: DARK }), 'favicon.png', 196);

  // Splash (koyu) — kare büyük; Expo resizeMode contain ile ortalar
  const splashDark = splashSVG(1284, 1284, DARK);
  await sharp(Buffer.from(splashDark)).png().toFile(path.join(OUT, 'splash.png'));
  console.log('✓ splash.png');

  console.log('\nTüm varlıklar üretildi -> assets/');
}

main().catch((e) => { console.error(e); process.exit(1); });
