// Tahta paketi: branşın bütün etkinlikleri + menü sayfası TEK .html dosyada.
// Flash belleğe atılır, akıllı tahtada (Pardus: Firefox/Chromium) çift tıklanınca açılır; internet gerekmez.
// Her oyun kendi tek dosyalık HTML'i (build.js) olarak gömülür, menüden seçilince tam ekran iframe'de (srcdoc) açılır.
import { ACTIVITY_TYPES, activitiesFor } from './index';
import { buildHtml } from './build';
import { BRANCH_BY_ID } from '../branches';

const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Script içine gömülen metin: "</script>" erken kapanmasın.
const js = (v) => JSON.stringify(v).replace(/<\//g, '<\\/');

export function packFileName(branchId) {
  const b = BRANCH_BY_ID[branchId];
  return `Okul Tahta Paketi - ${b ? b.name : 'Etkinlikler'}.html`.replace(/[\\/:*?"<>|]/g, '');
}

// Paketteki oyun sayısı (menüde kart sayısı).
export const packCount = (branchId) => activitiesFor(branchId).length;

export function buildBoardPack(branchId) {
  const b = BRANCH_BY_ID[branchId];
  const acts = activitiesFor(branchId).sort((x, y) => (x.grade || 0) - (y.grade || 0) || (x.unit || 0) - (y.unit || 0));
  const htmls = acts.map((a) => buildHtml(a));
  const games = Object.entries(ACTIVITY_TYPES)
    .map(([type, t]) => ({
      ikon: t.icon,
      ad: t.name,
      aciklama: t.desc,
      items: acts
        .map((a, i) => ({ a, i }))
        .filter(({ a }) => a.type === type)
        .map(({ a, i }) => ({ etiket: a.grade ? `${a.grade}. sınıf${a.unit ? ` · ${a.unit}. ün.` : ''}` : a.unitName, i })),
    }))
    .filter((g) => g.items.length);
  const baslik = `${b ? b.name : ''} Etkinlikleri`;
  return TEMPLATE.replace('__BASLIK__', () => esc(baslik))
    .replace('__BRANS__', () => esc(b ? `${b.emoji} ${b.name}` : ''))
    .replace('/*__VERI__*/', () => `const OYUNLAR=${js(games)};const HTMLLER=${js(htmls)};`);
}

const TEMPLATE = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>Okul · __BASLIK__</title>
<style>
:root{--mercan:#E2574C;--turkuaz:#0D9488;--gok:#0284C7;--kehribar:#D99A1E;--yazi:#0F172A;--soluk:#64748B;--zemin:#F1F5F9;--f:clamp(16px,2.6vmin,34px)}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;color:var(--yazi);font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;
  background:linear-gradient(155deg,#E0F2FE 0%,#ECFEFF 45%,#F0FDFA 70%,#FFF1EE 100%);user-select:none;-webkit-user-select:none}
body{overflow:auto}
button{font-family:inherit;cursor:pointer;border:0}
#arka{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0}
.blob{position:absolute;border-radius:50%;filter:blur(6vmin);opacity:.35}
.b1{width:45vmin;height:45vmin;background:var(--gok);top:-12vmin;left:-10vmin}
.b2{width:38vmin;height:38vmin;background:var(--mercan);bottom:-14vmin;right:-8vmin;opacity:.25}
.b3{width:30vmin;height:30vmin;background:var(--turkuaz);bottom:10vmin;left:-12vmin;opacity:.22}
main{position:relative;z-index:1;max-width:1500px;margin:0 auto;padding:4vmin 3vmin 6vmin}
header{display:flex;align-items:center;gap:2vmin;flex-wrap:wrap;margin-bottom:3vmin}
.logo{display:flex;gap:.8vmin}
.logo i{display:block;width:6vmin;height:6vmin;min-width:34px;min-height:34px;border-radius:1.4vmin;font-style:normal;color:#fff;font-weight:900;font-size:calc(var(--f)*1.1);display:grid;place-items:center;box-shadow:0 .6vmin 0 rgba(0,0,0,.18)}
.logo i:nth-child(1){background:var(--gok);transform:rotate(-8deg)}.logo i:nth-child(2){background:var(--turkuaz);transform:translateY(-.8vmin)}
.logo i:nth-child(3){background:var(--mercan);transform:rotate(7deg)}
h1{margin:0;font-size:calc(var(--f)*1.9);font-weight:900;line-height:1;background:linear-gradient(90deg,var(--turkuaz),var(--gok));-webkit-background-clip:text;background-clip:text;color:transparent}
.alt{color:var(--soluk);font-weight:700;font-size:calc(var(--f)*.7);margin-top:.6vmin}
.tam{margin-left:auto;background:#fff;border-radius:99px;padding:1.2vmin 2.6vmin;font-weight:900;font-size:calc(var(--f)*.7);box-shadow:0 .5vmin 0 #CBD5E1}
.izgara{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr));gap:2.4vmin}
.kart{--c:var(--turkuaz);background:rgba(255,255,255,.92);border-radius:3vmin;padding:2.6vmin;box-shadow:0 1.2vmin 3vmin rgba(2,132,199,.12);border-top:1vmin solid var(--c);display:flex;flex-direction:column;gap:1.4vmin}
.kart:nth-child(2n){--c:var(--mercan)}
.ust{display:flex;align-items:center;gap:1.6vmin}
.ikon{width:calc(var(--f)*2.8);height:calc(var(--f)*2.8);border-radius:1.8vmin;display:grid;place-items:center;font-size:calc(var(--f)*1.6);background:color-mix(in srgb,var(--c) 14%,#fff)}
.ad{font-weight:900;font-size:calc(var(--f)*1.15)}
.aciklama{color:var(--soluk);font-size:calc(var(--f)*.68);line-height:1.45}
.duzeyler{display:flex;flex-wrap:wrap;gap:1.2vmin;margin-top:.4vmin}
.duzeyler button{background:var(--c);color:#fff;font-weight:900;font-size:calc(var(--f)*.75);padding:1.3vmin 2.6vmin;border-radius:99px;box-shadow:0 .6vmin 0 rgba(15,23,42,.22);transition:transform .1s}
.duzeyler button:active{transform:translateY(.4vmin);box-shadow:0 .2vmin 0 rgba(15,23,42,.22)}
#oyun{position:fixed;inset:0;z-index:10;display:none;background:#fff}
#oyun.acik{display:block}
#oyun iframe{width:100%;height:100%;border:0;display:block}
#menuBtn{position:fixed;left:1.4vmin;bottom:1.4vmin;z-index:11;display:none;background:rgba(15,23,42,.72);color:#fff;font-weight:900;font-size:calc(var(--f)*.65);border-radius:99px;padding:1.1vmin 2.4vmin}
#oyun.acik~#menuBtn{display:block}
footer{margin-top:4vmin;color:var(--soluk);font-size:calc(var(--f)*.6);text-align:center}
</style></head><body>
<div id="arka"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span></div>
<main>
  <header>
    <div class="logo"><i>O</i><i>k</i><i>l</i></div>
    <div><h1>Okul</h1><div class="alt">__BRANS__ · Akıllı tahta etkinlikleri</div></div>
    <button class="tam" id="tamBtn">⛶ Tam ekran</button>
  </header>
  <div class="izgara" id="izgara"></div>
  <footer>İnternet gerekmez. Oyundan menüye dönmek için sol alttaki “‹ Menü”ye dokun.</footer>
</main>
<div id="oyun"></div>
<button id="menuBtn">‹ Menü</button>
<script>
/*__VERI__*/
const $=id=>document.getElementById(id);
const iz=$('izgara');
OYUNLAR.forEach(g=>{
  const k=document.createElement('div');k.className='kart';
  k.innerHTML='<div class="ust"><div class="ikon"></div><div class="ad"></div></div><div class="aciklama"></div><div class="duzeyler"></div>';
  k.querySelector('.ikon').textContent=g.ikon;k.querySelector('.ad').textContent=g.ad;k.querySelector('.aciklama').textContent=g.aciklama;
  const d=k.querySelector('.duzeyler');
  g.items.forEach(it=>{const b=document.createElement('button');b.textContent='▶ '+it.etiket;b.onclick=()=>ac(it.i);d.appendChild(b)});
  iz.appendChild(k);
});
function ac(i){
  const o=$('oyun');o.innerHTML='';const f=document.createElement('iframe');
  f.setAttribute('allow','autoplay; fullscreen');f.setAttribute('allowfullscreen','');f.srcdoc=HTMLLER[i];
  o.appendChild(f);o.classList.add('acik');
}
$('menuBtn').onclick=()=>{const o=$('oyun');o.classList.remove('acik');o.innerHTML=''};
const tamVar=!!(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen);
if(!tamVar)$('tamBtn').style.display='none';
$('tamBtn').onclick=()=>{const d=document.documentElement;if(document.fullscreenElement||document.webkitFullscreenElement){(document.exitFullscreen||document.webkitExitFullscreen).call(document)}else{(d.requestFullscreen||d.webkitRequestFullscreen).call(d)}};
</script>
</body></html>`;
