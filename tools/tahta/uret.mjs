// Tahta sitesini üretir → tahta-site/ (GitHub Pages'e bu klasörün içeriği yüklenir):
//   index.html      tahta sayfası (tools/tahta/index.html + Supabase adresi/anahtarı + supabase-js gömülü)
//   e/<id>.html     her branşın her etkinliği (src/data/activities → build.js), telefon "Tahtada aç" deyince açılır
// Kullanım: node tools/tahta/uret.mjs   (etkinlik ya da tahta sayfası değişince yeniden çalıştır)
// Yayın:   cd tahta-site && git add -A && git commit -m "…" && git push   → GitHub Pages birkaç dakikada günceller
//          (https://sezginakts.github.io/mamoste-tahta/ — app.json → extra.tahtaUrl)
import fs from 'fs';
import path from 'path';
import { createRequire, register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'tahta-site');

// Uygulama kodu Metro için yazıldı: uzantısız içe aktarma ve fonksiyon içinde require. Node'da aynısını sağla.
register(pathToFileURL(path.join(ROOT, 'tools/tahta/uzanti.mjs')).href);
const base = createRequire(pathToFileURL(path.join(ROOT, 'src/data/activities/index.js')).href);
globalThis.require = (p) => {
  try {
    return base(p);
  } catch (e) {
    return base(p + '.js');
  }
};

const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).expo.extra;
const umd = fs.readFileSync(path.join(ROOT, 'node_modules/@supabase/supabase-js/dist/umd/supabase.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const page = fs
  .readFileSync(path.join(ROOT, 'tools/tahta/index.html'), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace('/*__SUPABASE_UMD__*/', () => umd)
  .replace('__SUPABASE_URL__', app.supabaseUrl)
  .replace('__SUPABASE_KEY__', app.supabaseKey);

const { activitiesFor } = await import(pathToFileURL(path.join(ROOT, 'src/data/activities/index.js')).href);
const { buildHtml } = await import(pathToFileURL(path.join(ROOT, 'src/data/activities/build.js')).href);
const { BRANCHES } = await import(pathToFileURL(path.join(ROOT, 'src/data/branches.js')).href);

// Yalnız üretilen dosyalar yenilenir; tahta-site/.git (yayın deposu: github.com/sezginakts/mamoste-tahta) ve README kalır.
// Oyunlar tek tek yazılır: biri üretilemezse (ör. motor dosyası eksik) sitedeki önceki sürümü olduğu gibi kalır.
fs.mkdirSync(path.join(OUT, 'e'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), page);
fs.writeFileSync(path.join(OUT, '.nojekyll'), ''); // GitHub Pages dosyaları olduğu gibi sunsun
let n = 0;
let bytes = 0;
for (const b of BRANCHES) {
  for (const a of activitiesFor(b.id)) {
    let html;
    try {
      html = buildHtml(a);
    } catch (e) {
      console.warn(`! ${a.id} üretilemedi, önceki sürüm kalıyor: ${String(e.message).split(/\n/)[0]}`);
      continue;
    }
    fs.writeFileSync(path.join(OUT, 'e', `${a.id}.html`), html);
    n++;
    bytes += html.length;
  }
}
console.log(`tahta-site/: index.html + ${n} etkinlik (${(bytes / 1048576).toFixed(1)} MB)`);
