// Genel yardımcılar.

// Diziyi yerinde olmadan karıştır (Fisher-Yates).
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Diziden n rastgele eleman seç.
export function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

// Bugünün tarih anahtarı (YYYY-MM-DD) — streak hesaplaması için.
export function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// İki gün anahtarı arasındaki gün farkı.
export function daysBetween(aKey, bKey) {
  const a = new Date(aKey + 'T00:00:00');
  const b = new Date(bKey + 'T00:00:00');
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

// Bugünden geriye doğru son N günün anahtarlarını döndürür (eskiden yeniye).
export function lastNDays(n, today = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

// Gün anahtarını kısa etikete çevirir (örn. "5 Haz").
const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export function shortDayLabel(key) {
  const d = new Date(key + 'T00:00:00');
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
}

// Cümleyi kelimelere böl (noktalama işaretlerini koruyarak basitçe).
export function toWords(sentence) {
  return sentence.trim().split(/\s+/);
}

// Yazılı test için metin normalleştirme:
// büyük/küçük, noktalama, kesme işareti ve fazla boşluk farklarını yok sayar.
// Türkçe karakterleri de güvenli küçültür (İ/I sorununu çözer).
export function normalizeText(s) {
  if (!s) return '';
  return s
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr')
    .replace(/['’`]/g, '') // kesme işaretleri: can't = cant, dont = don't
    .replace(/[.,!?;:"()…]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function textsMatch(a, b) {
  return normalizeText(a) === normalizeText(b);
}

// Levenshtein mesafesi (küçük yazım hatalarına tolerans için).
export function editDistance(a, b) {
  a = normalizeText(a);
  b = normalizeText(b);
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

// "Yeterince doğru" mu? Tam eşleşme ya da uzunluğa göre çok küçük hata (1-2 harf).
export function isCloseEnough(answer, correct) {
  if (textsMatch(answer, correct)) return true;
  const d = editDistance(answer, correct);
  const len = normalizeText(correct).length;
  // kısa cümlede 1, uzun cümlede orantılı tolerans
  const tolerance = len <= 10 ? 1 : len <= 25 ? 2 : 3;
  return d <= tolerance;
}
