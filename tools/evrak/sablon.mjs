// Evrak şablonlarını (Word .docx) TAM İÇERİKLE üretir → tahta-site/evrak/ (yayın: github.com/sezginakts/mamoste-tahta).
// Toplantı tutanakları: gündem, gündem maddelerinin görüşülmesi, alınan kararlar, imzalar hazır; öğretmen yalnız
// ad / okul / tarih gibi bilgileri değiştirir (uygulama indirirken yer tutucuları kendisi doldurur, teacher/docFill.js).
// Yıllık planlar: uygulamadaki MEB 2026-2027 çerçeve planlarından (src/data/yearPlans) branş ve sınıf başına.
// Yer tutucular: {OGRETMEN} {OKUL} {IL} {ILCE} {MUDUR} {BRANS} {TARIH} {EGITIM_YILI}
//
// Mevzuat dayanakları (Ekim 2026 itibarıyla): MEB Okul Öncesi Eğitim ve İlköğretim Kurumları Yönetmeliği (son değişiklik
// RG 28.07.2026/33323: en az bir proje, teslim etmeyene sıfır; 5. sınıftan kademeli Gelişim Raporu; ölçmede öğrenme
// çıktıları esas; devamsızlığın 5-10-15. günde veliye bildirimi; bilişim araçlarının kurala aykırı kullanımı disiplin fiili),
// MEB Ölçme ve Değerlendirme Yönetmeliği (RG 9.9.2023/32304: dönemde iki yazılı; haftalık 6+ saatlik derste il zümresi
// kararıyla üçüncü), Türkiye Yüzyılı Maarif Modeli (2026-2027: ortaokul 5, 6, 7. sınıflar; 8. sınıf mevcut program).
// Mevzuat değişince bu metinleri güncelle ve yeniden üret: node tools/evrak/sablon.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const JSZip = require(path.join(ROOT, 'node_modules/jszip'));
const OUT = path.join(ROOT, 'tahta-site/evrak');
const BRANCH_NAMES = {
  ingilizce: 'İngilizce',
  'teknoloji-tasarim': 'Teknoloji ve Tasarım',
  turkce: 'Türkçe',
  matematik: 'Matematik',
  fen: 'Fen Bilimleri',
  sosyal: 'Sosyal Bilgiler',
  inkilap: 'T.C. İnkılap Tarihi ve Atatürkçülük',
  din: 'Din Kültürü ve Ahlak Bilgisi',
  gorsel: 'Görsel Sanatlar',
  muzik: 'Müzik',
  beden: 'Beden Eğitimi ve Spor',
  bilisim: 'Bilişim Teknolojileri ve Yazılım',
};

// ---------- docx yardımcıları ----------
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const run = (t, { b, size, i } = {}) =>
  `<w:r><w:rPr>${b ? '<w:b/>' : ''}${i ? '<w:i/>' : ''}${size ? `<w:sz w:val="${size * 2}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
const p = (t, o = {}) =>
  `<w:p><w:pPr>${o.center ? '<w:jc w:val="center"/>' : o.justify ? '<w:jc w:val="both"/>' : ''}<w:spacing w:after="${o.after ?? 100}"/>${o.indent ? `<w:ind w:left="${o.indent}" w:hanging="${o.hanging || 0}"/>` : ''}</w:pPr>${t ? run(t, o) : ''}</w:p>`;
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
  p('{ILCE} KAYMAKAMLIĞI', { center: true, b: true, after: 0 }) +
  p('{OKUL} MÜDÜRLÜĞÜ', { center: true, b: true, after: 240 }) +
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
        ['{OGRETMEN}', '{BRANS} Öğretmeni', ''],
        ['', '{BRANS} Öğretmeni', ''],
        ['', '{BRANS} Öğretmeni', ''],
        ['', '{BRANS} Öğretmeni', ''],
      ],
      [3800, 3800, 2000]
    ) +
    p('') +
    table(
      [
        ['Zümre Başkanı', 'UYGUNDUR'],
        ['……\n{BRANS} Öğretmeni', '{TARIH}\n{MUDUR}\nOkul Müdürü'],
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
        ['……', '{TARIH}\n{MUDUR}\nOkul Müdürü'],
      ],
      [4800, 4800]
    ),
  rehber: (who = 'Sınıf Rehber Öğretmeni') =>
    p('') +
    table(
      [
        [who, 'UYGUNDUR'],
        ['{OGRETMEN}', '{TARIH}\n{MUDUR}\nOkul Müdürü'],
      ],
      [4800, 4800]
    ),
  kulup: () =>
    p('') +
    table(
      [
        ['Kulüp Başkanı', 'Danışman Öğretmen', 'UYGUNDUR'],
        ['……', '{OGRETMEN}', '{TARIH}\n{MUDUR}\nOkul Müdürü'],
      ],
      [3200, 3200, 3200]
    ),
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

const MEETING_INFO = (extra = []) => [['Toplantı tarihi', '{TARIH}'], ['Toplantı saati', '……'], ['Toplantı yeri', '……'], ...extra];
const PROGRAM =
  'Türkiye Yüzyılı Maarif Modeli öğretim programları 2026-2027 eğitim-öğretim yılında ortaokul 5, 6 ve 7. sınıflarda uygulanmakta, 8. sınıflarda ise mevcut öğretim programı sürdürülmektedir.';

// ---------- Zümre ----------
const ZUMRE_BASI = {
  id: 'zumre-yil-basi',
  kategori: 'zumre',
  ad: 'Zümre öğretmenler kurulu tutanağı — yıl başı',
  donem: 'Eylül · eğitim-öğretim yılı başı',
  body: () =>
    meeting({
      title: '{EGITIM_YILI} EĞİTİM-ÖĞRETİM YILI {BRANS} ZÜMRE ÖĞRETMENLER KURULU YIL BAŞI TOPLANTI TUTANAĞI',
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
  kategori: 'zumre',
  ad: 'Zümre öğretmenler kurulu tutanağı — 2. dönem başı',
  donem: 'Şubat · ikinci dönem başı',
  body: () =>
    meeting({
      title: '{EGITIM_YILI} EĞİTİM-ÖĞRETİM YILI {BRANS} ZÜMRE ÖĞRETMENLER KURULU İKİNCİ DÖNEM BAŞI TOPLANTI TUTANAĞI',
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
  kategori: 'zumre',
  ad: 'Zümre öğretmenler kurulu tutanağı — yıl sonu',
  donem: 'Haziran · eğitim-öğretim yılı sonu',
  body: () =>
    meeting({
      title: '{EGITIM_YILI} EĞİTİM-ÖĞRETİM YILI {BRANS} ZÜMRE ÖĞRETMENLER KURULU YIL SONU TOPLANTI TUTANAĞI',
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

// ---------- ŞÖK ----------
const SOK_INFO = MEETING_INFO([['Sınıf / Şube', '……'], ['Sınıf rehber öğretmeni', '……']]);
const SOK_BASI = {
  id: 'sok-donem-basi',
  kategori: 'sok',
  ad: 'Şube öğretmenler kurulu (ŞÖK) tutanağı — dönem başı',
  donem: 'Dönem başı',
  body: () =>
    meeting({
      title: '{EGITIM_YILI} EĞİTİM-ÖĞRETİM YILI ŞUBE ÖĞRETMENLER KURULU TOPLANTI TUTANAĞI',
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
  kategori: 'sok',
  ad: 'Şube öğretmenler kurulu (ŞÖK) tutanağı — dönem sonu',
  donem: 'Dönem sonu (teşekkür-takdir)',
  body: () =>
    meeting({
      title: '{EGITIM_YILI} EĞİTİM-ÖĞRETİM YILI ŞUBE ÖĞRETMENLER KURULU DÖNEM SONU TOPLANTI TUTANAĞI',
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
const VELI_INFO = MEETING_INFO([['Sınıf / Şube', '……'], ['Sınıf rehber öğretmeni', '{OGRETMEN}'], ['Katılan veli sayısı', '……']]);
const veliSign = () =>
  p('') +
  section('KATILAN VELİLER') +
  table([['Öğrencinin adı soyadı', 'Velinin adı soyadı', 'İmza'], ...Array.from({ length: 15 }, () => ['', '', ''])], [3700, 3700, 2200]) +
  sign.rehber();
const VELI_1 = {
  id: 'veli-1-donem',
  kategori: 'veli',
  ad: 'Veli toplantısı tutanağı — 1. dönem',
  donem: 'Birinci dönem',
  body: () =>
    meeting({
      title: '{EGITIM_YILI} EĞİTİM-ÖĞRETİM YILI BİRİNCİ DÖNEM VELİ TOPLANTISI TUTANAĞI',
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
  kategori: 'veli',
  ad: 'Veli toplantısı tutanağı — 2. dönem',
  donem: 'İkinci dönem',
  body: () =>
    meeting({
      title: '{EGITIM_YILI} EĞİTİM-ÖĞRETİM YILI İKİNCİ DÖNEM VELİ TOPLANTISI TUTANAĞI',
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
const MONTHS = ['EYLÜL', 'EKİM', 'KASIM', 'ARALIK', 'OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN'];
const KULUP_PLAN = {
  id: 'kulup-yillik-plan',
  kategori: 'kulup',
  ad: 'Kulüp yıllık çalışma planı',
  donem: 'Eğitim-öğretim yılı',
  body: () =>
    head('{EGITIM_YILI} EĞİTİM-ÖĞRETİM YILI …… KULÜBÜ YILLIK ÇALIŞMA PLANI') +
    infoTable([
      ['Kulüp adı', '……'],
      ['Danışman öğretmen', '{OGRETMEN}'],
      ['Kulüp başkanı', '……'],
      ['Üye sayısı', '……'],
    ]) +
    p('') +
    p('Plan, Millî Eğitim Bakanlığı Eğitim Kurumları Sosyal Etkinlikler Yönetmeliği esas alınarak hazırlanmıştır. Kulüp çalışmaları öğrencilerin ilgi ve yeteneklerini geliştirmeyi, iş birliği, sorumluluk ve gönüllülük bilinci kazandırmayı amaçlar.', { justify: true, i: true }) +
    table(
      [
        ['AY', 'YAPILACAK ÇALIŞMALAR', 'AÇIKLAMA'],
        ['EYLÜL', 'Kulübün tanıtılması, üyelerin belirlenmesi. İlk genel kurul toplantısı; kulüp başkanı ve yönetim kurulunun seçilmesi.', 'Üye listesi e-Okul’a işlenir.'],
        ['EKİM', 'Yıllık çalışma planının üyelerle birlikte hazırlanması. 29 Ekim Cumhuriyet Bayramı etkinliklerine katılım.', 'Görev dağılımı yapılır.'],
        ['KASIM', '10 Kasım Atatürk’ü Anma Haftası etkinliklerine katkı. 24 Kasım Öğretmenler Günü için çalışma.', 'Pano / sunum hazırlanır.'],
        ['ARALIK', 'Kulüp alanına yönelik araştırma ve sunum çalışmaları. Okul içi duyuru ve pano düzenlenmesi.', ''],
        ['OCAK', 'Birinci dönem çalışmalarının değerlendirilmesi; dönem sonu raporunun hazırlanması.', 'Dönem değerlendirme toplantısı.'],
        ['ŞUBAT', 'İkinci dönem çalışma takviminin belirlenmesi. Kulüp alanına yönelik proje veya etkinlik hazırlığı.', ''],
        ['MART', '12 Mart İstiklal Marşı’nın Kabulü ve 18 Mart Çanakkale Zaferi etkinliklerine katkı.', ''],
        ['NİSAN', '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı etkinliklerine katılım. Okul dışı gezi / gözlem etkinliği (izinler alınarak).', ''],
        ['MAYIS', '19 Mayıs Atatürk’ü Anma, Gençlik ve Spor Bayramı etkinliklerine katılım. Yıl sonu sergi / gösteri hazırlığı.', ''],
        ['HAZİRAN', 'Yıl sonu genel kurul toplantısı; yıllık çalışmaların değerlendirilmesi ve faaliyet raporunun hazırlanması.', 'Rapor okul yönetimine verilir.'],
      ],
      [1300, 5600, 2700]
    ) +
    sign.kulup(),
};

const KULUP_ILK = {
  id: 'kulup-ilk-toplanti',
  kategori: 'kulup',
  ad: 'Kulüp ilk genel kurul toplantı tutanağı',
  donem: 'Eylül · yıl başı',
  body: () =>
    meeting({
      title: '{EGITIM_YILI} EĞİTİM-ÖĞRETİM YILI …… KULÜBÜ İLK GENEL KURUL TOPLANTI TUTANAĞI',
      info: MEETING_INFO([['Danışman öğretmen', '{OGRETMEN}']]),
      imza: 'kulup',
      items: [
        ['Açılış ve yoklama', 'Toplantı danışman öğretmenin açılış konuşmasıyla başladı, kulüp üyelerinin yoklaması yapıldı.'],
        ['Kulübün amacı ve çalışma alanının tanıtılması', 'Danışman öğretmen kulübün amacını, çalışma alanını ve üyelerden beklenen sorumlulukları anlattı. Sosyal etkinliklerin öğrencilerin ilgi ve yeteneklerini geliştirmeye, iş birliği ve gönüllülük bilinci kazandırmaya yönelik olduğu belirtildi.'],
        ['Kulüp başkanı ve yönetim kurulunun seçimi', 'Üyeler arasından yapılan seçimle kulüp başkanı …… , başkan yardımcısı …… , sekreter …… olarak belirlendi.'],
        ['Yıllık çalışma planının hazırlanması', 'Üyelerin önerileri alınarak aylara göre yapılacak etkinlikler belirlendi; belirli gün ve haftalara katkı sağlanmasına karar verildi.'],
        ['Görev dağılımı', 'Etkinliklerde görev alacak öğrenciler belirlendi ve görevler paylaştırıldı.'],
        ['Dilek ve temenniler', 'Yeni dönemin verimli geçmesi dileğiyle toplantı sona erdi.'],
      ],
      kararlar: [
        'Kulüp başkanı ve yönetim kurulu seçilmiştir.',
        'Yıllık çalışma planı üyelerin önerileri doğrultusunda hazırlanacak ve okul yönetimine sunulacaktır.',
        'Kulüp ayda en az bir kez toplanarak çalışmaları değerlendirecektir.',
        'Etkinliklerde görev dağılımına uygun hareket edilecektir.',
      ],
    }),
};

const KULUP_RAPOR = {
  id: 'kulup-yil-sonu-rapor',
  kategori: 'kulup',
  ad: 'Kulüp yıl sonu faaliyet raporu',
  donem: 'Haziran · yıl sonu',
  body: () =>
    head('{EGITIM_YILI} EĞİTİM-ÖĞRETİM YILI …… KULÜBÜ YIL SONU FAALİYET RAPORU') +
    infoTable([
      ['Kulüp adı', '……'],
      ['Danışman öğretmen', '{OGRETMEN}'],
      ['Kulüp başkanı', '……'],
      ['Üye sayısı', '……'],
    ]) +
    p('') +
    section('1. YIL İÇİNDE YAPILAN ÇALIŞMALAR') +
    p('Kulüp yıl başında hazırlanan yıllık çalışma planı doğrultusunda çalışmalarını sürdürmüştür. Belirli gün ve haftalarda okul etkinliklerine katkı sağlanmış, kulüp alanına yönelik araştırma, sunum ve pano çalışmaları yapılmıştır.', { justify: true }) +
    table([['TARİH', 'YAPILAN ETKİNLİK', 'KATILAN ÖĞRENCİ'], ...Array.from({ length: 8 }, () => ['', '', ''])], [1800, 5600, 2200]) +
    p('') +
    section('2. ULAŞILAN SONUÇLAR') +
    p('Kulüp çalışmalarıyla öğrencilerin iş birliği, sorumluluk alma ve kendini ifade etme becerilerinin geliştiği; okul etkinliklerine katılımın arttığı gözlenmiştir.', { justify: true }) +
    section('3. KARŞILAŞILAN GÜÇLÜKLER') +
    p('……', { justify: true }) +
    section('4. GELECEK YIL İÇİN ÖNERİLER') +
    p('Kulüp çalışmalarının yıl başında daha erken planlanması, okul dışı öğrenme etkinliklerinin artırılması ve diğer kulüplerle ortak etkinlikler düzenlenmesi önerilmektedir.', { justify: true }) +
    sign.kulup(),
};

// ---------- Sınıf rehberlik planı ----------
const REHBERLIK = {
  id: 'rehberlik-yillik-plan',
  kategori: 'rehberlik',
  ad: 'Sınıf rehberlik yıllık çalışma planı',
  donem: 'Eğitim-öğretim yılı',
  body: () =>
    head('{EGITIM_YILI} EĞİTİM-ÖĞRETİM YILI SINIF REHBERLİK YILLIK ÇALIŞMA PLANI') +
    infoTable([
      ['Sınıf / Şube', '……'],
      ['Sınıf rehber öğretmeni', '{OGRETMEN}'],
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

// ---------- Yıllık planlar (MEB çerçeve) ----------
const MONTH_NAMES = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
const dmy = (k) => (k ? `${k.slice(8, 10)}.${k.slice(5, 7)}` : '');
function yearPlanDoc(branchId, grade, weeks) {
  let lastMonth = null;
  const rows = weeks.map((w) => {
    const m = w.start ? MONTH_NAMES[+w.start.slice(5, 7) - 1] : '';
    const showMonth = m !== lastMonth ? m : '';
    lastMonth = m;
    const outs = w.holiday ? '' : String(w.outcomes || '').trim();
    return [showMonth, `${w.week ? `${w.week}. hafta\n` : ''}${dmy(w.start)}–${dmy(w.end)}`, w.hours ? String(w.hours) : '', w.holiday ? `${w.unit || 'Tatil'}` : String(w.unit || w.topic || ''), outs];
  });
  return (
    head(`{EGITIM_YILI} EĞİTİM-ÖĞRETİM YILI ${BRANCH_NAMES[branchId].toLocaleUpperCase('tr')} DERSİ ${grade}. SINIF YILLIK PLANI`) +
    p('Bu plan Millî Eğitim Bakanlığının 2026-2027 eğitim ve öğretim yılı çerçeve yıllık planı esas alınarak hazırlanmıştır. Okulun ders yılı takvimine göre gerekli düzenlemeleri yapınız.', { justify: true, i: true }) +
    table([['AY', 'HAFTA', 'SAAT', 'ÜNİTE / TEMA', 'ÖĞRENME ÇIKTILARI'], ...rows], [900, 1200, 600, 2600, 9100], { size: 9 }) +
    p('') +
    table(
      [
        ['Ders Öğretmeni', 'UYGUNDUR'],
        ['{OGRETMEN}\n{BRANS} Öğretmeni', '{TARIH}\n{MUDUR}\nOkul Müdürü'],
      ],
      [7200, 7200]
    )
  );
}

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

async function writeDocx(file, body, landscape = false) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CT);
  zip.file('_rels/.rels', RELS);
  zip.file('word/_rels/document.xml.rels', DOC_RELS);
  zip.file('word/styles.xml', STYLES);
  zip.file('word/document.xml', doc(body, landscape));
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

const today = new Date().toISOString().slice(0, 10);
fs.mkdirSync(path.join(OUT, 'yillik-plan'), { recursive: true });
const rows = [];
for (const s of [ZUMRE_BASI, ZUMRE_ORTA, ZUMRE_SONU, SOK_BASI, SOK_SONU, VELI_1, VELI_2, KULUP_PLAN, KULUP_ILK, KULUP_RAPOR, REHBERLIK]) {
  await writeDocx(path.join(OUT, `${s.id}.docx`), s.body());
  rows.push({ id: s.id, kategori: s.kategori, ad: s.ad, donem: s.donem, dosya: `${s.id}.docx`, brans: null, tarih: today });
}
let plans = 0;
for (const b of Object.keys(BRANCH_NAMES)) {
  const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/yearPlans', `${b}.json`), 'utf8'));
  for (const g of Object.keys(all).map(Number).filter((g) => g >= 5).sort((a, b2) => a - b2)) {
    const id = `yillik-plan-${b}-${g}`;
    const dosya = `yillik-plan/${b}-${g}.docx`;
    await writeDocx(path.join(OUT, dosya), yearPlanDoc(b, g, all[g]), true);
    rows.push({ id, kategori: 'yillik-plan', ad: `${BRANCH_NAMES[b]} ${g}. sınıf yıllık planı`, donem: '2026-2027 · MEB çerçeve planı', dosya, brans: b, tarih: today });
    plans++;
  }
}
// Eski boş iskeletler kaldırıldı (yerlerine tam içerikli olanlar geldi).
for (const f of ['zumre-donem-basi', 'zumre-donem-sonu', 'sok', 'yillik-plan', 'kulup-tutanak', 'veli-toplanti', 'rehberlik-plan']) {
  fs.rmSync(path.join(OUT, `${f}.docx`), { force: true });
}
fs.writeFileSync(path.join(OUT, 'liste.json'), JSON.stringify({ guncelleme: today, evraklar: rows }, null, 2) + '\n');
console.log(`evrak/: ${rows.length - plans} tutanak/plan + ${plans} yıllık plan`);
