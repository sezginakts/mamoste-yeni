// QR / kod okuma — iki modda:
//   mode 'teacher': öğrencilerin SONUÇ QR'larını art arda okutur (30 öğrenci tek ekranda).
//   mode 'student': öğretmenin ÖDEV QR'ını okutur (ya da WhatsApp'tan gelen kodu yapıştırır).
import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { spacing, font, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useProgress } from '../context/ProgressContext';
import { useTeacher } from '../teacher/TeacherContext';
import { decodePayload } from '../utils/codec';
import { Header, Card, Field, SmallButton, goTo } from '../teacher/ui';
import { hwSummary } from '../utils/homework';

export default function ScanScreen({ route, navigation }) {
  const mode = route.params?.mode || 'teacher';
  const { colors } = useTheme();
  const teacher = useTeacher();
  const progress = useProgress();
  const [perm, requestPerm] = useCameraPermissions();
  const [camOn, setCamOn] = useState(Platform.OS !== 'web');
  const [paste, setPaste] = useState('');
  const [log, setLog] = useState([]); // { ok, msg }
  const seen = useRef(new Set());
  const [no, setNo] = useState(progress.state.student.no);
  const [nk, setNk] = useState(progress.state.student.nk);
  const needProfile = mode === 'student' && !progress.state.student.no;

  const push = (ok, msg) => setLog((l) => [{ ok, msg, k: Date.now() + Math.random() }, ...l].slice(0, 60));

  const handle = (text, manual) => {
    if (!text) return;
    if (seen.current.has(text)) {
      if (manual) push(false, 'Bu kod az önce işlendi.');
      return;
    }
    const p = decodePayload(text);
    if (!p) {
      push(false, 'Bu bir uygulama kodu değil.');
      return;
    }
    seen.current.add(text);
    if (mode === 'teacher') {
      if (p.type !== 'R') return push(false, 'Bu bir ödev kodu; öğretmen burada öğrenci SONUÇ kodunu okutur.');
      const r = teacher.importResult(p.data);
      push(r.ok, r.msg);
      if (r.ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      if (p.type !== 'H') return push(false, 'Bu bir sonuç kodu; burada öğretmenin verdiği ÖDEV kodunu okut.');
      const r = progress.receiveHomeworks(p.data);
      if (r.added.length) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        r.added.forEach((hw) => push(true, `${p.data.cn}: ${hw.title} — ${hwSummary(hw)}`));
      }
      if (r.skipped.length) push(false, `${r.skipped.length} ödev zaten ekli.`);
      if (r.forOther.length && !r.added.length) push(false, 'Bu ödev başka bir öğrenciye verilmiş.');
    }
  };

  const saveProfile = () => {
    if (!no.trim()) return;
    progress.setStudentProfile(no, nk);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title={mode === 'teacher' ? 'Sonuçları okut' : 'Ödev ekle'}
        subtitle={mode === 'teacher' ? 'Öğrenciler sırayla telefonlarındaki QR\'ı göstersin' : 'Öğretmenin QR\'ını okut ya da kodu yapıştır'}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
        {needProfile ? (
          <Card>
            <Text style={[st.h, { color: colors.text }]}>Önce kendini tanıt</Text>
            <Text style={[st.p, { color: colors.textMuted }]}>
              Sadece okul numaran ve istersen bir takma ad. Bu bilgi telefonunda kalır; ödev sonucunu öğretmenine gösterdiğinde kim olduğunu anlaması için.
            </Text>
            <Field label="Okul numaran" value={no} onChangeText={setNo} keyboardType="number-pad" placeholder="ör. 14" />
            <Field label="Takma ad (isteğe bağlı)" value={nk} onChangeText={setNk} placeholder="ör. Ali K." maxLength={24} />
            <SmallButton title="Kaydet" filled onPress={saveProfile} disabled={!no.trim()} />
          </Card>
        ) : (
          <>
            {camOn ? (
              perm?.granted ? (
                <View style={[st.cam, { borderColor: colors.border }]}>
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={({ data }) => handle(data)}
                  />
                </View>
              ) : (
                <Card>
                  <Text style={[st.p, { color: colors.textMuted }]}>QR okumak için kamera izni gerekiyor.</Text>
                  <SmallButton title="Kamerayı aç" filled onPress={requestPerm} />
                </Card>
              )
            ) : (
              <SmallButton title="📷 Kamerayı aç" onPress={() => setCamOn(true)} style={{ marginBottom: spacing.md }} />
            )}

            <Field
              label="…ya da kodu buraya yapıştır (WhatsApp mesajının tamamı da olur)"
              value={paste}
              onChangeText={setPaste}
              multiline
              placeholder="ING1.…"
            />
            <SmallButton
              title="Kodu işle"
              filled
              disabled={!paste.trim()}
              onPress={() => {
                handle(paste.trim(), true);
                setPaste('');
              }}
            />
          </>
        )}

        {log.map((l) => (
          <View key={l.k} style={[st.log, { backgroundColor: l.ok ? colors.successSoft : colors.dangerSoft }]}>
            <Text style={{ color: colors.text, fontSize: font.small }}>{l.ok ? '✅ ' : '⚠️ '}{l.msg}</Text>
          </View>
        ))}
        {mode === 'student' && log.some((l) => l.ok) ? (
          <SmallButton title="Ödevlerime git →" filled style={{ marginTop: spacing.md }} onPress={() => goTo(navigation, 'StudentHomework')} />
        ) : null}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  h: { fontSize: font.h3, fontWeight: '800', marginBottom: 6 },
  p: { fontSize: font.small, marginBottom: spacing.md, lineHeight: 20 },
  cam: { height: 300, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, marginBottom: spacing.md },
  log: { borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },
});
