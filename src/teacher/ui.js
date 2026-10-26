// Öğretmen / ödev ekranlarının ortak küçük bileşenleri.
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Platform, Share, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { radius, spacing, font } from '../theme';
import { useTheme } from '../context/ThemeContext';

export function Header({ title, subtitle, onBack, right }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: insets.top + spacing.sm, backgroundColor: colors.bg, borderColor: colors.border }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} accessibilityLabel="Geri" style={s.back}>
          <Text style={{ fontSize: 22, color: colors.text }}>←</Text>
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[s.hTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[s.hSub, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, onPress }) {
  const { colors, shadow } = useTheme();
  const base = [s.card, shadow, { backgroundColor: colors.card, borderColor: colors.border }];
  if (!onPress) return <View style={[...base, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed && { opacity: 0.85 }, style]}>
      {children}
    </Pressable>
  );
}

export function SectionTitle({ children, right }) {
  const { colors } = useTheme();
  return (
    <View style={s.secRow}>
      <Text style={[s.sec, { color: colors.textMuted }]}>{children}</Text>
      {right}
    </View>
  );
}

export function Chip({ label, active, onPress, color, small }) {
  const { colors } = useTheme();
  const c = color || colors.accent;
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, small && s.chipSmall, { borderColor: active ? c : colors.border, backgroundColor: active ? c + '22' : colors.card }]}
    >
      <Text style={[s.chipText, small && { fontSize: font.tiny }, { color: active ? c : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={[s.label, { color: colors.textMuted }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        {...props}
        style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }, props.multiline && { minHeight: 90, textAlignVertical: 'top' }, props.style]}
      />
    </View>
  );
}

export function SmallButton({ title, onPress, color, filled, style, disabled }) {
  const { colors } = useTheme();
  const c = color || colors.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.sb, { borderColor: c, backgroundColor: filled ? c : 'transparent' }, pressed && { opacity: 0.8 }, disabled && { opacity: 0.4 }, style]}
    >
      <Text style={[s.sbText, { color: filled ? '#fff' : c }]}>{title}</Text>
    </Pressable>
  );
}

// Davet kodu tahtada okunaklı olsun: K7MQ4XPA → K7MQ-4XPA
export const formatJoinCode = (c) => (c && c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c || '');

// Metni panoya kopyala / paylaş (WhatsApp vb.). Web'de panoya kopyalar.
export async function shareText(message) {
  if (Platform.OS === 'web') {
    try {
      await navigator.clipboard.writeText(message);
      return 'copied';
    } catch (e) {
      return 'failed';
    }
  }
  try {
    await Share.share({ message });
    return 'shared';
  } catch (e) {
    return 'failed';
  }
}

export function QrBox({ value, size = 240, caption, shareMessage }) {
  const { colors } = useTheme();
  const [status, setStatus] = useState(null);
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[s.qrWrap, { borderColor: colors.border }]}>
        <QRCode value={value} size={size} ecl="L" backgroundColor="#FFFFFF" color="#000000" />
      </View>
      {caption ? <Text style={[s.qrCap, { color: colors.textMuted }]}>{caption}</Text> : null}
      <SmallButton
        title={status === 'copied' ? '✓ Kopyalandı' : Platform.OS === 'web' ? '📋 Kodu kopyala' : '📤 Paylaş / kopyala'}
        onPress={async () => setStatus(await shareText(shareMessage || value))}
        style={{ marginTop: spacing.sm }}
      />
    </View>
  );
}

export function Stat({ value, label, color }) {
  const { colors } = useTheme();
  return (
    <View style={[s.stat, { backgroundColor: colors.cardSoft }]}>
      <Text style={[s.statV, { color: color || colors.text }]}>{value}</Text>
      <Text style={[s.statL, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export function Empty({ text }) {
  const { colors } = useTheme();
  return <Text style={{ color: colors.textMuted, textAlign: 'center', padding: spacing.lg, fontSize: font.small }}>{text}</Text>;
}

export function formatDate(key) {
  if (!key) return '';
  const d = new Date(key.length === 10 ? key + 'T00:00:00' : key);
  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${d.getDate()} ${months[d.getMonth()]} ${days[d.getDay()]}`;
}

// Uzun tarih: "26 Ekim Pazartesi" (gün ve ay adları tam)
export function formatDateLong(key) {
  if (!key) return '';
  const d = new Date(key.length === 10 ? key + 'T00:00:00' : key);
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${d.getDate()} ${months[d.getMonth()]} ${days[d.getDay()]}`;
}

export function formatTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${formatDate(d.toISOString())} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  hTitle: { fontSize: font.h3, fontWeight: '800' },
  hSub: { fontSize: font.tiny, marginTop: 1 },
  card: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, marginBottom: spacing.sm },
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm },
  sec: { fontSize: font.tiny, fontWeight: '800', letterSpacing: 1 },
  chip: { borderWidth: 1.5, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: 14, marginRight: 6, marginBottom: 6 },
  chipSmall: { paddingVertical: 4, paddingHorizontal: 10 },
  chipText: { fontSize: font.small, fontWeight: '700' },
  label: { fontSize: font.tiny, fontWeight: '700', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: font.body },
  sb: { borderWidth: 1.5, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  sbText: { fontSize: font.small, fontWeight: '800' },
  qrWrap: { padding: 12, backgroundColor: '#FFFFFF', borderRadius: radius.md, borderWidth: 1 },
  qrCap: { fontSize: font.tiny, marginTop: spacing.sm, textAlign: 'center' },
  stat: { flex: 1, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  statV: { fontSize: font.h3, fontWeight: '900' },
  statL: { fontSize: font.tiny, marginTop: 2 },
  cBack: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  cBox: { width: '100%', maxWidth: 420, borderRadius: radius.md, borderWidth: 1, padding: spacing.lg },
  cTitle: { fontSize: font.h3, fontWeight: '900' },
  cMsg: { fontSize: font.small, marginTop: spacing.sm, lineHeight: 20 },
  cRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
});

// Onay sorusu: telefonda sistem penceresi; web'de uygulama içi pencere (tarayıcının confirm'ü bazı ortamlarda
// kendiliğinden kapanıyor, silme hiç olmuyordu). ConfirmHost App.js'te bir kez durur.
let openConfirm = null;
export function confirmAction({ title, message, ok = 'Tamam', destructive = false, onOk }) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, [{ text: 'Vazgeç', style: 'cancel' }, { text: ok, style: destructive ? 'destructive' : 'default', onPress: onOk }]);
  } else if (openConfirm) openConfirm({ title, message, ok, destructive, onOk });
  else if (window.confirm(`${title}\n\n${message}`)) onOk();
}
// Hata/bilgi mesajı (web'de de görünsün).
export function notify(title, message) {
  if (Platform.OS !== 'web') Alert.alert(title, message);
  else if (openConfirm) openConfirm({ title, message, ok: 'Tamam', info: true });
  else window.alert(`${title}\n\n${message}`);
}
export const HW_DELETE_MSG = 'Ödev senin listenden ve sunucudan silinir; başlamamış öğrencilerin listesinden de kalkar. Öğrencilerin daha önce gelen sonuçları profillerinde kalır.';

export function ConfirmHost() {
  const { colors } = useTheme();
  const [c, setC] = useState(null);
  openConfirm = setC;
  const close = () => setC(null);
  return (
    <Modal visible={!!c} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={s.cBack} onPress={close}>
        <Pressable style={[s.cBox, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
          <Text style={[s.cTitle, { color: colors.text }]}>{c ? c.title : ''}</Text>
          {c && c.message ? <Text style={[s.cMsg, { color: colors.textMuted }]}>{c.message}</Text> : null}
          <View style={s.cRow}>
            {c && !c.info ? <SmallButton title="Vazgeç" color={colors.textMuted} onPress={close} /> : null}
            <SmallButton
              title={c ? c.ok : ''}
              filled
              color={c && c.destructive ? colors.danger : colors.accent}
              onPress={() => {
                const fn = c && c.onOk;
                close();
                if (fn) fn();
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Yığında varsa o ekrana geri dön, yoksa ekle (aynı ekran iki kez açılmasın).
export function goTo(navigation, name, params) {
  const routes = (navigation.getState && navigation.getState().routes) || [];
  if (routes.some((r) => r.name === name)) navigation.popTo(name, params);
  else navigation.navigate(name, params);
}
