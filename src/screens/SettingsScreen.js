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
import { useProgress } from '../context/ProgressContext';
import { confirmAction, notify } from '../teacher/ui';
import { GIZLILIK_URL, DESTEK_URL, sayfaAc } from '../utils/links';
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
  const { role, branch, branchId, myBranchObjects, switchBranch, makePrimary, resetRole, resetBranch, fixedRole } = useRole();
  const auth = useAuth();
  const t = useTeacher();
  const desk = useDesk();
  const hasTimes = Object.values(desk.schedules || {}).some((s) => (s.periods || []).some((p) => p.start));
  const [siliniyor, setSiliniyor] = React.useState(false);
  const progress = useProgress();
  const ogrenciBagli = !!(progress.state.student && progress.state.student.token);
  // Öğrenci: hesap yok ama sunucuda takma ad, avatar ve ödev sonuçları tutulur → uygulama içinden silinebilmeli (5.1.1(v)).
  const verileriSil = () =>
    confirmAction({
      title: 'Verilerini sil',
      message:
        'Sunucudaki takma adın, avatarın ve bütün ödev sonuçların silinir; bu telefon bütün derslerinden çıkar. Öğretmenin sınıf listesindeki okul numaran kalır, istersen aynı kodla yeniden katılabilirsin. Geri alınamaz.\n\nKalıp çalışma ilerlemen bu telefonda kalır.',
      ok: 'Verilerimi sil',
      destructive: true,
      onOk: async () => {
        setSiliniyor(true);
        try {
          await progress.deleteStudentData();
          notify('Verilerin silindi', 'Sunucudaki bütün verilerin silindi.');
        } catch (e) {
          const m = String((e && e.message) || '');
          notify(
            'Veriler silinemedi',
            /fetch|network/i.test(m)
              ? 'İnternet bağlantısı yok gibi görünüyor.'
              : /could not find the function|schema cache/i.test(m)
                ? 'Sunucu şu an bu işlemi yapamıyor. Biraz sonra yeniden dene.'
                : m
          );
        }
        setSiliniyor(false);
      },
    });
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
          {/* Seçili dersler: dokununca o ders aktif olur, "Öne al" ile listede birinci (ana ders) yapılır.
              Dersin kendi sınıfları/planı/notları branşa bağlı olduğundan sıra değişince SİLİNMEZ. */}
          {(myBranchObjects || []).length > 1 ? (
            <View style={[styles.toggleRow, { marginTop: spacing.sm, flexDirection: 'column', alignItems: 'stretch' }]}>
              <Text style={[styles.toggleLabel, { marginBottom: 2 }]}>Derslerim</Text>
              {myBranchObjects.map((d, i) => {
                const on = d.id === branchId;
                const ana = i === 0;
                return (
                  <View key={d.id} style={[styles.branchRow, { borderColor: on ? d.color : colors.border, backgroundColor: on ? d.color + '1A' : 'transparent' }]}>
                    <Pressable
                      onPress={() => switchBranch(d.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${d.name} dersini aç`}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}
                    >
                      <View style={[styles.orderBadge, { backgroundColor: on ? d.color : colors.border }]}>
                        <Text style={styles.orderText}>{i + 1}</Text>
                      </View>
                      <Text style={[styles.toggleLabel, { flex: 1 }]} numberOfLines={1}>
                        {d.short ? `${d.short} · ` : ''}
                        {d.name}
                        {ana ? '  (ana ders)' : ''}
                      </Text>
                    </Pressable>
                    {!ana ? (
                      <Pressable onPress={() => makePrimary(d.id)} hitSlop={8} accessibilityLabel={`${d.name} dersini öne al`}>
                        <Text style={[styles.back, { fontSize: 13 }]}>↑ Öne al</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
              <Text style={[styles.toggleDesc, { marginTop: spacing.xs, marginLeft: 2 }]}>
                “Ana ders” uygulama açıldığında önce gelir. Ders değiştirmek sınıflarını, ders programını ve planlarını silmez.
              </Text>
            </View>
          ) : null}
          <Pressable onPress={resetBranch} style={[styles.toggleRow, { marginTop: spacing.sm }]}>
            <Text style={[styles.toggleLabel, { flex: 1 }]}>{(myBranchObjects || []).length > 1 ? 'Derslerim' : branch ? `${branch.emoji} ${branch.name}` : 'Branş'}</Text>
            <Text style={[styles.back, { fontSize: 13 }]}>Derslerimi değiştir ›</Text>
          </Pressable>
        </>
      ) : null}
      {auth.isAdmin && !fixedRole ? (
        <View style={styles.adminRow}>
          <Pressable onPress={resetRole} style={[styles.adminBtn, { borderColor: colors.accent }]}>
            <Text style={[styles.back, { textAlign: 'center' }]}>‹ Öğretmen / öğrenci seçimine dön</Text>
          </Pressable>
        </View>
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
                  <Text style={[styles.themeLabel, { fontSize: 13 }, active && { color: colors.accent }]}>{l}</Text>
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
                  <Text style={[styles.toggleDesc, { flex: 1, marginTop: 0, fontSize: 13 }]}>Zil için ders saatlerini gir ›</Text>
                </Pressable>
              ) : desk.bell.mode === 'mine' && !desk.hasTimetable ? (
                <Pressable onPress={() => navigation.navigate('Timetable')} style={[styles.toggleRow, { marginTop: spacing.sm }]}>
                  <Text style={[styles.toggleDesc, { flex: 1, marginTop: 0, fontSize: 13 }]}>Derslerinde çalması için ders programını gir ›</Text>
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
            <Text style={[styles.back, { fontSize: 13 }]}>›</Text>
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

      {/* En alt: Yedek → Çıkış yap → Hesabımı sil (sırasıyla) */}
      {role === 'teacher' ? (
        <>
          <Text style={styles.sectionTitle}>Veriler</Text>
          <Pressable onPress={() => navigation.navigate('TeacherBackup')} style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { flex: 1 }]}>💾 Yedek</Text>
            <Text style={[styles.back, { fontSize: 13 }]}>›</Text>
          </Pressable>
          {auth.user ? (
            <>
              <View style={[styles.toggleRow, { marginTop: spacing.sm }]}>
                <Text style={[styles.toggleLabel, { flex: 1 }]} numberOfLines={1}>☁️ {auth.user.email}</Text>
                <Pressable onPress={auth.signOut} hitSlop={8} accessibilityLabel="Çıkış yap">
                  <Text style={[styles.back, { color: colors.danger }]}>Çıkış yap</Text>
                </Pressable>
              </View>
              {/* Hesabı sil (App Store 5.1.1(v)): sunucudaki hesap ve bütün sınıf/öğrenci/ödev verisi silinir. */}
              <Pressable onPress={hesabiSil} disabled={siliniyor} style={[styles.toggleRow, { marginTop: spacing.sm }]} accessibilityRole="button">
                <Text style={[styles.toggleLabel, { flex: 1, color: colors.danger }]}>{siliniyor ? 'Hesap siliniyor…' : '🗑 Hesabımı sil'}</Text>
              </Pressable>
            </>
          ) : auth.cloudEnabled ? (
            // Hesap açmadan devam edildiyse: sınıf kodu ve ödev için giriş buradan.
            <Pressable onPress={() => auth.setGuest(false)} style={[styles.toggleRow, { marginTop: spacing.sm }]}>
              <Text style={[styles.toggleLabel, { flex: 1 }]}>☁️ Giriş yap ya da hesap aç</Text>
              <Text style={[styles.back, { fontSize: 13 }]}>›</Text>
            </Pressable>
          ) : null}
        </>
      ) : ogrenciBagli ? (
        <>
          <Text style={styles.sectionTitle}>Veriler</Text>
          <Pressable onPress={verileriSil} disabled={siliniyor} style={styles.toggleRow} accessibilityRole="button">
            <Text style={[styles.toggleLabel, { flex: 1, color: colors.danger }]}>{siliniyor ? 'Veriler siliniyor…' : '🗑 Verilerimi sil'}</Text>
          </Pressable>
        </>
      ) : null}

      {/* Hakkında: gizlilik politikası ve destek her iki uygulamada da buradan açılır (App Store 5.1.1(i)). */}
      <Text style={styles.sectionTitle}>Hakkında</Text>
      <Pressable onPress={() => sayfaAc(GIZLILIK_URL)} style={styles.toggleRow} accessibilityRole="link" accessibilityLabel="Gizlilik politikası">
        <Text style={[styles.toggleLabel, { flex: 1 }]}>🔒 Gizlilik politikası</Text>
        <Text style={[styles.back, { fontSize: 13 }]}>›</Text>
      </Pressable>
      <Pressable onPress={() => sayfaAc(DESTEK_URL)} style={[styles.toggleRow, { marginTop: spacing.sm }]} accessibilityRole="link" accessibilityLabel="Destek">
        <Text style={[styles.toggleLabel, { flex: 1 }]}>💬 Destek ve iletişim</Text>
        <Text style={[styles.back, { fontSize: 13 }]}>›</Text>
      </Pressable>

      <Text style={styles.version}>Okul · v1.0</Text>
      <Text style={styles.author}>Sezgin AKTAŞ</Text>
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
  themeLabel: { color: colors.text, fontSize: 14.5, fontWeight: '800' },
  back: { color: colors.accent, fontSize: 14.5, fontWeight: '800' },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  help: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.md },
  goalRow: { flexDirection: 'row', gap: spacing.sm },
  goalChip: { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 2, borderColor: colors.border },
  goalNum: { color: colors.text, fontSize: font.h2, fontWeight: '900' },
  goalLabel: { color: colors.textMuted, fontSize: font.tiny },
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  toggleLabel: { color: colors.text, fontSize: 14.5, fontWeight: '700' },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, marginTop: 6 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  orderBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  orderText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  toggleDesc: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  infoCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.border },
  infoTitle: { color: colors.text, fontSize: 14.5, fontWeight: '800', marginBottom: spacing.sm },
  infoText: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  resetBtn: { marginTop: spacing.xl, padding: spacing.md, alignItems: 'center' },
  resetText: { color: colors.danger, fontWeight: '800', fontSize: 14.5 },
  switch: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  adminRow: { gap: spacing.sm, marginTop: spacing.sm },
  adminBtn: { borderWidth: 1.5, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  version: { color: colors.textFaint, textAlign: 'center', marginTop: spacing.lg, fontSize: font.tiny },
  author: { color: colors.textFaint, textAlign: 'center', marginTop: 2, fontSize: font.tiny, opacity: 0.7 },
});
