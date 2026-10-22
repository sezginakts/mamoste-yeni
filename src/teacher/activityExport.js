// Etkinliği .html dosyası olarak paylaş: WhatsApp, Dosyalar, Drive… Dosya tek başına çalışır (internet gerekmez);
// flash belleğe atılıp akıllı tahtada çift tıklanınca tarayıcıda açılır.
import { Platform } from 'react-native';
import { buildHtml, fileName } from '../data/activities/build';

export async function exportActivity(act) {
  const html = buildHtml(act);
  const name = fileName(act);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }
  const { File, Paths } = require('expo-file-system');
  const Sharing = require('expo-sharing');
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(html);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/html', UTI: 'public.html', dialogTitle: name });
}
