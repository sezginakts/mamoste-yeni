import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import StatusBarCover from '../components/StatusBarCover';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, font } from '../theme';
import { useTheme, useThemedStyles, ACCENTS } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import { useTeacher } from '../teacher/TeacherContext';
import { useDesk } from '../teacher/DeskContext';
import { confirmAction, notify } from '../teacher/ui';
import { ringBell } from '../components/BellOverlay';
import { bellsRolling, MAX_BELLS } from '../utils/bell';

const THEMES = [
  { key: 'light', label: 'Aydınlık', emoji: '☀️' },
  { key: 'dark', label: 'Karanlık', emoji: '🌙' },
];

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, mode, setThemeMode, accent, setAccent } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // Rol kalıcıdır (yalnız yönetici sıfırlar); branş her öğretmen için değiştirilebilir, her branşın verisi ayrıdır.
  const { role, branch, branchId, myBranchObjects, switchBranch, resetRole, resetBranch } = useRole();
  const auth = useAuth();
  const t = useTeacher();
  const desk = useDesk();
  const hasTimes = Object.values(desk.schedules || {}).some((s) => (s.periods || []).some((p) => p.start));
  const [siliniyor, setSiliniyor] = React.useState(false);
  const hesabiSil = () =>
    confirmAction({
      title: 'Hesabını sil',
      message:
        'Hesabın ve sunucudaki bütün sınıfların, öğrenci kayıtların, ödevlerin ve ödev dosyaların kalıcı olarak silinir; öğrenciler derslerine erişemez. Geri alınamaz.\n\nBu cihazdaki ders programı, planlar ve notlar silinmez.',
      ok: 'Hesabı sil',
      destructive: true,
      onOk: async () => {
        setSiliniyor(true);
        try {
          await auth.deleteAccount();
          t.forgetCloud();
          auth.setGuest(true);
          notify('Hesabın silindi', 'Sunucudaki bütün verilerin silindi. Uygulamayı hesapsız kullanmaya devam edebilirsin.');
        } catch (e) {
          notify('Hesap silinemedi', /fetch|network/i.test(e.message) ? 'İnternet bağlantısı yok gibi görünüyor.' : e.message);
        }
        setSiliniyor(false);
      },
    });

  return (
    <View style={styles.screen}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxl }}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Geri</Text>
        </Pressable>
        <Text style={styles.title}>Ayarlar</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Kullanım modu */}
      <Text style={styles.sectionTitle}>Kullanım Modu</Text>
      <View style={styles.toggleRow}>
        <Text style={[styles.toggleLabel, { flex: 1 }]}>{role === 'teacher' ? '👩‍🏫 Öğretmen' : '🎒 Öğrenci'}</Text>
      </View>
      {role === 'teacher' ? (
        <>
          {/* Seçili derslerden biri öne alınır: ana sayfa, sınıflar ve planlar o derse göre açılır. */}
          {(myBranchObjects || []).length > 1 ? (
            <View style={[styles.toggleRow, { marginTop: spacing.sm, flexDirection: 'column', alignItems: 'stretch' }]}>
              <Text style={[styles.toggleLabel, { marginBottom: 2 }]}>Öndeki ders</Text>
              {myBranchObjects.map((d) => {
                const on = d.id === branchId;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => switchBranch(d.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={[styles.branchRow, { borderColor: on ? d.color : colors.border, backgroundColor: on ? d.color + '1A' : 'transparent' }]}
                  >
                    <View style={[styles.radio, { borderColor: on ? d.color : colors.border }]}>{on ? <View style={[styles.radioDot, { backgroundColor: d.color }]} /> : null}</View>
                    <Text style={[styles.toggleLabel, { flex: 1 }]} numberOfLines={1}>
                      {d.short ? `${d.short} · ` : ''}
                      {d.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          <Pressable onPress={resetBranch} style={[styles.toggleRow, { marginTop: spacing.sm }]}>
            <Text style={[styles.toggleLabel, { flex: 1 }]}>{(myBranchObjects || []).length > 1 ? 'Derslerim' : branch ? `${branch.emoji} ${branch.name}` : 'Branş'}</Text>
            <Text style={[styles.back, { fontSize: font.small }]}>Derslerimi değiştir ›</Text>
          </Pressable>
        </>
      ) : null}
      {auth.isAdmin ? (
        <View style={styles.adminRow}>
          <Pressable onPress={resetRole} style={[styles.adminBtn, { borderColor: colors.accent }]}>
            <Text style={[styles.back, { textAlign: 'center' }]}>‹ Öğretmen / öğrenci seçimine dön</Text>
          </Pressable>
        </View>
      ) : null}
      {role === 'teacher' && auth.user ? (
        <>
          <View style={[styles.toggleRow, { marginTop: spacing.sm }]}>
            <Text style={[styles.toggleLabel, { flex: 1 }]} numberOfLines={1}>☁️ {auth.user.email}</Text>
            <Pressable onPress={auth.signOut} hitSlop={8}>
              <Text style={[styles.back, { color: colors.danger }]}>Çıkış yap</Text>
            </Pressable>
          </View>
          {/* Hesabı sil (App Store 5.1.1(v)): sunucudaki hesap ve bütün sınıf/öğrenci/ödev verisi silinir. */}
          <Pressable onPress={hesabiSil} disabled={siliniyor} style={[styles.toggleRow, { marginTop: spacing.sm }]} accessibilityRole="button">
            <Text style={[styles.toggleLabel, { flex: 1, color: colors.danger }]}>{siliniyor ? 'Hesap siliniyor…' : '🗑 Hesabımı sil'}</Text>
          </Pressable>
        </>
      ) : role === 'teacher' && auth.cloudEnabled ? (
        // Hesap açmadan devam edildiyse: sınıf kodu ve ödev için giriş buradan.
        <Pressable onPress={() => auth.setGuest(false)} style={[styles.toggleRow, { marginTop: spacing.sm }]}>
          <Text style={[styles.toggleLabel, { flex: 1 }]}>☁️ Giriş yap ya da hesap aç</Text>
          <Text style={[styles.back, { fontSize: font.small }]}>›</Text>
        </Pressable>
      ) : null}

      {/* Öğretmen verileri: yedek (eşitleme arka planda kendiliğinden) */}
      {role === 'teacher' ? (
        <>
          <Text style={styles.sectionTitle}>Veriler</Text>
          <Pressable onPress={() => navigation.navigate('TeacherBackup')} style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { flex: 1 }]}>💾 Yedek</Text>
            <Text style={[styles.back, { fontSize: font.small }]}>›</Text>
          </Pressable>
        </>
      ) : null}

      {/* Ders zili: ders saatlerinde bildirim + uygulama açıksa zil animasyonu */}
      {role === 'teacher' ? (
        <>
          <Text style={styles.sectionTitle}>Ders Zili</Text>
          <View style={styles.goalRow}>
            {[
              ['off', 'Kapalı'],
              ['mine', 'Derslerimde'],
              ['all', 'Her ders saati'],
            ].map(([k, l]) => {
              const active = desk.bell.mode === k;
              return (
                <Pressable key={k} onPress={() => desk.setBell({ mode: k })} style={[styles.themeChip, active && { borderColor: colors.accent, backgroundColor: colors.accent + (mode === 'dark' ? '33' : '1A') }]}>
                  <Text style={[styles.themeLabel, { fontSize: font.small }, active && { color: colors.accent }]}>{l}</Text>
                </Pressable>
              );
            })}
          </View>
          {desk.bell.mode !== 'off' ? (
            <>
              <Pressable onPress={() => desk.setBell({ end: !desk.bell.end })} style={[styles.toggleRow, { marginTop: spacing.sm }]}>
                <Text style={[styles.toggleLabel, { flex: 1 }]}>Ders bitince de çalsın</Text>
                <View style={[styles.switch, { backgroundColor: desk.bell.end ? colors.accent : colors.border }]}>
                  <View style={[styles.knob, desk.bell.end && { alignSelf: 'flex-end' }]} />
                </View>
              </Pressable>
              {!hasTimes ? (
                <Pressable onPress={() => navigation.navigate('Timetable')} style={[styles.toggleRow, { marginTop: spacing.sm }]}>
                  <Text style={[styles.toggleDesc, { flex: 1, marginTop: 0, fontSize: font.small }]}>Zil için ders saatlerini gir ›</Text>
                </Pressable>
              ) : desk.bell.mode === 'mine' && !desk.hasTimetable ? (
                <Pressable onPress={() => navigation.navigate('Timetable')} style={[styles.toggleRow, { marginTop: spacing.sm }]}>
                  <Text style={[styles.toggleDesc, { flex: 1, marginTop: 0, fontSize: font.small }]}>Derslerinde çalması için ders programını gir ›</Text>
                </Pressable>
              ) : (
                <Text style={[styles.toggleDesc, { marginTop: spacing.sm, marginLeft: spacing.xs }]}>
                  {bellsRolling(desk.bells)
                    ? `Haftada ${desk.bells.length} zil (ders başı ${desk.bells.filter((b) => b.kind === 'start').length}, ders sonu ${desk.bells.filter((b) => b.kind === 'end').length}). Telefon aynı anda en fazla ${MAX_BELLS} zil bekletebildiği için önümüzdeki günlerin zilleri kurulur; uygulamayı açtıkça yenilenir. Tatil günlerinde çalmaz.`
                    : `Haftada ${desk.bells.length} zil kurulu${desk.bell.end ? ` (ders başı ${desk.bells.filter((b) => b.kind === 'start').length}, ders sonu ${desk.bells.filter((b) => b.kind === 'end').length})` : ''}.`}
                </Text>
              )}
            </>
          ) : null}
          <Pressable onPress={() => ringBell({ title: '🔔 Ders başladı', body: 'Zil böyle çalar' })} style={[styles.toggleRow, { marginTop: spacing.sm }]}>
            <Text style={[styles.toggleLabel, { flex: 1 }]}>🔔 Zili dene</Text>
            <Text style={[styles.back, { fontSize: font.small }]}>›</Text>
          </Pressable>
        </>
      ) : null}

      {/* Tema seçimi */}
      <Text style={styles.sectionTitle}>Tema</Text>
      <View style={styles.goalRow}>
        {THEMES.map((t) => {
          const active = mode === t.key;
          return (
            <Pressable key={t.key} onPress={() => setThemeMode(t.key)} style={[styles.themeChip, active && { borderColor: colors.accent, backgroundColor: colors.accent + (mode === 'dark' ? '33' : '1A') }]}>
              <Text style={styles.themeEmoji}>{t.emoji}</Text>
              <Text style={[styles.themeLabel, active && { color: colors.accent }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Uygulama rengi */}
      <Text style={styles.sectionTitle}>Uygulama Rengi</Text>
      <View style={styles.accentRow}>
        {Object.entries(ACCENTS).map(([key, a]) => {
          const active = accent === key;
          const c = mode === 'dark' ? a.dark : a.light;
          return (
            <Pressable key={key} onPress={() => setAccent(key)} style={styles.accentItem} accessibilityRole="radio" accessibilityState={{ selected: active }} accessibilityLabel={a.label}>
              <View style={[styles.accentDot, { backgroundColor: c, borderColor: active ? colors.text : 'transparent' }]}>
                {active ? <Text style={{ color: '#fff', fontWeight: '900' }}>✓</Text> : null}
              </View>
              <Text style={[styles.accentLabel, active && { color: colors.text, fontWeight: '800' }]} numberOfLines={1}>{a.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.version}>Okul · v1.0</Text>
    </ScrollView>
    <StatusBarCover color={colors.bg} />
    </View>
  );
}

const makeStyles = (colors, shadow) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  themeChip: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: spacing.md, borderWidth: 2, borderColor: colors.border },
  themeEmoji: { fontSize: 20 },
  accentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  accentItem: { width: 72, alignItems: 'center' },
  accentDot: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  accentLabel: { color: colors.textMuted, fontSize: font.tiny, marginTop: 4 },
  themeLabel: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  back: { color: colors.accent, fontSize: font.body, fontWeight: '800' },
  title: { color: colors.text, fontSize: font.h3, fontWeight: '900' },
  sectionTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  help: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.md },
  goalRow: { flexDirection: 'row', gap: spacing.sm },
  goalChip: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 2, borderColor: colors.border },
  goalNum: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  goalLabel: { color: colors.textMuted, fontSize: font.tiny },
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  toggleLabel: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, marginTop: 6 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  toggleDesc: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  infoCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.border },
  infoTitle: { color: colors.text, fontSize: font.body, fontWeight: '800', marginBottom: spacing.sm },
  infoText: { color: colors.textMuted, fontSize: font.small, lineHeight: 22 },
  resetBtn: { marginTop: spacing.xl, padding: spacing.md, alignItems: 'center' },
  resetText: { color: colors.danger, fontWeight: '800', fontSize: font.body },
  switch: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  adminRow: { gap: spacing.sm, marginTop: spacing.sm },
  adminBtn: { borderWidth: 1.5, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  version: { color: colors.textFaint, textAlign: 'center', marginTop: spacing.lg, fontSize: font.tiny },
});
