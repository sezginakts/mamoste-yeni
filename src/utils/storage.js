// AsyncStorage sarmalayıcısı — tüm kalıcı veri tek anahtar altında JSON olarak saklanır.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@ingapp/state/v1';

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('loadState hatası', e);
    return null;
  }
}

export async function saveState(state) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('saveState hatası', e);
  }
}

export async function clearState() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.warn('clearState hatası', e);
  }
}
