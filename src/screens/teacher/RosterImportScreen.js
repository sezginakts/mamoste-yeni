// Toplu öğrenci ekleme: dosyadan (Excel/Word/CSV) ya da yapıştırılan metinden liste çıkar,
// önizlemede düzelt, tek dokunuşla sınıfa ekle.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { Header, Card, SectionTitle, Field, SmallButton } from '../../teacher/ui';
import { parseRosterRows, prepareRoster, textToRows, shortenSurname } from '../../teacher/roster';
import { pickRosterFile, RosterFileError } from '../../teacher/rosterFile';

export default function RosterImportScreen({ route, navigation }) {
  const { classId } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useTeacher();
  const cls = t.getClass(classId);
  const [paste, setPaste] = useState('');
  const [rows, setRows] = useState(null); // null = kaynak seçimi
  const [source, setSource] = useState('');
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [shorten, setShorten] = useState(false);
  const [done, setDone] = useState(null);

  const existingNos = useMemo(() => (cls ? Object.values(cls.students).map((s) => String(s.no)) : []), [cls]);

  // Satır durumları düzenlemeyle birlikte yeniden hesaplanır.
  const statuses = useMemo(() => {
    if (!rows) return [];
    const ex = new Set(existingNos);
    const count = {};
    rows.forEach((r) => (count[r.no] = (count[r.no] || 0) + 1));
    return rows.map((r) => {
      if (!String(r.no).trim()) return 'noNo';
      if (ex.has(String(r.no))) return 'exists';
      if (count[r.no] > 1) return 'dup';
      return 'new';
    });
  }, [rows, existingNos]);
  const addable = statuses.filter((s) => s === 'new').length;
  const problems = statuses.filter((s) => s === 'dup' || s === 'noNo').length;

  if (!cls) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Sınıf bulunamadı" onBack={() => navigation.goBack()} /></View>;

  const load = (result, label) => {
    const prepared = prepareRoster(result.students, existingNos);
    if (!prepared.length) {
      setError('Listede öğrenci bulunamadı. Her satırda bir öğrenci olmalı (ör. “14 Ali Kaya”) ya da tabloda “No / Adı / Soyadı” sütunları olmalı.');
      return;
    }
    setError(null);
    setSkipped(result.skipped);
    setSource(label);
    setRows(prepared);
  };

  const fromFile = async () => {
    setError(null);
    setBusy(true);
    try {
      const f = await pickRosterFile();
      if (!f) return;
      const result = f.rows ? parseRosterRows(f.rows) : parseRosterRows(textToRows(f.text));
      load(result, f.name);
    } catch (e) {
      setError(e instanceof RosterFileError ? e.message : 'Dosya okunamadı. Dosyanın bozuk ya da şifreli olmadığından emin ol; olmazsa listeyi kopyalayıp yapıştır.');
      if (!(e instanceof RosterFileError)) console.warn('liste dosyası', e);
    } finally {
      setBusy(false);
    }
  };

  const fromPaste = () => load(parseRosterRows(textToRows(paste)), 'Yapıştırılan liste');

  const edit = (i, patch) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch, autoNo: patch.no != null ? false : r.autoNo } : r)));
  const remove = (i) => setRows((rs) => rs.filter((_, k) => k !== i));

  const save = () => {
    const list = rows
      .filter((_, i) => statuses[i] === 'new')
      .map((r) => ({ no: String(r.no).trim(), nk: shorten ? shortenSurname(r.nk) : r.nk }));
    const n = t.addStudentList(classId, list);
    setDone({ n, skippedExisting: statuses.filter((s) => s === 'exists').length });
  };

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Öğrenciler eklendi" subtitle={cls.name} onBack={() => navigation.goBack()} />
        <View style={{ padding: spacing.md }}>
          <Card>
            <Text style={{ color: colors.text, fontSize: font.h3, fontWeight: '900' }}>✓ {done.n} öğrenci eklendi</Text>
            {done.skippedExisting ? (
              <Text style={{ color: colors.textMuted, marginTop: 4 }}>{done.skippedExisting} öğrenci sınıfta zaten olduğu için atlandı.</Text>
            ) : null}
            <SmallButton title="Sınıfa dön" filled style={{ marginTop: spacing.md }} onPress={() => navigation.goBack()} />
          </Card>
        </View>
      </View>
    );
  }

  // ---- 1. Kaynak seçimi ----
  if (!rows) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Header title="Öğrenci listesi ekle" subtitle={cls.name} onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
          <Card onPress={busy ? null : fromFile} style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
            {busy ? <ActivityIndicator color={colors.accent} /> : <Text style={{ fontSize: 32 }}>📄</Text>}
            <Text style={{ color: colors.text, fontWeight: '800', marginTop: 6 }}>{busy ? 'Dosya okunuyor…' : 'Dosyadan ekle'}</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.small, textAlign: 'center', marginTop: 2 }}>
              Excel (.xlsx, .xls), Word (.docx), CSV ya da metin dosyası. e-Okul sınıf listesi de olur.
            </Text>
          </Card>

          <SectionTitle>YA DA YAPIŞTIR</SectionTitle>
          <Card>
            <Field
              label="Excel’den, PDF’ten ya da mesajdan kopyaladığın listeyi yapıştır"
              value={paste}
              onChangeText={setPaste}
              multiline
              placeholder={'14 Ali Kaya\n15 Ayşe Demir\n…\nya da sadece numara aralığı: 1-32'}
              style={{ minHeight: 140 }}
            />
            <SmallButton title="Listeyi ayıkla" filled onPress={fromPaste} disabled={!paste.trim()} />
          </Card>

          {error ? (
            <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.danger }}>
              <Text style={{ color: colors.text, fontSize: font.small }}>{error}</Text>
            </Card>
          ) : null}

          <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.sm }}>
            Dosya bu cihazda okunur, hiçbir yere gönderilmez. Numara sütunu, ad ve soyad otomatik bulunur; eklemeden önce kontrol edip düzeltebilirsin.
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ---- 2. Önizleme ----
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Listeyi kontrol et" subtitle={source} onBack={() => setRows(null)} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={{ color: colors.text, fontWeight: '800' }}>
            {rows.length} satır bulundu · {addable} öğrenci eklenecek
          </Text>
          {statuses.includes('exists') ? (
            <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>
              {statuses.filter((s) => s === 'exists').length} öğrenci sınıfta zaten var, atlanacak.
            </Text>
          ) : null}
          {problems ? (
            <Text style={{ color: colors.danger, fontSize: font.small, marginTop: 2 }}>
              {problems} satırda numara sorunu var — düzelt ya da sil, yoksa eklenmez.
            </Text>
          ) : null}
          {skipped ? (
            <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>
              {skipped} satır isim gibi görünmediği için alınmadı (başlık, tarih vb.).
            </Text>
          ) : null}
          <View style={st.toggle}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Soyadını kısalt</Text>
              <Text style={{ color: colors.textMuted, fontSize: font.tiny }}>“Ali Kaya” → “Ali K.” olarak kaydedilir</Text>
            </View>
            <Switch value={shorten} onValueChange={setShorten} trackColor={{ false: colors.border, true: colors.accent }} />
          </View>
        </Card>

        <View style={[st.headRow, { borderColor: colors.border }]}>
          <Text style={[st.noCol, st.head, { color: colors.textMuted }]}>No</Text>
          <Text style={[st.head, { color: colors.textMuted, flex: 1 }]}>Ad Soyad</Text>
        </View>
        {rows.map((r, i) => {
          const s = statuses[i];
          const tone = s === 'exists' ? colors.textFaint : s === 'new' ? colors.text : colors.danger;
          return (
            <View key={r.key} style={[st.row, { borderColor: colors.border, opacity: s === 'exists' ? 0.6 : 1 }]}>
              <TextInput
                value={String(r.no)}
                onChangeText={(v) => edit(i, { no: v.replace(/\D/g, '') })}
                keyboardType="number-pad"
                accessibilityLabel={`${i + 1}. satır numara`}
                style={[st.input, st.noCol, { color: tone, borderColor: s === 'dup' || s === 'noNo' ? colors.danger : colors.border, backgroundColor: colors.card }]}
              />
              <View style={{ flex: 1 }}>
                <TextInput
                  value={shorten ? shortenSurname(r.nk) : r.nk}
                  editable={!shorten}
                  onChangeText={(v) => edit(i, { nk: v })}
                  placeholder="(isimsiz)"
                  placeholderTextColor={colors.textFaint}
                  accessibilityLabel={`${i + 1}. satır ad soyad`}
                  style={[st.input, { color: tone, borderColor: colors.border, backgroundColor: colors.card }]}
                />
                {s !== 'new' || r.autoNo ? (
                  <Text style={{ fontSize: font.tiny, marginTop: 2, color: s === 'new' ? colors.warning : s === 'exists' ? colors.textMuted : colors.danger }}>
                    {s === 'exists' ? 'Sınıfta zaten var — atlanacak' : s === 'dup' ? 'Bu numara listede birden fazla' : s === 'noNo' ? 'Numara gerekli' : 'Listede numara yoktu, sıradaki boş numara verildi'}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => remove(i)} hitSlop={8} accessibilityLabel={`${i + 1}. satırı sil`} style={st.del}>
                <Text style={{ color: colors.textMuted, fontSize: 18 }}>✕</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      <View style={[st.footer, { backgroundColor: colors.bg, borderColor: colors.border, paddingBottom: spacing.md + insets.bottom }]}>
        <SmallButton title="Geri" color={colors.textMuted} onPress={() => setRows(null)} />
        <SmallButton title={addable ? `${addable} öğrenciyi ekle` : 'Eklenecek öğrenci yok'} filled disabled={!addable} onPress={save} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  headRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs, marginTop: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { fontSize: font.tiny, fontWeight: '800', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  noCol: { width: 64 },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 6, fontSize: font.small },
  del: { width: 32, height: 34, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
