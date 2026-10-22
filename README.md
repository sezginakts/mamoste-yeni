# Cümle Cümle İngilizce 🇬🇧🇹🇷

"Kalıp Ezberi" yöntemiyle İngilizce öğreten mobil uygulama (iOS + Android).
Gramer kuralı yerine, **cümleleri tekrar ederek ezberlersin**; her cümlede farklı kelimeler olduğu için kelime hazinen de genişler.

## Yöntem
- **Kalıp bazlı:** `am/is/are`, `have/has`, `can`, `do/does`, `want to` gibi her kalıp için 10 cümle.
- **Kolaydan zora:** Cümleler kısa ve basitten uzun ve bileşiğe doğru sıralanır.
- **Aralıklı tekrar (SRS):** Doğru bildiğin cümle seyrek, zorlandığın sık geri gelir (Leitner kutu sistemi).
- **Renk kodlama:** Sabit kalıp parçası vurgulanır → beyin kalıbı yakalar.
- **Sesli okuma (TTS):** Her cümle dinlenip tekrar edilebilir (shadowing).

## Bilimsel dayanak
- Günlük 5/10/15/20 cümle seçeneği. **10/gün** literatürde "tatlı nokta".
- Çalışma belleği sınırı nedeniyle oturumlar küçük tutulur.
- Asıl belirleyici sayı değil, **tekrar aralığıdır** (Cepeda meta-analizi).

## Akış
Ana ekran → Öğren (kart + ses + anlam) → Test (çoktan seçmeli / kelime dizme / boşluk doldurma) → Sonuç (ezberlenenler ✅ / tekrar gerekenler 🔁) → SRS + streak güncellenir.

## Çalıştırma
```bash
npm install
npm start        # Expo dev server (QR ile telefonda aç)
npm run android  # Android
npm run ios      # iOS
npm run web      # Tarayıcı
```

## Klasör Yapısı
```
src/
  data/        patterns.js   — kalıplar + cümleler (tek içerik kaynağı)
  utils/       srs.js, storage.js, tts.js, helpers.js
  context/     ProgressContext.js — global durum (SRS, streak, XP, ayarlar)
  components/  Button, ProgressBar, HighlightedSentence, quiz/*
  screens/     Home, Lesson, Quiz, Result, Progress, Settings
```

## Yeni kalıp/cümle ekleme
`src/data/patterns.js` içine yeni bir kalıp objesi ekle (id, name, color, emoji, sentences[]).
Her cümle: `{ id, level, en, tr, chunk }`. `chunk` = vurgulanacak/boşluk bırakılacak sabit parça.
