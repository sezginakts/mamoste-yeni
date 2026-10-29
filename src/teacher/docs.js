// Evraklar: öğretmen evrak şablonları (zümre, ŞÖK, yıllık plan, sınav, ölçme, kulüp, veli, rehberlik, sınıf).
// Liste + .docx dosyaları tahta sitesinde: <tahtaUrl>/evrak/liste3.json → v3/<id>.docx (yayın deposu github.com/sezginakts/mamoste-tahta).
// Şablonlar ana depoda evrak-kaynak/ + tools/evrak/sablon.mjs; `node tools/evrak/yayinla.mjs` denetleyip yayın klasörüne yazar.
// Yeni / güncel şablon için uygulama derlemesi gerekmez.
//
// liste3.json satırı: { id, kategori, ad, kisa?, grup?, donem, dosya, brans (null = herkes), tarih (şablonun güncellenme günü),
//   gun (varsayılan evrak tarihi — evrak/takvim.js), etiketler (şablonun kullandığı), ister (['sinif'|'ogrenci'|'kulup'|'duzey']), surum: 3 }
// İndirirken şablon cihazda doldurulur: evrak/baglam.js (veri) + evrak/motor.js (docxtemplater).
// liste.json (eski derlemeler için donmuş, eski {OGRETMEN} biçimi → docFill.js) yalnız liste3 alınamazsa kullanılır.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TAHTA_URL } from './BoardLink';
import { fillDocx, schoolYear, trDate, OGRENCI_SAYI } from './docFill';
import { doldur } from './evrak/motor';
import { evrakVerisi, eksikler } from './evrak/baglam';
import { ETIKETLER } from './evrak/sozluk';
import { varsayilanTarih, egitimYili } from './evrak/takvim';

// Ekrandaki başlıklar (sıra tools/evrak/yayinla.mjs → KATEGORILER ile aynı).
export const CATEGORIES = [
  { id: 'zumre', icon: '👥', name: 'Zümre tutanakları (okul ve ilçe)' },
  { id: 'sok', icon: '🏫', name: 'ŞÖK tutanakları ve yıllık plan' },
  { id: 'sinav', icon: '📝', name: 'Sınav evrakları' },
  { id: 'olcme', icon: '📊', name: 'Ölçme ve değerlendirme araçları' },
  { id: 'kulup', icon: '🎭', name: 'Kulüp dosyaları' },
  { id: 'sinif', icon: '🧑‍🏫', name: 'Sınıf ve danışman evrakları' },
  { id: 'bep', icon: '🧩', name: 'BEP (bireyselleştirilmiş eğitim programı)' },
];
// Eski listedeki (liste.json) ayrı başlıklar yeni başlığa düşer.
const ESKI_KATEGORI = { 'yillik-plan': 'sok', veli: 'sinif', rehberlik: 'sinif' };
export const kategoriOf = (doc) => ESKI_KATEGORI[doc.kategori] || doc.kategori;

const BASE = TAHTA_URL ? `${TAHTA_URL.replace(/\/?$/, '/')}evrak/` : '';
const LIST_KEY = '@ingapp/evrak/liste';
const SEEN_KEY = '@ingapp/evrak/gorulen';
const DATES_KEY = '@ingapp/evrak/tarihler';
const INFO_KEY = '@ingapp/teacher/v1/evrak-bilgi';

// Liste: önce cihazdaki son kopya, sonra sunucudan güncel hali. Döner { list, seen, loading, error, refresh, markSeen }.
export function useDocList() {
  const [list, setList] = useState(null);
  const [seen, setSeen] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = async () => {
    if (!BASE) {
      setError('Evrak adresi ayarlı değil.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let r = await fetch(`${BASE}liste3.json?t=${Date.now()}`);
      if (!r.ok) r = await fetch(`${BASE}liste.json?t=${Date.now()}`);
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      setList(d.evraklar || []);
      AsyncStorage.setItem(LIST_KEY, JSON.stringify(d.evraklar || [])).catch(() => {});
    } catch (e) {
      setError('Evrak listesi alınamadı — internet bağlantını kontrol et.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [l, s] = await Promise.all([AsyncStorage.getItem(LIST_KEY), AsyncStorage.getItem(SEEN_KEY)]);
        if (l) setList((cur) => cur || JSON.parse(l));
        if (s) setSeen(JSON.parse(s));
      } catch (e) {}
    })();
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // İndirilen evrak "görüldü": aynı tarihli sürümde YENİ etiketi kalkar.
  const markSeen = (doc) => {
    const next = { ...seen, [doc.id]: doc.tarih };
    setSeen(next);
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify(next)).catch(() => {});
  };
  return { list, seen, loading, error, refresh, markSeen };
}

// Okul bilgileri (yalnız bu cihazda): bir kez girilir, bütün evraklara yazılır.
//   zumreler / zumreBaskanlari: branşa göre ({ [branchId]: 'Ad Soyad, Ad Soyad' })
//   danismanlar: sınıf rehber öğretmenleri ({ '6-A': 'Ad Soyad' }; indirirken sınıf seçilince sorulur)
//   kulup: { ad, baskan, danisman, uyeler: [{ no, ad, sinif }] } — üyeler sınıf listelerinden seçilir
//   sinif / ogrenci / danisman: ESKİ tek alanlar (yalnız liste.json şablonları için)
const EMPTY_KULUP = { ad: '', baskan: '', danisman: '', uyeler: [] };
export const EMPTY_INFO = {
  ad: '', okul: '', il: '', ilce: '', mudur: '', mudurYrd: '', rehber: '',
  zumreler: {}, zumreBaskanlari: {}, danismanlar: {}, kulup: EMPTY_KULUP, sonSinif: '',
  danisman: '', sinif: '', ogrenci: '',
};
export async function loadDocInfo() {
  try {
    const d = JSON.parse((await AsyncStorage.getItem(INFO_KEY)) || '{}');
    // Eski kayıt: kulüp adı / başkanı düz metin, üyeler "ogrenci" alanındaydı.
    if (typeof d.kulup === 'string' || d.kulupBaskani) {
      d.kulup = { ...EMPTY_KULUP, ad: typeof d.kulup === 'string' ? d.kulup : '', baskan: d.kulupBaskani || '' };
      delete d.kulupBaskani;
    }
    return { ...EMPTY_INFO, ...d, kulup: { ...EMPTY_KULUP, ...(d.kulup || {}) } };
  } catch (e) {
    return EMPTY_INFO;
  }
}
export const saveDocInfo = (info) => AsyncStorage.setItem(INFO_KEY, JSON.stringify(info)).catch(() => {});

// Varsayılan evrak tarihi (evrakın normalde hazırlandığı gün; kurallar evrak/takvim.js).
export const docDefaultDate = (doc, now = new Date()) => varsayilanTarih(doc ? doc.gun : null, now);

// Öğretmenin elle değiştirdiği tarihler { [doc.id]: ms } — cihazda; başka eğitim yılından kalanlar yok sayılır.
export function useDocDates() {
  const [dates, setDates] = useState({});
  useEffect(() => {
    AsyncStorage.getItem(DATES_KEY)
      .then((s) => s && setDates(JSON.parse(s)))
      .catch(() => {});
  }, []);
  const isCustom = (doc) => !!dates[doc.id] && egitimYili(new Date(dates[doc.id])) === egitimYili();
  const dateOf = (doc) => (isCustom(doc) ? new Date(dates[doc.id]) : docDefaultDate(doc));
  const setDate = (doc, ms) => {
    const next = { ...dates };
    if (ms == null) delete next[doc.id];
    else next[doc.id] = ms;
    setDates(next);
    AsyncStorage.setItem(DATES_KEY, JSON.stringify(next)).catch(() => {});
  };
  return { dateOf, setDate, isCustom };
}

// Evrak verisinin girdisi (evrak/baglam.js → evrakVerisi). sinif / duzey indirirken seçilir (DocsScreen).
export function evrakGirdisi(doc, info, { brans, branchId, tarih, sinif = null, duzey = null }) {
  const ister = doc.ister || [];
  return {
    tarih,
    brans,
    profil: {
      ad: info.ad, okul: info.okul, il: info.il, ilce: info.ilce, mudur: info.mudur, mudurYrd: info.mudurYrd, rehber: info.rehber,
      zumre: (info.zumreler || {})[branchId] || '',
      zumreBaskani: (info.zumreBaskanlari || {})[branchId] || '',
    },
    sinif: ister.includes('sinif') || ister.includes('ogrenci') ? sinif : null,
    duzey: ister.includes('duzey') ? duzey : null,
    kulup: ister.includes('kulup') ? info.kulup : null,
  };
}
// Bu evrakta boş ("……") kalacak bilgiler: [{ etiket, bilgi, yer }].
export const evrakEksikleri = (doc, girdi) => eksikler(evrakVerisi(girdi), doc.etiketler || [], ETIKETLER);

const fileName = (doc) => `${doc.ad}.docx`.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ');

const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const UTI = 'org.openxmlformats.wordprocessingml.document';

// Uint8Array → base64 (eski FileSystem API'si base64 ister). RN'de btoa/Buffer olmayabilir: saf JS.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64le(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64[b0 >> 2] + B64[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    out += i + 2 < bytes.length ? B64[b2 & 63] : '=';
  }
  return out;
}

async function paylas(uri, name, Sharing) {
  const musait = Sharing && Sharing.isAvailableAsync ? await Sharing.isAvailableAsync() : false;
  if (!musait) throw new Error('Bu cihazda dosya paylaşımı kullanılamıyor.');
  await Sharing.shareAsync(uri, { mimeType: MIME, UTI, dialogTitle: name });
}

async function saveBytes(bytes, name) {
  if (Platform.OS === 'web') {
    const blob = new Blob([bytes], { type: MIME });
    const url = URL.createObjectURL(blob);
    // Akıllı tahta sayfası uygulamayı iframe içinde açıyorsa indirme engellenir: yeni sekmede aç.
    if (typeof window !== 'undefined' && window.self !== window.top) {
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return { url, name }; // ekranda "indir" bağlantısı göstermek için
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Anında DOM'dan çıkarmak bazı tarayıcılarda indirmeyi iptal ediyor: biraz bekle, sonra temizle.
    setTimeout(() => {
      try {
        a.remove();
      } catch (e) {}
    }, 3000);
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    return { url, name }; // indirme engellendiyse kullanıcı aynı blob'u yeni sekmede açabilsin
  }
  const Sharing = require('expo-sharing');
  // 1) Yeni FileSystem API'si (SDK 54)
  try {
    const { File, Paths } = require('expo-file-system');
    if (File && Paths) {
      const file = new File(Paths.cache, name);
      if (file.exists) file.delete();
      file.create();
      file.write(bytes);
      await paylas(file.uri, name, Sharing);
      return;
    }
  } catch (e) {
    // yeni API yoksa ya da yazamazsa aşağıdaki eski yola düşeriz
  }
  // 2) Eski FileSystem API'si (legacy) — base64 ile yazar
  const FS = require('expo-file-system/legacy');
  const hedef = `${FS.cacheDirectory}${name}`;
  await FS.writeAsStringAsync(hedef, base64le(bytes), { encoding: FS.EncodingType.Base64 });
  await paylas(hedef, name, Sharing);
}

async function sablonIndir(doc) {
  const url = `${BASE}${String(doc.dosya).split('/').map(encodeURIComponent).join('/')}`;
  const r = await fetch(`${url}?t=${encodeURIComponent(doc.iz || doc.tarih || '')}`);
  if (!r.ok) throw new Error('Dosya indirilemedi.');
  return r.arrayBuffer();
}

// Yeni şablon (liste3, surum 3): girdi = evrakGirdisi(...). Web'de { url, name } döner (indirme engellenirse yedek bağlantı).
export async function downloadDocV3(doc, girdi) {
  const bytes = doldur(await sablonIndir(doc), evrakVerisi(girdi));
  // Dosya adında sınıf / düzey: "Gözlem formu — 6-A.docx", "İngilizce 7. sınıf yıllık planı.docx"
  const ad = girdi.duzey
    ? `${girdi.brans} ${girdi.duzey.duzey}. sınıf yıllık planı`
    : girdi.sinif && girdi.sinif.ad
      ? `${doc.ad} — ${girdi.sinif.ad}`
      : doc.ad;
  return saveBytes(bytes, fileName({ ad }));
}

// ESKİ şablon (liste.json, {OGRETMEN} biçimi). extra: { sinif, tarih }.
export async function downloadDoc(doc, info, branchName, extra = {}) {
  const adlar = String((info && info.ogrenci) || '')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const tarih = extra.tarih || new Date();
  const degerler = {
    OGRETMEN: info.ad,
    OKUL: info.okul,
    IL: info.il,
    ILCE: info.ilce,
    MUDUR: info.mudur,
    MUDUR_YRD: info.mudurYrd,
    DANISMAN: info.danisman,
    BRANS: branchName,
    TARIH: trDate(tarih),
    EGITIM_YILI: schoolYear(tarih),
    SINIF: extra.sinif || '',
    OGRENCILER: adlar.join(', '),
    OGRENCI: adlar[0] || '',
  };
  for (let i = 1; i <= OGRENCI_SAYI; i++) degerler[`OGRENCI${i}`] = adlar[i - 1] || '';
  const bytes = await fillDocx(await sablonIndir(doc), degerler);
  return saveBytes(bytes, fileName(doc));
}
