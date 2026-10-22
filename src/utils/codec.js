// Sunucusuz veri taşıma: ödev ve sonuçlar QR kodu / kopyalanabilir metin olarak taşınır.
// Biçim:  ING1.<tip>.<base64url(UTF-8 JSON)>
//   tip 'H' = öğretmen -> öğrenci ödev paketi   { cc, cn, list:[ödev...] }
//   tip 'R' = öğrenci -> öğretmen sonuç paketi  { cc, no, nk, h, at, dur, res:{sentenceId:0|1} }
// Harici kütüphane yok; Hermes / web / Node'da aynı çalışır.

const PREFIX = 'ING1';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function utf8Encode(str) {
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const c2 = str.charCodeAt(i + 1);
      if (c2 >= 0xdc00 && c2 <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        i++;
      }
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

function utf8Decode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i++];
    let c;
    if (b < 0x80) c = b;
    else if (b < 0xe0) c = ((b & 31) << 6) | (bytes[i++] & 63);
    else if (b < 0xf0) c = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    else c = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63);
    if (c >= 0x10000) {
      c -= 0x10000;
      s += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 1023));
    } else s += String.fromCharCode(c);
  }
  return s;
}

function b64urlEncode(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (i + 1 < bytes.length) s += B64[(n >> 6) & 63];
    if (i + 2 < bytes.length) s += B64[n & 63];
  }
  return s;
}

function b64urlDecode(s) {
  const bytes = [];
  let buf = 0;
  let bits = 0;
  for (const ch of s) {
    const v = B64.indexOf(ch);
    if (v < 0) throw new Error('geçersiz karakter');
    buf = (buf << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buf >> bits) & 255);
    }
  }
  return bytes;
}

export function encodePayload(type, obj) {
  return `${PREFIX}.${type}.${b64urlEncode(utf8Encode(JSON.stringify(obj)))}`;
}

// Metnin içinden (WhatsApp mesajı vb.) kodu bulup çözer. Bulamazsa null.
export function decodePayload(text) {
  if (!text) return null;
  const m = String(text).match(/ING1\.([HR])\.([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    return { type: m[1], data: JSON.parse(utf8Decode(b64urlDecode(m[2]))) };
  } catch (e) {
    return null;
  }
}

// Sonuç paketini kompakt tut: { 'can-12': 1, 'can-13': 0 } -> "can:12.13|1.0" yerine
// okunabilirlik için düz obje bırakıyoruz; 40 cümle ~ 500 bayt, QR için sorun değil.

export function shortId() {
  return Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);
}

// Sınıf kodu: karışmasın diye 0/O, 1/I gibi harfler yok.
export function classCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}
