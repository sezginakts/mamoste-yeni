// Etkinlik motorlarını (tek dosyalık HTML) uygulamanın içe aktarabileceği JS modülüne çevirir.
// Kullanım: node tools/etkinlik/derle.js   (tools/etkinlik içindeki bir .html değişince yeniden çalıştır)
const fs = require('fs');
const path = require('path');

const MOTORLAR = [
  { kaynak: 'cumle.html', hedef: '../../src/data/activities/cumleEngine.js' },
  { kaynak: 'cark.html', hedef: '../../src/data/activities/carkEngine.js' },
  { kaynak: 'terazi.html', hedef: '../../src/data/activities/teraziEngine.js' },
  { kaynak: 'fiilimsi.html', hedef: '../../src/data/activities/fiilimsiEngine.js' },
  { kaynak: 'hikaye.html', hedef: '../../src/data/activities/hikayeEngine.js' },
  { kaynak: 'logo.html', hedef: '../../src/data/activities/logoEngine.js' },
  { kaynak: 'kronoloji.html', hedef: '../../src/data/activities/kronolojiEngine.js' },
  { kaynak: 'zaman.html', hedef: '../../src/data/activities/zamanEngine.js' },
  { kaynak: 'harita.html', hedef: '../../src/data/activities/haritaEngine.js' },
];

for (const m of MOTORLAR) {
  // Windows'ta git CRLF ile çıkarabilir; çıktı her makinede aynı olsun diye LF'e çevrilir.
  const html = fs.readFileSync(path.join(__dirname, m.kaynak), 'utf8').replace(/\r\n/g, '\n');
  const js =
    `// Otomatik üretildi (tools/etkinlik/${m.kaynak} → node tools/etkinlik/derle.js). Elle düzenleme.\n` +
    `// Yer tutucular: /*__HAVUZ__*/ __BASLIK__ __ALT__ __IMZA__ __ANAHTAR__ (build.js doldurur).\n` +
    `export default ${JSON.stringify(html)};\n`;
  fs.writeFileSync(path.join(__dirname, m.hedef), js);
  console.log(`${m.kaynak} → ${m.hedef} (${(js.length / 1024).toFixed(1)} KB)`);
}
