// Uygulamanın herkese açık sayfaları (gizlilik politikası, destek). App Store 5.1.1(i): gizlilik politikası
// uygulamanın içinden de açılabilmeli — Ayarlar → Hakkında. Sayfalar tahta sitesinde: tools/site → <tahtaUrl>/uygulama/.
// Site adresi değişirse yalnız app.json → extra.tahtaUrl değişir.
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig && Constants.expoConfig.extra) || {};
const SITE = String(extra.tahtaUrl || 'https://sezginakts.github.io/mamoste-tahta/').replace(/\/?$/, '/') + 'uygulama/';

export const GIZLILIK_URL = SITE + 'gizlilik.html';
export const DESTEK_URL = SITE + 'destek.html';

// Telefonda uygulama içi tarayıcıda (Safari görünümü), web'de yeni sekmede açar.
export async function sayfaAc(url) {
  if (Platform.OS !== 'web') {
    try {
      const WebBrowser = require('expo-web-browser');
      await WebBrowser.openBrowserAsync(url);
      return;
    } catch (e) {}
  }
  Linking.openURL(url).catch(() => {});
}
