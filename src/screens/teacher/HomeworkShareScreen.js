// Ödev gönderildi: öğrencilere sunucudan gider (bildirimle). Altında kim teslim etti / etmedi.
import React, { useEffect } from 'react';
import { View, Text, ScrollView, Platform, Alert } from 'react-native';
import { spacing, font } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { homeworkStatus } from '../../teacher/analytics';
import { hwSummary } from '../../utils/homework';
import { Header, Card, SmallButton, SectionTitle, formatDate, confirmAction, HW_DELETE_MSG } from '../../teacher/ui';

export default function HomeworkShareScreen({ route, navigation }) {
  const { classId, hwIds } = route.params;
  const { colors } = useTheme();
  const t = useTeacher();
  const cls = t.getClass(classId);
  const list = cls ? cls.homeworks.filter((h) => hwIds.includes(h.id)) : [];
  useEffect(() => {
    t.syncNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!cls || !list.length) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Header title="Ödev bulunamadı" onBack={() => navigation.goBack()} /></View>;

  const sent = list.every((h) => h.rid);
  const joined = Object.values(cls.students).filter((s) => s.joined).length;
  const total = Object.keys(cls.students).length;

  const del = () => {
    const go = () => {
      list.forEach((h) => t.removeHomework(classId, h.id));
      navigation.goBack();
    };
    confirmAction({ title: 'Ödevi sil', message: HW_DELETE_MSG, ok: 'Sil', destructive: true, onOk: go });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header
        title={list.length > 1 ? `${list.length} ödev` : list[0].title}
        subtitle={cls.name}
        onBack={() => navigation.goBack()}
        right={<SmallButton title={t.sync.busy ? '…' : '↻ Yenile'} onPress={t.syncNow} disabled={t.sync.busy} />}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}>
        <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Text style={{ fontSize: 36 }}>{!t.cloudOn ? '📴' : sent ? '✅' : '⏳'}</Text>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.h3, marginTop: spacing.sm, textAlign: 'center' }}>
            {!t.cloudOn ? 'Sunucuya bağlı değilsin' : sent ? 'Ödev öğrencilere gönderildi' : 'Gönderiliyor…'}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 4, textAlign: 'center' }}>
            {sent
              ? `Uygulamadan katılmış ${joined} öğrencinin telefonuna bildirim gitti.`
              : t.sync.error || 'İnternet varsa birkaç saniye içinde gider.'}
          </Text>
          {joined < total ? (
            <Text style={{ color: colors.warning, fontSize: font.small, marginTop: spacing.sm, textAlign: 'center' }}>
              {total - joined} öğrenci henüz katılmadı. Sınıf ekranındaki kodu ve okul numaralarını yazarak katılırlar.
            </Text>
          ) : null}
        </Card>
        {list.map((hw) => {
          const s = homeworkStatus(cls, hw);
          return (
            <View key={hw.id}>
              <SectionTitle>{hw.title.toUpperCase()}</SectionTitle>
              <Text style={{ color: colors.textMuted, fontSize: font.small }}>{hwSummary(hw)} · son gün {formatDate(hw.due)}</Text>
              <Text style={{ color: colors.text, marginTop: 6, fontWeight: '800' }}>Teslim: {s.done}/{s.expected}</Text>
              {s.missing.length ? (
                <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 4 }}>
                  Bekleyen: {s.missing.map((m) => `${m.no}${m.nk ? ' ' + m.nk : ''}`).join(', ')}
                </Text>
              ) : null}
            </View>
          );
        })}
        <Text style={{ color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.lg }}>
          Sonuçlar öğrenci ödevi bitirince kendiliğinden gelir (dakikada bir ve uygulamayı açınca yenilenir).
        </Text>
        <SmallButton title="Ödevi sil" color={colors.danger} style={{ marginTop: spacing.md }} onPress={del} />
      </ScrollView>
    </View>
  );
}
