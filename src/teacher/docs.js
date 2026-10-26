// Evraklar: öğretmen evrak şablonları (zümre, ŞÖK, yıllık plan, kulüp, veli toplantısı, sınıf rehberlik).
// Liste ve .docx dosyaları tahta sitesinde: <tahtaUrl>/evrak/liste.json (yayın deposu github.com/sezginakts/mamoste-tahta).
// Yeni / güncel şablon için uygulama derlemesi gerekmez: dosya + liste.json satırı yüklenir, öğretmen ekranı yenileyince görür.
// İndirirken şablon cihazda öğretmenin bilgileriyle doldurulur (docFill.js).
//
// liste.json: { guncelleme, evraklar: [{ id, kategori, ad, donem, dosya, brans (null = herkes; branş kimliği = yalnız o branş), tarih, bos? }] }
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TAHTA_URL } from './BoardLink';
import { fillDocx, schoolYear, trDate } from './docFill';

export const CATEGORIES = [
  { id: 'zumre', icon: '👥', name: 'Zümre tutanakları' },
  { id: 'sok', icon: '🏫', name: 'ŞÖK tutanakları' },
  { id: 'yillik-plan', icon: '📅', name: 'Yıllık planlar' },
  { id: 'sinav', icon: '📝', name: 'Sınav evrakları' },
  { id: 'olcme', icon: '📊', name: 'Ölçme ve değerlendirme araçları' },
  { id: 'kulup', icon: '🎭', name: 'Kulüp dosyaları' },
  { id: 'veli', icon: '👪', name: 'Veli toplantısı' },
  { id: 'rehberlik', icon: '🧭', name: 'Sınıf rehberlik planı' },
  { id: 'sinif', icon: '🧑‍🏫', name: 'Sınıf ve danışman evrakları' },
];

const BASE = TAHTA_URL ? `${TAHTA_URL.replace(/\/?$/, '/')}evrak/` : '';
const LIST_KEY = '@ingapp/evrak/liste';
const SEEN_KEY = '@ingapp/evrak/gorulen';
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
      const r = await fetch(`${BASE}liste.json?t=${Date.now()}`);
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

// Evrak bilgilerim (yalnız bu cihazda): şablonlara yazılan ad, okul, il, ilçe, müdür, müdür yardımcısı, danışman.
export const EMPTY_INFO = { ad: '', okul: '', il: '', ilce: '', mudur: '', mudurYrd: '', danisman: '' };
export async function loadDocInfo() {
  try {
    return { ...EMPTY_INFO, ...JSON.parse((await AsyncStorage.getItem(INFO_KEY)) || '{}') };
  } catch (e) {
    return EMPTY_INFO;
  }
}
export const saveDocInfo = (info) => AsyncStorage.setItem(INFO_KEY, JSON.stringify(info)).catch(() => {});

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
    const url = URL.createObjectURL(new Blob([bytes], { type: MIME }));
    // Akıllı tahta sayfası uygulamayı iframe içinde açıyorsa indirme engellenir: yeni sekmede aç.
    if (typeof window !== 'undefined' && window.self !== window.top) {
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return;
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

// Şablonu indir, bilgilerle doldur, kaydet / paylaş. branchName: ör. "İngilizce".
// extra: { sinif, ogrenciler } — öğrenci listesi isteyen evraklarda seçili sınıfın adı ve öğrenci dizisi.
export async function downloadDoc(doc, info, branchName, extra = {}) {
  const url = `${BASE}${String(doc.dosya).split('/').map(encodeURIComponent).join('/')}`; // alt klasör: yillik-plan/<branş>-<sınıf>.docx
  const r = await fetch(`${url}?t=${encodeURIComponent(doc.tarih || '')}`);
  if (!r.ok) throw new Error('Dosya indirilemedi.');
  const bytes = await fillDocx(await r.arrayBuffer(), {
    OGRETMEN: info.ad,
    OKUL: info.okul,
    IL: info.il,
    ILCE: info.ilce,
    MUDUR: info.mudur,
    MUDUR_YRD: info.mudurYrd,
    DANISMAN: info.danisman,
    BRANS: branchName,
    TARIH: trDate(),
    EGITIM_YILI: schoolYear(),
    SINIF: extra.sinif || '',
    OGRENCILER: extra.ogrenciler || '',
  });
  await saveBytes(bytes, fileName(doc));
}
