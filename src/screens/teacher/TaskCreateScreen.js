// Görev ödevi (tüm branşlar): başlık + açıklama + öğretmenin foto/videoları + son gün.
// Öğrenci bildirim alır, açar, "Tamamladım" der (isterse not). Öğrenci dosya gönderemez (şimdilik).
import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { addDays, nextWeekday } from '../../teacher/analytics';
import { Header, Card, SectionTitle, Field, SmallButton, Chip, formatDate } from '../../teacher/ui';
import { dayKey } from '../../utils/helpers';
import { pickMedia, uploadMedia, removeMedia } from '../../teacher/media';

export default function TaskCreateScreen({ route, navigation }) {
  const { classId, studentId } = route.params;
  const { colors } = useTheme();
  const t = useTeacher();
  const cls = t.getClass(classId);
  const student = studentId ? cls.students[studentId] : null;
  const today = dayKey();
  const [target, setTarget] = useState(student ? student.id : 'all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [att, setAtt] = useState([]); // yüklenmiş: { path, url, type, name }
  const [busy, setBusy] = useState(null); // yükleniyor mesajı
  const [error, setError] = useState(null);
  const dueOpts = [
    [addDays(today, 1), 'Yarın'],
    [addDays(today, 2), '2 gün'],
    [nextWeekday(5, new Date(Date.now() + 864e5)), 'Cuma'],
    [addDays(today, 7), '1 hafta'],
  ];
  const [due, setDue] = useState(dueOpts[3][0]);

  const add = async (source) => {
    setError(null);
    try {
      const items = await pickMedia(source);
      const room = 10 - att.length;
      for (const [i, it] of items.slice(0, room).entries()) {
        setBusy(`Yükleniyor ${i + 1}/${Math.min(items.length, room)}…`);
        const up = await uploadMedia(cls.rid, it);
        setAtt((a) => [...a, up]);
      }
      if (items.length > room) setError('En fazla 10 ek olabilir.');
    } catch (e) {
      setError(/fetch|network/i.test(e.message) ? 'İnternet bağlantısı yok gibi görünüyor.' : e.message);
    } finally {
      setBusy(null);
    }
  };

  const drop = (a) => {
    setAtt((list) => list.filter((x) => x.path !== a.path));
    removeMedia([a.path]).catch(() => {});
  };

  const create = () => {
    const to = target === 'all' ? undefined : target;
    const { list } = t.addHomeworks(classId, [{ type: 'task', title: title.trim(), body: body.trim(), att, due, to }]);
    navigation.replace('HomeworkShare', { classId, hwIds: list.map((h) => h.id) });
  };

  const canCreate = title.trim().length > 0 && !busy;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Yeni görev ödevi" subtitle={cls.name} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <SectionTitle>KİME</SectionTitle>
        <View style={st.wrap}>
          <Chip label={`👥 Tüm sınıf (${Object.keys(cls.students).length})`} active={target === 'all'} onPress={() => setTarget('all')} />
          {student ? <Chip label={`👤 ${student.no} ${student.nk || ''}`} active={target === student.id} onPress={() => setTarget(student.id)} /> : null}
        </View>

        <Field label="Başlık" value={title} onChangeText={(v) => setTitle(v.slice(0, 80))} placeholder="ör. Kalemlik eskizi" />
        <Field
          label="Açıklama"
          value={body}
          onChangeText={(v) => setBody(v.slice(0, 4000))}
          placeholder="Öğrenci ne yapacak? Adımları yaz."
          multiline
          style={{ minHeight: 110, textAlignVertical: 'top' }}
        />

        <SectionTitle>FOTO / VİDEO (en fazla 10)</SectionTitle>
        <View style={[st.wrap, { gap: spacing.sm }]}>
          {att.map((a) => (
            <View key={a.path} style={[st.thumb, { borderColor: colors.border, backgroundColor: colors.card }]}>
              {a.type === 'image' ? <Image source={{ uri: a.url }} style={StyleSheet.absoluteFill} /> : <Text style={{ fontSize: 28 }}>🎬</Text>}
              <Pressable onPress={() => drop(a)} hitSlop={6} style={st.x} accessibilityLabel={`${a.name} ekini kaldır`}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
        {busy ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ color: colors.textMuted }}>{busy}</Text>
          </View>
        ) : (
          <View style={[st.wrap, { gap: spacing.sm, marginTop: spacing.sm }]}>
            <SmallButton title="🖼️ Galeriden ekle" onPress={() => add('library')} disabled={att.length >= 10} />
            <SmallButton title="📷 Çek" onPress={() => add('camera')} disabled={att.length >= 10} />
          </View>
        )}
        {error ? <Text style={{ color: colors.danger, marginTop: spacing.sm }}>{error}</Text> : null}
        <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.sm }}>
          Video en fazla 2 dakika / 50 MB. Öğrencinin yüzü görünen fotoğraf eklemekten kaçın.
        </Text>

        <SectionTitle>SON GÜN</SectionTitle>
        <View style={st.wrap}>
          {dueOpts.map(([k, l]) => (
            <Chip key={l} label={`${l} · ${formatDate(k)}`} active={due === k} onPress={() => setDue(k)} />
          ))}
        </View>

        <Card style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.textMuted, fontSize: font.small }}>
            Oluşturunca ödev sınıfa gönderilir; katılmış öğrencilerin telefonuna bildirim gider.
          </Text>
        </Card>
      </ScrollView>
      <View style={[st.footer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <SmallButton title="Oluştur ve gönder →" filled onPress={create} disabled={!canCreate} style={{ paddingVertical: 14 }} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  thumb: { width: 84, height: 84, borderRadius: radius.md, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  x: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
