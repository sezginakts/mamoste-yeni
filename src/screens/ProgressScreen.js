import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, font } from '../theme';
import { useProgress } from '../context/ProgressContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { DonutChart, LineChart, HBar } from '../components/Charts';

// Tik aşamaları — anlamıyla etiketli.
const TICK_DEFS = [
  { key: 'mor', color: '#A855F7', label: 'İlk gün', desc: 'Yeni öğrenildi' },
  { key: 'mavi', color: '#3B82F6', label: 'Günlük tekrar', desc: '1 gün sonra geçildi' },
  { key: 'yesil', color: '#22C55E', label: 'Haftalık tekrar', desc: '1 hafta sonra geçildi' },
  { key: 'sari', color: '#EAB308', label: 'Aylık tekrar', desc: 'Ustalaşıldı 🏅' },
];

export default function ProgressScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { performance: rawP, state } = useProgress();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  // Güvenli varsayılanlar — herhangi bir alan eksikse çökme.
  const p = {
    ticks: {}, dueToday: { gunluk: 0, haftalik: 0, aylik: 0, toplam: 0 },
    byCategory: [], daily: [], totalSentences: 0, studied: 0, mastered: 0,
    accuracy: 0, totalPass: 0, totalFail: 0, totalAttempts: 0,
    learnedToday: 0, reviewedToday: 0, dueTomorrow: 0, dueThisWeek: 0,
    homeworkDone: false, newDone: false, reviewDone: false, activeDays: 0,
    ...(rawP || {}),
  };

  const screenW = Dimensions.get('window').width;
  const chartW = Math.min(screenW - spacing.lg * 4, 320);

  const donutData = TICK_DEFS.map((t) => ({ value: p.ticks[t.key] || 0, color: t.color }));
  const accuracyPct = Math.round(p.accuracy * 100);
  const masteredPct = p.totalSentences > 0 ? Math.round((p.mastered / p.totalSentences) * 100) : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxl }}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Geri</Text>
        </Pressable>
        <Text style={styles.title}>📊 Performans</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* ============ BUGÜN — ÖDEV DURUMU ============ */}
      <View style={[styles.todayCard, { borderColor: p.homeworkDone ? colors.primary : colors.border }]}>
        <View style={styles.todayHead}>
          <Text style={styles.todayTitle}>Bugün</Text>
          {p.homeworkDone ? (
            <View style={[styles.statusPill, { backgroundColor: colors.successSoft }]}>
              <Text style={[styles.statusPillText, { color: colors.success }]}>✓ Tamamlandı</Text>
            </View>
          ) : (
            <View style={[styles.statusPill, { backgroundColor: colors.bgSoft }]}>
              <Text style={[styles.statusPillText, { color: colors.textMuted }]}>Devam ediyor</Text>
            </View>
          )}
        </View>

        <View style={styles.todayRows}>
          <TodayRow
            styles={styles}
            colors={colors}
            done={p.newDone}
            icon="✨"
            label="Yeni konu öğren"
            detail={`Bugün ${p.learnedToday} yeni cümle öğrendin`}
          />
          <TodayRow
            styles={styles}
            colors={colors}
            done={p.reviewDone}
            icon="🔁"
            label="Tekrarları yap"
            detail={
              p.dueToday.toplam > 0
                ? `${p.dueToday.toplam} cümle tekrar bekliyor`
                : `Bugün ${p.reviewedToday} tekrar yaptın · bekleyen yok`
            }
          />
        </View>

        {!p.homeworkDone && (
          <Pressable style={[styles.todayCta, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('Home')}>
            <Text style={[styles.todayCtaText, { color: colors.onPrimary }]}>Çalışmaya Git →</Text>
          </Pressable>
        )}
      </View>

      {/* ============ TEKRAR TAKVİMİ ============ */}
      <Text style={styles.sectionTitle}>🔁 Tekrar Takvimi</Text>
      <Text style={styles.sectionHint}>Hangi cümleyi ne zaman tekrar etmen gerektiği.</Text>
      <View style={styles.calRow}>
        <CalCard styles={styles} colors={colors} big value={p.dueToday.toplam} label="Bugün" highlight />
        <CalCard styles={styles} colors={colors} value={p.dueTomorrow} label="Yarın" />
        <CalCard styles={styles} colors={colors} value={p.dueThisWeek} label="Bu hafta" />
      </View>
      {p.dueToday.toplam > 0 && (
        <View style={styles.calBreakdown}>
          {p.dueToday.gunluk > 0 && <CalChip styles={styles} color={colors.accent} label="Günlük" n={p.dueToday.gunluk} />}
          {p.dueToday.haftalik > 0 && <CalChip styles={styles} color={colors.accent} label="Haftalık" n={p.dueToday.haftalik} />}
          {p.dueToday.aylik > 0 && <CalChip styles={styles} color={colors.accent} label="Aylık" n={p.dueToday.aylik} />}
        </View>
      )}

      {/* ============ GENEL İLERLEME ============ */}
      <Text style={styles.sectionTitle}>📈 Genel İlerleme</Text>
      <View style={styles.bigStatsRow}>
        <BigStat styles={styles} colors={colors} value={`${p.studied}`} sub={`/ ${p.totalSentences}`} label="Çalışılan cümle" color={colors.accent} />
        <BigStat styles={styles} colors={colors} value={`%${masteredPct}`} label="Ustalaşma" color={colors.accent} />
        <BigStat styles={styles} colors={colors} value={`%${accuracyPct}`} label="Doğruluk" color={colors.success} />
      </View>

      {/* ============ HANGİ AŞAMADA — DONUT ============ */}
      <Text style={styles.sectionTitle}>🎯 Cümlelerin Hangi Aşamada?</Text>
      <Text style={styles.sectionHint}>
        Her cümle tekrar ettikçe ilerler: İlk gün → Günlük → Haftalık → Aylık (ustalık).
      </Text>
      <View style={styles.card}>
        <View style={styles.donutWrap}>
          <DonutChart
            data={donutData}
            size={150}
            thickness={24}
            centerLabel={p.studied}
            centerSub="çalışıldı"
            colors={colors}
          />
          <View style={styles.donutLegend}>
            {TICK_DEFS.map((t) => (
              <View key={t.key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: t.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.legendLabel}>{t.label}</Text>
                  <Text style={styles.legendDesc}>{t.desc}</Text>
                </View>
                <Text style={[styles.legendVal, { color: t.color }]}>{p.ticks[t.key] || 0}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ============ ÇALIŞMA TEMPOSU — EĞRİ ============ */}
      <Text style={styles.sectionTitle}>🗓️ Çalışma Temposu</Text>
      <Text style={styles.sectionHint}>Son 14 günde her gün kaç cümle çalıştın.</Text>
      <View style={styles.card}>
        <View style={{ alignItems: 'center' }}>
          <LineChart points={p.daily} width={chartW} height={150} color={colors.accent} colors={colors} />
        </View>
        <Text style={styles.cardFoot}>
          🔥 {state.streak} günlük seri · toplam {p.activeDays} gün çalıştın
        </Text>
      </View>

      {/* ============ KATEGORİ İLERLEMESİ ============ */}
      <Text style={styles.sectionTitle}>📚 Konulara Göre</Text>
      <Text style={styles.sectionHint}>Her konu grubunda ne kadar ilerledin.</Text>
      <View style={styles.card}>
        {p.byCategory.map((cat, i) => {
          const ratio = cat.total > 0 ? cat.seen / cat.total : 0;
          return (
            <View key={cat.id} style={[styles.catRow, i > 0 && styles.catRowBorder]}>
              <View style={styles.catTop}>
                <Text style={styles.catName}>{cat.emoji} {cat.name}</Text>
                <Text style={styles.catCount}>{cat.seen}/{cat.total}</Text>
              </View>
              <HBar ratio={ratio} color={colors.accent} track={colors.bgSoft} height={10} />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function TodayRow({ styles, colors, done, icon, label, detail }) {
  return (
    <View style={styles.todayRow}>
      <View style={[styles.todayCheck, { backgroundColor: done ? colors.primary : colors.bgSoft, borderColor: done ? colors.primary : colors.border }]}>
        <Text style={[styles.todayCheckText, { color: done ? colors.onPrimary : colors.textFaint }]}>{done ? '✓' : icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.todayLabel, done && { color: colors.textMuted, textDecorationLine: 'line-through' }]}>{label}</Text>
        <Text style={styles.todayDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function CalCard({ styles, colors, value, label, big, highlight }) {
  return (
    <View style={[styles.calCard, highlight && value > 0 && { borderColor: colors.accent, backgroundColor: colors.accent + '11' }]}>
      <Text style={[styles.calValue, big && styles.calValueBig, highlight && value > 0 && { color: colors.accent }]}>{value}</Text>
      <Text style={styles.calLabel}>{label}</Text>
    </View>
  );
}

function CalChip({ styles, color, label, n }) {
  return (
    <View style={styles.calChip}>
      <View style={[styles.calChipDot, { backgroundColor: color }]} />
      <Text style={styles.calChipText}>{label}: {n}</Text>
    </View>
  );
}

function BigStat({ styles, colors, value, sub, label, color }) {
  return (
    <View style={styles.bigStat}>
      <Text style={[styles.bigStatValue, { color }]}>
        {value}
        {sub ? <Text style={styles.bigStatSub}> {sub}</Text> : null}
      </Text>
      <Text style={styles.bigStatLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors, shadow) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  back: { color: colors.accent, fontSize: font.body, fontWeight: '800' },
  title: { color: colors.text, fontSize: font.h3, fontWeight: '900' },

  sectionTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800', marginTop: spacing.xl, marginBottom: 2 },
  sectionHint: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.md },

  // Bugün kartı
  todayCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 2, ...shadow },
  todayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  todayTitle: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  statusPill: { borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12 },
  statusPillText: { fontSize: font.small, fontWeight: '800' },
  todayRows: { gap: spacing.md },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  todayCheck: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  todayCheckText: { fontSize: 18, fontWeight: '900' },
  todayLabel: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  todayDetail: { color: colors.textMuted, fontSize: font.small, marginTop: 1 },
  todayCta: { marginTop: spacing.lg, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  todayCtaText: { fontSize: font.body, fontWeight: '900' },

  // Takvim
  calRow: { flexDirection: 'row', gap: spacing.sm },
  calCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 2, borderColor: colors.border, ...shadow },
  calValue: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  calValueBig: { fontSize: font.h1 },
  calLabel: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2, fontWeight: '700' },
  calBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  calChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  calChipDot: { width: 10, height: 10, borderRadius: 5 },
  calChipText: { color: colors.text, fontSize: font.small, fontWeight: '700' },

  // Büyük istatistikler
  bigStatsRow: { flexDirection: 'row', gap: spacing.sm },
  bigStat: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadow },
  bigStatValue: { fontSize: font.h2, fontWeight: '900' },
  bigStatSub: { fontSize: font.small, fontWeight: '700', color: colors.textMuted },
  bigStatLabel: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2, textAlign: 'center' },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow },
  cardFoot: { color: colors.textMuted, fontSize: font.small, textAlign: 'center', marginTop: spacing.md, fontWeight: '600' },

  donutWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  donutLegend: { flex: 1, gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendLabel: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  legendDesc: { color: colors.textMuted, fontSize: font.tiny },
  legendVal: { fontSize: font.body, fontWeight: '900' },

  catRow: { paddingVertical: spacing.sm },
  catRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catName: { color: colors.text, fontSize: font.small, fontWeight: '800' },
  catCount: { color: colors.textMuted, fontSize: font.small, fontWeight: '800' },
});
