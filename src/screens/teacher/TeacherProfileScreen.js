// Öğretmen profili: görünen ad, avatar (emoji), okul, tanıtım, iletişim saatleri (öğrenciler derslerinde görür);
// branş (değişmez), sınıflar + davet kodları (tümünü yenile), istatistik, etkinlikler.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { spacing, font } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { useRole } from '../../context/RoleContext';
import { useTeacherProfile, PROFILE_LIMITS } from '../../teacher/profile';
import { Header, Card, SectionTitle, Field, SmallButton, Stat, formatJoinCode, confirmAction } from '../../teacher/ui';
import { TEACHER_AVATARS } from '../../data/avatars';
import { activitiesFor, ACTIVITY_TYPES } from '../../data/activities';

export default function TeacherProfileScreen({ navigation }) {
  const { colors } = useTheme();
  const t = useTeacher();
  const { branch } = useRole();
  const { profile, save, signedIn } = useTeacherProfile();
  const [form, setForm] = useState(profile);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  // Sunucudan gelen profil, kullanıcı yazmaya başlamadıysa forma geçsin.
  useEffect(() => {
    if (!touched) setForm(profile);
  }, [profile, touched]);

  const set = (k) => (v) => {
    setTouched(true);
    setForm((f) => ({ ...f, [k]: PROFILE_LIMITS[k] ? v.slice(0, PROFILE_LIMITS[k]) : v }));
  };
  const dirty = Object.keys(form).some((k) => (form[k] || '') !== (profile[k] || ''));

  const submit = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await save(form);
      setTouched(false);
      setMsg({ ok: true, text: signedIn ? 'Kaydedildi. Öğrencilerin derslerinde bu bilgileri görür.' : 'Bu cihaza kaydedildi. Giriş yapınca öğrencilerin de görür.' });
    } catch (e) {
      setMsg({ ok: false, text: /column|schema/i.test(e.message) ? 'Sunucu henüz güncellenmedi (yeni migration uygulanmalı).' : e.message });
    }
    setBusy(false);
  };

  // Tüm sınıfların davet kodunu birden yenile (sınıftakiler kalır).
  const [renewing, setRenewing] = useState(false);
  const [codeMsg, setCodeMsg] = useState(null);
  const renewAll = () => {
    const go = async () => {
      setRenewing(true);
      setCodeMsg(null);
      try {
        const n = await t.newJoinCodesAll();
        setCodeMsg({ ok: true, text: `${n} sınıfın kodu yenilendi. Eski kodlar artık çalışmaz.` });
      } catch (e) {
        setCodeMsg({ ok: false, text: e.message });
      }
      setRenewing(false);
    };
    const m = 'Bütün sınıfların kodu değişir, eski kodlar çalışmaz. Sınıfa katılmış öğrenciler sınıfta kalır.';
    confirmAction({ title: 'Tüm kodları yenile', message: m, ok: 'Yenile', onOk: go });
  };

  const sum = useMemo(() => {
    let students = 0;
    let joined = 0;
    let hws = 0;
    t.classes.forEach((c) => {
      const all = Object.values(c.students);
      students += all.length;
      joined += all.filter((s) => s.joined).length;
      hws += (c.homeworks || []).length;
    });
    return { students, joined, hws };
  }, [t.classes]);
  const acts = branch ? activitiesFor(branch.id) : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Profilim" onBack={() => navigation.goBack()} right={<SmallButton title="⚙️" onPress={() => navigation.navigate('Settings')} />} />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <View style={[s.bigAv, { backgroundColor: colors.cardSoft, borderColor: colors.accent }]}>
            <Text style={{ fontSize: 52 }}>{form.avatar || '🧑‍🏫'}</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: font.h3, fontWeight: '900', marginTop: spacing.sm }}>{form.display_name.trim() || 'Adını yaz'}</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>
            {branch ? `${branch.emoji} ${branch.name}` : ''}{form.school.trim() ? ` · ${form.school.trim()}` : ''}
          </Text>
        </Card>

        <SectionTitle>AVATAR</SectionTitle>
        <Card>
          <View style={s.avGrid}>
            {TEACHER_AVATARS.map((a) => (
              <Pressable
                key={a}
                onPress={() => set('avatar')(a)}
                accessibilityLabel={`Avatar ${a}`}
                style={[s.avCell, { borderColor: form.avatar === a ? colors.accent : 'transparent', backgroundColor: form.avatar === a ? colors.accent + '22' : colors.cardSoft }]}
              >
                <Text style={{ fontSize: 26 }}>{a}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <SectionTitle>ÖĞRENCİLERİN GÖRDÜĞÜ BİLGİLER</SectionTitle>
        <Card>
          <Field label="Görünen ad" value={form.display_name} onChangeText={set('display_name')} placeholder="ör. Sezgin Öğretmen" />
          <Field label="Okul" value={form.school} onChangeText={set('school')} placeholder="ör. Atatürk Ortaokulu" />
          <Field label="İletişim saatleri" value={form.contact_hours} onChangeText={set('contact_hours')} placeholder="ör. Hafta içi 16.00–18.00" />
          <Field label={`Tanıtım notu (${form.bio.length}/${PROFILE_LIMITS.bio})`} value={form.bio} onChangeText={set('bio')} placeholder="ör. Ödevler pazar akşamına kadar. Sorularını derste sor." multiline />
          <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginBottom: spacing.sm }}>
            Branş ilk açılışta seçildi, değişmez. Telefon numarası ya da e-posta paylaşılmaz.
          </Text>
          <SmallButton title={busy ? '…' : 'Kaydet'} filled disabled={!dirty || busy} onPress={submit} style={{ alignSelf: 'flex-start' }} />
          {msg ? <Text style={{ color: msg.ok ? colors.primary : colors.danger, fontSize: font.small, marginTop: 6 }}>{msg.text}</Text> : null}
        </Card>

        <SectionTitle>İSTATİSTİK</SectionTitle>
        <View style={s.statRow}>
          <Stat value={t.classes.length} label="sınıf" />
          <Stat value={sum.students} label="öğrenci" />
          <Stat value={t.cloudOn ? `${sum.joined}` : '—'} label="uygulamada" color={colors.primary} />
          <Stat value={sum.hws} label="ödev" />
        </View>

        <SectionTitle right={t.cloudOn && t.classes.some((c) => c.code) ? <SmallButton title={renewing ? '…' : '🔄 Tüm kodları yenile'} disabled={renewing} onPress={renewAll} /> : null}>
          SINIFLARIM · KODLAR
        </SectionTitle>
        {codeMsg ? <Text style={{ color: codeMsg.ok ? colors.primary : colors.danger, fontSize: font.small, marginBottom: spacing.sm }}>{codeMsg.text}</Text> : null}
        {t.classes.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textMuted, fontSize: font.small }}>Henüz sınıf yok. Ana sayfadan sınıf ekle.</Text>
          </Card>
        ) : null}
        {t.classes.map((c) => {
          const n = Object.keys(c.students).length;
          const j = Object.values(c.students).filter((x) => x.joined).length;
          const state = !t.cloudOn ? '' : c.code ? formatJoinCode(c.code) : '…';
          return (
            <Card key={c.id} onPress={() => navigation.navigate('TeacherClass', { classId: c.id })}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontWeight: '800', flex: 1 }}>{c.name}</Text>
                <Text style={{ color: colors.accent, fontWeight: '900', letterSpacing: 1.5 }} selectable>{state}</Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>
                {n} öğrenci{t.cloudOn ? ` · ${j} katıldı` : ''} · {(c.homeworks || []).length} ödev ›
              </Text>
            </Card>
          );
        })}

        {acts.length ? (
          <>
            <SectionTitle>ETKİNLİKLERİM</SectionTitle>
            <Card onPress={() => navigation.navigate('Activities')}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>🎯 {acts.length} etkinlik</Text>
              <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }} numberOfLines={2}>
                {[...new Set(acts.map((a) => `${ACTIVITY_TYPES[a.type].icon} ${ACTIVITY_TYPES[a.type].name}`))].join(' · ')}
              </Text>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  bigAv: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  avGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  avCell: { width: 48, height: 48, borderRadius: 24, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
});
