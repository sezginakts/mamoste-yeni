// Seçmeli derslerin özel adları: cihazda saklanır, BRANCH_NAME_OVERRIDE haritasına yüklenir.
// Örnek: 'secmeli-1' → 'Yaşayan Diller'. Ad girilmezse varsayılan ad ("Seçmeli Ders 1") kullanılır.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRANCH_NAME_OVERRIDE, kisaAd } from '../data/branches';

const KEY = '@ingapp/branch-names/v1';

export async function loadBranchNames() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const kayit = raw ? JSON.parse(raw) : {};
    Object.keys(kayit).forEach((id) => {
      if (kayit[id]) BRANCH_NAME_OVERRIDE[id] = String(kayit[id]);
    });
    return { ...BRANCH_NAME_OVERRIDE };
  } catch (e) {
    return { ...BRANCH_NAME_OVERRIDE };
  }
}

export async function setBranchName(id, ad) {
  const temiz = String(ad || '').trim();
  if (temiz) BRANCH_NAME_OVERRIDE[id] = temiz;
  else delete BRANCH_NAME_OVERRIDE[id];
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const kayit = raw ? JSON.parse(raw) : {};
    if (temiz) kayit[id] = temiz;
    else delete kayit[id];
    await AsyncStorage.setItem(KEY, JSON.stringify(kayit));
  } catch (e) {}
  return { ...BRANCH_NAME_OVERRIDE };
}

export const branchShort = (id, varsayilan) => kisaAd(BRANCH_NAME_OVERRIDE[id]) || varsayilan;
