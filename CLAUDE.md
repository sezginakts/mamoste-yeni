# Mamoste (ingapp)

Expo SDK 54 / React Native 0.81 uygulaması. Ortaokul öğretmenleri (branş seçerek) ve öğrencileri için; İngilizce'de kalıp ezberi, tüm branşlarda görev ödevi, öğretmen modülü ve akıllı tahta modu var.
Çalıştırma: `npm start` (Expo Go) · `npm run web` (tarayıcı / akıllı tahta).

## Mimari
- İçerik: `src/data/patterns.js` (tek kaynak). Cümle id'leri (ör. `can-12`) ses dosyalarına ve kayıtlara bağlıdır; metni değiştirirsen sesi yeniden üret.
- Öğrenci durumu: `src/context/ProgressContext.js` (SRS kartları + `student` + `homeworks`), AsyncStorage.
- Öğretmen verisi: `src/teacher/TeacherContext.js` — cihazda asıl kopya (sınıf başına ayrı AsyncStorage anahtarı); giriş yapılmışsa `src/teacher/cloud.js` ile Supabase'e eşitlenir. Öğrencinin gerçek adı sunucuya GİTMEZ (yalnızca okul numarası + öğrencinin yazdığı takma ad).
- Branş: `src/data/branches.js` (kimlikler sunucudaki `classes.branch` ile aynı). Öğretmen ilk açılışta seçer, kalıcı (`RoleContext` → `branch`). `drills: false` olan branşta İngilizce kalıp kısımları gizlenir. Rol de kalıcıdır, uygulama içinde değiştirilemez.
- Öğrenci tek uygulamada tüm dersleri: cihaz TEK anahtar taşır, her ders ayrı üyelik (`student.classes`). `student_classes` / `student_feed` RPC'leri. Bildirime dokununca ödev açılır (`utils/push.js` → `App.js`).
- Ödev türleri: `sentences` (İngilizce, payload) ve `task` (görev: açıklama + öğretmenin foto/videosu, `teacher/media.js` → Storage `homework-media`). Öğrenci dosya yükleyemez; "Tamamladım" + not; öğretmen geri bildirim/puan verir.
- Eski ödev/sonuç taşıma (QR): `src/utils/codec.js` → `ING1.H.…` / `ING1.R.…`. Sunucuya geçildi; yeni akışta kullanılmıyor.
- Ödev kişiselleştirme: `src/utils/homework.js` (öğrencinin kendi SRS geçmişine göre cihazda seçilir).
- Rol: `src/context/RoleContext.js` ('student' | 'teacher', ayrı anahtar; ilerleme sıfırlansa da kalır). İlk açılışta `RoleSelectScreen`; `App.js` role göre `Home`'u (öğrenci: `HomeScreen`, öğretmen: `TeacherHomeScreen`) ve kayıtlı ekranları seçer. Değişim: Ayarlar.
- Toplu öğrenci ekleme: `src/teacher/roster.js` (ayıklayıcı, saf JS) + `rosterFile.js` (xlsx/xls/ods/csv → SheetJS, docx → JSZip) → `RosterImportScreen` (önizleme/düzeltme). Her şey cihazda.
- Yıllık plan: `src/teacher/yearPlan.js` (Excel/Word plandan hafta + tarih + öğrenme çıktısı ayıklar; `weekForDay`) + `PlanContext.js` (cihazda) → `YearPlanScreen`; öğretmen ana ekranının Bugün kartında bu hafta görünür. Plan içeriği uydurulmaz, öğretmen kendi dosyasını yükler.
- Ders programı + notlar: `src/teacher/DeskContext.js` (cihazda). Plan ekranı her zaman TEK dersi açar (bugünkü, yoksa o sınıfla sıradaki). Haftanın öğrenme çıktıları (her satır bir kazanım) plandaki haftalık ders saatine (`hours`: CLASS HOUR / SAAT) sırayla dağıtılır; dersin haftadaki sırası programdan gelir (`planUi.js` → `lessonSlot`, `outcomesForLesson`, `LessonCard`). Kartta içerik (CONTENT FRAME → `contentSections`), işlev, etkinlik, değerlendirme de var. Ekranlar: `TimetableScreen`, `NotesScreen`.
- Word planlarında birleşik hücreler (`gridSpan`) sütun kaymasın diye doldurulur; yıllık planda metin kopyalanır (`pickTableFile({ replicateSpans: true })`).
- Sunucu: Supabase projesi `ingapp` (Frankfurt, ücretsiz plan). `20261021000000_init.sql` UYGULANDI; `…010000_push.sql` ve `…020000_branches.sql` henüz UYGULANMADI (SQL Editor'dan sırayla). Yeni değişiklik = yeni migration dosyası; eskisini düzenleme. Uygulama `app.json` → `extra.supabaseUrl/supabaseKey` ile bağlanır (anahtar boşsa çevrimdışı çalışır). Tasarım: `docs/SUNUCU-MIMARISI.md`. Öğrenci hesapsız: cihaz anahtarı + `student_*` fonksiyonları. Migration'ı değiştirirsen RLS'yi PGlite ile test et (anon tablo okuyamaz, öğretmen başkasının sınıfını göremez, deneme sınırı kalıcı).
- Etkinlikler (akıllı tahta oyunları): `src/data/activities/index.js` (türler + branş listeleri) → `build.js` tek dosyalık HTML üretir (WebView'da oynanır, .html indirilir). Pasaparola motoru DKAB deposundan üretilir; Cümle Kur, Çarkıfelek, Denklem Terazisi ve Fiilimsi Kovası motorlarının kaynağı `tools/etkinlik/*.html`, değişince `node tools/etkinlik/derle.js`. Havuzlar `src/data/activities/<branş>/` (Denklem Terazisi soru listesi değil, `{ seviyeler }` alır; denklemleri kendi üretir). `unit: null` → ünite numarasız etkinlik.
- Ekranlar: `LearnScreen` (kalıplar), `src/screens/teacher/*` (panel, sınıf, öğrenci profili, ödev oluştur/paylaş, yedek, Board = akıllı tahta), `ScanScreen`, `StudentHomeworkScreen`, `HomeworkDoneScreen`.

## Ses
- `generate-audio.py`: patterns.js'ten okur, `assets/audio/manifest.json` ile metin değişimini algılar, `src/utils/audioMap.js`'i (AUDIO_MAP + AUDIO_TEXT) yeniden yazar.
- `tts.js` mp3'ü sadece metin eşleşirse çalar; değilse cihaz TTS'ine düşer.
- BEKLEYEN: can-2..can-10 sesleri eski metinden; `pip install edge-tts && python generate-audio.py` çalıştırılmalı.

## Kurallar
- Kullanıcıyla Türkçe konuş. Kısa, doğrudan, abartısız.
- Uydurma rakam verme; bilmiyorsan söyle.
