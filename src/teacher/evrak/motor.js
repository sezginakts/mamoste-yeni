// Evrak doldurma motoru (docxtemplater) — saf JS: uygulama ve tools/evrak/yayinla.mjs aynı kodu kullanır.
// Etiketler sozluk.js'te. Boş bilgi "……" olur (öğretmen elle doldurur); döngü satırındaki boş hücre boş kalır.
// Word'ün bir etiketi parçalara bölmesi ("{ok" + "ul}") docxtemplater'da sorun değil, biçim korunur.
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { kuralTarihi, trTarih } from './takvim.js';

export const BOS = '……';

// Türkçe büyük harf (Hermes'te toLocaleUpperCase('tr') güvenilir değil): i → İ, ı → I.
export const buyukHarf = (t) => String(t).replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();

const dolu = (v) => v !== undefined && v !== null && !(typeof v === 'string' && !v.trim());

function parser(etiket) {
  const ham = etiket.trim();
  if (ham === '.') return { get: (scope) => scope };
  if (ham.startsWith('gun:')) {
    const kural = ham.slice(4).trim();
    return { get: (scope, ctx) => trTarih(kuralTarihi(kural, kokVeri(ctx).__ref || new Date(), true)) };
  }
  const [ad, ...suzgecler] = ham.split('|').map((s) => s.trim());
  return {
    get(scope) {
      if (!scope || typeof scope !== 'object' || !(ad in scope)) return undefined; // üst kapsama bakılsın
      const v = scope[ad];
      if (!dolu(v)) return null;
      return suzgecler.reduce((x, s) => (s === 'buyuk' ? buyukHarf(x) : x), typeof v === 'number' ? String(v) : v);
    },
  };
}
// Kök veri (tarih kuralları evrakın eğitim yılına göre çözülsün diye __ref oradan okunur).
const kokVeri = (ctx) => (ctx && ctx.scopeList && ctx.scopeList[0]) || {};

// Döngü içindeki boş hücre (ör. öğrencinin numarası yoksa) boş kalır; dışarıdaki boş bilgi "……" (bos: denetimde işaret).
const nullGetterOf = (bos) => (part, scopeManager) => {
  if (part.module) return part.module === 'loop' ? [] : '';
  return scopeManager && scopeManager.scopePath && scopeManager.scopePath.length ? '' : bos;
};

// Şablonun düz metni (etiket denetimi için): Word'ün böldüğü parçalar birleşik gelir.
export function sablonMetni(bytes) {
  const doc = new Docxtemplater(new PizZip(bytes), { paragraphLoop: true, linebreaks: true, parser });
  return doc.getFullText();
}

// bytes: ArrayBuffer | Uint8Array (şablon) · veri: baglam.js → evrakVerisi. Döner Uint8Array (.docx).
// secenek.bos: boş bilginin yerine yazılacak (varsayılan "……"; yayın denetimi ayırt edilebilir bir işaret verir).
export function doldur(bytes, veri, secenek = {}) {
  let doc;
  try {
    doc = new Docxtemplater(new PizZip(bytes), { paragraphLoop: true, linebreaks: true, parser, nullGetter: nullGetterOf(secenek.bos || BOS) });
    doc.render(veri);
  } catch (e) {
    const ayrinti = e && e.properties && e.properties.errors ? e.properties.errors.map((x) => x.properties && x.properties.explanation).filter(Boolean) : [];
    throw new Error(`Şablon doldurulamadı: ${ayrinti.length ? ayrinti.join(' · ') : (e && e.message) || e}`);
  }
  return doc.getZip().generate({ type: 'uint8array', compression: 'DEFLATE' });
}
