// Yapışkan notlar: renkli not yaz + isteğe bağlı hatırlatma (bugün / yarın / takvimden tarih, saat).
// Kağıtta yalnızca yazı durur; renk, hatırlatma ve kaydet düğmesi kağıdın altında.
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { spacing, font, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { useDesk } from './DeskContext';
import { PlanCalendar } from './planUi';
import { formatDate } from './ui';
import { dayKey } from '../utils/helpers';

// Not kağıdı renkleri — tema ne olursa olsun kağıt rengi ve koyu yazı.
export const NOTE_COLORS = {
  green: { bg: '#C7EFEA', edge: '#0D9488' }, // turkuaz
  blue: { bg: '#CDEBFA', edge: '#0284C7' }, // gök mavisi
  pink: { bg: '#FAD4CF', edge: '#E2574C' }, // mercan
  yellow: { bg: '#FFF3B0', edge: '#C99A06' }, // açık sarı
};
// Eski notların renkleri (turuncu, mor) en yakın renge düşer.
const OLD_NOTE = { orange: 'pink', purple: 'blue' };
const COLOR_NAMES = { green: 'Turkuaz', blue: 'Mavi', pink: 'Mercan', yellow: 'Açık sarı' };
const INK = '#1F2937';
const INK_SOFT = 'rgba(31,41,55,0.65)';
const paper = (c) => NOTE_COLORS[c] || NOTE_COLORS[OLD_NOTE[c]] || NOTE_COLORS.green;

const plusDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dayKey(d);
};

export default function NoteComposer({ autoFocus, onSaved }) {
  const desk = useDesk();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [color, setColor] = useState('green');
  const [remind, setRemind] = useState(null);
  const [time, setTime] = useState('');
  const [cal, setCal] = useState(false);
  const today = dayKey();
  const tomorrow = plusDays(1);
  const timeOk = !time || /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  const p = paper(color);

  const save = async () => {
    if (!text.trim() || !timeOk) return;
    await desk.addNote(text, remind, time || null, color);
    setText('');
    setRemind(null);
    setTime('');
    if (onSaved) onSaved();
  };

  // "1330" -> "13:30"
  const onTime = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    setTime(d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d);
  };

  const Pill = ({ label, active, onPress }) => (
    <Pressable onPress={onPress} style={[st.pill, { borderColor: active ? p.edge : colors.border, backgroundColor: active ? p.edge : colors.card }]}>
      <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '800', fontSize: font.tiny }}>{label}</Text>
    </Pressable>
  );

  return (
    <View>
      {/* Kağıt: yalnızca yazı */}
      <View style={[st.composer, { backgroundColor: p.bg }]}>
        <View style={st.tape} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Bir not yaz… (ör. 7-B sınav kağıtlarını dağıt)"
          placeholderTextColor={INK_SOFT}
          multiline
          autoFocus={autoFocus}
          accessibilityLabel="Not"
          style={st.input}
        />
      </View>

      {/* Kağıdın altı: renk, hatırlatma, kaydet */}
      <View style={st.colors}>
        {Object.entries(NOTE_COLORS).map(([k, v]) => (
          <Pressable
            key={k}
            onPress={() => setColor(k)}
            accessibilityLabel={`${COLOR_NAMES[k]} not`}
            style={[st.swatch, { backgroundColor: v.bg, borderColor: color === k ? v.edge : colors.border }, color === k && { transform: [{ scale: 1.15 }] }]}
          />
        ))}
        <Text style={{ color: colors.textMuted, fontSize: font.tiny, fontWeight: '700', marginLeft: 4 }}>{COLOR_NAMES[color]}</Text>
      </View>
      <View style={st.pills}>
        <Pill label="Hatırlatma yok" active={!remind} onPress={() => setRemind(null)} />
        <Pill label="⏰ Bugün" active={remind === today} onPress={() => setRemind(today)} />
        <Pill label="⏰ Yarın" active={remind === tomorrow} onPress={() => setRemind(tomorrow)} />
        <Pill
          label={remind && remind !== today && remind !== tomorrow ? `📅 ${formatDate(remind)}` : '📅 Tarih'}
          active={!!remind && remind !== today && remind !== tomorrow}
          onPress={() => setCal(true)}
        />
      </View>
      {remind ? (
        <View style={st.timeRow}>
          <Text style={{ color: colors.text, fontSize: font.small, fontWeight: '700' }}>Saat</Text>
          <TextInput
            value={time}
            onChangeText={onTime}
            placeholder="08:30"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            accessibilityLabel="Hatırlatma saati"
            style={[st.time, { color: colors.text, backgroundColor: colors.card, borderColor: timeOk ? colors.border : '#E2574C' }]}
          />
          <Text style={{ color: colors.textMuted, fontSize: font.tiny, flex: 1 }}>{timeOk ? 'Boş bırakırsan 08:30’da hatırlatır.' : 'Saati 13:30 gibi yaz.'}</Text>
        </View>
      ) : null}
      <Pressable onPress={save} disabled={!text.trim() || !timeOk} style={[st.save, { backgroundColor: p.edge }, (!text.trim() || !timeOk) && { opacity: 0.35 }]}>
        <Text style={{ color: '#fff', fontWeight: '800' }}>{remind ? '📌 Yapıştır ve hatırlat' : '📌 Notu yapıştır'}</Text>
      </Pressable>
      {cal ? <PlanCalendar visible legend={false} selected={remind} onClose={() => setCal(false)} onPick={(k) => setRemind(k < today ? today : k)} /> : null}
    </View>
  );
}

// Tek yapışkan not: ✓ = tamamlandı, ✕ = sil. Günü geçmiş hatırlatma kırmızı.
export function StickyNote({ n, style }) {
  const desk = useDesk();
  const today = dayKey();
  const p = paper(n.color);
  const late = n.remind && !n.done && n.remind < today;
  const isToday = n.remind === today && !n.done;
  // Notlar hafifçe eğik dursun (id'den sabit açı).
  let h = 0;
  for (const ch of n.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const tilt = ((h % 5) - 2) * 0.8;
  return (
    <View style={[st.note, { backgroundColor: p.bg, transform: [{ rotate: `${tilt}deg` }] }, n.done && { opacity: 0.55 }, style]}>
      <View style={st.tape} />
      <Text style={[st.noteText, n.done && { textDecorationLine: 'line-through' }]}>{n.text}</Text>
      <View style={st.noteFoot}>
        {n.remind ? (
          <View style={[st.remind, { backgroundColor: late ? '#E2574C' : isToday ? p.edge : 'rgba(255,255,255,0.55)' }]}>
            <Text style={{ color: late || isToday ? '#fff' : INK, fontSize: 11, fontWeight: '800' }}>
              ⏰ {isToday ? 'Bugün' : formatDate(n.remind)}{n.time ? ` ${n.time}` : ''}{late ? ' · gecikti' : ''}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <Pressable onPress={() => desk.toggleNote(n.id)} hitSlop={6} style={st.iconBtn} accessibilityRole="checkbox" accessibilityState={{ checked: n.done }} accessibilityLabel={`Tamamlandı: ${n.text}`}>
            <Text style={{ color: n.done ? '#0D9488' : INK, fontWeight: '900' }}>✓</Text>
          </Pressable>
          <Pressable onPress={() => desk.removeNote(n.id)} hitSlop={6} style={st.iconBtn} accessibilityLabel="Notu sil">
            <Text style={{ color: INK_SOFT, fontWeight: '900' }}>✕</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const paperShadow = { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 };

const st = StyleSheet.create({
  composer: { borderRadius: 6, padding: spacing.md, paddingTop: spacing.lg, ...paperShadow },
  tape: { position: 'absolute', top: -7, alignSelf: 'center', width: 64, height: 16, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 2, transform: [{ rotate: '-2deg' }] },
  input: { color: INK, fontSize: font.body, minHeight: 96, textAlignVertical: 'top', lineHeight: 22 },
  colors: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2.5 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  pill: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  time: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 5, width: 70, textAlign: 'center', fontSize: font.body },
  save: { marginTop: spacing.md, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center' },

  note: { borderRadius: 4, padding: spacing.md, paddingTop: spacing.lg, minHeight: 130, justifyContent: 'space-between', ...paperShadow },
  noteText: { color: INK, fontSize: font.body, lineHeight: 21, fontWeight: '600' },
  noteFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, gap: 4 },
  remind: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 1 },
  iconBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
});
