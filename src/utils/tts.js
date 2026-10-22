// Sesli okuma — ÖNCE gömülü neural ses (Aria mp3, doğal), yoksa cihaz TTS'i (yedek).
// Gömülü mp3'ler internetsiz çalışır ve mekanik değil; 150 cümle assets/audio içinde.
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AUDIO_MAP, AUDIO_TEXT } from './audioMap';

// Metin karşılaştırma: noktalama/büyük-küçük harf/boşluk farkını yok say.
const norm = (t) => (t || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();

// mp3 SADECE ekrandaki metinden üretildiyse çalınır. Metin sonradan değiştiyse
// (eski ses dosyası kaldıysa) cihaz TTS'ine düşülür → ses-metin kayması olmaz.
function assetFor(id, text) {
  if (!id) return null;
  const asset = AUDIO_MAP[id];
  if (!asset) return null;
  if (AUDIO_TEXT && norm(AUDIO_TEXT[id]) !== norm(text)) {
    if (__DEV__) console.warn(`[tts] ${id} ses dosyası güncel değil, cihaz TTS kullanılıyor. python generate-audio.py çalıştır.`);
    return null;
  }
  return asset;
}

let player = null; // tekrar kullanılan tek oynatıcı

// Sessiz modda bile sesin duyulması için ses modunu ayarla (bir kez).
let audioModeSet = false;
async function ensureAudioMode() {
  if (audioModeSet) return;
  audioModeSet = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch (e) {
    // önemli değil; yine de çalmayı dener
  }
}

// --- Yedek: cihazın kendi TTS motoru (gömülü ses yoksa) ---
let bestVoice = null;
let voiceReady = false;
let voicePromise = null;

const PREFERRED_NAME_HINTS = [
  'samantha', 'aaron', 'nicky', 'evan',
  'natural', 'neural', 'premium', 'enhanced',
  'google us english', 'google uk english', 'google',
  'microsoft aria', 'microsoft jenny', 'microsoft guy', 'microsoft',
];

function scoreVoice(v) {
  const name = (v.name || '').toLowerCase();
  const id = (v.identifier || '').toLowerCase();
  const lang = (v.language || '').toLowerCase();
  if (!lang.startsWith('en')) return -1;
  let score = lang === 'en-us' ? 30 : lang === 'en-gb' ? 25 : 10;
  if (v.quality === Speech.VoiceQuality.Enhanced || v.quality === 'Enhanced') score += 60;
  PREFERRED_NAME_HINTS.forEach((hint, i) => {
    if (name.includes(hint) || id.includes(hint)) score += 50 - i * 2;
  });
  if (name.includes('compact') || id.includes('compact')) score -= 40;
  if (name.includes('eloquence')) score -= 50;
  return score;
}

async function ensureBestVoice() {
  if (voiceReady) return bestVoice;
  if (voicePromise) return voicePromise;
  voicePromise = (async () => {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      let best = null;
      let bestScore = -Infinity;
      for (const v of voices || []) {
        const s = scoreVoice(v);
        if (s > bestScore) { bestScore = s; best = v; }
      }
      if (best && bestScore >= 0) bestVoice = best.identifier;
    } catch (e) {}
    voiceReady = true;
    return bestVoice;
  })();
  return voicePromise;
}

function speakWithDeviceTTS(text, rate) {
  try {
    Speech.stop();
    ensureBestVoice().then((voiceId) => {
      const finalRate = rate != null ? rate : Platform.OS === 'web' ? 0.95 : 0.92;
      Speech.speak(text, { language: 'en-US', voice: voiceId || undefined, rate: finalRate, pitch: 1.0 });
    });
  } catch (e) {
    console.warn('TTS yedek hatası', e);
  }
}

// --- Ana API ---

// Açılışta hazırlık (ses modu + cihaz sesleri).
export function warmUpVoices() {
  ensureAudioMode();
  ensureBestVoice();
}

// id verilirse gömülü neural mp3 çalınır; yoksa metin cihaz TTS'iyle okunur.
export async function speak(text, opts = {}) {
  const { id, rate } = opts;
  const asset = assetFor(id, text);

  if (asset) {
    try {
      await ensureAudioMode();
      if (player) {
        try { player.remove(); } catch (e) {}
        player = null;
      }
      player = createAudioPlayer(asset);
      player.play();
      return;
    } catch (e) {
      // mp3 çalınamazsa cihaz TTS'ine düş
      console.warn('Gömülü ses çalınamadı, cihaz TTS yedeğine geçiliyor', e);
    }
  }
  speakWithDeviceTTS(text, rate);
}

export function stopSpeaking() {
  try { Speech.stop(); } catch (e) {}
  try { if (player) player.pause(); } catch (e) {}
}
