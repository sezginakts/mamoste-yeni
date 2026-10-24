// Öğretmen yedeği tek .json dosyası: web'de indirilir, telefonda paylaş menüsüyle (WhatsApp, Drive, Dosyalar…) gönderilir.
// Geri yüklerken aynı dosya seçilir; metin kopyalayıp yapıştırmaya gerek kalmaz.
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { dayKey } from '../utils/helpers';

export const backupFileName = () => `mamoste-yedek-${dayKey()}.json`;

export async function saveBackupFile(text) {
  const name = backupFileName();
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
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
  file.write(text);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: name });
}

// Seçilen yedek dosyasının metni; vazgeçilirse null.
export async function pickBackupFile() {
  const res = await DocumentPicker.getDocumentAsync({ type: Platform.OS === 'web' ? ['application/json', '.json', 'text/plain'] : '*/*', copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets || !res.assets[0]) return null;
  const asset = res.assets[0];
  if (Platform.OS === 'web') {
    if (asset.file) return asset.file.text();
    return (await fetch(asset.uri)).text();
  }
  const { File } = require('expo-file-system');
  return new File(asset.uri).text();
}
