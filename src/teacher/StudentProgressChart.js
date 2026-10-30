// Öğrenci kartındaki "yıl içinde gelişim" grafiği: aylık kümülatif puan çizgisi + kategori toplamları.
// Sade ve anlaşılır: tek çizgi, dönem başından bugüne yükseliş; altta 4 kategorinin toplamı.
import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { spacing, font, radius } from '../theme';
import { studentYearSeries, pointsByTag, POINT_TAGS } from './analytics';

const RENK = { 'Katılım': '#0D9488', 'Ödev': '#0284C7', 'Hazırlıklı': '#D99A1E', 'Sosyal ve Saygı': '#E2574C' };

export default function StudentProgressChart({ student, colors }) {
  const { width } = useWindowDimensions();
  const seri = studentYearSeries(student);
  const toplamlar = pointsByTag(student);
  const toplam = seri.kum.length ? seri.kum[seri.kum.length - 1] : 0;
  const enBuyuk = Math.max(1, ...seri.kum, 0);
  const enKucuk = Math.min(0, ...seri.kum);
  const gecerli = seri.kum.some((v, i) => v !== 0 || seri.net[i] !== 0);

  const kart = Math.min(width - spacing.md * 2, 560);
  const G = 24; // grafik iç boşluğu
  const GW = kart - G * 2; // çizim genişliği
  const GH = 132; // çizim yüksekliği
  const n = seri.kum.length;
  const x = (i) => G + (GW * i) / Math.max(1, n - 1);
  const y = (v) => G + GH - ((v - enKucuk) / (enBuyuk - enKucuk || 1)) * GH;
  const noktalar = seri.kum.map((v, i) => [x(i), y(v)]);
  const cizgi = noktalar.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const alan = `${cizgi} L${noktalar[n - 1][0].toFixed(1)} ${y(enKucuk).toFixed(1)} L${noktalar[0][0].toFixed(1)} ${y(enKucuk).toFixed(1)} Z`;
  const sifirY = y(0);

  return (
    <View style={[st.kart, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: colors.text, fontSize: font.h2, fontWeight: '900' }}>{toplam > 0 ? '+' : ''}{toplam}</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '700' }}>yıl toplamı</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: font.tiny }}>Eylül → Haziran</Text>
      </View>

      {gecerli ? (
        <View style={{ marginTop: spacing.sm }}>
          <Svg width={kart} height={GH + G * 2 + 18}>
            <Defs>
              <LinearGradient id="gelisim" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity="0.28" />
                <Stop offset="1" stopColor={colors.accent} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>
            {/* sıfır çizgisi ve ızgara */}
            <Line x1={G} y1={sifirY} x2={G + GW} y2={sifirY} stroke={colors.border} strokeWidth="1" strokeDasharray="4 4" />
            <Line x1={G} y1={y(enBuyuk)} x2={G + GW} y2={y(enBuyuk)} stroke={colors.border} strokeWidth="0.5" />
            <Path d={alan} fill="url(#gelisim)" />
            <Path d={cizgi} fill="none" stroke={colors.accent} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
            {noktalar.map(([px, py], i) => (
              <Circle key={i} cx={px} cy={py} r={seri.net[i] !== 0 ? 3.6 : 2.4} fill={colors.card} stroke={colors.accent} strokeWidth="2" />
            ))}
          </Svg>
          {/* ay adları */}
          <View style={{ flexDirection: 'row', marginTop: -6, paddingHorizontal: 4 }}>
            {seri.aylar.map((a, i) => (
              <Text key={a.ad} style={{ flex: 1, textAlign: 'center', color: colors.textFaint, fontSize: 9.5, fontWeight: '700' }}>{a.ad}</Text>
            ))}
          </View>
        </View>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: spacing.md }}>
          Henüz puan yok. Katılım / Ödev / Hazırlıklı / Sosyal ve Saygı satırlarından + verdikçe grafik dolar.
        </Text>
      )}

      {/* Kategori toplamları */}
      <View style={st.kategoriler}>
        {POINT_TAGS.map((t) => {
          const v = toplamlar[t] || 0;
          return (
            <View key={t} style={[st.kat, { borderColor: colors.border }]}>
              <View style={[st.nokta, { backgroundColor: RENK[t] || colors.accent }]} />
              <Text style={{ color: colors.textMuted, fontSize: 10.5, fontWeight: '700', flex: 1 }} numberOfLines={1}>{t}</Text>
              <Text style={{ color: v > 0 ? colors.text : colors.textFaint, fontSize: font.small, fontWeight: '900' }}>{v > 0 ? `+${v}` : v}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  kart: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.xs },
  kategoriler: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  kat: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5, minWidth: '47%', flexGrow: 1 },
  nokta: { width: 8, height: 8, borderRadius: 4 },
});
