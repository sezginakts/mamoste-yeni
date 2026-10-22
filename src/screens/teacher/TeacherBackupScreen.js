// Yedek: tüm öğretmen verisi tek metin. Kendine e-posta / Drive / WhatsApp ile gönder.
import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { spacing, font } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { useTeacher } from '../../teacher/TeacherContext';
import { Header, Card, Field, SmallButton, shareText } from '../../teacher/ui';

export default function TeacherBackupScreen({ navigation }) {
  const { colors } = useTheme();
  const t = useTeacher();
  const [status, setStatus] = useState(null);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);
  const backup = t.exportBackup();
  const kb = Math.round(backup.length / 1024);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Yedek" subtitle={`${t.classes.length} sınıf · ~${kb} KB`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.md }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 6 }}>Yedek al</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.small, marginBottom: spacing.md }}>
            Öğrenci notları dahil her şey bu metinde. Sadece kendine gönder; içinde öğrencilerle ilgili notların var.
          </Text>
          <SmallButton title={status === 'copied' ? '✓ Kopyalandı' : '📤 Yedeği paylaş / kopyala'} filled onPress={async () => setStatus(await shareText(backup))} />
        </Card>
        <Card>
          <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 6 }}>Geri yükle</Text>
          <Text style={{ color: colors.danger, fontSize: font.small, marginBottom: spacing.md }}>
            Dikkat: bu cihazdaki mevcut öğretmen verisinin YERİNE geçer.
          </Text>
          <Field value={text} onChangeText={setText} multiline placeholder='{"app":"ingapp-teacher", …' />
          <SmallButton title="Geri yükle" color={colors.danger} disabled={!text.trim()} onPress={() => { const r = t.importBackup(text.trim()); setMsg(r.msg); if (r.ok) setText(''); }} />
          {msg ? <Text style={{ color: colors.text, marginTop: spacing.sm }}>{msg}</Text> : null}
        </Card>
      </ScrollView>
    </View>
  );
}
