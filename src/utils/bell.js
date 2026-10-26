// Ders zili: ders saatlerine (DeskContext → periods, lessons) göre her hafta tekrarlayan YEREL bildirimler.
// Ses: assets/sounds/zil.wav (tek vuruş). Android'de "zil" kanalı, iOS'ta bildirimin kendi sesi.
// Uygulama açıkken bildirim yerine uygulamanın içinde zil animasyonu görünür (components/BellOverlay).
// iOS aynı anda en fazla 64 bildirim bekletir: zil en fazla MAX_BELLS; aşarsa ders bitiş zilleri düşer.
import { Platform } from 'react-native';

const MAX_BELLS = 56;
export const BELL_SOUND = 'zil.wav';
const CHANNEL = 'zil';

const valid = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || '');

// Zil anları: [{ day (1 = Pzt … 5 = Cuma), time 'HH:MM', kind 'start'|'end', period, label }]
// mode: 'mine' = yalnız ders programındaki derslerim · 'all' = her ders saati. end: ders bitişinde de çalsın.
// dayPeriods: iki okul için gün bazlı saat listeleri ([[Pzt], [Sal], …]); verilmezse tek `periods` kullanılır.
export function bellTimes({ periods = [], dayPeriods = null, lessons = {}, mode = 'mine', end = true }) {
  const out = [];
  for (let day = 1; day <= 5; day++) {
    const gunSaatleri = dayPeriods ? dayPeriods[day - 1] || [] : periods;
    gunSaatleri.forEach((p, i) => {
      const period = i + 1;
      const l = lessons[`${day}-${period}`];
      if (mode === 'mine' && !l) return;
      const label = l ? l.label : '';
      if (valid(p.start)) out.push({ day, time: p.start, kind: 'start', period, label });
      if (end && valid(p.end)) out.push({ day, time: p.end, kind: 'end', period, label });
    });
  }
  if (out.length <= MAX_BELLS) return out;
  return out.filter((b) => b.kind === 'start').slice(0, MAX_BELLS);
}

export const bellText = (b) =>
  b.kind === 'start'
    ? { title: '🔔 Ders başladı', body: `${b.period}. ders${b.label ? ` · ${b.label}` : ''}` }
    : { title: '🔔 Teneffüs', body: `${b.period}. ders bitti${b.label ? ` · ${b.label}` : ''}` };

let N = null;
function mod() {
  if (Platform.OS === 'web') return null;
  if (!N) {
    try {
      N = require('expo-notifications');
    } catch (e) {
      N = null;
    }
  }
  return N;
}

// Eski zilleri sil, yenilerini kur. bells boşsa yalnız siler. Döner: kurulan zil sayısı (izin yoksa null).
export async function scheduleBells(bells) {
  const n = mod();
  if (!n) return null;
  try {
    const all = await n.getAllScheduledNotificationsAsync();
    await Promise.all(all.filter((x) => x.content && x.content.data && x.content.data.type === 'zil').map((x) => n.cancelScheduledNotificationAsync(x.identifier)));
    if (!bells.length) return 0;
    const perm = await n.requestPermissionsAsync();
    if (!perm.granted) return null;
    if (Platform.OS === 'android') {
      await n.setNotificationChannelAsync(CHANNEL, { name: 'Ders zili', importance: n.AndroidImportance.HIGH, sound: BELL_SOUND, vibrationPattern: [0, 250] });
    }
    for (const b of bells) {
      const [h, m] = b.time.split(':').map(Number);
      await n.scheduleNotificationAsync({
        content: { ...bellText(b), sound: BELL_SOUND, data: { type: 'zil', kind: b.kind, period: b.period } },
        // expo: weekday 1 = Pazar … 7 = Cumartesi; bizim 1 = Pazartesi.
        trigger: { type: n.SchedulableTriggerInputTypes.WEEKLY, weekday: b.day + 1, hour: h, minute: m, channelId: CHANNEL },
      });
    }
    return bells.length;
  } catch (e) {
    console.warn('zil kurulamadı', e);
    return null;
  }
}

// Uygulamanın içinde zil sesi (web / akıllı tahta tarayıcısı ve "Zili dene").
let player = null;
export function playBell() {
  try {
    if (!player) {
      const { createAudioPlayer } = require('expo-audio');
      player = createAudioPlayer(require('../../assets/sounds/zil.wav'));
    }
    player.seekTo(0);
    player.play();
  } catch (e) {}
}
