// Liste dosyası seç ve tablo satırlarına çevir: Excel (xlsx/xls/ods), CSV/TXT, Word (docx).
// Dosya cihazdan çıkmaz; okuma tamamen yerelde yapılır.
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

const SHEET_EXT = ['xlsx', 'xlsm', 'xls', 'ods', 'csv', 'txt', 'tsv'];
const MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'text/plain',
  'text/tab-separated-values',
  'application/octet-stream',
];

export class RosterFileError extends Error {}

async function readBytes(asset) {
  if (Platform.OS === 'web') {
    if (asset.file) return new Uint8Array(await asset.file.arrayBuffer());
    const res = await fetch(asset.uri);
    return new Uint8Array(await res.arrayBuffer());
  }
  const { File } = require('expo-file-system');
  return new File(asset.uri).bytes();
}

// SheetJS tarihleri UTC gece yarısı verir; saat dilimi kaymasın diye UTC bileşenlerini kullan.
const formatTrDate = (d) => {
  const x = new Date(d.getTime() + 12 * 3600e3);
  return `${String(x.getUTCDate()).padStart(2, '0')}.${String(x.getUTCMonth() + 1).padStart(2, '0')}.${x.getUTCFullYear()}`;
};

// Dikey birleşik hücreleri (ör. üç haftaya yayılan öğrenme çıktısı) alttaki satırlara da kopyala.
// Yatay birleşimlere dokunulmaz; aynı metin yan sütunlara taşmasın.
function fillVerticalMerges(ws) {
  (ws['!merges'] || []).forEach(({ s, e }) => {
    if (e.r === s.r) return;
    for (let c = s.c; c <= e.c; c++) {
      const top = ws[XLSX.utils.encode_cell({ r: s.r, c })];
      if (!top) continue;
      for (let r = s.r + 1; r <= e.r; r++) ws[XLSX.utils.encode_cell({ r, c })] = { ...top };
    }
  });
}

function sheetRows(bytes, fillMerges = false) {
  const wb = XLSX.read(bytes, { type: 'array', codepage: 65001, raw: false, cellDates: true });
  // En çok dolu satırı olan sayfayı al (kapak sayfası vb. atlansın).
  let best = [];
  wb.SheetNames.forEach((name) => {
    const ws = wb.Sheets[name];
    // Tarih hücreleri Türkçe biçimde (gg.aa.yyyy) gelsin; yoksa Excel ay/gün sırasıyla verebilir.
    Object.keys(ws).forEach((addr) => {
      const c = ws[addr];
      if (addr[0] !== '!' && c && c.t === 'd' && c.v instanceof Date) c.w = formatTrDate(c.v);
    });
    if (fillMerges) fillVerticalMerges(ws);
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false, raw: false });
    if (rows.length > best.length) best = rows;
  });
  return best.map((r) => r.map((c) => String(c)));
}

const decodeXml = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// Paragraf içindeki metin parçalarını birleştir.
function paraText(xml) {
  const parts = [];
  xml.replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(tab|br|cr)(?:\s[^>]*)?\/>/g, (m, t, tag) => {
    parts.push(t != null ? decodeXml(t) : tag === 'tab' ? '\t' : '\n');
    return m;
  });
  return parts.join('');
}

// docx: tablolar satır/hücre olarak, tablo dışı paragraflar tek hücreli satır olarak.
async function docxRows(bytes, replicate = false) {
  const zip = await JSZip.loadAsync(bytes);
  const doc = zip.file('word/document.xml');
  if (!doc) throw new RosterFileError('Word dosyası okunamadı.');
  const xml = await doc.async('string');
  const body = xml.replace(/^[\s\S]*?<w:body>/, '').replace(/<\/w:body>[\s\S]*$/, '');
  const rows = [];
  const tableRe = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
  let last = 0;
  let m;
  const pushParas = (chunk) => {
    (chunk.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || []).forEach((p) => {
      const t = paraText(p).trim();
      if (t) rows.push({ text: t });
    });
  };
  while ((m = tableRe.exec(body))) {
    pushParas(body.slice(last, m.index));
    (m[0].match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || []).forEach((tr) => {
      const cells = [];
      (tr.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || []).forEach((tc) => {
        cells.push((tc.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || []).map(paraText).join('\n').trim());
        // Yatay birleşik hücre (gridSpan=n): sütunlar kaymasın diye n-1 hücre ekle
        // (replicate: metni kapladığı sütunlara kopyala — yıllık planda "SCHOOL-BASED PLANNING" gibi).
        const span = tc.match(/<w:gridSpan\s+w:val="(\d+)"/);
        const text = cells[cells.length - 1];
        for (let i = 1; i < (span ? +span[1] : 1); i++) cells.push(replicate ? text : '');
      });
      if (cells.some(Boolean)) rows.push({ cells });
    });
    last = m.index + m[0].length;
  }
  pushParas(body.slice(last));
  return rows;
}

// Döner: { name, rows?: string[][], text?: string } — text dönerse metin ayıklayıcıya verilir.
// Öğrenci listesi ve yıllık plan aynı okuyucuyu kullanır.
export async function pickTableFile({ replicateSpans = false } = {}) {
  const res = await DocumentPicker.getDocumentAsync({ type: Platform.OS === 'web' ? '*/*' : MIME_TYPES, copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets || !res.assets[0]) return null;
  const asset = res.assets[0];
  const name = asset.name || 'dosya';
  const ext = (name.split('.').pop() || '').toLowerCase();

  if (ext === 'doc') throw new RosterFileError('Eski Word biçimi (.doc) okunamıyor. Dosyayı Word’de “Farklı Kaydet → .docx” ile kaydedip tekrar dene.');
  if (ext === 'pdf') throw new RosterFileError('PDF henüz desteklenmiyor. Dosyanın Word ya da Excel halini seç; liste ise PDF’teki metni kopyalayıp yapıştırabilirsin.');

  const bytes = await readBytes(asset);
  if (ext === 'docx') {
    const items = await docxRows(bytes, replicateSpans);
    const tables = items.filter((x) => x.cells);
    // Tablo varsa tabloyu kullan; yoksa paragrafları metin olarak ayıkla.
    // title: tablo dışındaki başlık paragrafları ("2026-2027 … 7. SINIF …") — plan yılı ve sınıf düzeyi için.
    const title = items.filter((x) => !x.cells).map((x) => x.text).slice(0, 5).join('\n');
    if (tables.length >= 3) return { name, rows: tables.map((x) => x.cells), title };
    return { name, text: items.map((x) => (x.cells ? x.cells.join('\t') : x.text)).join('\n') };
  }
  if (SHEET_EXT.includes(ext) || !ext) {
    if (ext === 'txt') {
      const rows = sheetRows(bytes);
      return { name, text: rows.map((r) => r.join('\t')).join('\n') };
    }
    return { name, rows: sheetRows(bytes, replicateSpans) };
  }
  throw new RosterFileError(`“.${ext}” dosyası desteklenmiyor. Excel (.xlsx, .xls), CSV, Word (.docx) ya da metin dosyası seç.`);
}

export const pickRosterFile = pickTableFile;
