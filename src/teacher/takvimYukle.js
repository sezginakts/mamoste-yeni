// Eğitim takvimini yayın sitesinden (tahta-site/evrak/takvim.json) günceller: yeni yılın takvimi uygulama derlemesi
// gerekmeden gelir. Önce cihazdaki son kopya, sonra internetten güncel hali; ikisi de yoksa uygulamaya gömülü kopya
// (src/data/egitimTakvimi.js) kullanılır. Uygulama açılışında bir kez çağrılır (App.js).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TAHTA_URL } from './BoardLink';
import { takvimGuncelle } from './evrak/takvim';

const KEY = '@ingapp/takvim/v1';
const URL_ = TAHTA_URL ? `${TAHTA_URL.replace(/\/?$/, '/')}evrak/takvim.json` : '';
const dinleyiciler = new Set();
let surum = 0;

// Takvim değişince yeniden çizilmesi gereken ekranlar için: useTakvimSurumu benzeri basit abonelik.
export const takvimDegisince = (fn) => {
  dinleyiciler.add(fn);
  return () => dinleyiciler.delete(fn);
};
export const takvimSurumu = () => surum;
const bildir = () => {
  surum++;
  dinleyiciler.forEach((fn) => fn(surum));
};

export async function takvimiYenile() {
  try {
    const kayitli = await AsyncStorage.getItem(KEY);
    if (kayitli && takvimGuncelle(JSON.parse(kayitli))) bildir();
  } catch (e) {}
  if (!URL_) return;
  try {
    const r = await fetch(`${URL_}?t=${Date.now()}`);
    if (!r.ok) return;
    const json = await r.json();
    if (takvimGuncelle(json)) {
      AsyncStorage.setItem(KEY, JSON.stringify(json)).catch(() => {});
      bildir();
    }
  } catch (e) {
    // internet yok: gömülü / kayıtlı takvim kullanılır
  }
}
