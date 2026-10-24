// Branşa özel AsyncStorage anahtarı: `<anahtar>/<branş>`.
// Branş ayrımından önceki tek anahtar (eski veri) ilk okuyan branşa taşınır — o da güncellemeden sonraki ilk açılıştaki branştır.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const branchKey = (key, branchId) => `${key}/${branchId}`;

export async function getBranchItem(key, branchId) {
  const k = branchKey(key, branchId);
  const v = await AsyncStorage.getItem(k);
  if (v != null) return v;
  const old = await AsyncStorage.getItem(key);
  if (old == null) return null;
  await AsyncStorage.setItem(k, old);
  await AsyncStorage.removeItem(key);
  return old;
}

export const setBranchItem = (key, branchId, value) => AsyncStorage.setItem(branchKey(key, branchId), value);
