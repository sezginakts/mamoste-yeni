// Eğitim-öğretim yılı takvimi (görsel): ana sayfadaki tarihe dokununca açılır. Ay ay ızgara: resmî tatil, öğrenci tatili
// (ara tatil / yarıyıl), arife, mesleki çalışma, ders günleri, bugün; güne dokununca o günün olayları. Ayın altında toplantı,
// dönem ve belirli gün listesi. Veri evrak/takvim.js (gömülü + yayındaki takvim.json, takvimYukle.js).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { Header, Chip } from '../../teacher/ui';
import { yilVerisi, ilkYil, isoDay, fromIso, gunDurumu, takvimYillari } from '../../teacher/evrak/takvim';
import { takvimDegisince } from '../../teacher/takvimYukle';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const GUN_UZUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
// Sabit anlam renkleri (temadan bağımsız okunsun): resmî tatil kırmızı, öğrenci tatili turuncu, mesleki çalışma mavi.
const RENK = { resmi: '#E2574C', ders: '#E9A23B', yarim: '#E2574C', mesleki: '#4F86E8' };
const TUR_ADI = { resmi: 'Resmî tatil', ders: 'Öğrenci tatili', yarim: 'Arife (yarım gün)', mesleki: 'Mesleki çalışma' };
const OLAY_SIMGE = { toplanti: '👥', gun: '🎗️', donem: '🎒' };

const gunFarki = (a, b) => Math.round((fromIso(a) - fromIso(b)) / 86400000);
const kisa = (iso) => `${+iso.slice(8, 10)} ${AYLAR[+iso.slice(5, 7) - 1]}`;

export default function TakvimScreen({ navigation }) {
  const { colors, shadow } = useTheme();
  const [, yenile] = useState(0);
  useEffect(() => takvimDegisince(() => yenile((x) => x + 1)), []);
  const bugun = new Date();
  const bugunIso = isoDay(bugun);
  const yillar = takvimYillari();
  const [yil, setYil] = useState(ilkYil(bugun));
  const v = yilVerisi(yil);
  const [secili, setSecili] = useState(bugunIso);
  const scroll = useRef(null);
  const ayY = useRef({});

  // Eylül → Temmuz
  const aylar = useMemo(() => Array.from({ length: 11 }, (_, i) => new Date(yil, 8 + i, 1, 12)), [yil]);

  // Bütün olaylar (tatil, mesleki, toplantı, belirli gün, dönem) başlangıç tarihine göre
  const olaylar = useMemo(() => {
    const out = [
      ...v.tatiller.map(([a, b, tur, ad]) => ({ a, b, tur: tur || 'resmi', ad: ad || TUR_ADI[tur || 'resmi'] })),
      ...(v.mesleki || []).map(([a, b, ad]) => ({ a, b, tur: 'mesleki', ad })),
      ...(v.olaylar || []).map(([a, ad, tur, b]) => ({ a, b: b || a, tur, ad })),
    ];
    return out.sort((x, y) => (x.a < y.a ? -1 : x.a > y.a ? 1 : 0));
  }, [v]);
  const siradaki = olaylar.filter((o) => o.b >= bugunIso && ['resmi', 'ders', 'donem'].includes(o.tur)).slice(0, 3);
  const bugunDurum = gunDurumu(bugun);

  useEffect(() => {
    // Açılışta bulunulan aya kay
    const t = setTimeout(() => {
      const k = `${bugun.getFullYear()}-${bugun.getMonth()}`;
      if (ayY.current[k] != null && scroll.current) scroll.current.scrollTo({ y: Math.max(0, ayY.current[k] - 8), animated: false });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yil]);

  const hucre = (d) => {
    const s = isoDay(d);
    const durum = gunDurumu(d);
    const haftaSonu = d.getDay() === 0 || d.getDay() === 6;
    const tur = durum.tatil ? durum.tatil[0] : durum.mesleki && !haftaSonu ? 'mesleki' : null;
    const renk = tur ? RENK[tur] : null;
    const bos = !tur && !durum.dersVar;
    return (
      <Pressable
        key={s}
        onPress={() => setSecili(s)}
        accessibilityLabel={`${d.getDate()} ${AYLAR[d.getMonth()]}${durum.tatil ? ', ' + durum.tatil[1] : ''}`}
        style={[
          st.hucre,
          renk && { backgroundColor: renk + (tur === 'yarim' ? '22' : '33') },
          s === bugunIso && { borderColor: colors.accent, borderWidth: 2 },
          s === secili && s !== bugunIso && { borderColor: colors.text, borderWidth: 1 },
        ]}
      >
        <Text style={{ color: haftaSonu || bos ? colors.textFaint : colors.text, fontWeight: s === bugunIso || tur ? '900' : '600', fontSize: font.small }}>{d.getDate()}</Text>
        {durum.olaylar.some((o) => o[2] !== 'gun') ? <View style={[st.nokta, { backgroundColor: colors.accent }]} /> : durum.olaylar.length ? <View style={[st.nokta, { backgroundColor: colors.textFaint }]} /> : null}
      </Pressable>
    );
  };

  const secDurum = gunDurumu(fromIso(secili));
  const secD = fromIso(secili);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Eğitim takvimi" subtitle={`${v.ad} eğitim-öğretim yılı`} onBack={() => navigation.goBack()} />
      <ScrollView ref={scroll} contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }}>
        {yillar.length > 1 ? (
          <View style={st.satir}>
            {yillar.map((y) => (
              <Chip key={y} small label={`${y}-${y + 1}`} active={y === yil} onPress={() => setYil(y)} />
            ))}
          </View>
        ) : null}
        {v.yaklasik ? (
          <Text style={{ color: colors.danger, fontSize: font.small }}>Bu yılın resmî takvimi henüz eklenmedi; günler önceki yıla göre yaklaşıktır.</Text>
        ) : null}

        {/* Bugün + sıradaki */}
        <View style={[st.kart, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 }}>BUGÜN</Text>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body, marginTop: 2 }}>
            {bugun.getDate()} {AYLAR[bugun.getMonth()]} {GUN_UZUN[bugun.getDay()]}
            {bugunDurum.tatil ? ` · ${bugunDurum.tatil[1]}` : bugunDurum.mesleki ? ` · ${bugunDurum.mesleki}` : bugunDurum.dersVar && bugun.getDay() % 6 ? ' · ders günü' : ''}
          </Text>
          {siradaki.length ? (
            <View style={{ marginTop: spacing.sm, gap: 4 }}>
              {siradaki.map((o, i) => {
                const kalan = gunFarki(o.a, bugunIso);
                return (
                  <Text key={i} style={{ color: colors.text, fontSize: font.small }}>
                    <Text style={{ color: o.tur === 'donem' ? colors.accent : RENK[o.tur] || colors.accent, fontWeight: '900' }}>● </Text>
                    {o.ad} — {kisa(o.a)}
                    {o.b !== o.a ? `–${kisa(o.b)}` : ''}
                    <Text style={{ color: colors.textMuted }}>{kalan > 0 ? ` · ${kalan} gün sonra` : kalan === 0 ? ' · bugün' : ' · sürüyor'}</Text>
                  </Text>
                );
              })}
            </View>
          ) : null}
        </View>

        {/* Açıklama */}
        <View style={[st.satir, { gap: spacing.md }]}>
          {['resmi', 'ders', 'mesleki'].map((k) => (
            <View key={k} style={[st.satir, { gap: 6 }]}>
              <View style={[st.kutu, { backgroundColor: RENK[k] + '55' }]} />
              <Text style={{ color: colors.textMuted, fontSize: font.small }}>{TUR_ADI[k]}</Text>
            </View>
          ))}
          <View style={[st.satir, { gap: 6 }]}>
            <View style={[st.nokta, { backgroundColor: colors.accent, position: 'relative', bottom: 0 }]} />
            <Text style={{ color: colors.textMuted, fontSize: font.small }}>Toplantı / dönem</Text>
          </View>
        </View>

        {aylar.map((ay) => {
          const y = ay.getFullYear();
          const m = ay.getMonth();
          const gunSayisi = new Date(y, m + 1, 0).getDate();
          const bas = (new Date(y, m, 1).getDay() + 6) % 7; // Pzt = 0
          const gunler = Array.from({ length: gunSayisi }, (_, i) => new Date(y, m, i + 1, 12));
          const ayOlay = olaylar.filter((o) => +o.a.slice(0, 4) === y && +o.a.slice(5, 7) === m + 1);
          const seciliBuAyda = secD.getFullYear() === y && secD.getMonth() === m;
          return (
            <View
              key={`${y}-${m}`}
              onLayout={(e) => (ayY.current[`${y}-${m}`] = e.nativeEvent.layout.y)}
              style={[st.kart, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.h3, marginBottom: spacing.sm }}>
                {AYLAR[m]} {y}
              </Text>
              <View style={st.izgara}>
                {GUNLER.map((g) => (
                  <Text key={g} style={[st.baslik, { color: colors.textFaint }]}>
                    {g}
                  </Text>
                ))}
                {Array.from({ length: bas }, (_, i) => (
                  <View key={`b${i}`} style={st.hucre} />
                ))}
                {gunler.map(hucre)}
              </View>

              {seciliBuAyda ? (
                <View style={[st.detay, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={{ color: colors.text, fontWeight: '900' }}>
                    {secD.getDate()} {AYLAR[secD.getMonth()]} {GUN_UZUN[secD.getDay()]}
                  </Text>
                  {secDurum.tatil ? <Text style={{ color: RENK[secDurum.tatil[0]], fontWeight: '800' }}>{secDurum.tatil[1]}</Text> : null}
                  {secDurum.mesleki ? <Text style={{ color: RENK.mesleki, fontWeight: '800' }}>{secDurum.mesleki}</Text> : null}
                  {secDurum.olaylar.map((o, i) => (
                    <Text key={i} style={{ color: colors.text, fontSize: font.small }}>
                      {OLAY_SIMGE[o[2]] || '•'} {o[1]}
                    </Text>
                  ))}
                  {!secDurum.tatil && !secDurum.mesleki && !secDurum.olaylar.length ? (
                    <Text style={{ color: colors.textMuted, fontSize: font.small }}>{secD.getDay() % 6 && secDurum.dersVar ? 'Ders günü' : 'Bu gün için kayıt yok'}</Text>
                  ) : null}
                </View>
              ) : null}

              {ayOlay.length ? (
                <View style={{ marginTop: spacing.sm, gap: 4 }}>
                  {ayOlay.map((o, i) => (
                    <Pressable key={i} onPress={() => setSecili(o.a)} style={st.satir}>
                      <Text style={{ color: colors.textMuted, fontSize: font.small, width: 78 }}>
                        {+o.a.slice(8, 10)}
                        {o.b !== o.a ? `–${o.b.slice(5, 7) === o.a.slice(5, 7) ? +o.b.slice(8, 10) : kisa(o.b)}` : ''}
                      </Text>
                      <Text style={{ color: RENK[o.tur] || colors.text, fontSize: font.small, flex: 1, fontWeight: RENK[o.tur] ? '800' : '600' }}>
                        {OLAY_SIMGE[o.tur] ? `${OLAY_SIMGE[o.tur]} ` : ''}
                        {o.ad}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}

        {v.kaynak ? (
          <Pressable onPress={() => Linking.openURL(v.kaynak)} accessibilityRole="link">
            <Text style={{ color: colors.accent, fontSize: font.small, fontWeight: '800' }}>Kaynak: MEB {v.ad} çalışma takvimi ›</Text>
          </Pressable>
        ) : null}
        {v.not ? <Text style={{ color: colors.textFaint, fontSize: font.tiny }}>{v.not}</Text> : null}
        <Text style={{ color: colors.textFaint, fontSize: font.tiny }}>Takvim her yıl güncellenir; yeni yılın takvimi uygulamaya kendiliğinden gelir. Evrakların varsayılan tarihleri de bu takvimden alınır.</Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  kart: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  satir: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  izgara: { flexDirection: 'row', flexWrap: 'wrap' },
  baslik: { width: `${100 / 7}%`, textAlign: 'center', fontSize: font.tiny, fontWeight: '800', marginBottom: 4 },
  hucre: { width: `${100 / 7}%`, aspectRatio: 1.15, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 0, borderColor: 'transparent' },
  nokta: { width: 5, height: 5, borderRadius: 3, position: 'absolute', bottom: 4 },
  kutu: { width: 14, height: 14, borderRadius: 4 },
  detay: { marginTop: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, gap: 2 },
});
