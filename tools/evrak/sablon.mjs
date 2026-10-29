// ÜRETİLEN evrak şablonları (Word .docx, tam içerikli): zümre, ŞÖK, veli, sınıf rehberlik, kulüp, yıllık plan.
// Kendi başına çalışmaz: tools/evrak/yayinla.mjs çağırır (uret()), denetler ve tahta-site/evrak/v3/'e yazar.
// Toplantı tutanakları: gündem, görüşmeler, kararlar, imzalar hazır; uygulama indirirken bilgileri doldurur
// (src/teacher/evrak: motor.js + baglam.js; etiketler sozluk.js). Yıllık plan TEK şablon: haftalar uygulamadan gelir
// (öğretmenin yüklediği plan, yoksa MEB çerçeve planı).
// Etiket yazımı: {okul}, büyük harfli satırda kendiliğinden {okul|buyuk}; döngü dongu('ogrenciler', [...]); tarih {gun:AA-GG}.
// `gun` = evrakın varsayılan tarihi (kurallar src/teacher/evrak/takvim.js başında).
//
// Mevzuat dayanakları (Ekim 2026 itibarıyla): MEB Okul Öncesi Eğitim ve İlköğretim Kurumları Yönetmeliği (son değişiklik
// RG 28.07.2026/33323: en az bir proje, teslim etmeyene sıfır; 5. sınıftan kademeli Gelişim Raporu; ölçmede öğrenme
// çıktıları esas; devamsızlığın 5-10-15. günde veliye bildirimi; bilişim araçlarının kurala aykırı kullanımı disiplin fiili),
// MEB Ölçme ve Değerlendirme Yönetmeliği (RG 9.9.2023/32304: dönemde iki yazılı; haftalık 6+ saatlik derste il zümresi
// kararıyla üçüncü), Türkiye Yüzyılı Maarif Modeli (2026-2027: ortaokul 5, 6, 7. sınıflar; 8. sınıf mevcut program).
// Mevzuat değişince bu metinleri güncelle ve yeniden üret: node tools/evrak/yayinla.mjs
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));

// ---------- docx yardımcıları ----------
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const run = (t, { b, size, i } = {}) =>
  `<w:r><w:rPr>${b ? '<w:b/>' : ''}${i ? '<w:i/>' : ''}${size ? `<w:sz w:val="${size * 2}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
// Tamamen büyük harfli satırdaki etikete |buyuk eklenir ("{ilce} KAYMAKAMLIĞI" → "ÇANKAYA KAYMAKAMLIĞI").
const ETIKET_RE = /\{([a-z_]+)\}/g;
const buyukEtiket = (t) => {
  const geri = String(t).replace(/\{[^{}]*\}/g, '');
  return /\p{L}/u.test(geri) && geri === geri.toLocaleUpperCase('tr') ? String(t).replace(ETIKET_RE, '{$1|buyuk}') : t;
};
const p = (t, o = {}) =>
  `<w:p><w:pPr>${o.center ? '<w:jc w:val="center"/>' : o.justify ? '<w:jc w:val="both"/>' : ''}<w:spacing w:after="${o.after ?? 100}"/>${o.indent ? `<w:ind w:left="${o.indent}" w:hanging="${o.hanging || 0}"/>` : ''}</w:pPr>${t ? run(buyukEtiket(t), o) : ''}</w:p>`;
// Döngü satırı: tablo satırı listedeki her kayıt için çoğalır ({#ad}…{/ad} ilk ve son hücrede).
const dongu = (ad, hucreler) => hucreler.map((h, i) => `${i === 0 ? `{#${ad}}` : ''}${h}${i === hucreler.length - 1 ? `{/${ad}}` : ''}`);
// "1. Başlık: metin" gibi başı kalın paragraf
const pLead = (lead, text, o = {}) =>
  `<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="${o.after ?? 120}"/></w:pPr>${run(lead, { b: true, size: o.size })}${run(text, { size: o.size })}</w:p>`;
const cell = (t, w, o = {}) =>
  `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.shade ? '<w:shd w:val="clear" w:color="auto" w:fill="E7EEF5"/>' : ''}</w:tcPr>${String(t)
    .split('\n')
    .map((x) => p(x, { ...o, after: 0 }))
    .join('')}</w:tc>`;
const table = (rows, widths, { head = true, size } = {}) =>
  `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((k) => `<w:${k} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`)
    .join('')}</w:tblBorders><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths
    .map((w) => `<w:gridCol w:w="${w}"/>`)
    .join('')}</w:tblGrid>${rows
    .map(
      (r, i) =>
        `<w:tr>${head && i === 0 ? '<w:trPr><w:tblHeader/></w:trPr>' : '<w:trPr><w:trHeight w:val="380"/></w:trPr>'}${r
          .map((c, j) => cell(c, widths[j], { b: head && i === 0, shade: head && i === 0, size }))
          .join('')}</w:tr>`
    )
    .join('')}</w:tbl>`;
const numbered = (items, o = {}) => items.map((t, i) => p(`${i + 1}. ${t}`, { justify: true, indent: 360, hanging: 360, ...o })).join('');
const section = (t) => p(t, { b: true, after: 120 });

const head = (title) =>
  p('T.C.', { center: true, b: true, after: 0 }) +
  p('{ilce} KAYMAKAMLIĞI', { center: true, b: true, after: 0 }) +
  p('{okul} MÜDÜRLÜĞÜ', { center: true, b: true, after: 240 }) +
  p(title, { center: true, b: true, size: 12, after: 240 });

const infoTable = (rows) => table(rows, [3000, 6600], { head: false });

// ---------- imza blokları ----------
const sign = {
  zumre: () =>
    p('') +
    section('ZÜMRE ÖĞRETMENLERİ') +
    table(
      [
        ['Adı Soyadı', 'Branşı', 'İmza'],
        dongu('zumre', ['{ad}', '{brans} Öğretmeni', '']), // öğretmen + Okul bilgileri'ndeki zümre öğretmenleri
      ],
      [3800, 3800, 2000]
    ) +
    p('') +
    table(
      [
        ['Zümre Başkanı', 'UYGUNDUR'],
        ['{zumre_baskani}\n{brans} Öğretmeni', '{tarih}\n{mudur}\nOkul Müdürü'],
      ],
      [4800, 4800]
    ),
  sok: () =>
    p('') +
    section('ŞUBE ÖĞRETMENLER KURULU ÜYELERİ') +
    table(
      [
        ['Dersi', 'Öğretmeni', 'İmza'],
        ...['Türkçe', 'Matematik', 'Fen Bilimleri', 'Sosyal Bilgiler / İnkılap Tarihi', 'Yabancı Dil (İngilizce)', 'Din Kültürü ve Ahlak Bilgisi', 'Beden Eğitimi ve Spor', 'Görsel Sanatlar', 'Müzik', 'Teknoloji ve Tasarım', 'Bilişim Teknolojileri ve Yazılım', 'Seçmeli Dersler', 'Rehber Öğretmen'].map((d) => [d, '', '']),
      ],
      [3800, 3800, 2000]
    ) +
    p('') +
    table(
      [
        ['Sınıf Rehber Öğretmeni', 'UYGUNDUR'],
        ['{danisman}', '{tarih}\n{mudur}\nOkul Müdürü'],
      ],
      [4800, 4800]
    ),
  rehber: (who = 'Sınıf Rehber Öğretmeni') =>
    p('') +
    table(
      [
        [who, 'UYGUNDUR'],
        ['{danisman}', '{tarih}\n{mudur}\nOkul Müdürü'],
      ],
      [4800, 4800]
    ),
  kulup: () =>
    p('') +
    table(
      [
        ['Kulüp Başkanı', 'Danışman Öğretmen', 'Müdür Yardımcısı', 'UYGUNDUR'],
        ['{kulup_baskani}', '{kulup_danisman}', '{mudur_yrd}', '{tarih}\n{mudur}\nOkul Müdürü'],
      ],
      [2400, 2400, 2400, 2400]
    ),
  // Kulüp toplantıları: katılan üyeler (Kulübüm'deki üye listesi) + imzalar
  kulupToplanti: () => p('') + section('TOPLANTIYA KATILAN ÜYELER') + uyeTablosu() + sign.kulup(),
  bep: () => bepBirim(),
};

// Toplantı tutanağı: gündem maddeleri, her maddenin görüşülmesi, kararlar.
function meeting({ title, info, items, kararlar, imza, katilanlar = true }) {
  return (
    head(title) +
    infoTable(info) +
    p('') +
    (katilanlar ? p('Toplantıya katılanlar imza bölümünde gösterilmiştir.', { i: true }) : '') +
    section('GÜNDEM') +
    numbered(items.map((x) => x[0])) +
    p('') +
    section('GÜNDEM MADDELERİNİN GÖRÜŞÜLMESİ') +
    items.map((x, i) => pLead(`${i + 1}. ${x[0]}: `, x[1])).join('') +
    section('ALINAN KARARLAR') +
    numbered(kararlar) +
    sign[imza]()
  );
}

const MEETING_INFO = (extra = []) => [['Toplantı tarihi', '{tarih}'], ['Toplantı saati', '……'], ['Toplantı yeri', '……'], ...extra];
const PROGRAM =
  'Türkiye Yüzyılı Maarif Modeli öğretim programları 2026-2027 eğitim-öğretim yılında ortaokul 5, 6 ve 7. sınıflarda uygulanmakta, 8. sınıflarda ise mevcut öğretim programı sürdürülmektedir.';

// ---------- Zümre ----------
const ZUMRE_BASI = {
  id: 'zumre-yil-basi',
  gun: '@zumre_1', // takvim: okul zümre toplantıları (2026: 2 Eylül)
  kategori: 'zumre',
  ad: 'Zümre öğretmenler kurulu tutanağı — yıl başı',
  donem: 'Eylül · eğitim-öğretim yılı başı',
  body: () =>
    meeting({
      title: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI {brans} ZÜMRE ÖĞRETMENLER KURULU YIL BAŞI TOPLANTI TUTANAĞI',
      info: MEETING_INFO(),
      imza: 'zumre',
      items: [
        ['Açılış, yoklama ve zümre başkanının seçimi', 'Toplantı saygı duruşu ve İstiklal Marşı ile açıldı, yoklama yapıldı. Zümre öğretmenlerinin oy birliğiyle …… zümre başkanı seçildi; toplantı yazmanlığını …… üstlendi.'],
        ['Önceki yıl kararlarının değerlendirilmesi', 'Geçen eğitim-öğretim yılı zümre kararları ve yıl sonu raporu gözden geçirildi. Uygulanan kararların öğrenci başarısına olumlu yansıdığı, okuma ve uygulama çalışmalarına daha fazla zaman ayrılması gerektiği belirtildi. Eksik kalan konuların bu yıl ilgili ünitelerle ilişkilendirilerek tamamlanmasına karar verildi.'],
        ['Mevzuat ve Türkiye Yüzyılı Maarif Modeli', `Millî Eğitim Bakanlığı Okul Öncesi Eğitim ve İlköğretim Kurumları Yönetmeliği (son değişiklik: Resmî Gazete 28.07.2026), Ölçme ve Değerlendirme Yönetmeliği ve ilgili genelgeler okundu. ${PROGRAM} Modelin beceri temelli yaklaşımı; alan becerileri, kavramsal beceriler, eğilimler, sosyal-duygusal öğrenme becerileri, değerler ve okuryazarlık becerilerinin derslere bütüncül yansıtılması gerektiği vurgulandı.`],
        ['Öğretim programının ve yıllık planların incelenmesi', 'Dersin öğretim programı, öğrenme çıktıları ve süreç bileşenleri incelendi. Yıllık planların Bakanlıkça yayımlanan çerçeve planlar esas alınarak, okulun ders yılı takvimi, belirli gün ve haftalar ile resmî tatiller dikkate alınarak hazırlanacağı; öğrenme çıktılarının sırasının ve süresinin çerçeve plana uygun tutulacağı görüşüldü.'],
        ['Ders kitapları, kaynaklar ve materyaller', 'Bakanlıkça dağıtılan ders kitaplarının esas alınacağı, öğrencilerden ek kaynak kitap alınmasının istenmeyeceği belirtildi. EBA ve Bakanlığın dijital içerikleri, akıllı tahta etkinlikleri ve okul imkânlarıyla hazırlanabilecek materyallerin ortak kullanılması önerildi.'],
        ['Ölçme ve değerlendirme', 'Ölçme ve değerlendirmenin öğretim programındaki öğrenme çıktıları esas alınarak, süreç odaklı ve çok yönlü yapılacağı görüşüldü. Her dönemde iki yazılı sınav yapılacağı; haftalık ders saati altı ve üzeri olan derslerde üçüncü sınavın il zümresi kararına bağlı olduğu hatırlatıldı. Bakanlıkça belirlenen ders ve sınıf düzeylerinde ülke genelinde yapılacak ortak yazılı sınavların kılavuz ve takvimine uyulacağı belirtildi. Sınav tarihlerinin okul yönetimince ilan edilen takvime göre belirlenip öğrencilere ve velilere önceden duyurulacağı, sonuçların süresi içinde e-Okul’a işleneceği konuşuldu. Gözlem formları, kontrol listeleri, dereceli puanlama anahtarları ve öğrenci ürün dosyası gibi araçların süreç değerlendirmesinde kullanılması önerildi.'],
        ['Proje ve performans çalışmaları', 'Yönetmelik gereği öğrencilere ders yılında istedikleri ders veya derslerden öğretmen rehberliğinde en az bir proje hazırlatılacağı; projenin hazırlandığı dönemde değerlendirileceği ve teslim etmeyen öğrencinin proje puanının sıfır sayılacağı hatırlatıldı. Proje ve performans çalışmalarının konularının öğrenme çıktılarıyla ilişkili, öğrencinin düzeyine uygun ve okul imkânlarıyla yapılabilir olmasına; değerlendirme ölçütlerinin önceden öğrencilere duyurulmasına dikkat edileceği belirtildi.'],
        ['Gelişim Raporu', 'Beşinci sınıflardan başlayarak kademeli uygulanan ve dönem sonunda karneyle birlikte verilen Gelişim Raporu için öğrencilerin gelişim düzeyleri ile sosyal-duygusal becerilerine ilişkin gözlemlerin dönem boyunca düzenli kaydedileceği görüşüldü.'],
        ['Okuryazarlık becerileri ve değerler eğitimi', 'Maarif Modeli’nde yer alan bilgi, dijital, finansal, görsel, kültür, sanat, vatandaşlık, veri ve sürdürülebilirlik okuryazarlığının ders içeriğiyle ilişkilendirileceği; değerler eğitiminin erdem-değer-eylem çerçevesinde, örnek davranışlar ve sınıf içi uygulamalarla verileceği belirtildi. Atatürkçülükle ilgili konulara ilgili öğrenme çıktılarında yer verileceği, belirli gün ve haftaların derse yansıtılacağı konuşuldu.'],
        ['Özel eğitim, kaynaştırma ve üstün yetenekli öğrenciler', 'Kaynaştırma/bütünleştirme yoluyla eğitim alan öğrenciler için okul rehberlik servisi ve BEP geliştirme biriminin kararları doğrultusunda bireyselleştirilmiş eğitim planlarının hazırlanacağı, ölçme ve değerlendirmenin bu planlara göre yapılacağı; öğrenme güçlüğü yaşayan ve özel yetenekli öğrenciler için farklılaştırılmış etkinliklere yer verileceği görüşüldü.'],
        ['Başarının artırılması ve destekleme-yetiştirme kursları', 'Öğrenme eksiklerinin erken tespiti için ünite başlarında hazırbulunuşluk çalışmaları yapılacağı; ihtiyaç duyan öğrenciler için destekleme ve yetiştirme kursları açılması yönünde okul yönetimine öneride bulunulacağı belirtildi. 8. sınıflarda Liselere Geçiş Sistemi merkezî sınavına yönelik konu tekrarı ve deneme çalışmalarının planlanacağı konuşuldu.'],
        ['Ödev, sosyal etkinlikler ve iş birliği', 'Ödevlerin öğrencinin düzeyine uygun, araştırmaya ve üretmeye dönük olacağı, öğrencinin ve ailenin aşırı yükleneceği ödevlerden kaçınılacağı görüşüldü. Diğer zümrelerle disiplinler arası çalışmalar, kulüp etkinlikleri, belirli gün ve haftalar ile okul dışı öğrenme ortamlarının (müze, kütüphane, bilim merkezi) planlanması önerildi.'],
        ['Sağlık, güvenlik ve dijital araçlar', 'Derslerde iş güvenliği, sınıf düzeni ve afet bilinci konularına dikkat edileceği; öğrencilerin bilişim araçlarını okul yönetimince belirlenen usul ve esaslara uygun kullanmaları konusunda bilgilendirileceği belirtildi.'],
        ['Dilek ve temenniler', 'Zümre öğretmenleri yeni eğitim-öğretim yılının öğrencilere, velilere ve okul çalışanlarına başarı getirmesi dileğinde bulundu. Toplantı iyi dileklerle sona erdi.'],
      ],
      kararlar: [
        'Yıllık planlar Bakanlığın 2026-2027 çerçeve planları esas alınarak hazırlanacak ve okul yönetimine teslim edilecektir.',
        'Öğretim süreci Türkiye Yüzyılı Maarif Modeli’nin beceri temelli yaklaşımına uygun yürütülecek; derslerde okuryazarlık becerileri ve değerler eğitimine yer verilecektir.',
        'Her dönemde iki yazılı sınav yapılacak; ortak yazılı sınavlarda Bakanlığın kılavuz ve takvimine uyulacak, sınav tarihleri önceden duyurulacaktır.',
        'Ölçme ve değerlendirme öğrenme çıktıları esas alınarak yapılacak; süreç değerlendirmesinde gözlem formu, kontrol listesi ve dereceli puanlama anahtarı kullanılacaktır.',
        'Öğrencilere ders yılında en az bir proje hazırlatılacak; değerlendirme ölçütleri önceden duyurulacaktır.',
        'Gelişim Raporu için öğrenci gözlemleri dönem boyunca düzenli kaydedilecektir.',
        'BEP’i bulunan öğrenciler için planlar rehberlik servisiyle iş birliği içinde hazırlanacak ve uygulanacaktır.',
        'Öğrenme eksikleri olan öğrenciler için destekleme ve yetiştirme kursu açılması okul yönetimine önerilecektir.',
        'Zümre, dönem ortasında ve gerektiğinde yeniden toplanarak uygulamaları değerlendirecektir.',
      ],
    }),
};

const ZUMRE_ORTA = {
  id: 'zumre-2-donem-basi',
  gun: '@zumre_2', // takvim: 2. dönem okul zümresi
  kategori: 'zumre',
  ad: 'Zümre öğretmenler kurulu tutanağı — 2. dönem başı',
  donem: 'Şubat · ikinci dönem başı',
  body: () =>
    meeting({
      title: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI {brans} ZÜMRE ÖĞRETMENLER KURULU İKİNCİ DÖNEM BAŞI TOPLANTI TUTANAĞI',
      info: MEETING_INFO(),
      imza: 'zumre',
      items: [
        ['Açılış ve yoklama', 'Toplantı saygı duruşu ve İstiklal Marşı ile açıldı, yoklama yapıldı.'],
        ['Yıl başı zümre kararlarının değerlendirilmesi', 'Yıl başında alınan kararların birinci dönemde büyük ölçüde uygulandığı görüldü. Yıllık planlara uygun ilerlendiği, aksayan konuların ikinci dönemin ilk haftalarında telafi edileceği belirtildi.'],
        ['Birinci dönem başarı durumu', 'Birinci dönem sınav sonuçları, proje ve performans çalışmaları ile Gelişim Raporu gözlemleri değerlendirildi. Başarının düşük kaldığı öğrenme çıktıları ve sınıflar belirlendi; bu konularda ek etkinlik, tekrar ve bireysel destek çalışmaları yapılması önerildi.'],
        ['Ortak yazılı sınavların değerlendirilmesi', 'Birinci dönem ortak yazılı sınav sonuçları ve madde analizleri incelendi. Öğrencilerin zorlandığı soru türleri ve öğrenme çıktıları üzerinde durulmasına, ikinci dönem ortak sınav takvimine ve kılavuzuna uyulmasına karar verildi.'],
        ['İkinci dönem ölçme ve değerlendirme', 'İkinci dönemde de iki yazılı sınav yapılacağı, sınav tarihlerinin okul takvimine göre önceden duyurulacağı görüşüldü. Proje görevi almış öğrencilerin çalışmalarının izlenmesi, teslim tarihlerinin hatırlatılması ve projelerin hazırlandığı dönemde değerlendirilmesi gerektiği belirtildi.'],
        ['Öğretim programı uygulamaları', 'Türkiye Yüzyılı Maarif Modeli öğretim programlarının uygulanmasında karşılaşılan güçlükler ve iyi örnekler paylaşıldı. Beceri temelli etkinliklerin, okuryazarlık ve değerler eğitimine yönelik çalışmaların artırılması önerildi.'],
        ['Özel eğitim ve destekleme çalışmaları', 'BEP’i bulunan öğrencilerin gelişimi gözden geçirildi; planların güncellenmesi için rehberlik servisiyle görüşüleceği belirtildi. Destekleme ve yetiştirme kurslarının verimi değerlendirildi.'],
        ['LGS hazırlık çalışmaları', '8. sınıflarda konu tekrarı, soru çözümü ve deneme sınavı çalışmalarının ikinci dönemde planlı biçimde sürdürülmesi görüşüldü.'],
        ['Dilek ve temenniler', 'İkinci dönemin başarılı geçmesi dileğiyle toplantı sona erdi.'],
      ],
      kararlar: [
        'Birinci dönemde başarının düşük kaldığı öğrenme çıktıları için ek tekrar ve etkinlik yapılacaktır.',
        'İkinci dönemde iki yazılı sınav yapılacak; ortak yazılı sınavlarda Bakanlığın kılavuz ve takvimine uyulacaktır.',
        'Proje çalışmaları izlenecek ve hazırlandığı dönemde değerlendirilecektir.',
        'Beceri temelli etkinlikler ile okuryazarlık ve değerler eğitimine yönelik çalışmalar artırılacaktır.',
        'BEP’i bulunan öğrencilerin planları rehberlik servisiyle birlikte güncellenecektir.',
        '8. sınıflarda LGS’ye yönelik tekrar ve deneme çalışmaları sürdürülecektir.',
      ],
    }),
};

const ZUMRE_SONU = {
  id: 'zumre-yil-sonu',
  gun: '@zumre_3', // takvim: yıl sonu okul zümresi
  kategori: 'zumre',
  ad: 'Zümre öğretmenler kurulu tutanağı — yıl sonu',
  donem: 'Haziran · eğitim-öğretim yılı sonu',
  body: () =>
    meeting({
      title: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI {brans} ZÜMRE ÖĞRETMENLER KURULU YIL SONU TOPLANTI TUTANAĞI',
      info: MEETING_INFO(),
      imza: 'zumre',
      items: [
        ['Açılış ve yoklama', 'Toplantı saygı duruşu ve İstiklal Marşı ile açıldı, yoklama yapıldı.'],
        ['Yıl içindeki zümre kararlarının değerlendirilmesi', 'Yıl başı ve ikinci dönem başı zümre kararlarının uygulanma durumu gözden geçirildi. Kararların büyük bölümünün uygulandığı, uygulanamayanların nedenleri konuşuldu.'],
        ['Yıllık planların uygulanması', 'Yıllık planlarda yer alan öğrenme çıktılarının işlenme durumu değerlendirildi. Zaman yetersizliği nedeniyle yeterince pekiştirilemeyen konular belirlenerek gelecek yıl başında hazırbulunuşluk çalışmalarında ele alınmasına karar verildi.'],
        ['Öğrenci başarısının değerlendirilmesi', 'Yıl sonu başarı durumu, yazılı sınav ve ortak sınav sonuçları, proje ve performans çalışmaları ile Gelişim Raporlarındaki gözlemler değerlendirildi. Başarılı uygulamalar ve geliştirilmesi gereken alanlar belirlendi.'],
        ['Türkiye Yüzyılı Maarif Modeli uygulamaları', 'Programın uygulanmasında edinilen deneyimler paylaşıldı. Beceri temelli etkinliklerin öğrencilerin katılımını artırdığı, ölçme araçlarının çeşitlendirilmesinin süreç değerlendirmesini kolaylaştırdığı belirtildi.'],
        ['Ders araç-gereçleri ve ihtiyaçlar', 'Ders kitapları, materyaller ve okul imkânları değerlendirildi; gelecek yıl için gerekli materyal ve donanım ihtiyacı belirlenerek okul yönetimine bildirilmesine karar verildi.'],
        ['Yaz tatili önerileri', 'Öğrencilere yaz tatilinde kitap okuma, yaş düzeyine uygun araştırma ve tekrar çalışmaları önerilmesine, aşırı ödev yüküne yol açmayacak isteğe bağlı çalışmalar verilmesine karar verildi.'],
        ['Gelecek yıl için öneriler', 'Gelecek eğitim-öğretim yılında yıl başında hazırbulunuşluk çalışmalarına daha fazla yer verilmesi, disiplinler arası çalışmaların ve okul dışı öğrenme etkinliklerinin artırılması önerildi.'],
        ['Dilek ve temenniler', 'Zümre öğretmenleri tüm öğrencilere iyi tatiller diledi; toplantı sona erdi.'],
      ],
      kararlar: [
        'Yeterince pekiştirilemeyen konular gelecek yıl başındaki hazırbulunuşluk çalışmalarında ele alınacaktır.',
        'Gelecek yıl için materyal ve donanım ihtiyacı listesi okul yönetimine sunulacaktır.',
        'Öğrencilere yaz tatili için okuma ve isteğe bağlı tekrar çalışmaları önerilecektir.',
        'Gelecek yıl disiplinler arası çalışmalar ve okul dışı öğrenme etkinlikleri artırılacaktır.',
        'Bu tutanak, yıl sonu zümre raporu olarak okul yönetimine teslim edilecektir.',
      ],
    }),
};

// ---------- İlçe zümre ----------
// İlçe zümre öğretmenler kurulu: ilçedeki okulların zümre başkanları, okul zümrelerinden sonra ilçe millî eğitim müdürlüğünün
// belirlediği tarihte toplanır (yıl başı, yıl sonu). Varsayılan gün eğitim takvimindeki ilçe zümre günü (src/data/egitimTakvimi.js).
const headIlce = (title) =>
  p('T.C.', { center: true, b: true, after: 0 }) +
  p('{ilce} KAYMAKAMLIĞI', { center: true, b: true, after: 0 }) +
  p('{ilce} İLÇE MİLLÎ EĞİTİM MÜDÜRLÜĞÜ', { center: true, b: true, after: 240 }) +
  p(title, { center: true, b: true, size: 12, after: 240 });
const ILCE_INFO = [['Toplantı tarihi', '{tarih}'], ['Toplantı saati', '……'], ['Toplantı yeri', '……'], ['Toplantı başkanı', '……'], ['Yazman', '……']];
const ilceImza = () =>
  p('') +
  section('İLÇE ZÜMRE ÖĞRETMENLERİ (OKUL ZÜMRE BAŞKANLARI)') +
  table(
    [
      ['Okulu', 'Adı Soyadı', 'Branşı', 'İmza'],
      ['{okul}', '{zumre_baskani}', '{brans}', ''],
      ...Array.from({ length: 11 }, () => ['', '', '{brans}', '']),
    ],
    [3300, 3100, 1900, 1300]
  ) +
  p('') +
  table(
    [
      ['Yazman', 'Toplantı Başkanı'],
      ['……', '……'],
    ],
    [4800, 4800]
  );
const ilceToplanti = ({ title, items, kararlar }) =>
  headIlce(title) +
  infoTable(ILCE_INFO) +
  p('') +
  p('Toplantıya katılanlar imza bölümünde gösterilmiştir.', { i: true }) +
  section('GÜNDEM') +
  numbered(items.map((x) => x[0])) +
  p('') +
  section('GÜNDEM MADDELERİNİN GÖRÜŞÜLMESİ') +
  items.map((x, i) => pLead(`${i + 1}. ${x[0]}: `, x[1])).join('') +
  section('ALINAN KARARLAR') +
  numbered(kararlar) +
  ilceImza();

const ILCE_ZUMRE_BASI = {
  id: 'ilce-zumre-yil-basi',
  kategori: 'zumre',
  ad: 'İlçe zümre öğretmenler kurulu tutanağı — yıl başı',
  donem: 'Eylül · okul zümrelerinden sonra',
  gun: '@ilce_zumre_1',
  body: () =>
    ilceToplanti({
      title: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI {brans} DERSİ İLÇE ZÜMRE ÖĞRETMENLER KURULU YIL BAŞI TOPLANTI TUTANAĞI',
      items: [
        ['Açılış, yoklama ve yazmanın seçimi', 'Toplantı saygı duruşu ve İstiklal Marşı ile açıldı, yoklama yapıldı. İlçedeki okulların zümre başkanlarının katılımıyla toplantı yazmanı belirlendi.'],
        ['Okul zümre kararlarının görüşülmesi', 'Okul zümre öğretmenler kurulu tutanakları gözden geçirildi; okulların yıllık plan, ölçme-değerlendirme ve öğretim süreçlerine ilişkin kararları karşılaştırılarak ilçe genelinde ortak uygulamalar belirlendi.'],
        ['Mevzuat ve öğretim programları', `${PROGRAM} Yönetmelik değişiklikleri ve Bakanlığın yayımladığı çerçeve yıllık planlar üzerinde durularak öğrenme çıktılarının ilçe genelinde aynı sıra ve sürede ele alınması görüşüldü.`],
        ['Ortak sınavlar ve ölçme-değerlendirme', 'Her dönemde yapılacak yazılı sınavlar, Bakanlıkça yapılacak ortak yazılı sınavların takvimi ve kılavuzu ile süreç değerlendirme araçlarının (gözlem formu, kontrol listesi, dereceli puanlama anahtarı) okullarda benzer biçimde kullanılması görüşüldü. Proje ödevlerinin ders yılı içinde verilip hazırlandığı dönemde değerlendirileceği hatırlatıldı.'],
        ['Geçen yılın başarı durumu', 'Geçen eğitim-öğretim yılının ders başarı durumu ile 8. sınıflarda merkezî sınav sonuçları değerlendirildi; başarının düşük kaldığı öğrenme çıktıları için ilçe genelinde ortak tekrar ve destek çalışmaları önerildi.'],
        ['Materyal ve iyi örneklerin paylaşılması', 'Okulların hazırladığı çalışma kâğıtları, dijital içerikler ve etkinliklerin zümre başkanları aracılığıyla ilçedeki okullarla paylaşılması kararlaştırıldı.'],
        ['Özel eğitim ve destekleme-yetiştirme', 'Kaynaştırma/bütünleştirme yoluyla eğitim alan öğrenciler için BEP uygulamaları ve destekleme-yetiştirme kurslarının planlanması konusunda görüş alışverişinde bulunuldu.'],
        ['Belirli gün ve haftalar, okullar arası etkinlikler', 'Belirli gün ve haftalarda yapılacak etkinlikler ile okullar arası yarışma ve ortak etkinliklerin planlanması görüşüldü.'],
        ['İl zümresine iletilecek öneriler', 'İlçe genelinde ortaya çıkan ihtiyaç ve öneriler il zümre öğretmenler kuruluna iletilmek üzere belirlendi.'],
        ['Dilek ve temenniler', 'Yeni eğitim-öğretim yılının başarılı geçmesi dileğiyle toplantı sona erdi.'],
      ],
      kararlar: [
        'Yıllık planlar Bakanlığın çerçeve planları esas alınarak hazırlanacak; öğrenme çıktıları ilçe genelinde aynı sıra ve sürede işlenecektir.',
        'Yazılı ve ortak sınavlarda Bakanlığın takvim ve kılavuzuna uyulacak; süreç değerlendirme araçları ortak kullanılacaktır.',
        'Başarının düşük kaldığı öğrenme çıktıları için okullarda ek tekrar ve destek çalışmaları yapılacaktır.',
        'Hazırlanan materyal ve iyi örnekler zümre başkanları aracılığıyla ilçedeki okullarla paylaşılacaktır.',
        'İlçe zümre kararları okul zümre başkanlarınca okullardaki zümre öğretmenlerine duyurulacaktır.',
        'Belirlenen öneriler il zümre öğretmenler kuruluna iletilecektir.',
      ],
    }),
};

const ILCE_ZUMRE_SONU = {
  id: 'ilce-zumre-yil-sonu',
  kategori: 'zumre',
  ad: 'İlçe zümre öğretmenler kurulu tutanağı — yıl sonu',
  donem: 'Haziran · yıl sonu mesleki çalışma',
  gun: '@ilce_zumre_3',
  body: () =>
    ilceToplanti({
      title: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI {brans} DERSİ İLÇE ZÜMRE ÖĞRETMENLER KURULU YIL SONU TOPLANTI TUTANAĞI',
      items: [
        ['Açılış ve yoklama', 'Toplantı saygı duruşu ve İstiklal Marşı ile açıldı, yoklama yapıldı.'],
        ['Yıl başı ilçe zümre kararlarının değerlendirilmesi', 'Yıl başında alınan ilçe zümre kararlarının okullarda uygulanma durumu zümre başkanlarınca değerlendirildi; uygulanamayan kararların nedenleri görüşüldü.'],
        ['Öğretim programlarının uygulanması', 'Türkiye Yüzyılı Maarif Modeli öğretim programlarının uygulanmasında yaşanan güçlükler ve iyi örnekler paylaşıldı; yıllık planlarda yetiştirilemeyen öğrenme çıktıları belirlendi.'],
        ['Başarı durumu ve ortak sınavlar', 'Ders başarı durumu, ortak yazılı sınav sonuçları ve 8. sınıflarda merkezî sınava hazırlık çalışmaları değerlendirildi.'],
        ['Gelecek yıl için öneriler', 'Gelecek eğitim-öğretim yılında hazırbulunuşluk çalışmaları, materyal ihtiyaçları ve okullar arası ortak etkinlikler için öneriler belirlendi.'],
        ['Dilek ve temenniler', 'Toplantı iyi tatil dilekleriyle sona erdi.'],
      ],
      kararlar: [
        'Yetiştirilemeyen öğrenme çıktıları gelecek yıl başındaki hazırbulunuşluk çalışmalarında ele alınacaktır.',
        'Ortak sınav sonuçlarına göre zorlanılan konular için gelecek yıl ilçe genelinde ortak destek çalışmaları planlanacaktır.',
        'Materyal ve donanım ihtiyaçları ilçe millî eğitim müdürlüğüne bildirilecektir.',
        'Belirlenen öneriler il zümre öğretmenler kuruluna iletilecektir.',
      ],
    }),
};

// ---------- ŞÖK ----------
const SOK_INFO = MEETING_INFO([['Sınıf / Şube', '{sinif}'], ['Sınıf rehber öğretmeni', '{danisman}'], ['Öğrenci sayısı', '{ogrenci_sayisi}']]);
const SOK_BASI = {
  id: 'sok-donem-basi',
  gun: ['09-25', '02-12'], // iki dönemin ilk haftaları
  kategori: 'sok',
  ad: 'Şube öğretmenler kurulu (ŞÖK) tutanağı — dönem başı',
  donem: 'Dönem başı',
  body: () =>
    meeting({
      title: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI ŞUBE ÖĞRETMENLER KURULU TOPLANTI TUTANAĞI',
      info: SOK_INFO,
      imza: 'sok',
      items: [
        ['Açılış ve yoklama', 'Toplantı sınıf rehber öğretmeninin başkanlığında açıldı, yoklama yapıldı.'],
        ['Şubenin genel durumu', 'Şubenin öğrenci sayısı, sınıf ortamı, oturma düzeni ve sınıf kuralları görüşüldü. Sınıf kurallarının öğrencilerle birlikte belirlenip sınıfta görünür bir yere asılması önerildi.'],
        ['Öğrencilerin akademik durumu', 'Öğrencilerin derslere hazırbulunuşluk düzeyleri, önceki yıl başarıları ve öğrenme eksikleri her ders öğretmeni tarafından değerlendirildi. Desteğe ihtiyaç duyan öğrenciler belirlendi.'],
        ['Devam-devamsızlık', 'Devamsızlığı sık olan öğrenciler belirlendi. Özürsüz devamsızlığı 5, 10 ve 15 güne ulaşan öğrencilerin velilerine bildirim yapılacağı, devamsızlığın nedenlerinin rehberlik servisiyle birlikte araştırılacağı görüşüldü.'],
        ['Özel eğitim ve rehberlik ihtiyaçları', 'Kaynaştırma/bütünleştirme yoluyla eğitim alan öğrenciler ile BEP’i bulunan öğrenciler, ders öğretmenlerinin uygulayacağı uyarlamalar ve rehberlik servisine yönlendirilmesi gereken öğrenciler görüşüldü.'],
        ['Davranış ve sosyal-duygusal gelişim', 'Öğrencilerin sınıf içi davranışları, akran ilişkileri ve sosyal-duygusal gelişimleri değerlendirildi. Olumlu davranışların pekiştirilmesi, sorunlarda ortak tutum sergilenmesi ve gerektiğinde velilerle iş birliği yapılması kararlaştırıldı.'],
        ['Ölçme ve değerlendirme, ödevler', 'Sınav tarihlerinin aynı güne yığılmayacak şekilde dağıtılması, ödevlerin öğrencilere aşırı yük oluşturmayacak biçimde planlanması ve proje görevlerinin dengeli dağıtılması görüşüldü. Gelişim Raporu için gözlemlerin düzenli kaydedileceği belirtildi.'],
        ['Veli iş birliği', 'Veli toplantısının planlanması, e-Okul Veli Bilgilendirme Sistemi’nin kullanımının teşvik edilmesi ve velilerle düzenli iletişim kurulması önerildi.'],
        ['Dilek ve temenniler', 'Toplantı iyi dileklerle sona erdi.'],
      ],
      kararlar: [
        'Sınıf kuralları öğrencilerle birlikte belirlenecek ve sınıfa asılacaktır.',
        'Desteğe ihtiyaç duyan öğrenciler için ders öğretmenleri ek çalışma yapacak, gerekirse destekleme ve yetiştirme kursuna yönlendirilecektir.',
        'Özürsüz devamsızlığı 5, 10 ve 15 güne ulaşan öğrencilerin velilerine bildirim yapılacaktır.',
        'BEP’i bulunan öğrenciler için ders öğretmenleri planlara uygun uyarlamaları uygulayacaktır.',
        'Sınav tarihleri aynı güne yığılmayacak şekilde dağıtılacak, ödevler dengeli planlanacaktır.',
        'Davranış sorunlarında tüm öğretmenler ortak tutum sergileyecek, gerektiğinde rehberlik servisi ve velilerle iş birliği yapılacaktır.',
      ],
    }),
};

const SOK_SONU = {
  id: 'sok-donem-sonu',
  gun: ['@donem1_sonu-5', '@ders_sonu-5'], // karneden önceki hafta
  kategori: 'sok',
  ad: 'Şube öğretmenler kurulu (ŞÖK) tutanağı — dönem sonu',
  donem: 'Dönem sonu (teşekkür-takdir)',
  body: () =>
    meeting({
      title: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI ŞUBE ÖĞRETMENLER KURULU DÖNEM SONU TOPLANTI TUTANAĞI',
      info: SOK_INFO,
      imza: 'sok',
      items: [
        ['Açılış ve yoklama', 'Toplantı sınıf rehber öğretmeninin başkanlığında açıldı, yoklama yapıldı.'],
        ['Dönem başı kararlarının değerlendirilmesi', 'Dönem başında alınan kararların uygulanma durumu gözden geçirildi.'],
        ['Şubenin başarı durumu', 'Öğrencilerin ders başarıları, sınav sonuçları, proje ve performans çalışmaları ders öğretmenlerince değerlendirildi. Başarısı düşen öğrenciler ve nedenleri görüşüldü.'],
        ['Devam-devamsızlık', 'Dönem boyunca devamsızlık yapan öğrencilerin durumu ve velilere yapılan bildirimler gözden geçirildi.'],
        ['Teşekkür ve takdir belgeleri', 'Yönetmelik hükümlerine göre teşekkür ve takdir belgesi almaya hak kazanan öğrenciler belirlendi. 20 gün ve üzeri özürsüz devamsızlığı bulunan öğrencilere belge verilemeyeceği hatırlatıldı.'],
        ['Gelişim Raporu', 'Gelişim Raporu verilecek sınıf düzeylerinde öğrencilerin gelişim düzeyleri ve sosyal-duygusal becerilerine ilişkin öğretmen görüşleri paylaşıldı.'],
        ['Rehberlik ve özel eğitim', 'BEP’i bulunan öğrencilerin gelişimi ile rehberlik servisine yönlendirilen öğrencilerin durumu görüşüldü.'],
        ['Gelecek dönem için öneriler', 'Başarının artırılması ve sınıf ortamının iyileştirilmesi için öneriler sunuldu.'],
        ['Dilek ve temenniler', 'Toplantı iyi dileklerle sona erdi.'],
      ],
      kararlar: [
        'Teşekkür ve takdir belgesi almaya hak kazanan öğrencilerin listesi okul yönetimine sunulacaktır.',
        'Başarısı düşen öğrencilerin velileriyle görüşülecek, gelecek dönem için bireysel destek planlanacaktır.',
        'Gelişim Raporu için öğretmen görüşleri süresi içinde sisteme girilecektir.',
        'BEP’i bulunan öğrencilerin planları rehberlik servisiyle birlikte güncellenecektir.',
      ],
    }),
};

// ---------- Veli toplantısı ----------
const VELI_INFO = MEETING_INFO([['Sınıf / Şube', '{sinif}'], ['Sınıf rehber öğretmeni', '{danisman}'], ['Öğrenci sayısı', '{ogrenci_sayisi}'], ['Katılan veli sayısı', '……']]);
const veliSign = () =>
  p('') +
  section('KATILAN VELİLER') +
  table([['No', 'Öğrencinin adı soyadı', 'Velinin adı soyadı', 'İmza'], dongu('ogrenciler', ['{no}', '{ad}', '', ''])], [900, 3400, 3300, 2000]) +
  sign.rehber();
const VELI_1 = {
  id: 'veli-1-donem',
  gun: '10-09',
  kategori: 'sinif',
  ad: 'Veli toplantısı tutanağı — 1. dönem',
  donem: 'Birinci dönem',
  body: () =>
    meeting({
      title: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI BİRİNCİ DÖNEM VELİ TOPLANTISI TUTANAĞI',
      info: VELI_INFO,
      imza: 'rehber',
      katilanlar: false,
      items: [
        ['Açılış ve tanışma', 'Toplantı sınıf rehber öğretmeninin açılış konuşmasıyla başladı; öğretmen ve veliler tanıştı.'],
        ['Okulun işleyişi ve kurallar', 'Okulun giriş-çıkış saatleri, kılık-kıyafet, okul ve sınıf kuralları hakkında bilgi verildi. Öğrencilerin bilişim araçlarını (cep telefonu, tablet vb.) okul yönetimince belirlenen kurallara uygun kullanmaları gerektiği, aksi davranışın disiplin hükümlerine tabi olduğu hatırlatıldı.'],
        ['Devam-devamsızlık', 'Öğrencilerin okula düzenli devamının önemi vurgulandı. Özürsüz devamsızlığı 5, 10 ve 15 güne ulaşan öğrencilerin velilerine bildirim yapılacağı, özür belgelerinin zamanında okula teslim edilmesi gerektiği anlatıldı.'],
        ['Türkiye Yüzyılı Maarif Modeli', `${PROGRAM} Modelin ezber yerine beceri, değer ve okuryazarlık kazandırmayı amaçladığı; ailelerin evde okuma, sohbet ve günlük hayat uygulamalarıyla süreci destekleyebileceği anlatıldı.`],
        ['Ölçme ve değerlendirme', 'Her dönem yapılan yazılı sınavlar, ülke genelinde yapılan ortak yazılı sınavlar, ders yılında en az bir proje hazırlatıldığı ve teslim edilmeyen projenin sıfır sayıldığı açıklandı. Gelişim Raporu verilen sınıflarda dönem sonunda karneyle birlikte öğrencinin gelişimine ilişkin raporun verileceği belirtildi.'],
        ['e-Okul Veli Bilgilendirme Sistemi', 'Velilerin öğrencilerinin devamsızlık, not ve duyurularını e-Okul Veli Bilgilendirme Sistemi’nden düzenli takip etmeleri istendi; iletişim bilgilerinin güncel tutulması rica edildi.'],
        ['Ders çalışma alışkanlıkları ve LGS', 'Düzenli uyku, sağlıklı beslenme, ekran süresinin sınırlandırılması ve evde sessiz bir çalışma ortamı oluşturulmasının önemi anlatıldı. 8. sınıf velilerine Liselere Geçiş Sistemi ve yapılacak hazırlık çalışmaları hakkında bilgi verildi.'],
        ['Rehberlik hizmetleri', 'Okul rehberlik servisinin çalışmaları tanıtıldı; öğrencide gözlenen davranış, uyum veya akademik sorunlarda velilerin rehberlik servisi ve sınıf rehber öğretmeniyle iletişime geçmeleri istendi.'],
        ['Okul-aile iş birliği', 'Okul Aile Birliği çalışmaları ve velilerin okul etkinliklerine katılımının öğrenci başarısına katkısı vurgulandı.'],
        ['Dilek, öneri ve sorular', 'Velilerin soruları yanıtlandı, önerileri not edildi. Toplantı iyi dileklerle sona erdi.'],
      ],
      kararlar: [
        'Veliler öğrencilerinin devam durumunu ve notlarını e-Okul Veli Bilgilendirme Sistemi’nden düzenli takip edecektir.',
        'Özür belgeleri zamanında okula teslim edilecek, iletişim bilgileri güncel tutulacaktır.',
        'Öğrencilerin evde düzenli kitap okuması ve ekran süresinin sınırlandırılması için aileler destek olacaktır.',
        'Öğrencilerin bilişim araçlarını okul kurallarına uygun kullanmaları konusunda veliler bilgilendirilmiştir.',
        'Davranış veya başarı sorunlarında sınıf rehber öğretmeni ve rehberlik servisiyle iş birliği yapılacaktır.',
      ],
    }).replace(sign.rehber(), veliSign()),
};
const VELI_2 = {
  id: 'veli-2-donem',
  gun: '02-19',
  kategori: 'sinif',
  ad: 'Veli toplantısı tutanağı — 2. dönem',
  donem: 'İkinci dönem',
  body: () =>
    meeting({
      title: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI İKİNCİ DÖNEM VELİ TOPLANTISI TUTANAĞI',
      info: VELI_INFO,
      imza: 'rehber',
      katilanlar: false,
      items: [
        ['Açılış', 'Toplantı sınıf rehber öğretmeninin açılış konuşmasıyla başladı.'],
        ['Birinci dönemin değerlendirilmesi', 'Birinci dönem başarı durumu, karne ve Gelişim Raporu sonuçları genel olarak değerlendirildi; sınıfın güçlü yönleri ve geliştirilmesi gereken alanlar paylaşıldı.'],
        ['Devam durumu', 'Birinci dönem devamsızlık durumu gözden geçirildi, düzenli devamın önemi yeniden vurgulandı.'],
        ['İkinci dönem ölçme ve değerlendirme', 'İkinci dönem yazılı ve ortak sınav takvimi, proje teslim tarihleri ve değerlendirme ölçütleri hakkında bilgi verildi.'],
        ['Ders çalışma ve LGS', 'Öğrencilerin dönem boyunca düzenli tekrar yapmalarının önemi anlatıldı; 8. sınıf velilerine LGS takvimi ve hazırlık süreci hakkında bilgi verildi.'],
        ['Rehberlik ve kariyer', 'Öğrencilerin ilgi ve yeteneklerini tanımaları, meslekleri ve üst öğrenim kurumlarını araştırmaları için ailelerin destek olabileceği anlatıldı.'],
        ['Dilek, öneri ve sorular', 'Velilerin soruları yanıtlandı. Toplantı iyi dileklerle sona erdi.'],
      ],
      kararlar: [
        'Birinci dönemde başarısı düşen öğrencilerin velileriyle bireysel görüşme yapılacaktır.',
        'Veliler ikinci dönem sınav ve proje takvimini takip edecek, öğrencilerin düzenli çalışmasını destekleyecektir.',
        '8. sınıf öğrencilerinin LGS hazırlık süreci okul ve aile iş birliğiyle izlenecektir.',
      ],
    }).replace(sign.rehber(), veliSign()),
};

// ---------- Kulüp ----------
// Kulüp bilgileri ve üyeler Evraklar → Kulübüm'den (üyeler sınıf listelerinden seçilir); danışman boşsa öğretmenin adı.
const uyeTablosu = (son = 'İmza') => table([['S.No', 'Adı Soyadı', 'Sınıfı / No', son], dongu('uyeler', ['{sira}', '{ad}', '{sinif} {no}', ''])], [800, 4800, 1900, 2100]);
const KULUP_INFO = (extra = []) =>
  infoTable([['Kulüp adı', '{kulup} Kulübü'], ['Danışman öğretmen', '{kulup_danisman}'], ['Kulüp başkanı', '{kulup_baskani}'], ['Üye sayısı', '{uye_sayisi}'], ...extra]);
const KULUP_DAYANAK = 'Millî Eğitim Bakanlığı Eğitim Kurumları Sosyal Etkinlikler Yönetmeliği';

// Yıllık plan, aylık raporlar ve dönem / yıl sonu raporları aynı aylık çalışmalardan beslenir.
const KULUP_AYLAR = [
  { ay: 'Eylül', no: '09', is: 'Kulübün tanıtılması, üyelerin belirlenmesi. Sene başı genel kurul toplantısı; kulüp başkanı ve yönetim kurulunun seçilmesi, kulüp tüzüğünün kabulü.', not: 'Üye listesi e-Okul’a işlenir.' },
  { ay: 'Ekim', no: '10', is: 'Yıllık çalışma planının üyelerle birlikte hazırlanması. 29 Ekim Cumhuriyet Bayramı etkinliklerine katılım.', not: 'Görev dağılımı yapılır.' },
  { ay: 'Kasım', no: '11', is: '10 Kasım Atatürk’ü Anma Haftası etkinliklerine katkı. 24 Kasım Öğretmenler Günü için çalışma.', not: 'Pano / sunum hazırlanır.' },
  { ay: 'Aralık', no: '12', is: 'Kulüp alanına yönelik araştırma ve sunum çalışmaları. Okul içi duyuru ve pano düzenlenmesi.', not: '' },
  { ay: 'Ocak', no: '01', is: 'Birinci dönem çalışmalarının değerlendirilmesi; birinci dönem sonu raporunun hazırlanması.', not: 'Dönem değerlendirme toplantısı.' },
  { ay: 'Şubat', no: '02', is: 'İkinci dönem başı toplantısı; ikinci dönem çalışma takviminin belirlenmesi. Kulüp alanına yönelik proje veya etkinlik hazırlığı.', not: '' },
  { ay: 'Mart', no: '03', is: '12 Mart İstiklal Marşı’nın Kabulü ve 18 Mart Çanakkale Zaferi etkinliklerine katkı.', not: '' },
  { ay: 'Nisan', no: '04', is: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı etkinliklerine katılım. Okul dışı gezi / gözlem etkinliği (veli izinleri alınarak).', not: 'Veli izin belgesi.' },
  { ay: 'Mayıs', no: '05', is: '19 Mayıs Atatürk’ü Anma, Gençlik ve Spor Bayramı etkinliklerine katılım. Yıl sonu sergi / gösteri hazırlığı.', not: '' },
  { ay: 'Haziran', no: '06', is: 'Sene sonu genel kurul toplantısı; yıllık çalışmaların değerlendirilmesi ve yıl sonu faaliyet raporunun hazırlanması.', not: 'Rapor okul yönetimine verilir.' },
];
// Yapılan etkinlikler (raporların TARİH | ETKİNLİK | KATILAN tablosu): {gun:…} uygulamada evrakın eğitim yılına göre tarihe
// döner; gün tatile / hafta sonuna denk gelirse takvim.js önceki ders gününe çeker (29 Ekim → 28 Ekim, 12 Mart ara tatil → önceki
// cuma, 19 Mayıs bayram → önceki ders günü). Öğretmen Word'de düzeltir.
const KULUP_ETK = {
  '09': [['09-25', 'Sene başı genel kurul toplantısı yapıldı; kulüp başkanı, yönetim ve denetleme kurulu seçildi, kulüp tüzüğü kabul edildi.']],
  '10': [['10-02', 'Yıllık çalışma planı üyelerle birlikte hazırlandı, görev dağılımı yapıldı.'], ['10-29', '29 Ekim Cumhuriyet Bayramı etkinliklerine katılındı, kulüp panosu hazırlandı.']],
  '11': [['11-10', '10 Kasım Atatürk’ü Anma Haftası programına katkı sağlandı.'], ['11-24', '24 Kasım Öğretmenler Günü için etkinlik hazırlandı.']],
  '12': [['12-11', 'Kulüp alanına yönelik araştırma yapıldı, sonuçlar üyelere sunuldu.'], ['12-25', 'Okul içi duyurular hazırlandı, kulüp panosu güncellendi.']],
  '01': [['@donem1_sonu-5', 'Birinci dönem çalışmaları değerlendirme toplantısında gözden geçirildi.'], ['@donem1_sonu-2', 'Birinci dönem sonu raporu hazırlandı.']],
  '02': [['@donem2_basi+4', 'İkinci dönem başı toplantısı yapıldı, ikinci dönem çalışma takvimi belirlendi.'], ['02-26', 'Kulüp alanına yönelik proje / etkinlik hazırlığına başlandı.']],
  '03': [['03-12', '12 Mart İstiklal Marşı’nın Kabulü etkinliklerine katkı sağlandı.'], ['03-18', '18 Mart Çanakkale Zaferi anma programına katılındı.']],
  '04': [['04-16', 'Veli izinleri alınarak okul dışı gezi / gözlem etkinliği yapıldı.'], ['04-23', '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı etkinliklerine katılındı.']],
  '05': [['05-19', '19 Mayıs Atatürk’ü Anma, Gençlik ve Spor Bayramı etkinliklerine katılındı.'], ['05-28', 'Yıl sonu sergi / gösterisi düzenlendi.']],
  '06': [['@ders_sonu-10', 'Sene sonu genel kurul toplantısı yapıldı, yıllık çalışmalar değerlendirildi.'], ['@ders_sonu-5', 'Yıl sonu faaliyet raporu hazırlandı.']],
};
const etkSatirlari = (aylar) => aylar.flatMap((m) => KULUP_ETK[m.no].map(([g, t]) => [`{gun:${g}}`, t, '{uye_sayisi} üye']));
const GUCLUK = 'Ders saatleri dışında bütün üyelerin katılabileceği ortak toplantı saati bulmakta zaman zaman güçlük yaşanmış; okul programının yoğun olduğu haftalarda bazı çalışmalar ertelenerek sonraki haftalarda tamamlanmıştır.';
const buyuk = (t) => t.toLocaleUpperCase('tr');

const KULUP_PLAN = {
  id: 'kulup-yillik-plan',
  kategori: 'kulup',
  ad: 'Kulüp yıllık çalışma planı',
  kisa: 'Yıllık Plan',
  donem: 'Eylül sonu · sene başı toplantısından sonra',
  gun: '10-02',
  body: () =>
    head('{egitim_yili} EĞİTİM-ÖĞRETİM YILI {kulup} KULÜBÜ YILLIK ÇALIŞMA PLANI') +
    KULUP_INFO() +
    p('') +
    p(`Plan, ${KULUP_DAYANAK} esas alınarak hazırlanmıştır. Kulüp çalışmaları öğrencilerin ilgi ve yeteneklerini geliştirmeyi, iş birliği, sorumluluk ve gönüllülük bilinci kazandırmayı amaçlar.`, { justify: true, i: true }) +
    table(
      [['AY', 'TARİH', 'YAPILACAK ÇALIŞMALAR', 'AÇIKLAMA'], ...KULUP_AYLAR.map((m) => [buyuk(m.ay), KULUP_ETK[m.no].map(([g]) => `{gun:${g}}`).join('\n'), m.is, m.not])],
      [1200, 1300, 4800, 2300]
    ) +
    p('') +
    section('KULÜP ÜYELERİ') +
    uyeTablosu('Görevi') +
    sign.kulup(),
};

const KULUP_ILK = {
  id: 'kulup-ilk-toplanti',
  kategori: 'kulup',
  ad: 'Kulüp sene başı toplantı tutanağı',
  kisa: 'Sene Başı Toplantısı',
  donem: 'Eylül · ilk genel kurul',
  gun: '09-25',
  body: () =>
    meeting({
      title: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI {kulup} KULÜBÜ SENE BAŞI GENEL KURUL TOPLANTI TUTANAĞI',
      info: MEETING_INFO([['Kulüp adı', '{kulup} Kulübü'], ['Danışman öğretmen', '{kulup_danisman}']]),
      imza: 'kulupToplanti',
      items: [
        ['Açılış ve yoklama', 'Toplantı danışman öğretmenin açılış konuşmasıyla başladı, kulüp üyelerinin yoklaması yapıldı.'],
        ['Kulübün amacı ve çalışma alanının tanıtılması', `Danışman öğretmen kulübün amacını, çalışma alanını ve üyelerden beklenen sorumlulukları anlattı. ${KULUP_DAYANAK} çerçevesinde sosyal etkinliklerin öğrencilerin ilgi ve yeteneklerini geliştirmeye, iş birliği ve gönüllülük bilinci kazandırmaya yönelik olduğu belirtildi.`],
        ['Kulüp başkanı ve yönetim kurulunun seçimi', 'Üyeler arasından yapılan seçimle kulüp başkanlığına {kulup_baskani} seçildi; başkan yardımcısı …… , sekreter …… olarak belirlendi. Denetleme kurulu üyeleri …… , …… ve …… oldu.'],
        ['Kulüp tüzüğünün kabulü', 'Kulüp tüzüğü okundu, maddeler üzerinde görüşüldü ve oy birliğiyle kabul edildi.'],
        ['Yıllık çalışma planının hazırlanması', 'Üyelerin önerileri alınarak aylara göre yapılacak etkinlikler belirlendi; belirli gün ve haftalara katkı sağlanmasına karar verildi.'],
        ['Görev dağılımı', 'Etkinliklerde görev alacak öğrenciler belirlendi ve görevler paylaştırıldı.'],
        ['Dilek ve temenniler', 'Yeni dönemin verimli geçmesi dileğiyle toplantı sona erdi.'],
      ],
      kararlar: [
        'Kulüp başkanı, yönetim kurulu ve denetleme kurulu seçilmiştir.',
        'Kulüp tüzüğü kabul edilmiştir.',
        'Yıllık çalışma planı üyelerin önerileri doğrultusunda hazırlanacak ve okul yönetimine sunulacaktır.',
        'Kulüp ayda en az bir kez toplanarak çalışmaları değerlendirecektir.',
        'Etkinliklerde görev dağılımına uygun hareket edilecektir.',
      ],
    }),
};

const KULUP_ORTA = {
  id: 'kulup-2-donem-basi',
  kategori: 'kulup',
  ad: 'Kulüp ikinci dönem başı toplantı tutanağı',
  kisa: 'İkinci Dönem Başı Toplantısı',
  donem: 'Şubat · ikinci dönemin ilk haftası',
  gun: '@donem2_basi+4',
  body: () =>
    meeting({
      title: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI {kulup} KULÜBÜ İKİNCİ DÖNEM BAŞI TOPLANTI TUTANAĞI',
      info: MEETING_INFO([['Kulüp adı', '{kulup} Kulübü'], ['Danışman öğretmen', '{kulup_danisman}']]),
      imza: 'kulupToplanti',
      items: [
        ['Açılış ve yoklama', 'Toplantı danışman öğretmenin açılış konuşmasıyla başladı, kulüp üyelerinin yoklaması yapıldı.'],
        ['Birinci dönem çalışmalarının değerlendirilmesi', 'Yıllık çalışma planında birinci dönem için belirlenen etkinlikler gözden geçirildi. Belirli gün ve haftalara katkı sağlandığı, planlanan çalışmaların büyük bölümünün yapıldığı; yapılamayanların ikinci dönemde tamamlanacağı belirtildi.'],
        ['Yönetim kurulunda değişiklik', 'Yönetim kurulunun görevine devam etmesine / ayrılan üyelerin yerine yeni üye seçilmesine karar verildi.'],
        ['İkinci dönem çalışma takvimi', 'İkinci dönemde 12 Mart İstiklal Marşı’nın Kabulü, 18 Mart Çanakkale Zaferi, 23 Nisan Ulusal Egemenlik ve Çocuk Bayramı ile 19 Mayıs Atatürk’ü Anma, Gençlik ve Spor Bayramı etkinliklerine katkı sağlanması; kulüp alanına yönelik proje ve yıl sonu sergi / gösteri hazırlığı yapılması görüşüldü.'],
        ['Okul dışı etkinlikler', 'Planlanan gezi ve gözlem etkinlikleri için okul yönetiminden onay ve velilerden yazılı izin alınacağı hatırlatıldı.'],
        ['Görev dağılımı', 'İkinci dönem etkinliklerinde görev alacak öğrenciler belirlendi.'],
        ['Dilek ve temenniler', 'İkinci dönemin verimli geçmesi dileğiyle toplantı sona erdi.'],
      ],
      kararlar: [
        'Birinci dönemde yapılamayan çalışmalar ikinci dönemde tamamlanacaktır.',
        'İkinci dönem belirli gün ve haftalarına kulüp olarak katkı sağlanacaktır.',
        'Okul dışı etkinlikler için okul yönetiminin onayı ve veli izinleri alınacaktır.',
        'Yıl sonu sergi / gösteri hazırlıklarına Nisan ayında başlanacaktır.',
      ],
    }),
};

const KULUP_SONU = {
  id: 'kulup-sene-sonu-toplanti',
  kategori: 'kulup',
  ad: 'Kulüp sene sonu toplantı tutanağı',
  kisa: 'Sene Sonu Toplantısı',
  donem: 'Haziran · sene sonu genel kurulu',
  gun: '@ders_sonu-10',
  body: () =>
    meeting({
      title: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI {kulup} KULÜBÜ SENE SONU GENEL KURUL TOPLANTI TUTANAĞI',
      info: MEETING_INFO([['Kulüp adı', '{kulup} Kulübü'], ['Danışman öğretmen', '{kulup_danisman}']]),
      imza: 'kulupToplanti',
      items: [
        ['Açılış ve yoklama', 'Toplantı danışman öğretmenin açılış konuşmasıyla başladı, kulüp üyelerinin yoklaması yapıldı.'],
        ['Yıllık çalışmaların değerlendirilmesi', 'Yıllık çalışma planında yer alan etkinliklerin uygulanma durumu gözden geçirildi. Belirli gün ve haftalarda okul etkinliklerine katkı sağlandığı, kulüp alanına yönelik araştırma, sunum ve pano çalışmalarının yapıldığı belirtildi.'],
        ['Denetleme kurulunun raporu', 'Denetleme kurulu, kulüp çalışmalarının yıllık plana ve tüzüğe uygun yürütüldüğünü bildirdi.'],
        ['Yıl sonu faaliyet raporunun hazırlanması', 'Yıl boyunca yapılan çalışmalar, ulaşılan sonuçlar ve karşılaşılan güçlükler üzerinde görüşülerek yıl sonu faaliyet raporunun hazırlanmasına karar verildi.'],
        ['Gelecek yıl için öneriler', 'Kulüp çalışmalarının yıl başında daha erken planlanması, okul dışı öğrenme etkinliklerinin artırılması ve diğer kulüplerle ortak etkinlikler düzenlenmesi önerildi.'],
        ['Dilek ve temenniler', 'Danışman öğretmen üyelere katkıları için teşekkür etti, iyi tatiller diledi. Toplantı sona erdi.'],
      ],
      kararlar: [
        'Yıllık çalışmalar değerlendirilmiş, kulüp çalışmalarının plana uygun yürütüldüğü görülmüştür.',
        'Yıl sonu faaliyet raporu hazırlanarak okul yönetimine sunulacaktır.',
        'Gelecek yıl için öneriler yıl sonu raporunda yer alacaktır.',
      ],
    }),
};

// Dönem / yıl sonu raporu: yapılan etkinlikler tarihleriyle hazır yazılır, katılan üyeler Bilgilerim'deki öğrenci adlarından.
const kulupRapor = ({ baslik, aylar, sonuc, oneri }) =>
  head(baslik) +
  KULUP_INFO() +
  p('') +
  section('1. YAPILAN ÇALIŞMALAR') +
  p('Kulüp, sene başında hazırlanan yıllık çalışma planı doğrultusunda çalışmalarını sürdürmüştür. Yapılan çalışmalar tarihleriyle aşağıda gösterilmiştir.', { justify: true }) +
  table([['TARİH', 'YAPILAN ETKİNLİK', 'KATILAN ÖĞRENCİ'], ...etkSatirlari(aylar)], [1500, 6000, 2100]) +
  p('') +
  section('ÇALIŞMALARA KATILAN ÜYELER') +
  uyeTablosu('Görevi') +
  p('') +
  section('2. ULAŞILAN SONUÇLAR') +
  p(sonuc, { justify: true }) +
  section('3. KARŞILAŞILAN GÜÇLÜKLER') +
  p(GUCLUK, { justify: true }) +
  section('4. ÖNERİLER') +
  p(oneri, { justify: true }) +
  sign.kulup();

const KULUP_DONEM = {
  id: 'kulup-1-donem-rapor',
  kategori: 'kulup',
  ad: 'Kulüp birinci dönem sonu raporu',
  kisa: 'Birinci Dönem Sonu Raporu',
  donem: 'Ocak · birinci dönemin son haftası',
  gun: '@donem1_sonu-2',
  body: () =>
    kulupRapor({
      baslik: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI {kulup} KULÜBÜ BİRİNCİ DÖNEM SONU RAPORU',
      aylar: KULUP_AYLAR.slice(0, 5),
      sonuc: 'Birinci dönemde kulüp üyelerinin belirli gün ve haftalara yönelik etkinliklere katılımı sağlanmış; öğrencilerin iş birliği, sorumluluk alma ve kendini ifade etme becerilerinin geliştiği gözlenmiştir.',
      oneri: 'Birinci dönemde yapılamayan çalışmaların ikinci dönemin ilk haftalarında tamamlanması, ikinci dönem için proje ve okul dışı etkinliklerin erken planlanması önerilmektedir.',
    }),
};

const KULUP_RAPOR = {
  id: 'kulup-yil-sonu-rapor',
  kategori: 'kulup',
  ad: 'Kulüp yıl sonu faaliyet raporu',
  kisa: 'Yıl Sonu Raporu',
  donem: 'Haziran · ders yılının son haftaları',
  gun: '@ders_sonu-5',
  body: () =>
    kulupRapor({
      baslik: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI {kulup} KULÜBÜ YIL SONU FAALİYET RAPORU',
      aylar: KULUP_AYLAR,
      sonuc: 'Kulüp çalışmalarıyla öğrencilerin iş birliği, sorumluluk alma ve kendini ifade etme becerilerinin geliştiği; okul etkinliklerine katılımın arttığı gözlenmiştir.',
      oneri: 'Kulüp çalışmalarının yıl başında daha erken planlanması, okul dışı öğrenme etkinliklerinin artırılması ve diğer kulüplerle ortak etkinlikler düzenlenmesi önerilmektedir.',
    }),
};

const madde = (no, baslik, metin) => pLead(`Madde ${no} – ${baslik}: `, metin);
const KULUP_TUZUK = {
  id: 'kulup-tuzuk',
  kategori: 'kulup',
  ad: 'Kulüp tüzüğü',
  kisa: 'Kulüp Tüzüğü',
  donem: 'Eylül · sene başı toplantısında kabul edilir',
  gun: '09-25',
  body: () =>
    head('{egitim_yili} EĞİTİM-ÖĞRETİM YILI {kulup} KULÜBÜ TÜZÜĞÜ') +
    madde(1, 'Kulübün adı', 'Kulübün adı {okul} {kulup} Kulübü’dür.') +
    madde(2, 'Dayanak', `Bu tüzük, ${KULUP_DAYANAK} hükümlerine dayanılarak hazırlanmıştır.`) +
    madde(3, 'Amaç', 'Kulübün amacı; öğrencilerin ilgi ve yetenekleri doğrultusunda kulüp alanında bilgi ve beceri kazanmalarını, iş birliği, sorumluluk, gönüllülük ve demokratik katılım bilinci geliştirmelerini, millî ve manevi değerlere bağlı, paylaşımcı bireyler olarak yetişmelerini sağlamaktır.') +
    madde(4, 'Üyelik', 'Okulun öğrencileri, ilgi ve istekleri doğrultusunda kulübe üye olur. Üyelik bilgileri danışman öğretmen tarafından e-Okul’a işlenir. Kulüp değişikliği okul yönetiminin belirlediği esaslara göre yapılır.') +
    madde(5, 'Kulübün organları', 'Kulüp; genel kurul, yönetim kurulu ve denetleme kurulundan oluşur.') +
    madde(6, 'Genel kurul', 'Genel kurul kulübün bütün üyelerinden oluşur. Sene başında toplanarak yönetim ve denetleme kurullarını seçer, tüzüğü kabul eder ve yıllık çalışma planını görüşür; sene sonunda toplanarak yıllık çalışmaları değerlendirir.') +
    madde(7, 'Yönetim kurulu', 'Yönetim kurulu başkan, başkan yardımcısı, sekreter ve üyelerden oluşur. Yıllık çalışma planını uygular, etkinlikleri düzenler, görev dağılımı yapar ve toplantı tutanaklarını tutar. Kulüp başkanı kulübü temsil eder, toplantıları danışman öğretmenle birlikte yönetir.') +
    madde(8, 'Denetleme kurulu', 'Denetleme kurulu üç üyeden oluşur. Kulüp çalışmalarının tüzüğe ve yıllık plana uygun yürütülüp yürütülmediğini izler, görüşlerini dönem sonunda genel kurula bildirir.') +
    madde(9, 'Danışman öğretmen', 'Danışman öğretmen kulüp çalışmalarına rehberlik eder, toplantılara katılır, çalışmaların plana uygun yürütülmesini izler, raporları hazırlayarak okul yönetimine sunar.') +
    madde(10, 'Toplantılar', 'Yönetim kurulu ayda en az bir kez toplanır. Kararlar oy çokluğuyla alınır ve tutanağa geçirilir. Toplantılar ders saatleri dışında ya da okul yönetiminin belirlediği sosyal etkinlik saatlerinde yapılır.') +
    madde(11, 'Okul dışı etkinlikler', 'Gezi, gözlem ve benzeri okul dışı etkinlikler okul müdürünün onayı ve velilerin yazılı izniyle yapılır.') +
    madde(12, 'Yürürlük', 'Bu tüzük genel kurulca kabulü ve okul müdürünün onayıyla yürürlüğe girer.') +
    p('') +
    section('YÖNETİM KURULU') +
    table([['Görevi', 'Adı Soyadı', 'İmza'], ['Başkan', '{kulup_baskani}', ''], ['Başkan yardımcısı', '', ''], ['Sekreter', '', ''], ['Üye', '', ''], ['Üye', '', '']], [3000, 4600, 2000]) +
    p('') +
    section('DENETLEME KURULU') +
    table([['Görevi', 'Adı Soyadı', 'İmza'], ['Üye', '', ''], ['Üye', '', ''], ['Üye', '', '']], [3000, 4600, 2000]) +
    sign.kulup(),
};

const KULUP_IZIN = {
  id: 'kulup-veli-izin',
  kategori: 'kulup',
  ad: 'Kulüp veli izin belgesi',
  kisa: 'Veli İzin Belgesi',
  donem: 'Gezi / okul dışı etkinlikten önce',
  gun: null, // etkinlik tarihi belli değil: indirildiği gün
  body: () =>
    head('{kulup} KULÜBÜ VELİ İZİN BELGESİ') +
    infoTable([
      ['Etkinliğin adı', '……'],
      ['Etkinliğin yeri', '……'],
      ['Tarih / saat', '……'],
      ['Ulaşım', '……'],
      ['Sorumlu öğretmen', '{kulup_danisman}'],
    ]) +
    p('') +
    p('{okul} {kulup} Kulübü tarafından düzenlenecek, bilgileri yukarıda yazılı etkinliğe velisi bulunduğum öğrencinin katılmasına izin veriyorum. Etkinlik süresince öğretmenlerinin ve okul yönetiminin belirlediği kurallara uyması gerektiğini öğrencime bildirdim.', { justify: true }) +
    table(
      [['S.No', 'Öğrencinin adı soyadı', 'Velinin adı soyadı', 'İzin (Evet / Hayır)', 'Veli imzası'], dongu('uyeler', ['{sira}', '{ad}', '', '', ''])],
      [700, 3200, 2800, 1500, 1400]
    ) +
    p('') +
    p('- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - (keserek öğrenciyle gönderiniz)', { center: true, size: 8 }) +
    section('VELİ İZİN DİLEKÇESİ') +
    p('{okul} {kulup} Kulübü tarafından …… tarihinde …… yerinde düzenlenecek etkinliğe velisi bulunduğum …… sınıfı …… numaralı öğrenci …… ’nın katılmasına izin veriyorum / vermiyorum.', { justify: true }) +
    table([['Velinin adı soyadı', 'Telefonu', 'İmza'], ['', '', '']], [3800, 3000, 2800]) +
    p('') +
    table([['Danışman Öğretmen', 'UYGUNDUR'], ['{kulup_danisman}', '{tarih}\n{mudur}\nOkul Müdürü']], [4800, 4800]),
};

// Aylık çalışma raporları (Eylül … Haziran): plandaki çalışmalar + o ayın tarihli etkinlikleri + üye listesi; tarih ayın son iş günü.
const KULUP_AYLIK = KULUP_AYLAR.map((m, i) => ({
  id: `kulup-aylik-${m.no}`,
  kategori: 'kulup',
  grup: 'aylik',
  ad: `Kulüp aylık çalışma raporu — ${m.ay}`,
  kisa: m.ay,
  donem: `${m.ay} sonu`,
  gun: `ay-sonu:${m.no}`,
  body: () =>
    head(`{egitim_yili} EĞİTİM-ÖĞRETİM YILI {kulup} KULÜBÜ ${buyuk(m.ay)} AYI ÇALIŞMA RAPORU`) +
    KULUP_INFO([['Rapor dönemi', `${m.ay} ayı`]]) +
    p('') +
    section('1. PLANDA BU AY İÇİN BELİRLENEN ÇALIŞMALAR') +
    p(m.is + (m.not ? ` (${m.not})` : ''), { justify: true }) +
    section('2. YAPILAN ÇALIŞMALAR') +
    table([['TARİH', 'YAPILAN ETKİNLİK', 'KATILAN ÖĞRENCİ'], ...etkSatirlari([m]), ['', '', '']], [1500, 6000, 2100]) +
    p('') +
    section('BU AY ÇALIŞMALARA KATILAN ÜYELER') +
    uyeTablosu() +
    p('') +
    section('3. DEĞERLENDİRME') +
    p(
      `${m.ay} ayında kulüp çalışmaları yıllık çalışma planı doğrultusunda yürütülmüş, üyelerin etkinliklere katılımı sağlanmış ve görev dağılımına uygun hareket edilmiştir.` +
        (i < KULUP_AYLAR.length - 1 ? ` ${KULUP_AYLAR[i + 1].ay} ayında yapılacak çalışmalar için hazırlık yapılmıştır.` : ' Yıllık çalışmalar sene sonu toplantısında değerlendirilmiştir.'),
      { justify: true }
    ) +
    section('4. KARŞILAŞILAN GÜÇLÜKLER VE ÖNERİLER') +
    p(GUCLUK, { justify: true }) +
    sign.kulup(),
}));
const KULUP = [KULUP_PLAN, KULUP_ILK, KULUP_ORTA, KULUP_SONU, KULUP_DONEM, KULUP_RAPOR, KULUP_TUZUK, KULUP_IZIN, ...KULUP_AYLIK];

// ---------- Sınıf rehberlik planı ----------
const REHBERLIK = {
  id: 'rehberlik-yillik-plan',
  gun: '10-02',
  kategori: 'sinif',
  ad: 'Sınıf rehberlik yıllık çalışma planı',
  donem: 'Eğitim-öğretim yılı',
  body: () =>
    head('{egitim_yili} EĞİTİM-ÖĞRETİM YILI SINIF REHBERLİK YILLIK ÇALIŞMA PLANI') +
    infoTable([
      ['Sınıf / Şube', '{sinif}'],
      ['Sınıf rehber öğretmeni', '{danisman}'],
    ]) +
    p('') +
    p('Plan, okul rehberlik ve psikolojik danışma servisinin yıllık programı ile Bakanlığın sınıf rehberlik programı esas alınarak hazırlanmıştır; etkinlikler akademik, kariyer ve sosyal-duygusal gelişim alanlarını kapsar. Programdaki kazanım ve etkinliklere göre güncelleyiniz.', { justify: true, i: true }) +
    table(
      [
        ['AY', 'ALAN', 'ETKİNLİK / KONU', 'AÇIKLAMA'],
        ['EYLÜL', 'Sosyal-duygusal', 'Tanışma ve okula uyum; sınıf kurallarının birlikte belirlenmesi; öğrenci bilgi formlarının doldurulması.', 'Oryantasyon'],
        ['EKİM', 'Akademik', 'Etkili ve verimli ders çalışma yöntemleri; zaman planlaması.', ''],
        ['EKİM', 'Sosyal-duygusal', 'Akran zorbalığını tanıma ve önleme; yardım isteme yolları.', 'Rehberlik servisiyle'],
        ['KASIM', 'Sosyal-duygusal', 'Duyguları tanıma ve ifade etme; öfke yönetimi.', ''],
        ['ARALIK', 'Akademik', 'Sınav kaygısıyla başa çıkma; hedef belirleme.', ''],
        ['ARALIK', 'Sosyal-duygusal', 'Teknoloji ve ekran kullanımı; güvenli internet, dijital bağımlılık.', ''],
        ['OCAK', 'Akademik', 'Birinci dönemin değerlendirilmesi; güçlü yönler ve gelişim alanları.', 'Dönem sonu'],
        ['ŞUBAT', 'Kariyer', 'İlgi, yetenek ve değerleri tanıma.', ''],
        ['MART', 'Kariyer', 'Meslekleri tanıma; meslek tanıtım etkinlikleri.', 'Veli/meslek temsilcisi daveti'],
        ['MART', 'Sosyal-duygusal', 'Etkili iletişim, empati ve iş birliği.', ''],
        ['NİSAN', 'Kariyer', 'Ortaöğretim kurumları ve LGS sistemi hakkında bilgilendirme (8. sınıf).', ''],
        ['NİSAN', 'Sosyal-duygusal', 'Sağlıklı yaşam; beslenme, uyku ve hareket.', ''],
        ['MAYIS', 'Akademik', 'Yaz tatilini verimli değerlendirme; okuma alışkanlığı.', ''],
        ['HAZİRAN', 'Değerlendirme', 'Yıl sonu sınıf rehberlik çalışmalarının değerlendirilmesi; yıl sonu raporu.', 'Rapor rehberlik servisine'],
      ],
      [1200, 1700, 4800, 1900]
    ) +
    sign.rehber(),
};

// ---------- BEP (bireyselleştirilmiş eğitim programı) ----------
// Kaynaştırma / bütünleştirme yoluyla eğitim alan öğrenci için; indirirken sınıf + ÖĞRENCİ seçilir. Uzun dönemli amaçlar
// (UDA) o sınıf düzeyinin yıllık planındaki üniteler, kısa dönemli amaçlar (KDA) ünitenin öğrenme çıktılarıdır: öğretmen
// öğrencinin performansına göre siler / sadeleştirir. Dayanak: MEB Özel Eğitim Hizmetleri Yönetmeliği (BEP geliştirme birimi).
const BEP_DAYANAK = 'Millî Eğitim Bakanlığı Özel Eğitim Hizmetleri Yönetmeliği';
const BEP_OGRENCI = (extra = []) =>
  infoTable([
    ['Öğrencinin adı soyadı', '{ogrenci_ad}'],
    ['Okul numarası', '{ogrenci_no}'],
    ['Sınıf / şube', '{sinif}'],
    ['Ders', '{brans}'],
    ['Ders öğretmeni', '{ogretmen}'],
    ['Sınıf rehber öğretmeni', '{danisman}'],
    ...extra,
  ]);
// BEP geliştirme birimi imzaları (birim başkanı: müdür yardımcısı)
const bepBirim = () =>
  p('') +
  section('BEP GELİŞTİRME BİRİMİ') +
  table(
    [
      ['Görevi', 'Adı Soyadı', 'İmza'],
      ['Birim başkanı (Müdür Yardımcısı)', '{mudur_yrd}', ''],
      ['Rehber öğretmen', '{rehber_ogretmen}', ''],
      ['Sınıf rehber öğretmeni', '{danisman}', ''],
      ['{brans} öğretmeni', '{ogretmen}', ''],
      ['Ders öğretmeni', '', ''],
      ['Ders öğretmeni', '', ''],
      ['Özel eğitim öğretmeni', '', ''],
      ['Öğrencinin velisi', '', ''],
      ['Öğrenci', '{ogrenci_ad}', ''],
    ],
    [3600, 4000, 2000]
  ) +
  p('') +
  table([['UYGUNDUR'], ['{tarih}\n{mudur}\nOkul Müdürü']], [9600]);

const BEP_TUTANAK = {
  id: 'bep-birim-tutanak',
  kategori: 'bep',
  ad: 'BEP geliştirme birimi toplantı tutanağı',
  kisa: 'BEP Geliştirme Birimi Toplantı Tutanağı',
  donem: 'Eylül · BEP hazırlanmadan önce',
  gun: '09-25',
  body: () =>
    meeting({
      title: '{egitim_yili} EĞİTİM-ÖĞRETİM YILI BEP GELİŞTİRME BİRİMİ TOPLANTI TUTANAĞI',
      info: MEETING_INFO([['Öğrencinin adı soyadı', '{ogrenci_ad}'], ['Okul numarası', '{ogrenci_no}'], ['Sınıf / şube', '{sinif}']]),
      imza: 'bep',
      items: [
        ['Açılış ve birimin oluşturulması', `Toplantı birim başkanı müdür yardımcısının açılış konuşmasıyla başladı. ${BEP_DAYANAK} gereğince öğrenci için BEP geliştirme biriminin; müdür yardımcısı, rehber öğretmen, sınıf rehber öğretmeni, ders öğretmenleri, özel eğitim öğretmeni (varsa), öğrencinin velisi ve uygun durumda öğrencinin katılımıyla oluşturulduğu belirtildi.`],
        ['Öğrenciye ait raporların incelenmesi', 'Öğrencinin rehberlik ve araştırma merkezince düzenlenen özel eğitim değerlendirme kurulu raporu, eğitsel değerlendirme sonuçları ve önceki yıllara ait BEP ile gelişim bilgileri incelendi.'],
        ['Eğitim performansının belirlenmesi', 'Ders öğretmenleri, öğrencinin derslerdeki mevcut performansını kaba değerlendirme ve gözlemlerle belirledi; öğrencinin güçlü yönleri ve desteklenmesi gereken alanları kayda geçirildi.'],
        ['Uzun ve kısa dönemli amaçların belirlenmesi', 'Her ders için öğretim programının öğrenme çıktıları, öğrencinin performansı dikkate alınarak uzun dönemli amaçlar (ünite) ve kısa dönemli amaçlar (öğrenme çıktıları) olarak belirlendi; amaçların süreleri yıllık plana göre planlandı.'],
        ['Öğretim yöntemleri, materyaller ve uyarlamalar', 'Öğrencinin öğrenme özelliklerine uygun öğretim yöntem ve teknikleri, materyaller ile sınıf içi düzenlemeler (oturma yeri, ek süre, görsel destek, yönergelerin sadeleştirilmesi gibi) belirlendi.'],
        ['Ölçme ve değerlendirme uyarlamaları', 'Öğrencinin başarısının BEP’te yer alan amaçlara göre değerlendirileceği; sınavlarda gerekli uyarlamaların (ek süre, ayrı ortam, okuyucu-yazıcı desteği, büyük punto, soru sayısının düzenlenmesi gibi) yapılacağı görüşüldü.'],
        ['Destek eğitim hizmetleri ve veli iş birliği', 'Öğrencinin destek eğitim odası hizmetlerinden yararlanma ihtiyacı değerlendirildi. Velinin BEP sürecine katılımı, evde yapılabilecek destekleyici çalışmalar ve düzenli bilgilendirme konuşuldu.'],
        ['Dilek ve temenniler', 'Öğrencinin gelişimine katkı dileğiyle toplantı sona erdi.'],
      ],
      kararlar: [
        'Öğrencinin her ders için BEP’i, belirlenen uzun ve kısa dönemli amaçlarla hazırlanacaktır.',
        'Öğretim ve ölçme-değerlendirme uyarlamaları bütün ders öğretmenlerince uygulanacaktır.',
        'Öğrencinin başarısı BEP’teki amaçlara göre değerlendirilecek, sınavlarda gerekli uyarlamalar yapılacaktır.',
        'Veli BEP süreci hakkında bilgilendirilecek, görüşü alınacaktır.',
        'BEP geliştirme birimi dönem sonunda toplanarak öğrencinin ilerlemesini değerlendirecek, gerekirse BEP’i güncelleyecektir.',
      ],
    }),
};

const BEP_PERFORMANS = {
  id: 'bep-performans',
  kategori: 'bep',
  ad: 'BEP eğitsel performans belirleme formu',
  kisa: 'Eğitsel Performans Belirleme Formu',
  donem: 'BEP’ten önce · kaba değerlendirme',
  gun: '09-30',
  body: () =>
    head('{egitim_yili} EĞİTİM-ÖĞRETİM YILI {brans} DERSİ EĞİTSEL PERFORMANS BELİRLEME FORMU') +
    BEP_OGRENCI([['Değerlendirme tarihi', '{tarih}']]) +
    p('') +
    p('Öğrencinin dersteki mevcut performansı, sınıf düzeyinin öğrenme çıktılarına göre gözlem, çalışma kâğıdı ve sözlü sorularla belirlenir. Her ünite için uygun sütun işaretlenir; BEP’in uzun ve kısa dönemli amaçları bu forma göre seçilir.', { justify: true, i: true }) +
    table([['ÜNİTE', 'ÖĞRENME ÇIKTILARI', 'Yapabiliyor', 'Kısmen', 'Yapamıyor'], dongu('uniteler', ['{unite}', '{ciktilar}', '', '', ''])], [2000, 4900, 900, 900, 900], { size: 9 }) +
    p('') +
    section('GÜÇLÜ YÖNLERİ') +
    p('……') +
    section('DESTEKLENMESİ GEREKEN YÖNLERİ') +
    p('……') +
    p('') +
    table([['Ders Öğretmeni', 'Sınıf Rehber Öğretmeni'], ['{ogretmen}\n{brans} Öğretmeni', '{danisman}']], [4800, 4800]),
};

const BEP_FORMU = {
  id: 'bep-formu',
  kategori: 'bep',
  ad: 'Bireyselleştirilmiş eğitim programı (BEP)',
  kisa: 'BEP Formu (ders planı)',
  donem: 'Ekim başı · yıl boyunca uygulanır',
  gun: '10-09',
  yatay: true,
  body: () =>
    head('{egitim_yili} EĞİTİM-ÖĞRETİM YILI {brans} DERSİ BİREYSELLEŞTİRİLMİŞ EĞİTİM PROGRAMI (BEP)') +
    table(
      [
        ['Öğrencinin adı soyadı', '{ogrenci_ad}', 'Okul numarası', '{ogrenci_no}'],
        ['Sınıf / şube', '{sinif}', 'Ders', '{brans}'],
        ['Ders öğretmeni', '{ogretmen}', 'Sınıf rehber öğretmeni', '{danisman}'],
        ['BEP başlangıç', '{gun:@ders_basi}', 'BEP bitiş', '{gun:@ders_sonu}'],
        ['Özel eğitim değerlendirme kurulu raporu', '……', 'Eğitsel tanı', '……'],
      ],
      [3300, 3900, 3300, 3900],
      { head: false }
    ) +
    p('') +
    section('EĞİTİM PERFORMANSI') +
    p('Eğitsel performans belirleme formuna göre öğrencinin derste yapabildikleri ve desteklenmesi gereken alanlar: ……', { justify: true }) +
    section('UZUN VE KISA DÖNEMLİ AMAÇLAR') +
    p('Uzun dönemli amaçlar sınıf düzeyinin yıllık planındaki ünitelerden, kısa dönemli amaçlar o ünitenin öğrenme çıktılarından alınmıştır. Öğrencinin performansına uymayan amaçları siliniz ya da sadeleştiriniz.', { justify: true, i: true, size: 9 }) +
    table(
      [
        ['UZUN DÖNEMLİ AMAÇ (ÜNİTE)', 'KISA DÖNEMLİ AMAÇLAR (ÖĞRENME ÇIKTILARI)', 'BAŞLAMA – BİTİŞ', 'YÖNTEM VE TEKNİKLER', 'MATERYALLER', 'DEĞERLENDİRME'],
        dongu('uniteler', [
          '{sira}. {unite}',
          '{ciktilar}',
          '{baslangic}\n{bitis}\n({sure})',
          'Doğrudan öğretim, model olma, ipucuyla öğretim, tekrar',
          'Ders kitabı, görsel kartlar, somut materyal, çalışma kâğıdı',
          'Gözlem, kontrol listesi\n☐ Gerçekleşti\n☐ Kısmen\n☐ Gerçekleşmedi',
        ]),
      ],
      [2000, 5600, 1500, 1900, 1900, 1500],
      { size: 9 }
    ) +
    p('') +
    section('ÖĞRETİMSEL UYARLAMALAR') +
    numbered([
      'Öğrenci öğretmene yakın, dikkat dağıtıcı uyaranlardan uzak bir yere oturtulur.',
      'Yönergeler kısa, açık ve adım adım verilir; gerektiğinde tekrarlanır ve görsel destek kullanılır.',
      'Etkinliklerde ek süre verilir; iş yükü öğrencinin performansına göre azaltılır.',
      'Başarılı davranışlar anında pekiştirilir; akran desteği ve iş birliğine dayalı çalışmalar kullanılır.',
    ]) +
    section('ÖLÇME VE DEĞERLENDİRME UYARLAMALARI') +
    numbered([
      'Öğrencinin başarısı bu BEP’teki kısa dönemli amaçlara göre değerlendirilir.',
      'Sınavlarda ek süre, büyük punto, soruların okunması, ayrı ortam gibi uyarlamalar gerektiğinde yapılır (sınav uyarlama formu).',
      'Süreç değerlendirmesinde gözlem ve kontrol listesi kullanılır.',
    ]) +
    sign.bep(),
};

const BEP_VELI = {
  id: 'bep-veli-bilgilendirme',
  kategori: 'bep',
  ad: 'BEP veli bilgilendirme ve görüş formu',
  kisa: 'Veli Bilgilendirme ve Görüş Formu',
  donem: 'BEP hazırlanınca',
  gun: '10-09',
  body: () =>
    head('BEP VELİ BİLGİLENDİRME VE GÖRÜŞ FORMU') +
    BEP_OGRENCI([['Tarih', '{tarih}']]) +
    p('') +
    p('Sayın Veli,', { b: true }) +
    p(`Velisi bulunduğunuz öğrencimiz için ${BEP_DAYANAK} gereğince bireyselleştirilmiş eğitim programı (BEP) hazırlanmıştır. BEP; öğrencimizin mevcut performansına göre belirlenen uzun ve kısa dönemli amaçları, uygulanacak öğretim yöntemlerini, sınıf içi düzenlemeleri ve ölçme-değerlendirme uyarlamalarını içerir. Öğrencimizin başarısı BEP’teki amaçlara göre değerlendirilecektir.`, { justify: true }) +
    p('BEP geliştirme biriminin üyesi olarak programın hazırlanması ve uygulanması sürecine katılabilir, görüş ve önerilerinizi bildirebilirsiniz. Evde yapacağınız destekleyici çalışmalar ve öğretmenlerle düzenli iletişim, öğrencimizin gelişimine önemli katkı sağlayacaktır.', { justify: true }) +
    section('VELİNİN GÖRÜŞ VE ÖNERİLERİ') +
    p('……') +
    p('') +
    p('Öğrencim için hazırlanan BEP hakkında bilgilendirildim; bir örneğini aldım / inceledim.', { i: true }) +
    table([['Velinin adı soyadı', 'Yakınlığı', 'Telefonu', 'İmza'], ['', '', '', '']], [3200, 1800, 2400, 2200]) +
    p('') +
    table([['Ders Öğretmeni', 'Sınıf Rehber Öğretmeni'], ['{ogretmen}\n{brans} Öğretmeni', '{danisman}']], [4800, 4800]),
};

const BEP_SINAV = {
  id: 'bep-sinav-uyarlama',
  kategori: 'bep',
  ad: 'BEP sınav uyarlama formu',
  kisa: 'Sınav Uyarlama Formu',
  donem: 'Her yazılı sınavdan önce',
  gun: null,
  body: () =>
    head('{egitim_yili} EĞİTİM-ÖĞRETİM YILI ÖZEL EĞİTİM GEREKSİNİMİ OLAN ÖĞRENCİ SINAV UYARLAMA FORMU') +
    BEP_OGRENCI([['Sınav', '{donem} …… yazılı sınavı'], ['Sınav tarihi', '{tarih}']]) +
    p('') +
    p('Öğrencinin sınavı BEP’te yer alan kısa dönemli amaçlara göre hazırlanır. Uygulanacak uyarlamaları işaretleyiniz.', { justify: true, i: true }) +
    table(
      [
        ['UYARLAMA', 'UYGULANACAK'],
        ...[
          'Sorular BEP’teki kısa dönemli amaçlara göre hazırlandı',
          'Soru sayısı azaltıldı / sorular sadeleştirildi',
          'Ek süre verildi (…… dakika)',
          'Sınav ayrı ve sessiz bir ortamda yapıldı',
          'Sorular öğrenciye okundu (okuyucu desteği)',
          'Cevaplar öğrencinin söylediği şekilde yazıldı (yazıcı desteği)',
          'Büyük punto / görsel destekli soru kâğıdı kullanıldı',
          'Sözlü ya da uygulamalı sınav yapıldı',
          'Diğer: ……',
        ].map((x) => [x, '☐']),
      ],
      [7800, 1800]
    ) +
    p('') +
    section('SINAV SONUCU VE DEĞERLENDİRME') +
    p('Puanı: …… · Açıklama: ……') +
    p('') +
    table([['Ders Öğretmeni', 'Müdür Yardımcısı'], ['{ogretmen}\n{brans} Öğretmeni', '{mudur_yrd}']], [4800, 4800]),
};

const BEP_DEGERLENDIRME = {
  id: 'bep-donem-degerlendirme',
  kategori: 'bep',
  ad: 'BEP dönem sonu değerlendirme raporu',
  kisa: 'Dönem Sonu Değerlendirme Raporu',
  donem: 'Her dönemin son haftası',
  gun: ['@donem1_sonu-5', '@ders_sonu-5'],
  body: () =>
    head('{egitim_yili} EĞİTİM-ÖĞRETİM YILI {brans} DERSİ BEP {donem|buyuk} SONU DEĞERLENDİRME RAPORU') +
    BEP_OGRENCI([['Değerlendirme tarihi', '{tarih}']]) +
    p('') +
    section('UZUN DÖNEMLİ AMAÇLARIN GERÇEKLEŞME DURUMU') +
    table([['UZUN DÖNEMLİ AMAÇ (ÜNİTE)', 'SÜRE', 'Gerçekleşti', 'Kısmen', 'Gerçekleşmedi', 'AÇIKLAMA'], dongu('uniteler', ['{sira}. {unite}', '{baslangic}–{bitis}', '', '', '', ''])], [3400, 2000, 1000, 900, 1100, 1200], { size: 9 }) +
    p('') +
    section('GENEL DEĞERLENDİRME') +
    p('Öğrenci dönem boyunca BEP’te yer alan amaçlar doğrultusunda desteklenmiş; uygulanan öğretim ve ölçme-değerlendirme uyarlamalarıyla derse katılımı sağlanmıştır. Gerçekleşmeyen amaçlar için ek çalışma yapılması planlanmaktadır.', { justify: true }) +
    section('ÖNERİLER (BEP GÜNCELLEMESİ)') +
    p('……') +
    sign.bep(),
};
const BEP = [BEP_TUTANAK, BEP_PERFORMANS, BEP_FORMU, BEP_VELI, BEP_SINAV, BEP_DEGERLENDIRME];

// ---------- Eğitim-öğretim yılı çalışma takvimi ----------
// Satırlar uygulamadaki takvimden (src/data/egitimTakvimi.js / yayındaki takvim.json) gelir: yeni yıl = yalnız takvim verisi.
const TAKVIM_EVRAK = {
  id: 'egitim-takvimi',
  kategori: 'takvim',
  ad: 'Eğitim-öğretim yılı çalışma takvimi',
  kisa: 'Çalışma Takvimi',
  donem: 'Dönem, tatil, mesleki çalışma, toplantı ve belirli günler',
  gun: null,
  body: () =>
    head('{egitim_yili} EĞİTİM-ÖĞRETİM YILI ÇALIŞMA TAKVİMİ') +
    table([['TARİH', 'TÜR', 'FAALİYET'], dongu('takvim', ['{tarih}', '{tur}', '{olay}'])], [2600, 1900, 5100]) +
    p('') +
    p('{takvim_notu}', { i: true, size: 9, justify: true }) +
    p('Kaynak: {takvim_kaynagi}', { i: true, size: 9 }),
};

// ---------- Yıllık plan (TEK şablon) ----------
// Haftalar uygulamadan gelir: öğretmenin o düzeye yüklediği plan, yoksa MEB çerçeve planı (PlanContext → planForGrade).
const YILLIK_PLAN = {
  id: 'yillik-plan',
  kategori: 'sok',
  ad: 'Yıllık plan',
  donem: 'Ders yılı başı',
  gun: '@ders_basi',
  yatay: true,
  body: () =>
    head('{egitim_yili} EĞİTİM-ÖĞRETİM YILI {brans} DERSİ {duzey}. SINIF YILLIK PLANI') +
    p('Bu plan {plan_kaynagi} esas alınarak hazırlanmıştır. Okulun ders yılı takvimine göre gerekli düzenlemeleri yapınız.', { justify: true, i: true }) +
    table([['AY', 'HAFTA', 'SAAT', 'ÜNİTE / TEMA', 'ÖĞRENME ÇIKTILARI'], dongu('haftalar', ['{ay}', '{hafta}\n{tarihler}', '{saat}', '{unite}', '{ciktilar}'])], [900, 1200, 600, 2600, 9100], { size: 9 }) +
    p('') +
    table(
      [
        ['Ders Öğretmeni', 'UYGUNDUR'],
        ['{ogretmen}\n{brans} Öğretmeni', '{tarih}\n{mudur}\nOkul Müdürü'],
      ],
      [7200, 7200]
    ),
};

// ---------- docx paketleme ----------
const CT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="22"/><w:lang w:val="tr-TR"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>`;
const doc = (body, landscape) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr>${
  landscape ? '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>' : '<w:pgSz w:w="11906" w:h="16838"/>'
}<w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;

// Üretilen şablonlar: [{ meta: { id, kategori, ad, kisa?, grup?, donem, gun }, bytes: Buffer }]
export async function uret() {
  const out = [];
  for (const s of [TAKVIM_EVRAK, ZUMRE_BASI, ZUMRE_ORTA, ZUMRE_SONU, ILCE_ZUMRE_BASI, ILCE_ZUMRE_SONU, SOK_BASI, SOK_SONU, YILLIK_PLAN, VELI_1, VELI_2, REHBERLIK, ...KULUP, ...BEP]) {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', CT);
    zip.file('_rels/.rels', RELS);
    zip.file('word/_rels/document.xml.rels', DOC_RELS);
    zip.file('word/styles.xml', STYLES);
    zip.file('word/document.xml', doc(s.body(), !!s.yatay));
    const { body, yatay, ...meta } = s;
    out.push({ meta: { ...meta, gun: s.gun ?? null }, bytes: await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }) });
  }
  return out;
}
