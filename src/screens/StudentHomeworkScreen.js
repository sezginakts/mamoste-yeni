// Öğrenci: tüm derslerden gelen ödevler tek listede (route.params.branch verilirse sadece o ders).
// Cümle ödevi → çalışma ekranı; görev ödevi → TaskScreen.
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { spacing, font } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useProgress } from '../context/ProgressContext';
import { Header, Card, SmallButton, Empty, formatDate, SectionTitle, confirmAction } from '../teacher/ui';
import { hwSummary } from '../utils/homework';
import { dayKey } from '../utils/helpers';
import { branchOf } from '../data/branches';

export default function StudentHomeworkScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { state, startHomework, removeStudentHomework, refreshHomeworks } = useProgress();
  const joined = !!state.student.token;
  const [refreshing, setRefreshing] = React.useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshHomeworks();
    } catch (e) {}
    setRefreshing(false);
  };
  const only = route && route.params && route.params.branch;
  const classes = state.student.classes || [];
  const all = Object.values(state.homeworks || {})
    .filter((h) => !only || (h.branch || 'ingilizce') === only)
    .sort((a, b) => (a.due || '').localeCompare(b.due || ''));
  const todo = all.filter((h) => !h.result);
  const done = all.filter((h) => h.result).sort((a, b) => b.result.at - a.result.at);
  const today = dayKey();

  const start = (hw) => {
    if (hw.type === 'task') {
      navigation.navigate('Task', { id: hw.id });
      return;
    }
    const sentences = startHomework(hw.id);
    if (!sentences.length) return;
    navigation.navigate('Study', { sentences, title: hw.title, homeworkId: hw.id });
  };

  // Yalnızca bitmiş ödev silinir (sonucu öğretmene gittiyse); listeden kalkar, öğretmendeki sonuç kalır.
  const canRemove = (hw) => !hw.cloud || (hw.result && hw.result.sent);
  const remove = (hw) =>
    confirmAction({
      title: 'Ödevi listeden sil',
      message: `“${hw.title}” listenden kalkar. Öğretmenine giden sonucun silinmez.`,
      ok: 'Sil',
      destructive: true,
      onOk: () => removeStudentHomework(hw.id),
    });
  // Verildi / son gün / bitirdin satırı
  const dates = (hw) => {
    const parts = [];
    if (hw.given || hw.receivedAt) parts.push(`📅 Verildi ${formatDate(hw.given || new Date(hw.receivedAt).toISOString())}`);
    if (hw.due) parts.push(`son gün ${formatDate(hw.due)}`);
    if (hw.result && hw.result.at) parts.push(`bitirdin ${formatDate(new Date(hw.result.at).toISOString())}`);
    return parts.join(' · ');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title={only ? `${branchOf(only).emoji} ${branchOf(only).name}` : 'Ödevlerim'}
        subtitle={joined ? (classes.length > 1 ? `${classes.length} ders` : `${state.student.cn} · No ${state.student.no}`) : 'Henüz bir derse katılmadın'}
        onBack={() => navigation.goBack()}
        right={
          joined ? (
            <SmallButton title={refreshing ? '…' : '↻ Yenile'} onPress={refresh} disabled={refreshing} />
          ) : (
            <SmallButton title="Derse katıl" filled onPress={() => navigation.navigate('StudentJoin')} />
          )
        }
      />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        {!joined ? (
          <Card onPress={() => navigation.navigate('StudentJoin')} style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
            <Text style={{ fontSize: 34 }}>🎒</Text>
            <Text style={[st.t, { color: colors.text, marginTop: 6 }]}>Dersine katıl</Text>
            <Text style={[st.m, { color: colors.textMuted, textAlign: 'center' }]}>
              Öğretmeninin tahtaya yazdığı sınıf kodunu gir. Katıldıktan sonra ödevler buraya kendiliğinden gelir.
            </Text>
          </Card>
        ) : null}
        <SectionTitle>YAPILACAK</SectionTitle>
        {todo.length === 0 ? <Empty text={joined ? 'Bekleyen ödevin yok. Öğretmenin ödev verince bildirim gelir.' : 'Henüz ödev yok.'} /> : null}
        {todo.map((hw) => {
          const late = hw.due && hw.due < today;
          return (
            <Card key={hw.id}>
              <Text style={[st.t, { color: colors.text }]}>{branchOf(hw.branch).emoji} {hw.title}</Text>
              <Text style={[st.m, { color: colors.textMuted }]}>{hw.cn} · {hw.type === 'task' ? `Görev${(hw.att || []).length ? ` · ${(hw.att || []).length} ek` : ''}` : hwSummary(hw)}</Text>
              <Text style={[st.m, { color: late ? colors.danger : colors.textMuted }]}>
                {dates(hw) || 'Son gün yok'}{late ? ' (geçti)' : ''}
              </Text>
              {hw.r ? <Text style={[st.m, { color: colors.accent }]}>➕ Daha önce zorlandığın cümleler varsa en fazla {hw.r} tanesi de eklenecek.</Text> : null}
              <View style={st.row}>
                <SmallButton title={hw.type === 'task' ? 'Aç' : hw.sessionIds ? 'Devam et / baştan' : 'Başla'} filled onPress={() => start(hw)} style={{ flex: 1 }} />
                {canRemove(hw) ? <SmallButton title="Sil" color={colors.textMuted} onPress={() => remove(hw)} /> : null}
              </View>
            </Card>
          );
        })}

        <SectionTitle>BİTENLER</SectionTitle>
        {done.length ? <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginBottom: spacing.sm }}>Biten ödevi 🗑 ile listenden silebilirsin; öğretmenine giden sonuç kalır.</Text> : null}
        {done.length === 0 ? <Empty text="Henüz biten ödev yok." /> : null}
        {done.map((hw) => {
          const del = canRemove(hw) ? <SmallButton title="🗑" color={colors.textMuted} onPress={() => remove(hw)} /> : null;
          if (hw.type === 'task') {
            return (
              <Card key={hw.id} onPress={() => navigation.navigate('Task', { id: hw.id })}>
                <View style={st.head}>
                  <Text style={[st.t, { color: colors.text, flex: 1 }]}>{branchOf(hw.branch).emoji} {hw.title}</Text>
                  {del}
                </View>
                <Text style={[st.m, { color: colors.textMuted }]}>
                  ✓ Tamamlandı · {hw.result.sent ? 'öğretmenine iletildi' : '⏳ internet gelince iletilecek'}
                </Text>
                <Text style={[st.m, { color: colors.textFaint }]}>{dates(hw)}</Text>
                {hw.fb ? <Text style={[st.m, { color: colors.accent, fontWeight: '800' }]}>💬 Öğretmeninden geri bildirim{hw.fb.score != null ? ` · ${hw.fb.score} puan` : ''}</Text> : null}
              </Card>
            );
          }
          const vals = Object.values(hw.result.res);
          const c = vals.filter((v) => v === 1).length;
          return (
            <Card key={hw.id} onPress={() => navigation.navigate('HomeworkDone', { id: hw.id })}>
              <View style={st.head}>
                <Text style={[st.t, { color: colors.text, flex: 1 }]}>{hw.title}</Text>
                {del}
              </View>
              <Text style={[st.m, { color: colors.textMuted }]}>
                {c}/{vals.length} doğru · {hw.cloud ? (hw.result.sent ? '✓ öğretmenine gönderildi' : '⏳ internet gelince gönderilecek') : 'QR için dokun'}
              </Text>
              <Text style={[st.m, { color: colors.textFaint }]}>{dates(hw)}</Text>
            </Card>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  t: { fontSize: font.body, fontWeight: '800' },
  m: { fontSize: font.small, marginTop: 3 },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
