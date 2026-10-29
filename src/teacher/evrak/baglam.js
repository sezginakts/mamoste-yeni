// Evrak bağlamı: uygulamadaki bilgilerden şablona gidecek veriyi kurar (saf JS — testte de aynısı kullanılır).
// Kaynaklar: Okul bilgileri (profil, cihazda), seçilen sınıf (TeacherContext: öğrenci no + ad — ad sunucuya gitmez),
// kulüp kaydı, yıllık plan (öğretmenin yüklediği ya da MEB çerçeve planı), ders programı, takvim.
// Uygulamaya bağımlı değil: çağıran taraf (DocsScreen) bunları toplayıp verir.
import { egitimYili, donemOf, trTarih, isoDay } from './takvim.js';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const AY_BUYUK = AYLAR.map((a) => a.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase());

// Boş tabloda kalem satırı kalsın (sınıf/kulüp seçilmezse form elle doldurulabilsin).
const BOS_OGRENCI_SATIRI = 25;
const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const BOS_UYE_SATIRI = 20;
const EN_AZ_ZUMRE = 4;

const temiz = (s) => String(s == null ? '' : s).trim();
// "Ali Veli, Ayşe Kaya" / satır satır → ['Ali Veli', 'Ayşe Kaya']
export const adListesi = (metin) =>
  String(metin || '')
    .split(/[,;\n]+/)
    .map(temiz)
    .filter(Boolean);

const noSirasi = (a, b) => (+a.no || 1e9) - (+b.no || 1e9) || String(a.ad).localeCompare(String(b.ad), 'tr');
const bosSatirlar = (n, alanlar) => Array.from({ length: n }, (_, i) => ({ ...alanlar, sira: String(i + 1) }));

// "Satranç Kulübü" → "Satranç" (şablon "{kulup} Kulübü" der).
export const kulupAdi = (s) => temiz(s).replace(/\s+kul[uü]b[uü]$/i, '');

const ddmm = (k) => (k ? `${k.slice(8, 10)}.${k.slice(5, 7)}` : '');

// Plan haftaları (teacher/yearPlan.js biçimi) → tablo satırları; ay adı yalnız ay değişince yazılır.
export function planSatirlari(weeks) {
  let onceki = null;
  return (weeks || []).map((w) => {
    const ay = w.start ? AY_BUYUK[+w.start.slice(5, 7) - 1] : '';
    const goster = ay !== onceki ? ay : '';
    onceki = ay;
    return {
      ay: goster,
      hafta: w.week ? `${w.week}. hafta` : '',
      tarihler: w.start ? `${ddmm(w.start)}–${ddmm(w.end)}` : '',
      saat: w.hours ? String(w.hours) : '',
      unite: w.holiday ? temiz(w.unit) || 'Tatil' : temiz(w.unit || w.topic),
      ciktilar: w.holiday ? '' : temiz(w.outcomes),
    };
  });
}
// Tarihin düştüğü plan haftası (yoksa o tarihten sonraki ilk hafta).
export function haftaBul(weeks, tarih) {
  const k = isoDay(tarih);
  const list = (weeks || []).filter((w) => w.start);
  return list.find((w) => k >= w.start && k <= (w.end || w.start)) || list.find((w) => w.start > k) || null;
}

// girdi: {
//   tarih: Date, brans: 'İngilizce',
//   profil: { ad, okul, il, ilce, mudur, mudurYrd, rehber, zumre: 'ad, ad', zumreBaskani },
//   sinif?: { ad: '6-A', danisman, ogrenciler: [{ no, ad }], haftalikSaat, plan?: weeks },
//   duzey?: { duzey: 6, weeks, kaynak },
//   kulup?: { ad, baskan, danisman, uyeler: [{ no, ad, sinif }] },
// }
export function evrakVerisi(girdi) {
  const { tarih = new Date(), brans = '', profil = {}, sinif = null, duzey = null, kulup = null } = girdi;
  const ogretmen = temiz(profil.ad);

  const zumreAdlari = [ogretmen, ...adListesi(profil.zumre).filter((a) => a.toLocaleLowerCase('tr') !== ogretmen.toLocaleLowerCase('tr'))].filter(Boolean);
  const zumre = zumreAdlari.map((ad, i) => ({ sira: String(i + 1), ad, brans }));
  while (zumre.length < EN_AZ_ZUMRE) zumre.push({ sira: String(zumre.length + 1), ad: '', brans });

  const ogrenciler = sinif && sinif.ogrenciler && sinif.ogrenciler.length
    ? [...sinif.ogrenciler].sort(noSirasi).map((o, i) => ({ sira: String(i + 1), no: temiz(o.no), ad: temiz(o.ad), nobet: GUNLER[i % 5] }))
    : bosSatirlar(BOS_OGRENCI_SATIRI, { no: '', ad: '' });
  const gercekOgrenci = !!(sinif && sinif.ogrenciler && sinif.ogrenciler.length);

  const uyeler = kulup && kulup.uyeler && kulup.uyeler.length
    ? kulup.uyeler.map((u, i) => ({ sira: String(i + 1), no: temiz(u.no), ad: temiz(u.ad), sinif: temiz(u.sinif) }))
    : bosSatirlar(BOS_UYE_SATIRI, { no: '', ad: '', sinif: '' });

  const sinifHaftasi = sinif && sinif.plan ? haftaBul(sinif.plan, tarih) : null;

  return {
    __ref: tarih, // {gun:…} kuralları bu tarihin eğitim yılına göre
    ogretmen,
    brans,
    okul: temiz(profil.okul),
    il: temiz(profil.il),
    ilce: temiz(profil.ilce),
    mudur: temiz(profil.mudur),
    mudur_yrd: temiz(profil.mudurYrd),
    rehber_ogretmen: temiz(profil.rehber),
    zumre,
    zumre_baskani: temiz(profil.zumreBaskani),
    tarih: trTarih(tarih),
    egitim_yili: egitimYili(tarih),
    donem: donemOf(tarih),
    // sınıf
    sinif: sinif ? temiz(sinif.ad) : '',
    duzey: duzey ? String(duzey.duzey) : '',
    danisman: sinif ? temiz(sinif.danisman) : '',
    ogrenci_sayisi: gercekOgrenci ? String(sinif.ogrenciler.length) : '',
    ogrenciler,
    ogrenci_sayfalari: gercekOgrenci ? ogrenciler : [{ sira: '1', no: '', ad: '' }],
    haftalik_saat: sinif && sinif.haftalikSaat ? String(sinif.haftalikSaat) : '',
    // plan
    haftalar: duzey ? planSatirlari(duzey.weeks) : [],
    plan_kaynagi: duzey ? temiz(duzey.kaynak) : '',
    hafta_no: sinifHaftasi && sinifHaftasi.week ? `${sinifHaftasi.week}. hafta` : '',
    hafta_unite: sinifHaftasi ? temiz(sinifHaftasi.unit || sinifHaftasi.topic) : '',
    hafta_ciktilari: sinifHaftasi ? temiz(sinifHaftasi.outcomes) : '',
    // kulüp
    kulup: kulup ? kulupAdi(kulup.ad) : '',
    kulup_baskani: kulup ? temiz(kulup.baskan) : '',
    kulup_danisman: kulup ? temiz(kulup.danisman) || ogretmen : '',
    uye_sayisi: kulup && kulup.uyeler && kulup.uyeler.length ? String(kulup.uyeler.length) : '',
    uyeler,
  };
}

// Eksik bilgi: şablonun kullandığı etiketlerden boş kalacak olanlar → [{ etiket, bilgi, yer }].
export function eksikler(veri, etiketler, sozluk) {
  return etiketler
    .filter((e) => sozluk[e] && sozluk[e].yer !== 'otomatik')
    .filter((e) => {
      const v = veri[e];
      if (Array.isArray(v)) {
        if (e === 'zumre') return v.filter((x) => x.ad).length < 2; // yalnız öğretmenin kendisi
        return !v.some((x) => x.ad || x.ciktilar || x.unite);
      }
      return !temiz(v);
    })
    .map((e) => ({ etiket: e, bilgi: sozluk[e].bilgi, yer: sozluk[e].yer }));
}
