// Etkinliğin tek dosyalık HTML'i: motor + soru havuzu + başlıklar. Uygulamada WebView'da oynanır,
// "İndir" ile .html dosyası olarak paylaşılır (akıllı tahtada tarayıcıda, internetsiz açılır).
import { ACTIVITY_TYPES } from './index';
import { BRANCH_BY_ID } from '../branches';

const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function activityTitle(act) {
  const branch = BRANCH_BY_ID[act.branchId];
  return `${act.grade}. Sınıf ${branch ? branch.name : ''} · ${act.unit}. Ünite: ${act.unitName}`;
}

export function buildHtml(act) {
  const type = ACTIVITY_TYPES[act.type];
  const pool = JSON.stringify(act.pool()).replace(/<\//g, '<\\/');
  return type
    .engine()
    .replace('/*__HAVUZ__*/', () => `const HAVUZ=${pool};`)
    .replace('__BASLIK__', () => esc(`${type.name} · ${act.grade}. Sınıf`))
    .replace('__ALT__', () => esc(activityTitle(act)))
    .replace('__IMZA__', () => (act.imza ? `<div class="imza">${act.imza}</div>` : ''))
    .split('__ANAHTAR__')
    .join(act.id);
}

// "Pasaparola - 10. Sınıf Din Kültürü ve Ahlak Bilgisi - 1. Ünite.html"
export function fileName(act) {
  const branch = BRANCH_BY_ID[act.branchId];
  const name = `${ACTIVITY_TYPES[act.type].name} - ${act.grade}. Sınıf ${branch ? branch.name : ''} - ${act.unit}. Ünite`;
  return `${name.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim()}.html`;
}
