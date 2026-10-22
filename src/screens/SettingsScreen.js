import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import StatusBarCover from '../components/StatusBarCover';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, font } from '../theme';
import { useTheme, useThemedStyles, ACCENTS } from '../context/ThemeContext';
import { useRole } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import { useTeacher } from '../teacher/TeacherContext';

const THEMES = [
  { key: 'light', label: 'Aydınlık', emoji: '☀️' },
  { key: 'dark', label: 'Karanlık', emoji: '🌙' },
];

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, mode, setThemeMode, accent, setAccent } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // Rol ilk açılışta seçilir ve kalıcıdır; burada sadece gösterilir.
  const { role, resetRole, resetBranch } = useRole();
  const auth = useAuth();
  const t = useTeacher();

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
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleLabel}>{role === 'teacher' ? '👩‍🏫 Öğretmen' : '🎒 Öğrenci'}</Text>
          <Text style={styles.toggleDesc}>İlk açılışta seçildi; bu cihazda değiştirilemez.</Text>
        </View>
      </View>
      {auth.isAdmin ? (
        <View style={styles.adminRow}>
          {role === 'teacher' ? (
            <Pressable onPress={resetBranch} style={[styles.adminBtn, { borderColor: colors.accent }]}>
              <Text style={[styles.back, { textAlign: 'center' }]}>‹ Branş seçimine dön</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={resetRole} style={[styles.adminBtn, { borderColor: colors.accent }]}>
            <Text style={[styles.back, { textAlign: 'center' }]}>‹ Öğretmen / öğrenci seçimine dön</Text>
          </Pressable>
        </View>
      ) : null}
      {role === 'teacher' && auth.user ? (
        <View style={[styles.toggleRow, { marginTop: spacing.sm }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>☁️ {auth.user.email}</Text>
            <Text style={styles.toggleDesc}>Sınıfların ve ödevlerin bu hesaba bağlı.</Text>
          </View>
          <Pressable onPress={auth.signOut} hitSlop={8}>
            <Text style={[styles.back, { color: colors.danger }]}>Çıkış yap</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Öğretmen verileri: eşitleme ve yedek (ana ekrandan buraya alındı) */}
      {role === 'teacher' ? (
        <>
          <Text style={styles.sectionTitle}>Veriler</Text>
          <Pressable onPress={t.cloudOn ? t.syncNow : undefined} disabled={!t.cloudOn || t.sync.busy} style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>{t.sync.error ? '⚠️' : '☁️'} Eşitle</Text>
              <Text style={styles.toggleDesc}>
                {!t.cloudOn
                  ? 'Hesapla giriş yapılmadı; veriler yalnız bu cihazda.'
                  : t.sync.busy
                    ? 'Eşitleniyor…'
                    : t.sync.error
                      ? t.sync.error
                      : t.sync.at
                        ? `Son eşitleme: ${new Date(t.sync.at).toTimeString().slice(0, 5)} · öğrenci sonuçlarını almak için dokun`
                        : 'Öğrenci sonuçlarını almak için dokun'}
              </Text>
            </View>
            {t.cloudOn ? <Text style={[styles.back, { fontSize: font.small }]}>Şimdi ›</Text> : null}
          </Pressable>
          <Pressable onPress={() => navigation.navigate('TeacherBackup')} style={[styles.toggleRow, { marginTop: spacing.sm }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>💾 Yedek</Text>
              <Text style={styles.toggleDesc}>Sınıflarını ve verilerini dosyaya al ya da yedekten geri yükle.</Text>
            </View>
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

      <Text style={styles.version}>Mamoste · v1.0</Text>
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
  toggleDesc: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  infoCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.border },
  infoTitle: { color: colors.text, fontSize: font.body, fontWeight: '800', marginBottom: spacing.sm },
  infoText: { color: colors.textMuted, fontSize: font.small, lineHeight: 22 },
  resetBtn: { marginTop: spacing.xl, padding: spacing.md, alignItems: 'center' },
  resetText: { color: colors.danger, fontWeight: '800', fontSize: font.body },
  adminRow: { gap: spacing.sm, marginTop: spacing.sm },
  adminBtn: { borderWidth: 1.5, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  version: { color: colors.textFaint, textAlign: 'center', marginTop: spacing.lg, fontSize: font.tiny },
});
