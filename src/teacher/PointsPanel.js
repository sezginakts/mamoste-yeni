// Puan paneli: aynı gün + aynı etiket TEK satırda birikir (+1 +1 → 2).
// Üstte tarih seçimi (Bugün / Yarın / 1 hafta sonra / tekerlekli takvim), altta etiket satırları.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { spacing, font, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { pointsOnDay, POINT_TAGS } from './analytics';
import DateWheel from '../components/DateWheel';

const GUN_ADI = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const AY_ADI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const tarihYaz = (ms) => {
  const d = new Date(ms);
  return `${GUN_ADI[d.getDay()]}, ${d.getDate()} ${AY_ADI[d.getMonth()]}`;
};
const ayniGun = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

export default function PointsPanel({ student, onAdd, onRemove, colors: disRenk }) {
  const tema = useTheme();
  const colors = disRenk || tema.colors;
  const [zaman, setZaman] = useState(() => Date.now());
  const [takvim, setTakvim] = useState(false);

  const gun = useMemo(() => pointsOnDay(student, zaman), [student, zaman]);
  const bugun = Date.now();

  const kisayol = (gunFarki, ad) => {
    const d = new Date();
    d.setDate(d.getDate() + gunFarki);
    d.setHours(12, 0, 0, 0);
    const secili = ayniGun(d.getTime(), zaman);
    return (
      <Pressable key={ad} onPress={() => setZaman(d.getTime())} style={[st.kisa, { borderColor: secili ? colors.accent : colors.border, backgroundColor: secili ? colors.accent + '14' : 'transparent' }]}>
        <Text style={{ color: secili ? colors.accent : colors.textMuted, fontWeight: '800', fontSize: font.tiny }}>{ad}</Text>
      </Pressable>
    );
  };

  const toplamBugun = useMemo(() => (student.points || []).reduce((s, p) => s + (p.d || 0), 0), [student.points]);

  return (
    <View style={[st.kart, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Başlık: genel toplam + seçili gün toplamı */}
      <View style={st.ust}>
        <View>
          <Text style={{ color: colors.text, fontSize: font.h2, fontWeight: '900' }}>{toplamBugun > 0 ? '+' : ''}{toplamBugun}</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '700' }}>toplam puan</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: colors.textMuted, fontSize: font.tiny }}>{tarihYaz(zaman)}</Text>
          <Text style={{ color: gun.toplam > 0 ? colors.success : gun.toplam < 0 ? colors.danger : colors.textMuted, fontSize: font.h3, fontWeight: '900' }}>
            {gun.toplam > 0 ? '+' : ''}{gun.toplam} gün
          </Text>
        </View>
      </View>

      {/* Tarih seçimi */}
      <View style={st.tarihSatir}>
        {kisayol(0, 'Bugün')}
        {kisayol(1, 'Yarın')}
        {kisayol(7, '1 hafta sonra')}
        <Pressable onPress={() => setTakvim(true)} style={[st.kisa, { borderColor: colors.border }]} accessibilityLabel="Tarih seç">
          <Text style={{ color: colors.accent, fontWeight: '800', fontSize: font.tiny }}>📅 Tarih</Text>
        </Pressable>
      </View>

      {/* Etiket satırları: tek satırda birikir */}
      {POINT_TAGS.map((tg) => {
        const sayi = gun.etiketler[tg] || 0;
        return (
          <View key={tg} style={[st.satir, { borderTopColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>{tg}</Text>
            <Pressable
              onPress={() => onAdd(-1, tg, zaman)}
              hitSlop={6}
              style={[st.adim, { borderColor: colors.border }]}
              accessibilityLabel={`${tg} eksi bir`}
            >
              <Text style={{ color: colors.danger, fontWeight: '900', fontSize: font.body }}>−</Text>
            </Pressable>
            <Text style={{ width: 40, textAlign: 'center', color: sayi > 0 ? colors.success : sayi < 0 ? colors.danger : colors.textFaint, fontWeight: '900', fontSize: font.body }}>
              {sayi > 0 ? `+${sayi}` : sayi}
            </Text>
            <Pressable
              onPress={() => onAdd(1, tg, zaman)}
              hitSlop={6}
              style={[st.adim, { borderColor: colors.border, backgroundColor: colors.accent + '12' }]}
              accessibilityLabel={`${tg} artı bir`}
            >
              <Text style={{ color: colors.accent, fontWeight: '900', fontSize: font.body }}>+</Text>
            </Pressable>
          </View>
        );
      })}

      {/* O günün kayıtları (silinebilir) */}
      {(student.points || []).filter((p) => p && p.at && new Date(p.at).toDateString() === new Date(zaman).toDateString()).length ? (
        <View style={{ marginTop: spacing.sm }}>
          {(student.points || [])
            .filter((p) => p && p.at && new Date(p.at).toDateString() === new Date(zaman).toDateString())
            .sort((a, b) => b.at - a.at)
            .map((p) => (
              <View key={p.id} style={st.kayit}>
                <Text style={{ color: p.d > 0 ? colors.success : colors.danger, fontWeight: '900', width: 44 }}>{p.d > 0 ? `+${p.d}` : p.d}</Text>
                <Text style={{ color: colors.textMuted, flex: 1 }}>{p.tag || 'Puan'}</Text>
                <Pressable onPress={() => onRemove(p.id)} hitSlop={8} accessibilityLabel="Kaydı sil">
                  <Text style={{ color: colors.textFaint }}>✕</Text>
                </Pressable>
              </View>
            ))}
        </View>
      ) : null}

      <DateWheel visible={takvim} value={zaman} onClose={() => setTakvim(false)} onPick={(ms) => setZaman(ms)} />
    </View>
  );
}

const st = StyleSheet.create({
  kart: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.xs },
  ust: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  tarihSatir: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  kisa: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  satir: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 6, gap: 6 },
  adim: { width: 34, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kayit: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
});
