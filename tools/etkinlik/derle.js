// Etkinlik motorlarını (tek dosyalık HTML) uygulamanın içe aktarabileceği JS modülüne çevirir.
// Kullanım: node tools/etkinlik/derle.js   (tools/etkinlik içindeki bir .html değişince yeniden çalıştır)
const fs = require('fs');
const path = require('path');

const MOTORLAR = [
  { kaynak: 'cumle.html', hedef: '../../src/data/activities/cumleEngine.js' },
  { kaynak: 'cark.html', hedef: '../../src/data/activities/carkEngine.js' },
  { kaynak: 'terazi.html', hedef: '../../src/data/activities/teraziEngine.js' },
];

for (const m of MOTORLAR) {
  const html = fs.readFileSync(path.join(__dirname, m.kaynak), 'utf8');
  const js =
    `// Otomatik üretildi (tools/etkinlik/${m.kaynak} → node tools/etkinlik/derle.js). Elle düzenleme.\n` +
    `// Yer tutucular: /*__HAVUZ__*/ __BASLIK__ __ALT__ __IMZA__ __ANAHTAR__ (build.js doldurur).\n` +
    `export default ${JSON.stringify(html)};\n`;
  fs.writeFileSync(path.join(__dirname, m.hedef), js);
  console.log(`${m.kaynak} → ${m.hedef} (${(js.length / 1024).toFixed(1)} KB)`);
}
