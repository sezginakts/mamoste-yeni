// Öğrenci ana ekranı: "Bugün" kartı (tüm derslerden en yakın ödev + günlük tekrar) + Derslerim + İngilizce Çalış.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import StatusBarCover from '../components/StatusBarCover';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, font } from '../theme';
import { useProgress } from '../context/ProgressContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import ProgressBar from '../components/ProgressBar';
import Button from '../components/Button';
import { formatDate } from '../teacher/ui';
import { hwSummary } from '../utils/homework';
import { dayKey } from '../utils/helpers';
import { branchOf } from '../data/branches';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { stats, studiedToday, dueCount, state, buildDailySession, startHomework } = useProgress();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const goal = state.dailyGoal;
  const dailyRatio = goal > 0 ? Math.min(1, studiedToday / goal) : 0;
  const dailySession = buildDailySession(goal);
  const nothingToday = dailySession.length === 0;

  // Bekleyen ödevler — son günü en yakın olan öne.
  const pending = Object.values(state.homeworks || {})
    .filter((h) => !h.result)
    .sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
  const nextHw = pending[0];
  const today = dayKey();

  const startDaily = () => {
    if (nothingToday) return;
    navigation.navigate('Study', { sentences: dailySession, title: 'Günlük Çalışma' });
  };

  const classes = state.student.classes || [];
  // İngilizce çalışma bölümü: henüz derse katılmamışsa ya da İngilizce dersi varsa.
  const showEnglish = !classes.length || classes.some((c) => c.branch === 'ingilizce');
  const pendingIn = (branch) => pending.filter((h) => (h.branch || 'ingilizce') === branch).length;

  const startNextHw = () => {
    if (nextHw.type === 'task') {
      navigation.navigate('Task', { id: nextHw.id });
      return;
    }
    const sentences = startHomework(nextHw.id);
    if (!sentences.length) return;
    navigation.navigate('Study', { sentences, title: nextHw.title, homeworkId: nextHw.id });
  };


  return (
    <View style={styles.screen}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxl }}
    >
      {/* Üst bar */}
      <View style={styles.topbar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Merhaba{state.student.nk ? ` ${state.student.nk}` : ''} 👋</Text>
          <Text style={styles.title}>Mamoste</Text>
        </View>
        <View style={styles.topRight}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🔥 {state.streak}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>⭐ {state.xp}</Text>
          </View>
          <Pressable style={styles.badge} onPress={() => navigation.navigate('Profile')} accessibilityLabel="Profilim" hitSlop={6}>
            <Text style={styles.badgeText}>{state.student.avatar || '🙂'}</Text>
          </Pressable>
        </View>
      </View>

      {/* BUGÜN */}
      <View style={styles.todayCard}>
        <Text style={styles.todayLabel}>BUGÜN</Text>
        {nextHw ? (
          <>
            <Text style={styles.todayTitle}>{branchOf(nextHw.branch).emoji} Ödevin var: {nextHw.title}</Text>
            <Text style={[styles.todaySub, nextHw.due && nextHw.due < today && { color: colors.danger }]}>
              {branchOf(nextHw.branch).name}{nextHw.cn ? ` · ${nextHw.cn}` : ''} · {nextHw.type === 'task' ? 'Görev' : hwSummary(nextHw)}
              {nextHw.due ? ` · son gün ${formatDate(nextHw.due)}${nextHw.due < today ? ' (geçti)' : ''}` : ''}
            </Text>
            <Button title={nextHw.type === 'task' ? 'Ödevi Aç' : nextHw.sessionIds ? 'Ödeve Devam Et' : 'Ödeve Başla'} onPress={startNextHw} />
            {pending.length > 1 ? (
              <Pressable onPress={() => navigation.navigate('StudentHomework')}>
                <Text style={styles.link}>+{pending.length - 1} ödev daha bekliyor ›</Text>
              </Pressable>
            ) : null}
            {showEnglish ? <View style={styles.divider} /> : null}
          </>
        ) : null}

        {showEnglish ? (
          <>
            <View style={styles.dailyHeader}>
              <Text style={nextHw ? styles.dailyTitleSmall : styles.todayTitle}>Günlük hedef</Text>
              <Text style={styles.dailyCount}>
                {studiedToday}/{goal} cümle
              </Text>
            </View>
            <ProgressBar ratio={dailyRatio} height={nextHw ? 8 : 12} />
            {!nextHw ? (
              <View style={styles.dailyBreakdown}>
                <View style={styles.dailyChip}>
                  <Text style={styles.dailyChipNum}>✨ {Math.min(goal, stats.newCount)}</Text>
                  <Text style={styles.dailyChipLabel}>yeni konu</Text>
                </View>
                <View style={styles.dailyChip}>
                  <Text style={[styles.dailyChipNum, { color: colors.accent }]}>🔁 {dueCount}</Text>
                  <Text style={styles.dailyChipLabel}>tekrar</Text>
                </View>
              </View>
            ) : null}
            {nothingToday ? (
              <View style={styles.donePill}>
                <Text style={styles.doneText}>🎉 Harika! Şu an çalışılacak cümle kalmadı.</Text>
              </View>
            ) : (
              <Button
                title={nextHw ? 'Günlük çalışma' : 'Bugünkü Çalışmaya Başla'}
                variant={nextHw ? 'secondary' : 'primary'}
                onPress={startDaily}
              />
            )}
          </>
        ) : !nextHw ? (
          <Text style={styles.todayTitle}>🎉 Bekleyen ödevin yok</Text>
        ) : null}
      </View>

      {/* DERSLERİM: her öğretmenin dersi; dokununca o dersin ödevleri */}
      <Text style={styles.section}>DERSLERİM</Text>
      {classes.map((c) => {
        const b = branchOf(c.branch);
        const n = pendingIn(c.branch);
        return (
          <RowCard
            key={c.rid}
            styles={styles}
            emoji={b.emoji}
            title={b.name}
            desc={`${c.cn}${c.teacher ? ` · ${c.teacher}` : ''} · ${n ? `${n} bekleyen ödev` : 'ödev yok'}`}
            badge={n || null}
            onPress={() => navigation.navigate('StudentHomework', { branch: c.branch })}
          />
        );
      })}
      <RowCard
        styles={styles}
        emoji="＋"
        title={classes.length ? 'Ders ekle' : 'Derse katıl'}
        desc="Öğretmeninin verdiği sınıf koduyla"
        onPress={() => navigation.navigate('StudentJoin')}
      />
      {classes.length > 1 ? (
        <RowCard
          styles={styles}
          emoji="📚"
          title="Tüm ödevlerim"
          desc={pending.length ? `${pending.length} bekleyen ödev` : 'Bekleyen ödev yok'}
          badge={pending.length || null}
          onPress={() => navigation.navigate('StudentHomework')}
        />
      ) : null}

      {showEnglish ? (
        <>
          <Text style={styles.section}>İNGİLİZCE ÇALIŞ</Text>
          <RowCard
            styles={styles}
            emoji="🧩"
            title="Kalıplar"
            desc="Konu başlıklarına göre cümle kalıpları"
            onPress={() => navigation.navigate('Learn')}
          />
          <RowCard styles={styles} emoji="📖" title="Kütüphanem" desc="Çalıştığın cümleleri tekrar et ve test et" onPress={() => navigation.navigate('Library')} />
          <RowCard styles={styles} emoji="📊" title="Performansım" desc="Grafikler, öğrenme eğrisi ve tik dağılımı" onPress={() => navigation.navigate('Progress')} />
        </>
      ) : null}
    </ScrollView>
    <StatusBarCover color={colors.bg} />
    </View>
  );
}

function RowCard({ styles, emoji, title, desc, badge, onPress }) {
  return (
    <Pressable style={({ pressed }) => [styles.rowCard, pressed && { opacity: 0.85 }]} onPress={onPress}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      {badge ? (
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text style={styles.rowArrow}>›</Text>
    </Pressable>
  );
}

const makeStyles = (colors, shadow) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, gap: spacing.sm },
  hello: { color: colors.textMuted, fontSize: font.small },
  title: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  topRight: { flexDirection: 'row', gap: spacing.xs },
  badge: { backgroundColor: colors.card, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border },
  badgeText: { color: colors.text, fontWeight: '800', fontSize: font.small },

  todayCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow },
  todayLabel: { color: colors.primary, fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  todayTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  todaySub: { color: colors.textMuted, fontSize: font.small, marginTop: -spacing.sm },
  link: { color: colors.accent, fontWeight: '700', fontSize: font.small },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dailyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dailyTitleSmall: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  dailyCount: { color: colors.textMuted, fontWeight: '700' },
  dailyBreakdown: { flexDirection: 'row', gap: spacing.sm },
  dailyChip: { flex: 1, backgroundColor: colors.bgSoft, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  dailyChipNum: { color: colors.primary, fontSize: font.body, fontWeight: '900' },
  dailyChipLabel: { color: colors.textMuted, fontSize: font.tiny, marginTop: 1 },
  donePill: { backgroundColor: colors.bgSoft, borderRadius: radius.md, padding: spacing.md },
  doneText: { color: colors.primary, textAlign: 'center', fontWeight: '700' },

  section: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.sm },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadow },
  rowTitle: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  rowDesc: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  rowArrow: { color: colors.textMuted, fontSize: 28, fontWeight: '300' },
  countBadge: { backgroundColor: colors.danger, borderRadius: radius.pill, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countBadgeText: { color: colors.white, fontWeight: '900', fontSize: font.tiny },
  meNote: { color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.xs, textAlign: 'center' },
});
