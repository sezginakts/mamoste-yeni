// Telefon yönü: uygulama normalde DİKEY kilitli; ana sayfadaki ders programı tam ekran açılınca
// yatay kilide geçilir, kapanınca tekrar dikey kilitlenir (YouTube'un tam ekran oynatıcısı gibi).
// Web'de yön kilidi yok (tarayıcı kendi işini yapar) — bu yüzden tüm fonksiyonlar sessizce geçer.
import { Platform } from 'react-native';

let mod = null;
let arandi = false;
function so() {
  if (Platform.OS === 'web') return null;
  if (!arandi) {
    arandi = true;
    try {
      mod = require('expo-screen-orientation');
    } catch (e) {
      mod = null;
    }
  }
  return mod;
}

export async function dikeyKilitle() {
  const m = so();
  if (!m) return;
  try {
    await m.lockAsync(m.OrientationLock.PORTRAIT_UP);
  } catch (e) {}
}

export async function yatayKilitle() {
  const m = so();
  if (!m) return;
  try {
    await m.lockAsync(m.OrientationLock.LANDSCAPE);
  } catch (e) {}
}

export async function kilidiAc() {
  const m = so();
  if (!m) return;
  try {
    await m.unlockAsync();
  } catch (e) {}
}
