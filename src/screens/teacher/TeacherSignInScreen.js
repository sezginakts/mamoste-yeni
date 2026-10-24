// Öğretmen girişi: e-posta + şifre (Giriş yap / Kayıt ol), beni hatırla, şifremi unuttum, Google ile devam et.
// Şifremi unuttum / şifrem yok: sıfırlama e-postası gider; linke dokunmak ya da linki buraya yapıştırmak
// yeni şifre ekranını açar. İlk sürümde e-posta linkiyle açılan hesapların şifresi yoktur, şifreyi bu yolla koyarlar.
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const trError = (m) =>
  /invalid login credentials/i.test(m)
    ? 'E-posta ya da şifre hatalı. Hesabını ilk sürümde e-posta linkiyle açtıysan şifren yok: "Şifremi unuttum / şifrem yok"a dokunup şifre belirle.'
    : /already registered|already been registered/i.test(m)
      ? 'Bu e-postayla zaten bir hesap var. "Giriş yap"tan gir.'
      : /email not confirmed/i.test(m)
        ? 'E-posta adresin henüz onaylanmadı. Gelen onay e-postasındaki linke dokun.'
        : /password should be|at least 6|weak/i.test(m)
          ? 'Şifre en az 6 karakter olmalı.'
          : /expired|invalid.*(token|otp)|token.*invalid|otp/i.test(m)
            ? 'Link geçersiz ya da süresi dolmuş. Yeni link iste ve en son gelen e-postadaki linki kullan.'
          : /provider is not enabled|unsupported provider/i.test(m)
            ? 'Google ile giriş henüz açılmadı.'
            : /rate|too many|seconds/i.test(m)
              ? 'Çok fazla deneme. Biraz bekleyip tekrar dene.'
              : /network|fetch/i.test(m)
                ? 'İnternet bağlantısı yok gibi görünüyor.'
                : m;

export default function TeacherSignInScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [mode, setMode] = useState('in'); // 'in' | 'up' | 'forgot'
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [sent, setSent] = useState(false); // sıfırlama e-postası gitti → link yapıştırma alanı
  const [link, setLink] = useState('');

  // Beni hatırla ile saklanan e-posta hazır gelsin.
  useEffect(() => {
    if (auth.lastEmail && !email) setEmail(auth.lastEmail);
  }, [auth.lastEmail]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const ok =
    mode === 'forgot' ? emailOk : mode === 'up' ? emailOk && pw.length >= 6 && pw === pw2 : emailOk && pw.length > 0;

  const run = async (fn) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(trError(e.message || String(e)));
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    run(async () => {
      if (mode === 'in') await auth.signIn(email, pw, remember);
      else if (mode === 'up') {
        const r = await auth.signUp(email, pw, remember);
        if (r.needsConfirm) setInfo('Hesabın açıldı. E-postana gelen onay linkine dokun, sonra giriş yap.');
      } else {
        await auth.resetPassword(email);
        setSent(true);
        setInfo(`${email.trim()} adresine link gönderdik (gelmezse spam klasörüne bak).`);
      }
    });

  const go = (m) => {
    setMode(m);
    setError(null);
    setInfo(null);
    setPw2('');
    setSent(false);
    setLink('');
  };
  const useLink = () => run(() => auth.verifyLink(link, email, remember));

  const input = (props) => (
    <TextInput
      placeholderTextColor={colors.textFaint}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={[st.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }, props.style]}
    />
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[st.wrap, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 44 }}>👩‍🏫</Text>
        <Text style={[st.title, { color: colors.text }]}>{mode === 'forgot' ? 'Şifremi unuttum' : 'Öğretmen girişi'}</Text>
        <Text style={[st.sub, { color: colors.textMuted }]}>
          {mode === 'forgot' ? 'E-postana bir link göndereceğiz; o linkle yeni şifreni belirleyeceksin. Şifren hiç yoksa da bu yolu kullan.' : 'Okul hesabınla gir ya da yeni hesap aç.'}
        </Text>

        {mode !== 'forgot' ? (
          <View style={[st.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[['in', 'Giriş yap'], ['up', 'Kayıt ol']].map(([k, l]) => (
              <Pressable key={k} onPress={() => go(k)} style={[st.tab, mode === k && { backgroundColor: colors.accent }]} accessibilityRole="tab" accessibilityState={{ selected: mode === k }}>
                <Text style={{ color: mode === k ? '#fff' : colors.text, fontWeight: '800' }}>{l}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={[st.label, { color: colors.textMuted }]}>E-posta</Text>
        {input({ value: email, onChangeText: setEmail, placeholder: 'ornek@okul.k12.tr', keyboardType: 'email-address', autoComplete: 'email', textContentType: 'emailAddress', accessibilityLabel: 'E-posta' })}

        {mode !== 'forgot' ? (
          <>
            <Text style={[st.label, { color: colors.textMuted }]}>Şifre{mode === 'up' ? ' (en az 6 karakter)' : ''}</Text>
            <View style={{ width: '100%' }}>
              {input({
                value: pw,
                onChangeText: setPw,
                placeholder: '••••••',
                secureTextEntry: !show,
                autoComplete: mode === 'up' ? 'new-password' : 'current-password',
                textContentType: mode === 'up' ? 'newPassword' : 'password',
                accessibilityLabel: 'Şifre',
                style: { paddingRight: 70 },
                onSubmitEditing: mode === 'in' && ok ? submit : undefined,
              })}
              <Pressable onPress={() => setShow(!show)} style={st.eye} hitSlop={8} accessibilityLabel={show ? 'Şifreyi gizle' : 'Şifreyi göster'}>
                <Text style={{ color: colors.accent, fontWeight: '700', fontSize: font.small }}>{show ? 'Gizle' : 'Göster'}</Text>
              </Pressable>
            </View>
            {mode === 'up' ? (
              <>
                <Text style={[st.label, { color: colors.textMuted }]}>Şifre (tekrar)</Text>
                {input({ value: pw2, onChangeText: setPw2, placeholder: '••••••', secureTextEntry: !show, autoComplete: 'new-password', textContentType: 'newPassword', accessibilityLabel: 'Şifre tekrar' })}
                {pw2.length > 0 && pw !== pw2 ? <Text style={[st.hint, { color: colors.danger }]}>Şifreler aynı değil.</Text> : null}
              </>
            ) : null}

            <View style={st.row}>
              <Pressable onPress={() => setRemember(!remember)} style={st.check} accessibilityRole="checkbox" accessibilityState={{ checked: remember }} hitSlop={6}>
                <View style={[st.box, { borderColor: remember ? colors.accent : colors.border, backgroundColor: remember ? colors.accent : 'transparent' }]}>
                  {remember ? <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>✓</Text> : null}
                </View>
                <Text style={{ color: colors.text }}>Beni hatırla</Text>
              </Pressable>
              {mode === 'in' ? (
                <Pressable onPress={() => go('forgot')} hitSlop={6}>
                  <Text style={{ color: colors.accent, fontWeight: '700' }}>Şifremi unuttum / şifrem yok</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}

        {mode === 'forgot' && sent ? (
          <View style={[st.steps, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '900', marginBottom: 6 }}>Sonraki adım</Text>
            <Text style={{ color: colors.textMuted, lineHeight: 21 }}>
              <Text style={{ color: colors.accent, fontWeight: '900' }}>1. </Text>E-postadaki linke dokunma: telefonda basılı tut, “Bağlantıyı kopyala”yı seç (bilgisayarda sağ tık → “Bağlantı adresini kopyala”).{'\n'}
              <Text style={{ color: colors.accent, fontWeight: '900' }}>2. </Text>Aşağıya yapıştır, “Linkle devam et”e dokun, yeni şifreni belirle.{'\n'}
              Link bir kez kullanılır; dokunduysan ve açılmadıysa yeni link iste.
            </Text>
            {input({ value: link, onChangeText: setLink, placeholder: 'Linki buraya yapıştır', accessibilityLabel: 'E-postadaki link', style: { marginTop: spacing.sm } })}
            <Pressable onPress={useLink} disabled={busy || !link.trim()} style={[st.btn, { backgroundColor: colors.primary }, (busy || !link.trim()) && { opacity: 0.4 }]}>
              <Text style={st.btnT}>Linkle devam et</Text>
            </Pressable>
          </View>
        ) : null}

        {error ? <Text style={[st.msg, { color: colors.danger }]}>{error}</Text> : null}
        {info ? <Text style={[st.msg, { color: colors.primary }]}>{info}</Text> : null}

        <Pressable onPress={submit} disabled={busy || !ok} style={[st.btn, { backgroundColor: colors.accent }, (busy || !ok) && { opacity: 0.4 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnT}>{mode === 'in' ? 'Giriş yap' : mode === 'up' ? 'Hesap aç' : sent ? 'Linki yeniden gönder' : 'Link gönder'}</Text>}
        </Pressable>

        {mode === 'forgot' ? (
          <>
            {!sent ? (
              <Pressable onPress={() => setSent(true)} style={{ marginTop: spacing.md }}>
                <Text style={{ color: colors.accent, fontWeight: '700' }}>Link zaten geldi, yapıştıracağım</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => go('in')} style={{ marginTop: spacing.md }}>
              <Text style={{ color: colors.accent, fontWeight: '700' }}>‹ Girişe dön</Text>
            </Pressable>
          </>
        ) : auth.googleEnabled ? (
          <>
            <View style={st.orRow}>
              <View style={[st.line, { backgroundColor: colors.border }]} />
              <Text style={{ color: colors.textFaint, marginHorizontal: spacing.sm }}>veya</Text>
              <View style={[st.line, { backgroundColor: colors.border }]} />
            </View>
            <Pressable
              onPress={() => run(() => auth.signInWithGoogle(remember))}
              disabled={busy}
              style={[st.btn, st.google, { backgroundColor: colors.card, borderColor: colors.border }]}
              accessibilityLabel="Google ile devam et"
            >
              <Text style={st.gMark}>G</Text>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: font.body }}>Google ile devam et</Text>
            </Pressable>
          </>
        ) : null}

        <Text style={[st.note, { color: colors.textFaint }]}>
          Sınıfların ve ödevlerin bu hesaba bağlanır. Öğrenci adları sunucuya gönderilmez; yalnızca okul numaraları gider.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: 'center', paddingHorizontal: spacing.lg, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: font.h2, fontWeight: '900', marginTop: spacing.sm },
  sub: { fontSize: font.body, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  tabs: { flexDirection: 'row', width: '100%', borderWidth: 1, borderRadius: radius.md, padding: 4, marginBottom: spacing.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md - 2 },
  label: { alignSelf: 'flex-start', fontSize: font.small, fontWeight: '700', marginTop: spacing.md, marginBottom: 6 },
  input: { width: '100%', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: font.body },
  eye: { position: 'absolute', right: spacing.md, top: 0, bottom: 0, justifyContent: 'center' },
  hint: { alignSelf: 'flex-start', fontSize: font.small, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: spacing.md },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  msg: { marginTop: spacing.md, textAlign: 'center' },
  btn: { width: '100%', borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.md },
  btnT: { color: '#fff', fontWeight: '900', fontSize: font.body },
  orRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: spacing.lg },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  google: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, borderWidth: 1 },
  gMark: { fontSize: 18, fontWeight: '900', color: '#4285F4' },
  note: { fontSize: font.tiny, textAlign: 'center', marginTop: spacing.xl },
  steps: { width: '100%', borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
});
