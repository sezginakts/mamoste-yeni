// Ana sayfa haftalık ders programı ızgarası (salt okunur). Büyük varyantı tam ekran modalda kullanılır.
// Günler üstte, saatler solda; günlerin saat düzeni farklıysa (iki okul) saat hücrenin içinde gösterilir.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { font, radius, timetableColorFor } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useDesk, weekdayOf, ogleOf } from './DeskContext';
import { classColor } from '../screens/teacher/TimetableScreen';
import { branchOf } from '../data/branches';

const GUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'];

// alan: { h } verilirse (tam ekran) ızgara bu yüksekliğe TAM sığar — satır yüksekliği ve yazı boyu ondan hesaplanır,
// kaydırma gerekmez.
export default function HomeTimetable({ buyuk = false, alan = null }) {
  const { colors } = useTheme();
  const desk = useDesk();
  const [genis, setGenis] = useState(0); // ızgaranın ölçülen genişliği (yazı boyu buradan)
  const week = desk.weekLessons();
  const bugun = weekdayOf();
  // Program girilmemişse bile 4 satırlık boş ızgara görünür.
  const enSonDers = week.reduce((m, l) => Math.max(m, l.period), 0);
  const sonDers = week.length ? Math.max(enSonDers, 1) : 4;

  const doluSaat = (liste) => Array.isArray(liste) && liste.some((p) => p && p.start);
  // Saatler soldaki sütunda, kutuların içinde değil. Sütun SEÇİLİ okulun (1. / 2. okul) saatlerini gösterir;
  // seçim Ders Programı ekranındaki "Saat düzeni"nden yapılır ve öğretmen değiştirene kadar kalır (desk.activeSchedule).
  const duzenler = desk.schedules || {};
  const secili = duzenler[desk.activeSchedule] || {};
  // Saat sütununun düzeni: seçili okul; onun saati yoksa saati girilmiş öbür okul.
  const gosterilen = doluSaat(secili.periods) ? secili : Object.values(duzenler).find((d) => doluSaat(d.periods)) || secili;
  const saatler = gosterilen.periods || [];
  const saatVar = Object.values(duzenler).some((d) => doluSaat(d.periods));
  const en = (day, period) => week.find((w) => w.day === day && w.period === period) || null;
  // O okulda öğle arası seçiliyse o dersten sonra bütün haftaya tek ince şerit (son dersten sonraysa gösterilmez).
  const ogleHam = ogleOf(gosterilen);
  const ogle = ogleHam && ogleHam < sonDers ? ogleHam : 0;
  const ogleT = buyuk || alan ? 10 : 8;
  const ogleY = ogle ? Math.round(ogleT * 1.25) + 4 : 0;

  const sinirla = (v, a, b) => Math.max(a, Math.min(b, v));
  const notY = (!saatVar ? 18 : 0) + (!week.length ? 20 : 0) + ogleY;
  // Tam ekran: başlık satırı ~28 px, kalan yükseklik ders satırlarına bölünür.
  const sigY = alan && alan.h ? Math.floor((alan.h - 30 - notY) / sonDers) : null;
  const olcu = sigY
    ? {
        saatKolon: 74,
        gunT: 14,
        saatT: sinirla(Math.round(sigY * 0.26), 9, 13),
        hucreY: sigY,
        sabitY: true,
        boxT: sinirla(Math.round(sigY * 0.36), 10, 20),
        boxTag: sinirla(Math.round(sigY * 0.24), 8, 12),
        headPad: 4,
      }
    : {
        saatKolon: buyuk ? 94 : 56,
        gunT: buyuk ? 15 : 10,
        saatT: buyuk ? 13 : 9,
        hucreY: buyuk ? 58 : 34,
        boxT: buyuk ? 17 : 10,
        boxTag: buyuk ? 12 : 8,
        headPad: buyuk ? 8 : 4,
      };
  // Tam ekranda satır kısaysa (telefon yatay: ~35 px) sınıf + ders alt alta SIĞMAZ ve kesiliyordu;
  // o zaman ikisi tek satıra yan yana dizilir, yazı boyu satır yüksekliğinden hesaplanır.
  if (sigY) {
    const ic = sigY - 12; // hücre + kutu boşlukları ve kenarlık
    olcu.tekSatir = ic < (olcu.boxT + olcu.boxTag) * 1.3;
    if (olcu.tekSatir) {
      olcu.boxT = sinirla(Math.round(ic * 0.62), 10, 18);
      olcu.boxTag = sinirla(Math.round(ic * 0.46), 9, 13);
    }
  }
  // TASARIM KURALI: aynı türdeki yazılar (sınıf adları, ders kısaltmaları, saatler, günler) HEP AYNI BOYDA.
  // Yazı tek tek küçülmez ("sığdır" / adjustsFontSizeToFit YOK): iOS yan yana duran yazının genişliğini bazen sıfıra
  // yakın ölçüp tek bir sınıf adını (ör. 8-A) minicik yazıyordu. Bunun yerine ızgaranın genişliği ölçülür ve en uzun
  // yazı sığacak boy BİR KEZ hesaplanıp hepsine verilir. Telefonun yazı büyütme ayarı da ızgarayı bozmasın diye
  // ızgara yazıları büyütülmez (maxFontSizeMultiplier 1).
  const W = genis || (alan && alan.w) || 0;
  if (W) {
    const harf = 0.66; // kalın Manrope'ta bir harfin yaklaşık eni (yazı boyuna oranı)
    const uzun = (f, en) => week.reduce((m, l) => Math.max(m, String(f(l) || '').length), en);
    const etiketN = uzun((l) => l.label, 3);
    const dersN = uzun((l) => l.ders && branchOf(l.ders).short, 2);
    const hucreW = (W - olcu.saatKolon) / 5 - 2 - 2; // hücre iç boşluğu + kenarlık
    if (olcu.tekSatir) {
      const yer = hucreW - 8 - 5; // kutu iç boşluğu + iki yazı arası
      const gerek = etiketN * olcu.boxT * harf + dersN * olcu.boxTag * harf;
      if (gerek > yer) {
        const k = yer / gerek;
        olcu.boxT = Math.floor(olcu.boxT * k);
        olcu.boxTag = Math.floor(olcu.boxTag * k);
      }
    } else {
      const yer = hucreW - 4; // kutu iç boşluğu
      olcu.boxT = Math.min(olcu.boxT, Math.floor(yer / (etiketN * harf)));
      olcu.boxTag = Math.min(olcu.boxTag, Math.floor(yer / (dersN * harf)));
    }
    // Saat sütunu: numara (1.) + "08:10"
    olcu.saatT = Math.min(olcu.saatT, Math.floor((olcu.saatKolon - 2 - 19) / (5 * 0.62)));
  }
  // Soldaki saat sütunu kısa satırda (telefon yatay) bitiş saati yazılmaz, yalnız başlangıç kalır.
  const saatSiga = (n) => !olcu.sabitY || olcu.hucreY >= n * olcu.saatT * 1.25 + 2;
  const satirY = (fs) => (olcu.sabitY ? { lineHeight: Math.round(fs * 1.25), includeFontPadding: false } : null);
  const sigdir = { numberOfLines: 1, maxFontSizeMultiplier: 1 };
  const kutuYazi = sigdir;

  return (
    <View onLayout={(e) => { const w = Math.round(e.nativeEvent.layout.width); if (w && w !== genis) setGenis(w); }}>
      {/* Gün başlıkları (üstte) */}
      <View style={[st.row, { borderBottomColor: colors.border }]}>
        <Text style={[st.saatBaslik, { width: olcu.saatKolon, color: colors.textFaint, fontSize: buyuk ? 11 : 9 }]} {...sigdir}>SAAT</Text>
        {GUN.map((g, i) => {
          const isToday = i + 1 === bugun;
          return (
            <View key={g} style={[st.gun, { paddingVertical: olcu.headPad }, isToday && { backgroundColor: colors.accent, borderRadius: radius.sm }]}>
              <Text style={[st.gunT, { color: isToday ? colors.onAccent : colors.textMuted, fontSize: olcu.gunT }]} {...sigdir}>{g}</Text>
            </View>
          );
        })}
      </View>

      {/* Saatler solda */}
      {Array.from({ length: sonDers }, (_, i) => {
        const period = i + 1;
        const s = saatler[i] || {};
        const bitisVar = !!s.end && saatSiga(2);
        return (
          <React.Fragment key={period}>
          {ogle && period === ogle + 1 ? (
            <View style={[st.ogle, { height: ogleY, borderTopColor: colors.border, backgroundColor: colors.cardSoft }]}>
              <Text style={[st.ogleT, { color: colors.textMuted, fontSize: ogleT, lineHeight: Math.round(ogleT * 1.25) }]} {...sigdir}>ÖĞLE ARASI</Text>
            </View>
          ) : null}
          <View style={[st.row, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <View style={[st.saatKolon, { width: olcu.saatKolon }, olcu.sabitY && { paddingVertical: 0, height: olcu.hucreY }]}>
              {s.start ? (
                // Saatin solunda kaçıncı ders olduğu (1. 2. 3.); başlık/açıklama yok.
                <View style={st.saatSatir}>
                  <Text style={[st.no, { color: colors.textMuted, fontSize: olcu.saatT }, satirY(olcu.saatT)]} {...sigdir}>{period}.</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.saatT, { color: colors.text, fontSize: olcu.saatT }, satirY(olcu.saatT)]} {...sigdir}>{s.start}</Text>
                    {bitisVar ? <Text style={[st.saatT, { color: colors.textFaint, fontSize: olcu.saatT }, satirY(olcu.saatT)]} {...sigdir}>{s.end}</Text> : null}
                  </View>
                </View>
              ) : (
                <Text style={[st.saatT, { color: colors.textMuted, fontSize: olcu.saatT }]} {...sigdir}>{period}.</Text>
              )}
            </View>
            {[1, 2, 3, 4, 5].map((d) => {
              const l = en(d, period);
              const col = l && l.label ? timetableColorFor(l.label) : null;
              // 5. sınıf: yalnız ders programında sarı zemin (diğer ekranlarda sınıf rengi değişmez).
              const besMi = !!(l && l.label && /^\s*5\s*[-/.\s]/.test(l.label));
              const isToday = d === bugun;
              return (
                <View key={d} style={[st.hucre, olcu.sabitY ? { height: olcu.hucreY, overflow: 'hidden' } : { minHeight: olcu.hucreY }, isToday && { backgroundColor: colors.accent + '0D' }]}>
                  {l ? (
                    <View style={[st.kutu, olcu.sabitY && { flex: 1, paddingVertical: 1 }, olcu.tekSatir && st.kutuSatir, { backgroundColor: besMi ? '#FEF3C7' : col + '1F', borderColor: besMi ? '#F5B301' : col + '66' }]}>
                      <Text style={[st.kutuT, { color: colors.text, fontSize: olcu.boxT }, !olcu.tekSatir && { flexShrink: 1 }, satirY(olcu.boxT)]} {...kutuYazi}>{l.label || '—'}</Text>
                      {l.ders ? <Text style={[st.kutuTag, { color: besMi ? '#92610B' : col, fontSize: olcu.boxTag }, satirY(olcu.boxTag)]} {...kutuYazi}>{branchOf(l.ders).short}</Text> : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
          </React.Fragment>
        );
      })}
      {!saatVar ? (
        <Text style={{ color: colors.textFaint, fontSize: buyuk ? 12 : 10, marginTop: 6 }}>Saatler henüz girilmemiş.</Text>
      ) : null}
      {!week.length ? (
        <Text style={{ color: colors.textMuted, fontSize: buyuk ? 13 : 11, marginTop: 6 }}>Ders programı henüz girilmemiş — Düzenle › ile ekle.</Text>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  saatBaslik: { fontWeight: '900', letterSpacing: 0.5, paddingVertical: 4 },
  gun: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gunT: { fontWeight: '900' },
  saatKolon: { justifyContent: 'center', paddingVertical: 6, paddingRight: 2, overflow: 'hidden' },
  saatT: { fontWeight: '700' },
  saatSatir: { flexDirection: 'row', alignItems: 'center' },
  no: { fontWeight: '900', minWidth: 16, marginRight: 3 },
  hucre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 1, paddingVertical: 3 },
  kutu: { width: '100%', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 7, paddingVertical: 4, paddingHorizontal: 2 },
  kutuSatir: { flexDirection: 'row', gap: 5, paddingHorizontal: 4 },
  kutuT: { fontWeight: '900' },
  kutuTag: { fontWeight: '900', letterSpacing: 0.3 },
  ogle: { borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  ogleT: { fontWeight: '900', letterSpacing: 2, includeFontPadding: false },
});
