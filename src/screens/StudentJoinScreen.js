// Öğrenci: derse katıl (öğretmenin tahtadaki QR'ını okut + okul numarası) ya da yeni telefona geç (6 haneli bağlama kodu).
// Sınıf kodu yazılmaz: QR'ın anahtarı tahmin edilemez ve öğretmen yeniledikçe eskisi çalışmaz.
import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { spacing, font, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useProgress } from '../context/ProgressContext';
import { Header, Card } from '../teacher/ui';

// Öğretmenin sınıf QR'ı: MAMOSTE:KATIL:<32 hex>
export const parseJoinQr = (text) => {
  const m = /^MAMOSTE:KATIL:([0-9a-f]{32})$/i.exec(String(text || '').trim());
  return m ? m[1].toLowerCase() : null;
};

export default function StudentJoinScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { state, joinClass, linkDevice, cloudEnabled } = useProgress();
  const st = state.student;
  const [tab, setTab] = useState('join');
  const [secret, setSecret] = useState(parseJoinQr(route.params?.qr));
  const [no, setNo] = useState(st.no || '');
  const [nk, setNk] = useState(st.nk || '');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const [perm, requestPerm] = useCameraPermissions();
  const lastBad = useRef('');

  const ok = tab === 'join' ? !!secret && /^[0-9]{1,6}$/.test(no.trim()) : /^[0-9]{6}$/.test(link.trim());

  const onScan = ({ data }) => {
    if (secret) return;
    const s = parseJoinQr(data);
    if (s) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setError(null);
      setSecret(s);
    } else if (data !== lastBad.current) {
      lastBad.current = data;
      setError('Bu bir Mamoste sınıf QR kodu değil. Öğretmeninin tahtada gösterdiği QR\'ı okut.');
    }
  };

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const cn = tab === 'join' ? await joinClass(secret, no, nk) : await linkDevice(link);
      setDone(cn);
    } catch (e) {
      const msg = /fetch|network/i.test(e.message) ? 'İnternet bağlantısı yok gibi görünüyor.' : e.message;
      setError(msg);
      // QR yenilenmiş / katılım kapalıysa tekrar okutsun.
      if (/QR/.test(msg)) setSecret(null);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Derse katıldın 🎉" onBack={() => navigation.goBack()} />
        <View style={{ padding: spacing.md }}>
          <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Text style={{ fontSize: 44 }}>🎒</Text>
            <Text style={{ color: colors.text, fontSize: font.h3, fontWeight: '900', marginTop: spacing.sm }}>{done}</Text>
            <Text style={{ color: colors.textMuted, marginTop: 4, textAlign: 'center' }}>
              Öğretmenin ödev verdiğinde telefonuna bildirim gelir ve ödev “Ödevlerim”de görünür.
            </Text>
            <Pressable onPress={() => navigation.replace('StudentHomework')} style={[st2.btn, { backgroundColor: colors.primary, marginTop: spacing.lg }]}>
              <Text style={st2.btnT}>Ödevlerime git</Text>
            </Pressable>
          </Card>
        </View>
      </View>
    );
  }

  const input = (props) => (
    <TextInput placeholderTextColor={colors.textFaint} {...props} style={[st2.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }, props.style]} />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Derse katıl" subtitle={(st.classes || []).length ? `${st.classes.length} dersin var · yenisini ekle` : 'Öğretmeninin QR kodunu okut'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        {!cloudEnabled ? (
          <Card>
            <Text style={{ color: colors.text }}>Sunucu bağlantısı bu sürümde ayarlı değil.</Text>
          </Card>
        ) : null}
        <View style={st2.tabs}>
          {[['join', '📷 QR ile katıl'], ['link', 'Yeni telefona geç']].map(([k, l]) => (
            <Pressable key={k} onPress={() => { setTab(k); setError(null); }} style={[st2.tab, { borderColor: tab === k ? colors.primary : colors.border, backgroundColor: tab === k ? colors.primary + '1A' : colors.card }]}>
              <Text style={{ color: tab === k ? colors.primary : colors.text, fontWeight: '800', fontSize: font.small }}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <Card>
          {tab === 'join' ? (
            <>
              {!secret ? (
                <>
                  <Text style={[st2.lbl, { color: colors.textMuted, marginTop: 0 }]}>1 · ÖĞRETMENİNİN QR KODUNU OKUT</Text>
                  {perm?.granted ? (
                    <View style={[st2.cam, { borderColor: colors.border }]}>
                      <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />
                      <View pointerEvents="none" style={st2.frame} />
                    </View>
                  ) : (
                    <Pressable onPress={requestPerm} style={[st2.btn, { backgroundColor: colors.primary }]}>
                      <Text style={st2.btnT}>📷 Kamerayı aç</Text>
                    </Pressable>
                  )}
                  <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.sm }}>
                    QR, öğretmeninin tahtasında ya da telefonunda. Kod yazılmaz; QR'ın fotoğrafı başkasına gönderilse de öğretmen yenileyince çalışmaz.
                  </Text>
                </>
              ) : (
                <View style={[st2.okRow, { backgroundColor: colors.successSoft }]}>
                  <Text style={{ color: colors.text, fontWeight: '800', flex: 1 }}>✅ QR okundu</Text>
                  <Pressable onPress={() => setSecret(null)} hitSlop={8}>
                    <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Yeniden okut</Text>
                  </Pressable>
                </View>
              )}
              <Text style={[st2.lbl, { color: colors.textMuted }]}>2 · OKUL NUMARAN</Text>
              {input({ value: no, onChangeText: (v) => setNo(v.replace(/\D/g, '').slice(0, 6)), placeholder: 'ör. 14', keyboardType: 'number-pad', accessibilityLabel: 'Okul numarası' })}
              <Text style={[st2.lbl, { color: colors.textMuted }]}>TAKMA ADIN (isteğe bağlı)</Text>
              {input({ value: nk, onChangeText: (v) => setNk(v.slice(0, 30)), placeholder: 'ör. Ali K.', accessibilityLabel: 'Takma ad' })}
              <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.sm }}>
                Tam adını yazmak zorunda değilsin. Öğretmenin seni numaranla tanır.
              </Text>
            </>
          ) : (
            <>
              <Text style={{ color: colors.text, marginBottom: spacing.sm }}>
                Telefonunu değiştirdiysen öğretmeninden <Text style={{ fontWeight: '800' }}>bağlama kodu</Text> iste ve buraya yaz. Bütün derslerin ve ödev geçmişin yeni telefona geçer.
              </Text>
              {input({ value: link, onChangeText: (v) => setLink(v.replace(/\D/g, '').slice(0, 6)), placeholder: '123456', keyboardType: 'number-pad', accessibilityLabel: 'Bağlama kodu', style: st2.big })}
            </>
          )}
          {error ? <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Text> : null}
          <Pressable onPress={submit} disabled={!ok || busy || !cloudEnabled} style={[st2.btn, { backgroundColor: colors.primary, marginTop: spacing.md }, (!ok || busy || !cloudEnabled) && { opacity: 0.4 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={st2.btnT}>{tab === 'join' ? 'Derse katıl' : 'Bağla'}</Text>}
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}

const st2 = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  tab: { flex: 1, alignItems: 'center', borderWidth: 1.5, borderRadius: radius.md, paddingVertical: 10 },
  lbl: { fontSize: font.tiny, fontWeight: '800', letterSpacing: 1, marginTop: spacing.md, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: font.body },
  big: { fontSize: 24, letterSpacing: 4, fontWeight: '800', textAlign: 'center' },
  btn: { borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  btnT: { color: '#fff', fontWeight: '900', fontSize: font.body },
  cam: { height: 280, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1 },
  frame: { position: 'absolute', top: '15%', left: '20%', right: '20%', bottom: '15%', borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)', borderRadius: 18 },
  okRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, padding: spacing.md },
});
