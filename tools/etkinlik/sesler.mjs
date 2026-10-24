// İngilizce oyunlarda okunan cümleleri doğal sesle (edge-tts, en-US-AriaNeural) MP3'e çevirir ve
// src/data/activities/ingilizce/ses/<havuz>.js olarak yazar: { "metin": "<mp3 base64>" }. build.js bunu
// oyunun HTML'ine SESLER olarak gömer; oyun önce bu sesi çalar (cihazdan ve internetten bağımsız).
// Okunan metinler motorlardaki konus(...) çağrılarıyla aynı olmalı:
//   cumle: cümle (q[0]) · kalip: her kalıbın cümleleri (cumleler[][0]) · cark: soru (q[0]), cevap (q[1]) ve cevabın ilk parçası (q[1] "/", "(", "…" öncesi).
// Kullanım: pip install -U edge-tts  →  node tools/etkinlik/sesler.mjs   (havuz değişince yeniden çalıştır;
// yalnız yeni/değişen metinler üretilir, kullanılmayanlar silinir).
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { pathToFileURL, fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const POOLS = path.join(ROOT, 'src/data/activities/ingilizce');
const OUT = path.join(POOLS, 'ses');
const VOICE = 'en-US-AriaNeural';
const RATE = '-5%';
const PARALLEL = 4;

const textsFor = (file, pool) => {
  const out = new Set();
  for (const q of pool) {
    if (file.startsWith('cumle')) out.add(String(q[0]).trim());
    else if (file.startsWith('kalip')) q.cumleler.forEach((c) => out.add(String(c[0]).trim()));
    else if (file.startsWith('cark')) {
      out.add(String(q[0]).trim());
      out.add(String(q[1]).trim());
      out.add(String(q[1]).split(/\s*[/(…]/)[0].trim());
    }
  }
  out.delete('');
  return [...out];
};

const tts = (text, file) =>
  new Promise((ok, fail) =>
    execFile('python', ['-m', 'edge_tts', '--voice', VOICE, `--rate=${RATE}`, '--text', text, '--write-media', file], (e, _o, err) =>
      e ? fail(new Error(err || e.message)) : ok()
    )
  );

async function run() {
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mamoste-ses-'));
  const files = fs.readdirSync(POOLS).filter((f) => /^(cumle|cark|kalip).*\.js$/.test(f));
  for (const f of files) {
    const pool = (await import(pathToFileURL(path.join(POOLS, f)).href)).default;
    const texts = textsFor(f, pool);
    const target = path.join(OUT, f);
    const old = fs.existsSync(target) ? (await import(pathToFileURL(target).href + `?t=${Date.now()}`)).default : {};
    const out = {};
    const todo = texts.filter((t) => !(out[t] = old[t]));
    let i = 0;
    const worker = async () => {
      while (i < todo.length) {
        const t = todo[i++];
        const mp3 = path.join(tmp, `${f}-${i}.mp3`);
        for (let deneme = 1; ; deneme++) {
          try {
            await tts(t, mp3);
            break;
          } catch (e) {
            if (deneme >= 3) throw new Error(`"${t}" üretilemedi: ${e.message}`);
          }
        }
        out[t] = fs.readFileSync(mp3).toString('base64');
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    const sorted = Object.fromEntries(texts.map((t) => [t, out[t]]));
    fs.writeFileSync(
      target,
      `// OTOMATİK ÜRETİLDİ — node tools/etkinlik/sesler.mjs (${VOICE}, ${RATE}). Elle düzenleme.\n` +
        `// ${f} havuzunda okunan metinler → MP3 (base64).\n` +
        `export default ${JSON.stringify(sorted)};\n`
    );
    const kb = fs.statSync(target).size / 1024;
    console.log(`${f}: ${texts.length} metin (${todo.length} yeni) → ses/${f} ${kb.toFixed(0)} KB`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
