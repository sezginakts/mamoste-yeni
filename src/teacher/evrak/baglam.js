// Evrak bağlamı: uygulamadaki bilgilerden şablona gidecek veriyi kurar (saf JS — testte de aynısı kullanılır).
// Kaynaklar: Okul bilgileri (profil, cihazda), seçilen sınıf (TeacherContext: öğrenci no + ad — ad sunucuya gitmez),
// kulüp kaydı, yıllık plan (öğretmenin yüklediği ya da MEB çerçeve planı), ders programı, takvim.
// Uygulamaya bağımlı değil: çağıran taraf (DocsScreen) bunları toplayıp verir.
import { egitimYili, donemOf, trTarih, isoDay, yilVerisi, ilkYil, fromIso } from './takvim.js';

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

// Ünite / tema adı: MEB planlarının çoğunda 'content' alanında (matematik, fen, Türkçe…), İngilizce ve DKAB'de 'unit'te.
const uniteAdi = (w) => temiz(w.unit) || temiz(w.content) || temiz(w.topic);

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
      unite: w.holiday ? temiz(w.unit) || 'Tatil' : uniteAdi(w),
      ciktilar: w.holiday ? '' : temiz(w.outcomes),
    };
  });
}
// Plan haftaları → üniteler (art arda aynı ünite tek satır): BEP'te uzun dönemli amaç = ünite, kısa dönemli = çıktılar.
const trKisa = (k) => (k ? `${k.slice(8, 10)}.${k.slice(5, 7)}.${k.slice(0, 4)}` : '');
// Öğrenme çıktısı metni → kodlu çıktılar (tekrarsız): "MAT.7.1.2. …", "T.K.7.1. …", "ENG.6.1.L1. …". Alt maddeler (a, b…)
// atılır; kodu olmayan metinde satırlar alınır. BEP'in kısa dönemli amaçları için (yıllık plan tam metni kullanır).
// Kod bitişik yazılmış olabilir ("Spoken InteractionE7.1.SI1."): kodun önünde büyük harf ya da nokta yoksa oradan bölünür
// (MAT.7.1.2'nin içindeki "T.7.1.2" kod sayılmaz).
const KOD = '[A-ZÇĞİÖŞÜ]{1,6}\\d*(?:\\.[A-Za-z0-9]+){2,}\\.\\s';
const KOD_ONU = new RegExp(`(^|[^A-ZÇĞİÖŞÜ.])(?=${KOD})`, 'g');
const KOD_BASI = /^[A-ZÇĞİÖŞÜ]{1,6}\d*(?:\.[A-Za-z0-9]+){2,}\./;
function kodluCiktilar(metin, gorulen) {
  const parcalar = String(metin || '')
    .replace(KOD_ONU, '$1\u0001')
    .split('\u0001')
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  // Alt maddeler (a, b…) ve kodun metninden sonra yapışan beceri başlığı ("… personalities. Spoken Interaction") atılır.
  const kodlu = parcalar
    .filter((s) => KOD_BASI.test(s))
    .map((s) => {
      const kod = s.match(KOD_BASI)[0];
      const govde = s.slice(kod.length).replace(/\s+[a-zçğıöşü]\)\s.*$/, '').replace(/\.\s+[A-ZÇĞİÖŞÜa-zçğıöşü][^.]{0,30}$/, '.');
      return kod + govde;
    });
  const liste = kodlu.length ? kodlu : String(metin || '').split('\n').map(temiz).filter(Boolean);
  // Aynı kod ya da aynı metin bir kez (kaynak planda kodu eksik yazılmış tekrarlar da: "SB.5.1.2." / "B.5.1.2.").
  return liste.filter((s) => {
    const kod = (s.match(KOD_BASI) || [''])[0];
    const govde = 'm:' + s.slice(kod.length).trim().toLocaleLowerCase('tr');
    if ((kod && gorulen.has(kod)) || (govde.length > 8 && gorulen.has(govde))) return false;
    if (kod) gorulen.add(kod);
    gorulen.add(govde);
    return true;
  });
}
export function uniteSatirlari(weeks) {
  const out = [];
  for (const w of weeks || []) {
    if (w.holiday) continue;
    // Geçiş haftası iki ünite içerebilir ("A\nB" ya da MEB planında "A / B"): önceki uzar, yenisi başlar; çıktılar yeniye.
    const adlar = uniteAdi(w).split(/\n| \/ /).map(temiz).filter(Boolean);
    adlar.forEach((unite, i) => {
      const son = out[out.length - 1];
      const u = son && son.unite === unite ? son : null;
      if (u) {
        u.bitis = trKisa(w.end || w.start);
        u.hafta++;
      } else out.push({ unite, baslangic: trKisa(w.start), bitis: trKisa(w.end || w.start), hafta: 1, ham: [] });
      if (i === adlar.length - 1 && temiz(w.outcomes)) out[out.length - 1].ham.push(w.outcomes);
    });
  }
  const gorulen = new Set();
  const satir = out.map((u) => ({ ...u, ciktilar: u.ham.flatMap((m) => kodluCiktilar(m, gorulen)) }));
  // Çıktısı olmayan haftalar (uyum, tekrar, okul temelli planlama) amaç değildir — hiç çıktı yoksa hepsi kalır.
  const amacli = satir.some((u) => u.ciktilar.length) ? satir.filter((u) => u.ciktilar.length) : satir;
  // Arası çıkarılınca yan yana gelen aynı ünite tek satır olur.
  const birlesik = [];
  for (const u of amacli) {
    const son = birlesik[birlesik.length - 1];
    if (son && son.unite === u.unite) Object.assign(son, { bitis: u.bitis, hafta: son.hafta + u.hafta, ciktilar: [...son.ciktilar, ...u.ciktilar] });
    else birlesik.push({ ...u });
  }
  return birlesik.map((u, i) => ({ sira: String(i + 1), unite: u.unite, ciktilar: u.ciktilar.join('\n'), baslangic: u.baslangic, bitis: u.bitis, sure: `${u.hafta} hafta` }));
}
// Eğitim-öğretim yılı takvimi → tarih sırasıyla satırlar (çalışma takvimi evrakı ve takvim ekranı).
const TUR_ADI = { resmi: 'Resmî tatil', ders: 'Öğrenci tatili', yarim: 'Yarım gün', mesleki: 'Mesleki çalışma', toplanti: 'Toplantı', gun: 'Belirli gün / hafta', donem: 'Dönem' };
export function takvimSatirlari(tarih = new Date()) {
  const v = yilVerisi(ilkYil(tarih));
  const aralik = (a, b) => (b && b !== a ? `${trTarih(fromIso(a))} – ${trTarih(fromIso(b))}` : trTarih(fromIso(a)));
  const satir = [
    ...v.tatiller.map(([a, b, tur, ad]) => ({ k: a, tarih: aralik(a, b), tur: TUR_ADI[tur || 'resmi'], olay: ad || '' })),
    ...(v.mesleki || []).map(([a, b, ad]) => ({ k: a, tarih: aralik(a, b), tur: TUR_ADI.mesleki, olay: ad })),
    ...(v.olaylar || []).map(([a, ad, tur, b]) => ({ k: a, tarih: aralik(a, b), tur: TUR_ADI[tur] || '', olay: ad })),
  ];
  return satir.sort((x, y) => (x.k < y.k ? -1 : x.k > y.k ? 1 : 0)).map(({ k, ...r }) => r);
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
//   sinif?: { ad: '6-A', danisman, ogrenciler: [{ no, ad }], haftalikSaat, plan?: weeks, secili?: { no, ad } (BEP: tek öğrenci) },
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
    takvim: takvimSatirlari(tarih),
    takvim_notu: yilVerisi(ilkYil(tarih)).yaklasik ? 'Bu eğitim yılının resmî takvimi henüz eklenmedi; tarihler önceki yıla göre yaklaşıktır.' : yilVerisi(ilkYil(tarih)).not || '',
    takvim_kaynagi: yilVerisi(ilkYil(tarih)).kaynak || 'Millî Eğitim Bakanlığı',
    // sınıf
    sinif: sinif ? temiz(sinif.ad) : '',
    duzey: duzey ? String(duzey.duzey) : '',
    danisman: sinif ? temiz(sinif.danisman) : '',
    ogrenci_sayisi: gercekOgrenci ? String(sinif.ogrenciler.length) : '',
    ogrenciler,
    ogrenci_sayfalari: gercekOgrenci ? ogrenciler : [{ sira: '1', no: '', ad: '' }],
    haftalik_saat: sinif && sinif.haftalikSaat ? String(sinif.haftalikSaat) : '',
    ogrenci_ad: sinif && sinif.secili ? temiz(sinif.secili.ad) : '',
    ogrenci_no: sinif && sinif.secili ? temiz(sinif.secili.no) : '',
    // Plan yoksa elle doldurulacak boş satırlar
    uniteler: sinif && sinif.plan && uniteSatirlari(sinif.plan).length ? uniteSatirlari(sinif.plan) : bosSatirlar(6, { unite: '', ciktilar: '', baslangic: '', bitis: '', sure: '' }),
    // plan
    haftalar: duzey ? planSatirlari(duzey.weeks) : [],
    plan_kaynagi: duzey ? temiz(duzey.kaynak) : '',
    hafta_no: sinifHaftasi && sinifHaftasi.week ? `${sinifHaftasi.week}. hafta` : '',
    hafta_unite: sinifHaftasi ? uniteAdi(sinifHaftasi) : '',
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
