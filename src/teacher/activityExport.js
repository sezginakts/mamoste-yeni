// Etkinliği .html dosyası olarak paylaş: WhatsApp, Dosyalar, Drive… Dosya tek başına çalışır (internet gerekmez);
// flash belleğe atılıp akıllı tahtada çift tıklanınca tarayıcıda açılır.
import { Platform } from 'react-native';
import { buildHtml, fileName } from '../data/activities/build';
import { buildBoardPack, packFileName } from '../data/activities/pack';

async function saveHtml(html, name) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Tıklamadan hemen sonra DOM'dan silmek indirmeyi iptal edebiliyor (Edge/Chrome): bekle, sonra temizle.
    setTimeout(() => {
      try {
        a.remove();
      } catch (e) {}
    }, 3000);
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    return { url, name }; // indirme engellenirse ekranda "buradan al" bağlantısı gösterilebilir
  }
  const { File, Paths } = require('expo-file-system');
  const Sharing = require('expo-sharing');
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(html);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/html', UTI: 'public.html', dialogTitle: name });
}

export const exportActivity = (act) => saveHtml(buildHtml(act), fileName(act));

// Tahta paketi: branşın bütün oyunları + menü, tek dosya (data/activities/pack.js).
export const exportBoardPack = (branchId) => saveHtml(buildBoardPack(branchId), packFileName(branchId));
