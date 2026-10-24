// Kumanda: tahtada açık etkinliği telefondan yönet (teacher/BoardLink). params.type: etkinlik türü.
// Sınıf düzeyi seçilince o içerik tahtada açılır. Kalıp Tahtası tam kumandalıdır (oyun durumunu bildirir:
// cümle, Türkçesi, puan, sıra); diğer oyunlar tahtada dokunarak oynanır, buradan açılıp kapatılır.
import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useRole } from '../../context/RoleContext';
import { Header, Chip } from '../../teacher/ui';
import { useBoardLink } from '../../teacher/BoardLink';
import { activitiesFor, ACTIVITY_TYPES } from '../../data/activities';
import { showCode } from './BoardConnectScreen';

const gradeKey = (branchId, type) => `@ingapp/activity-grade/${branchId}-${type}`;
const TEAMS = ['Mercan', 'Turkuaz'];

export default function BoardRemoteScreen({ navigation, route }) {
  const { colors, shadow } = useTheme();
  const { branchId } = useRole();
  const link = useBoardLink();
  const type = route.params && route.params.type;
  const t = ACTIVITY_TYPES[type] || {};
  const items = useMemo(() => activitiesFor(branchId).filter((a) => a.type === type).sort((a, b) => (a.grade || 0) - (b.grade || 0)), [branchId, type]);
  const openHere = link.open && items.find((a) => a.id === link.open.id);
  const d = link.durum && link.durum.oyun === 'kalip' && openHere && openHere.type === 'kalip' ? link.durum : null;

  const open = (a) => {
    link.openActivity(a);
    AsyncStorage.setItem(gradeKey(branchId, type), a.id).catch(() => {});
    setTimeout(() => link.command('durum'), 1500);
  };

  // İlk girişte bu tür tahtada açık değilse son seçilen (yoksa ilk) düzeyi aç.
  useEffect(() => {
    if (!link.linked || openHere || !items.length) return;
    AsyncStorage.getItem(gradeKey(branchId, type))
      .then((id) => open(items.find((a) => a.id === id) || items[0]))
      .catch(() => open(items[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link.linked]);

  if (!link.linked) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Kumanda" onBack={() => navigation.goBack()} />
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: font.body, textAlign: 'center' }}>Tahtaya bağlı değilsin.</Text>
          <Pressable onPress={() => navigation.replace('BoardConnect')} style={[st.btn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: colors.onPrimary, fontWeight: '900' }}>📶 Kodla bağlan</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const cmd = (k, extra) => () => link.command(k, extra);
  // bg yoksa açık düğme: kart rengi + kenarlık (zeminle karışmasın).
  const Big = ({ label, onPress, bg, fg = '#fff', flex = 1 }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [st.big, bg ? { backgroundColor: bg } : { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border }, { flex }, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
    >
      <Text style={{ color: fg, fontWeight: '900', fontSize: font.h3 }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title={`${t.icon || ''} ${t.name || 'Kumanda'}`}
        subtitle={`${link.status === 'lost' ? '🟠 Bağlantı zayıf' : '🟢 Tahtaya bağlı'} · ${showCode(link.code)}`}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }}>
        {items.length > 1 ? (
          <View style={st.wrap}>
            {items.map((a) => (
              <Chip key={a.id} label={a.grade ? `${a.grade}. sınıf` : a.unitName} active={openHere && openHere.id === a.id} onPress={() => open(a)} />
            ))}
          </View>
        ) : null}

        {type !== 'kalip' ? (
          <View style={[st.card, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 36, textAlign: 'center' }}>{t.icon}</Text>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.h3, textAlign: 'center' }}>{openHere ? 'Tahtada açık' : 'Açılıyor…'}</Text>
            <Text style={{ color: colors.textMuted, textAlign: 'center', lineHeight: 21 }}>Bu oyun tahtada dokunarak oynanır.</Text>
          </View>
        ) : !d ? (
          <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Tahtadan bilgi bekleniyor…</Text>
            <Pressable onPress={cmd('durum')} hitSlop={8} style={{ alignSelf: 'center' }}>
              <Text style={{ color: colors.accent, fontWeight: '800' }}>Yenile</Text>
            </Pressable>
          </View>
        ) : d.ekran === 'giris' ? (
          <>
            <Text style={[st.label, { color: colors.textMuted }]}>KALIP</Text>
            <View style={st.wrap}>
              {(d.kaliplar || []).map((ad, i) => (
                <Chip key={ad} small label={ad} active={d.kalip === i} onPress={cmd('kalip', { i })} />
              ))}
            </View>
            <Text style={[st.label, { color: colors.textMuted }]}>MOD</Text>
            <View style={st.wrap}>
              <Chip label="📖 Oku-tekrarla" active={d.mod === 'oku'} onPress={cmd('ayar', { ad: 'mod', v: 'oku' })} />
              <Chip label="🔁 Türkçeden çevir" active={d.mod === 'cevir'} onPress={cmd('ayar', { ad: 'mod', v: 'cevir' })} />
            </View>
            <Text style={[st.label, { color: colors.textMuted }]}>OYUNCU</Text>
            <View style={st.wrap}>
              <Chip label="👤 Sınıf" active={d.oyuncu === 'tek'} onPress={cmd('ayar', { ad: 'oyuncu', v: 'tek' })} />
              <Chip label="👥 İki takım" active={d.oyuncu === 'takim'} onPress={cmd('ayar', { ad: 'oyuncu', v: 'takim' })} />
            </View>
            <Big label="Başla ▶" onPress={cmd('basla')} bg={colors.primary} fg={colors.onPrimary} />
          </>
        ) : d.ekran === 'bitis' ? (
          <View style={[st.card, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 44, textAlign: 'center' }}>🏆</Text>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.h3, textAlign: 'center' }}>
              {d.oyuncu === 'takim' ? `${TEAMS[0]} ${d.puan[0]} – ${d.puan[1]} ${TEAMS[1]}` : `${d.puan[0]} / ${d.n} doğru`}
            </Text>
            <View style={st.row}>
              <Big label="⚙︎ Ayarlar" onPress={cmd('giris')} fg={colors.text} />
              <Big label="↻ Tekrar" onPress={cmd('basla')} bg={colors.primary} fg={colors.onPrimary} />
            </View>
          </View>
        ) : (
          <>
            {/* Öğretmen cevabı hep görür; tahtada ne göründüğü moda ve "Cevap"a bağlı. */}
            <View style={[st.card, shadow, { backgroundColor: colors.card, borderColor: colors.accent }]}>
              <View style={st.row}>
                <Text style={{ color: colors.textMuted, fontWeight: '800', flex: 1 }}>
                  {d.i + 1} / {d.n}
                  {d.sonuc ? (d.sonuc === 'd' ? '  ✅' : '  ❌') : ''}
                </Text>
                <Text style={{ color: colors.textMuted, fontWeight: '800' }}>
                  {d.oyuncu === 'takim' ? `${TEAMS[0]} ${d.puan[0]} · ${TEAMS[1]} ${d.puan[1]}` : `Doğru ${d.puan[0]}`}
                </Text>
              </View>
              {d.oyuncu === 'takim' && !d.sonuc ? (
                <Text style={{ color: d.sira === 0 ? '#E2574C' : '#0D9488', fontWeight: '900' }}>Sıra: {TEAMS[d.sira]} Takımı</Text>
              ) : null}
              <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900', lineHeight: 34 }}>{d.en}</Text>
              <Text style={{ color: colors.textMuted, fontSize: font.body, fontStyle: 'italic' }}>🇹🇷 {d.tr}</Text>
              <Text style={{ color: colors.textFaint, fontSize: font.tiny }}>
                Tahtada: {d.mod === 'cevir' ? (d.acik ? 'İngilizcesi açık' : 'yalnız Türkçesi') : d.acik ? 'Türkçesi açık' : 'yalnız İngilizcesi'}
              </Text>
            </View>
            <View style={st.row}>
              <Big label="✓ Doğru" onPress={cmd('dogru')} bg={colors.success} />
              <Big label="✗ Yanlış" onPress={cmd('yanlis')} bg={colors.danger} />
            </View>
            <View style={st.row}>
              <Big label="◀" onPress={cmd('onceki')} fg={colors.text} flex={0.6} />
              <Big label="🔊" onPress={cmd('dinle')} fg={colors.text} flex={0.7} />
              <Big label={d.acik ? '👁 Gizle' : '👁 Cevap'} onPress={cmd('cevap')} fg={colors.text} />
              <Big label="▶" onPress={cmd('sonraki')} bg={colors.primary} fg={colors.onPrimary} flex={0.8} />
            </View>
            {d.mevcut ? (
              <View style={st.row}>
                <Big label={d.soz ? `🎲 Söz: ${d.soz}` : '🎲 Söz ver'} onPress={cmd('soz')} bg={colors.second} />
                {d.soz ? <Big label="Sözü kapat" onPress={cmd('sozKapat')} fg={colors.text} flex={0.8} /> : null}
              </View>
            ) : null}
            <Pressable onPress={cmd('giris')} hitSlop={8} style={{ alignSelf: 'center' }}>
              <Text style={{ color: colors.accent, fontWeight: '800' }}>⚙︎ Kalıbı / modu değiştir</Text>
            </Pressable>
          </>
        )}

        <Pressable
          onPress={() => {
            link.closeActivity();
            navigation.goBack();
          }}
          style={[st.btn, { borderWidth: 1.5, borderColor: colors.danger }]}
        >
          <Text style={{ color: colors.danger, fontWeight: '900' }}>Tahtada kapat</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  card: { borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.lg, gap: spacing.sm },
  label: { fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  big: { minHeight: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  btn: { borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center' },
});
