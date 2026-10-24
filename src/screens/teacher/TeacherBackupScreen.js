// Yedek: tüm öğretmen verisi tek .json dosyası. Kendine e-posta / Drive / WhatsApp ile gönder, geri yüklerken dosyayı seç.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { spacing, font } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { Header, Card, Field, SmallButton, confirmAction } from '../../teacher/ui';
import { saveBackupFile, pickBackupFile, backupFileName } from '../../teacher/backupFile';

export default function TeacherBackupScreen({ navigation }) {
  const { colors } = useTheme();
  const t = useTeacher();
  const [text, setText] = useState('');
  const [paste, setPaste] = useState(false);
  const [msg, setMsg] = useState(null);
  const backup = t.exportBackup();
  const kb = Math.round(backup.length / 1024);

  const save = async () => {
    setMsg(null);
    try {
      await saveBackupFile(backup);
    } catch (e) {
      setMsg('Yedek dosyası oluşturulamadı.');
    }
  };
  const restore = (raw) =>
    confirmAction({
      title: 'Yedeği geri yükle',
      message: 'Bu cihazdaki mevcut öğretmen verisinin yerine geçer.',
      ok: 'Geri yükle',
      destructive: true,
      onOk: () => {
        const r = t.importBackup(raw.trim());
        setMsg(r.msg);
        if (r.ok) setText('');
      },
    });
  const pick = async () => {
    setMsg(null);
    try {
      const raw = await pickBackupFile();
      if (raw) restore(raw);
    } catch (e) {
      setMsg('Dosya okunamadı.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Yedek" subtitle={`${t.allClassCount} sınıf · ~${kb} KB`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 6 }}>Yedek al</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.small, marginBottom: spacing.md }}>
            Öğrenci notları dahil her şey tek dosyada ({backupFileName()}). Sadece kendine gönder.
          </Text>
          <SmallButton title="💾 Yedek dosyasını kaydet / paylaş" filled onPress={save} />
        </Card>
        <Card>
          <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 6 }}>Geri yükle</Text>
          <Text style={{ color: colors.danger, fontSize: font.small, marginBottom: spacing.md }}>
            Dikkat: bu cihazdaki mevcut öğretmen verisinin YERİNE geçer.
          </Text>
          <SmallButton title="📂 Yedek dosyasını seç" color={colors.danger} onPress={pick} />
          {paste ? (
            <View style={{ marginTop: spacing.md }}>
              <Field value={text} onChangeText={setText} multiline placeholder='{"app":"ingapp-teacher", …' />
              <SmallButton title="Metinden geri yükle" color={colors.danger} disabled={!text.trim()} onPress={() => restore(text)} />
            </View>
          ) : (
            <Pressable onPress={() => setPaste(true)} hitSlop={8} style={{ marginTop: spacing.md }}>
              <Text style={{ color: colors.accent, fontWeight: '700', fontSize: font.small }}>Eski yedeğim metin hâlinde ›</Text>
            </Pressable>
          )}
          {msg ? <Text style={{ color: colors.text, marginTop: spacing.sm }}>{msg}</Text> : null}
        </Card>
      </ScrollView>
    </View>
  );
}
