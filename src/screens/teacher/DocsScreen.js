// Evraklar: kategorilere göre şablonlar (teacher/docs.js). İndirirken "Bilgilerim" (ad, okul, il, ilçe, müdür) + branş,
// tarih ve eğitim yılı şablona kendiliğinden yazılır; öğretmen Word'de gündem / kararları doldurur.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useRole } from '../../context/RoleContext';
import { Header, Field, SmallButton, notify, formatDate } from '../../teacher/ui';
import { useTeacherProfile } from '../../teacher/profile';
import { CATEGORIES, useDocList, loadDocInfo, saveDocInfo, downloadDoc, EMPTY_INFO } from '../../teacher/docs';
import Collapsible from '../../components/Collapsible';

export default function DocsScreen({ navigation }) {
  const { colors, shadow } = useTheme();
  const { branchId, branch } = useRole();
  const { profile } = useTeacherProfile();
  const docs = useDocList();
  const [info, setInfo] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(null);

  // Bilgiler: kayıtlıysa o; yoksa öğretmen profilindeki ad ve okul.
  useEffect(() => {
    loadDocInfo().then((saved) => {
      const merged = { ...EMPTY_INFO, ...saved, ad: saved.ad || profile.display_name || '', okul: saved.okul || profile.school || '' };
      setInfo(merged);
      if (!merged.ad || !merged.okul) setEditing(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const mine = (docs.list || []).filter((d) => !d.brans || d.brans === branchId);
    return CATEGORIES.map((c) => ({ ...c, items: mine.filter((d) => d.kategori === c.id).sort((a, b) => (b.brans ? 1 : 0) - (a.brans ? 1 : 0)) })).filter((g) => g.items.length);
  }, [docs.list, branchId]);

  const set = (k) => (v) => setInfo((x) => ({ ...x, [k]: v }));
  const saveInfo = () => {
    saveDocInfo(info);
    setEditing(false);
  };

  const download = async (doc) => {
    setBusy(doc.id);
    try {
      await downloadDoc(doc, info || EMPTY_INFO, branch ? branch.name : '', {
        sinif: (info || EMPTY_INFO).sinif || '',
      });
      docs.markSeen(doc);
    } catch (e) {
      notify('İndirilemedi', `Evrak indirilemedi. Sebep: ${(e && e.message) || 'bilinmeyen hata'}`);
    } finally {
      setBusy(null);
    }
  };

  const summary = info ? [info.ad, info.okul, [info.ilce, info.il].filter(Boolean).join(' / ')].filter(Boolean).join(' · ') : '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Evraklar" subtitle={branch ? `${branch.emoji} ${branch.name}` : ''} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }} keyboardShouldPersistTaps="handled">
        {/* Bilgilerim */}
        <View style={[st.card, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={st.row}>
            <Text style={{ fontSize: 22 }}>🪪</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body }}>Bilgilerim</Text>
              {!editing ? (
                <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }} numberOfLines={2}>
                  {summary || 'Henüz girilmedi'}
                </Text>
              ) : null}
            </View>
            {!editing && info ? (
              <Pressable onPress={() => setEditing(true)} hitSlop={8}>
                <Text style={{ color: colors.accent, fontWeight: '800' }}>Düzenle</Text>
              </Pressable>
            ) : null}
          </View>
          {editing && info ? (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={{ color: colors.textMuted, fontSize: font.small, marginBottom: spacing.sm }}>Evraklara kendiliğinden yazılır. Yalnız bu cihazda saklanır.</Text>
              <Field label="Adı soyadı" value={info.ad} onChangeText={set('ad')} placeholder="ör. Ayşe Yılmaz" />
              <Field label="Okul" value={info.okul} onChangeText={set('okul')} placeholder="ör. Atatürk Ortaokulu" />
              <View style={st.row}>
                <View style={{ flex: 1 }}>
                  <Field label="İl" value={info.il} onChangeText={set('il')} placeholder="ör. Ankara" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="İlçe" value={info.ilce} onChangeText={set('ilce')} placeholder="ör. Çankaya" />
                </View>
              </View>
              <Field label="Okul müdürü" value={info.mudur} onChangeText={set('mudur')} placeholder="Adı soyadı" />
              <Field label="Müdür yardımcısı" value={info.mudurYrd} onChangeText={set('mudurYrd')} placeholder="Adı soyadı" />
              <Field label="Sınıf / danışman öğretmen" value={info.danisman} onChangeText={set('danisman')} placeholder="Adı soyadı" />
              <View style={st.row}>
                <View style={{ flex: 1.1 }}>
                  <Field label="Sınıf / şube" value={info.sinif} onChangeText={set('sinif')} placeholder="ör. 5-B" />
                </View>
                <View style={{ flex: 2 }}>
                  <Field label="Öğrenci adı / adları" value={info.ogrenci} onChangeText={set('ogrenci')} placeholder="ör. Ali Veli, Ayşe Kaya" />
                </View>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: font.tiny, marginBottom: spacing.sm }}>
                Öğrenci adları, öğrenci isteyen evraklarda (gözlem formu, kontrol listesi, ürün dosyası, proje listesi…) şablona yazılır.
              </Text>
              <SmallButton title="Kaydet" filled onPress={saveInfo} style={{ alignSelf: 'flex-start' }} />
            </View>
          ) : null}
        </View>

        {docs.error && !docs.list ? (
          <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center' }]}>
            <Text style={{ color: colors.danger, textAlign: 'center', marginBottom: spacing.sm }}>{docs.error}</Text>
            <SmallButton title="Tekrar dene" onPress={docs.refresh} />
          </View>
        ) : !docs.list ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />
        ) : (
          groups.map((g, gi) => {
            const tint = gi % 2 ? colors.second : colors.accent;
            return (
              <Collapsible
                key={g.id}
                title={`${g.icon} ${g.name.toLocaleUpperCase('tr')}`}
                storageKey={`doc-${g.id}`}
                style={{ marginTop: spacing.sm }}
              >
                <View style={{ gap: spacing.sm }}>
                {g.items.map((d) => {
                  const isNew = docs.seen[d.id] !== d.tarih;
                  return (
                    <View key={d.id} style={[st.doc, shadow, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: tint }]}>
                      <View style={{ flex: 1 }}>
                        <View style={[st.row, { gap: 6, flexWrap: 'wrap' }]}>
                          <Text style={{ color: colors.text, fontWeight: '800', fontSize: font.body, flexShrink: 1 }}>{d.ad}</Text>
                          {isNew ? (
                            <View style={[st.badge, { backgroundColor: tint }]}>
                              <Text style={st.badgeT}>YENİ</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>
                          {[d.donem, d.tarih ? `Güncelleme: ${formatDate(d.tarih)}` : null, d.bos ? 'Boş şablon' : null].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => download(d)}
                        disabled={!!busy}
                        accessibilityRole="button"
                        accessibilityLabel={`${d.ad} indir`}
                        style={({ pressed }) => [st.dl, { backgroundColor: tint }, (pressed || (busy && busy !== d.id)) && { opacity: 0.6 }]}
                      >
                        {busy === d.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '900' }}>⬇ İndir</Text>}
                      </Pressable>
                    </View>
                  );
                })}
                </View>
              </Collapsible>
            );
          })
        )}
        {docs.list ? (
          <Pressable onPress={docs.refresh} disabled={docs.loading} hitSlop={8} style={{ alignSelf: 'center' }}>
            <Text style={{ color: colors.accent, fontWeight: '800' }}>{docs.loading ? 'Yenileniyor…' : '↻ Listeyi yenile'}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  section: { fontSize: font.tiny, fontWeight: '900', letterSpacing: 1, marginTop: spacing.sm },
  doc: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderLeftWidth: 5, padding: spacing.md },
  badge: { borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  badgeT: { color: '#fff', fontWeight: '900', fontSize: 10, letterSpacing: 0.5 },
  dl: { borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10, minWidth: 92, alignItems: 'center' },
});
