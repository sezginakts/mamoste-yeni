// Şifre sıfırlama linkinden gelen öğretmen: yeni şifreyi belirler.
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function NewPasswordScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const ok = pw.length >= 6 && pw === pw2;

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      await auth.updatePassword(pw);
    } catch (e) {
      setError(/at least 6|weak/i.test(e.message) ? 'Şifre en az 6 karakter olmalı.' : /different from the old/i.test(e.message) ? 'Yeni şifre eskisiyle aynı olamaz.' : e.message);
    } finally {
      setBusy(false);
    }
  };

  const field = (value, onChangeText, label) => (
    <>
      <Text style={[st.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="••••••"
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={label}
        style={[st.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
      />
    </>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[st.wrap, { paddingTop: insets.top + spacing.xl }]}>
        <Text style={{ fontSize: 44 }}>🔑</Text>
        <Text style={[st.title, { color: colors.text }]}>Yeni şifre</Text>
        <Text style={[st.sub, { color: colors.textMuted }]}>Hesabın için yeni bir şifre belirle.</Text>
        {field(pw, setPw, 'Yeni şifre (en az 6 karakter)')}
        {field(pw2, setPw2, 'Yeni şifre (tekrar)')}
        {pw2.length > 0 && pw !== pw2 ? <Text style={{ color: colors.danger, alignSelf: 'flex-start', marginTop: 4 }}>Şifreler aynı değil.</Text> : null}
        {error ? <Text style={{ color: colors.danger, marginTop: spacing.md, textAlign: 'center' }}>{error}</Text> : null}
        <Pressable onPress={save} disabled={busy || !ok} style={[st.btn, { backgroundColor: colors.accent }, (busy || !ok) && { opacity: 0.4 }]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={st.btnT}>Şifreyi kaydet</Text>}
        </Pressable>
        <Pressable onPress={auth.cancelRecovery} style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.accent, fontWeight: '700' }}>Şimdi değil</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.lg, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: font.h2, fontWeight: '900', marginTop: spacing.sm },
  sub: { fontSize: font.body, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.md },
  label: { alignSelf: 'flex-start', fontSize: font.small, fontWeight: '700', marginTop: spacing.md, marginBottom: 6 },
  input: { width: '100%', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: font.body },
  btn: { width: '100%', borderRadius: radius.md, paddingVertical: 15, alignItems: 'center', marginTop: spacing.lg },
  btnT: { color: '#fff', fontWeight: '900', fontSize: font.body },
});
