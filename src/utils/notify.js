// Not hatırlatıcıları için YEREL bildirim (sunucu yok). Web'de ve izin yoksa sessizce atlanır;
// hatırlatma yine de Öğretmen Paneli'ndeki "Dikkat" şeridinde görünür.
import { Platform } from 'react-native';

// Uygulama öndeyken: ders zili banner göstermez (uygulamada zil animasyonu çıkar), yalnız sesi çalar.
// Ödev bildirimi sesli banner, not hatırlatıcısı sessiz banner.
export async function foregroundHandling(notification) {
  const data = (notification && notification.request && notification.request.content.data) || {};
  if (data.type === 'zil') return { shouldShowBanner: false, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false };
  return { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: !!data.homeworkId, shouldSetBadge: false };
}

let N = null;
function mod() {
  if (Platform.OS === 'web') return null;
  if (N) return N;
  try {
    N = require('expo-notifications');
    N.setNotificationHandler({ handleNotification: foregroundHandling });
  } catch (e) {
    N = null;
  }
  return N;
}

// dateKey: 'YYYY-MM-DD', time: 'HH:MM' (yoksa 08:30). Dönen id, iptal için saklanır.
export async function scheduleReminder(dateKey, title, body, time) {
  const n = mod();
  if (!n || !dateKey) return null;
  try {
    const perm = await n.requestPermissionsAsync();
    if (!perm.granted) return null;
    const when = new Date(`${dateKey}T${/^\d{2}:\d{2}$/.test(time || '') ? time : '08:30'}:00`);
    if (when.getTime() < Date.now()) return null;
    return await n.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: when },
    });
  } catch (e) {
    return null;
  }
}

export async function cancelReminder(id) {
  const n = mod();
  if (!n || !id) return;
  try {
    await n.cancelScheduledNotificationAsync(id);
  } catch (e) {}
}

// Her gün aynı saatte tekrarlayan hatırlatıcı (öğrenci profili). time: 'HH:MM'. Dönen id, iptal için saklanır.
export async function scheduleDaily(time, title, body) {
  const n = mod();
  const m = /^(\d{2}):(\d{2})$/.exec(time || '');
  if (!n || !m) return null;
  try {
    const perm = await n.requestPermissionsAsync();
    if (!perm.granted) return null;
    return await n.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: n.SchedulableTriggerInputTypes.DAILY, hour: +m[1], minute: +m[2] },
    });
  } catch (e) {
    return null;
  }
}
