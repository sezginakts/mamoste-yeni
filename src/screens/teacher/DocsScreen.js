// Evraklar: kategorilere göre şablonlar (teacher/docs.js). İndirirken bilgiler şablona kendiliğinden yazılır:
//   Okul bilgileri (bir kez girilir: okul, müdür, müdür yrd., rehber öğretmen, zümre öğretmenleri),
//   sınıf (evrak isterse sorulur: öğrenci listesi sınıftan, sınıf rehber öğretmeni sınıfa göre hatırlanır),
//   Kulübüm (kulüp evrakları: üyeler sınıf listelerinden), yıllık plan düzeyi (öğretmenin planı ya da MEB planı).
// Boş kalacak bilgi varsa indirmeden önce söylenir. Evrak tarihi normalde düzenlendiği gün (evrak/takvim.js); 📅 ile değişir.
// Kulüp dosyaları: belgeler listesi + aylık raporlar ızgarası (grup 'aylik').
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { spacing, font, radius } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useRole } from '../../context/RoleContext';
import { Header, Field, SmallButton, notify, confirmAction } from '../../teacher/ui';
import { useTeacherProfile } from '../../teacher/profile';
import { useTeacher } from '../../teacher/TeacherContext';
import { useDesk, gradeOfName } from '../../teacher/DeskContext';
import { usePlans } from '../../teacher/PlanContext';
import { CATEGORIES, useDocList, useDocDates, loadDocInfo, saveDocInfo, downloadDoc, downloadDocV3, evrakGirdisi, evrakEksikleri, EMPTY_INFO } from '../../teacher/docs';
import { trTarih } from '../../teacher/evrak/takvim';
import { adListesi } from '../../teacher/evrak/baglam';
import EvrakSecim from '../../teacher/EvrakSecim';
import EvrakKulup from '../../teacher/EvrakKulup';
import DateWheel from '../../components/DateWheel';
import Collapsible from '../../components/Collapsible';

const ISTER_YAZI = { sinif: 'sınıf seçilir', ogrenci: 'öğrenci seçilir', kulup: 'Kulübüm’den', duzey: 'düzey seçilir' };

export default function DocsScreen({ navigation }) {
  const { colors, shadow } = useTheme();
  const { branchId, branch } = useRole();
  const { profile } = useTeacherProfile();
  const { classes } = useTeacher();
  const { lessons } = useDesk();
  const { plans, planForGrade } = usePlans();
  const docs = useDocList();
  const dates = useDocDates();
  const [tarihDoc, setTarihDoc] = useState(null); // tarihi değiştirilen evrak (DateWheel açık)
  const [secimDoc, setSecimDoc] = useState(null); // sınıf / düzey sorulan evrak
  const [kulupAcik, setKulupAcik] = useState(false);
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

  const kaydet = (next) => {
    setInfo(next);
    saveDocInfo(next);
  };
  const set = (k) => (v) => setInfo((x) => ({ ...x, [k]: v }));
  const setBrans = (k) => (v) => setInfo((x) => ({ ...x, [k]: { ...(x[k] || {}), [branchId]: v } }));
  const saveInfo = () => {
    saveDocInfo(info);
    setEditing(false);
  };

  // Sınıf → evrak verisi: öğrenciler (no + öğretmenin yazdığı ad), haftalık ders saati (programdan), sınıf düzeyinin planı.
  const sinifVerisi = (cls, danisman, secili = null) => {
    if (!cls) return null;
    const plan = planForGrade(gradeOfName(cls.name));
    const haftalikSaat = Object.values(lessons || {}).filter((l) => (l.label ? l.label.trim() === cls.name.trim() : l.classId === cls.id) && (!l.ders || l.ders === branchId)).length;
    return {
      ad: cls.name,
      danisman,
      ogrenciler: Object.values(cls.students || {}).map((s) => ({ no: s.no, ad: s.nk || '' })),
      haftalikSaat,
      plan: plan ? plan.weeks : null,
      secili, // BEP: seçilen öğrenci { no, ad }
    };
  };

  const indir = async (doc, girdi) => {
    setBusy(doc.id);
    try {
      if (doc.surum === 3) await downloadDocV3(doc, girdi);
      else await downloadDoc(doc, info || EMPTY_INFO, branch ? branch.name : '', { sinif: (info || EMPTY_INFO).sinif || '', tarih: dates.dateOf(doc) });
      docs.markSeen(doc);
    } catch (e) {
      notify('İndirilemedi', `Evrak indirilemedi. Sebep: ${(e && e.message) || 'bilinmeyen hata'}`);
    } finally {
      setBusy(null);
    }
  };

  // Doldur → boş kalacak bilgi varsa önce söyle (Vazgeç = bilgileri tamamla).
  const hazirla = (doc, secim = {}) => {
    const girdi = evrakGirdisi(doc, info, {
      brans: branch ? branch.name : '',
      branchId,
      tarih: dates.dateOf(doc),
      sinif: sinifVerisi(secim.sinif, secim.danisman, secim.ogrenci),
      duzey: secim.duzey ? { duzey: secim.duzey.grade, weeks: secim.duzey.weeks, kaynak: secim.duzey.builtin ? 'Millî Eğitim Bakanlığının çerçeve yıllık planı' : 'öğretmenin yıllık planı' } : null,
    });
    const eksik = evrakEksikleri(doc, girdi);
    if (!eksik.length) return indir(doc, girdi);
    const nereden = [...new Set(eksik.map((e) => ({ profil: 'Okul bilgileri', sinif: 'sınıf listesi', kulup: 'Kulübüm', plan: 'yıllık plan', program: 'ders programı' }[e.yer])).filter(Boolean))];
    confirmAction({
      title: 'Bazı bilgiler boş',
      message: `${eksik.map((e) => e.bilgi).join(', ')} evrakta "……" olarak kalacak.\n\nTamamlamak için: ${nereden.join(', ')}.`,
      ok: 'Yine de indir',
      onOk: () => indir(doc, girdi),
    });
  };

  const indirBas = (doc) => {
    if (doc.surum !== 3) return indir(doc);
    const ister = doc.ister || [];
    if (ister.includes('kulup') && !(info.kulup && info.kulup.ad)) {
      notify('Önce kulübünü kaydet', 'Kulüp evraklarına kulüp adı, başkanı ve üyeleri Kulübüm’den yazılır.');
      setKulupAcik(true);
      return undefined;
    }
    if (ister.includes('sinif') || ister.includes('ogrenci') || ister.includes('duzey')) {
      setSecimDoc(doc);
      return undefined;
    }
    return hazirla(doc);
  };

  const secimTamam = (secim) => {
    const doc = secimDoc;
    setSecimDoc(null);
    if (secim.sinif) {
      // Sınıf rehber öğretmeni ve son seçilen sınıf hatırlanır.
      const next = { ...info, sonSinif: secim.sinif.name };
      if ((doc.etiketler || []).includes('danisman')) next.danismanlar = { ...(info.danismanlar || {}), [secim.sinif.name]: secim.danisman };
      kaydet(next);
    }
    hazirla(doc, secim);
  };

  // Evrak tarihi: dokununca tekerlekli takvim; elle değiştirilmişse ↺ varsayılana döndürür.
  const DateChip = ({ doc, tint, short }) => {
    const d = dates.dateOf(doc);
    const custom = dates.isCustom(doc);
    return (
      <View style={[st.row, { gap: 8, marginTop: 6 }]}>
        <Pressable
          onPress={() => setTarihDoc(doc)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`${doc.ad} tarihi ${trTarih(d)}, değiştir`}
          style={[st.chip, { borderColor: tint + '66', backgroundColor: tint + '14' }]}
        >
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: font.small }}>📅 {short ? trTarih(d).slice(0, 5) : trTarih(d)}</Text>
        </Pressable>
        {custom ? (
          <Pressable onPress={() => dates.setDate(doc, null)} hitSlop={8} accessibilityLabel="Varsayılan tarihe dön">
            <Text style={{ color: colors.textMuted, fontWeight: '900' }}>↺</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const zumreSayisi = info ? adListesi((info.zumreler || {})[branchId]).length : 0;
  const summary = info ? [info.ad, info.okul, [info.ilce, info.il].filter(Boolean).join(' / '), info.mudur ? `Müdür: ${info.mudur}` : null].filter(Boolean).join(' · ') : '';
  const kulup = (info && info.kulup) || {};
  const kulupOzet = kulup.ad ? [`${kulup.ad.replace(/\s+kul[uü]b[uü]$/i, '')} Kulübü`, `${(kulup.uyeler || []).length} üye`, kulup.baskan ? `Başkan: ${kulup.baskan}` : 'başkan seçilmedi'].join(' · ') : 'Henüz kaydedilmedi';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Evraklar" subtitle={branch ? `${branch.emoji} ${branch.name}` : ''} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md }} keyboardShouldPersistTaps="handled">
        {/* Okul bilgileri */}
        <View style={[st.card, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={st.row}>
            <Text style={{ fontSize: 22 }}>🪪</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body }}>Okul bilgileri</Text>
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
              <Text style={{ color: colors.textMuted, fontSize: font.small, marginBottom: spacing.sm }}>Bir kez gir, bütün evraklara yazılır. Yalnız bu cihazda saklanır.</Text>
              <Field label="Adın soyadın" value={info.ad} onChangeText={set('ad')} placeholder="ör. Ayşe Yılmaz" />
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
              <Field label="Okul rehber öğretmeni (PDR)" value={info.rehber} onChangeText={set('rehber')} placeholder="Adı soyadı" />
              <Field
                label={`${branch ? branch.name : 'Branş'} zümre öğretmenleri (sen hariç)`}
                value={(info.zumreler || {})[branchId] || ''}
                onChangeText={setBrans('zumreler')}
                placeholder="Virgülle ayır: Ali Veli, Ayşe Kaya"
              />
              <Field label="Zümre başkanı" value={(info.zumreBaskanlari || {})[branchId] || ''} onChangeText={setBrans('zumreBaskanlari')} placeholder="Adı soyadı" />
              <Text style={{ color: colors.textMuted, fontSize: font.tiny, marginBottom: spacing.sm }}>
                Öğrenci adları sınıflarından gelir (sınıf ekranında öğrencinin adını yaz); sınıf rehber öğretmeni evrak indirirken sorulur.
              </Text>
              <SmallButton title="Kaydet" filled onPress={saveInfo} style={{ alignSelf: 'flex-start' }} />
            </View>
          ) : !editing && info && !zumreSayisi ? (
            <Text style={{ color: colors.textMuted, fontSize: font.tiny, marginTop: spacing.sm }}>Zümre öğretmenleri girilmedi — zümre tutanaklarında imza satırları boş kalır.</Text>
          ) : null}
        </View>

        {/* Kulübüm */}
        <Pressable onPress={() => setKulupAcik(true)} accessibilityRole="button" style={[st.card, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={st.row}>
            <Text style={{ fontSize: 22 }}>🎭</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body }}>Kulübüm</Text>
              <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }} numberOfLines={2}>
                {kulupOzet}
              </Text>
            </View>
            <Text style={{ color: colors.accent, fontWeight: '800' }}>Düzenle</Text>
          </View>
        </Pressable>

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
              <Collapsible key={g.id} title={`${g.icon} ${g.name.toLocaleUpperCase('tr')}`} style={{ marginTop: spacing.sm }}>
                <View style={{ gap: spacing.sm }}>
                  {g.items
                    .filter((d) => d.grup !== 'aylik')
                    .map((d) => {
                      const isNew = docs.seen[d.id] !== d.tarih;
                      return (
                        <View key={d.id} style={[st.doc, shadow, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: tint }]}>
                          <View style={{ flex: 1 }}>
                            <View style={[st.row, { gap: 6, flexWrap: 'wrap' }]}>
                              <Text style={{ color: colors.text, fontWeight: '800', fontSize: font.body, flexShrink: 1 }}>{d.kisa || d.ad}</Text>
                              {isNew ? (
                                <View style={[st.badge, { backgroundColor: tint }]}>
                                  <Text style={st.badgeT}>YENİ</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>
                              {[d.donem, ...(d.ister || []).filter((x) => x !== 'kulup' && !(x === 'sinif' && (d.ister || []).includes('ogrenci'))).map((x) => ISTER_YAZI[x]), d.bos ? 'Boş şablon' : null].filter(Boolean).join(' · ')}
                            </Text>
                            <DateChip doc={d} tint={tint} />
                          </View>
                          <Pressable
                            onPress={() => indirBas(d)}
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
                  {g.items.some((d) => d.grup === 'aylik') ? (
                    <>
                      <Text style={[st.section, { color: colors.textMuted }]}>AYLIK RAPORLAR</Text>
                      <View style={st.grid}>
                        {g.items
                          .filter((d) => d.grup === 'aylik')
                          .map((d) => (
                            <View key={d.id} style={[st.month, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                              <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body }} numberOfLines={1}>
                                {d.kisa || d.ad}
                              </Text>
                              <DateChip doc={d} tint={tint} short />
                              <Pressable
                                onPress={() => indirBas(d)}
                                disabled={!!busy}
                                accessibilityRole="button"
                                accessibilityLabel={`${d.ad} indir`}
                                style={({ pressed }) => [st.dlSmall, { backgroundColor: tint }, (pressed || (busy && busy !== d.id)) && { opacity: 0.6 }]}
                              >
                                {busy === d.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '900', fontSize: font.small }}>⬇ İndir</Text>}
                              </Pressable>
                            </View>
                          ))}
                      </View>
                    </>
                  ) : null}
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
      <DateWheel
        visible={!!tarihDoc}
        value={tarihDoc ? dates.dateOf(tarihDoc).getTime() : undefined}
        onClose={() => setTarihDoc(null)}
        onPick={(ms) => tarihDoc && dates.setDate(tarihDoc, ms)}
      />
      {info ? <EvrakSecim doc={secimDoc} classes={classes} plans={plans} info={info} onClose={() => setSecimDoc(null)} onOk={secimTamam} /> : null}
      {info ? (
        <EvrakKulup
          visible={kulupAcik}
          kulup={info.kulup}
          classes={classes}
          ogretmen={info.ad}
          onClose={() => setKulupAcik(false)}
          onSave={(k) => {
            kaydet({ ...info, kulup: k });
            setKulupAcik(false);
          }}
        />
      ) : null}
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
  chip: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  month: { flexGrow: 1, flexBasis: '30%', maxWidth: '33%', minWidth: 96, borderRadius: radius.lg, borderWidth: 1, padding: spacing.sm, alignItems: 'center' },
  dlSmall: { marginTop: spacing.sm, borderRadius: radius.pill, paddingVertical: 8, alignSelf: 'stretch', alignItems: 'center' },
});
