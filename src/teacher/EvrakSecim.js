// Evrak indirirken soru penceresi: evrak sınıf istiyorsa sınıf (öğrenci listesi oradan), öğrenci istiyorsa (BEP) sınıf + tek
// öğrenci, düzey istiyorsa yıllık plan düzeyi.
// Sınıf rehber öğretmeni sınıfa göre hatırlanır (Okul bilgileri → danismanlar). Ne sorulacağı liste3 satırının `ister`inden.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, font, radius } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { Field } from './ui';

const BOS_SINIF = '__bos';

export default function EvrakSecim({ doc, classes, plans, info, onClose, onOk }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ister = (doc && doc.ister) || [];
  const ogrenciIster = ister.includes('ogrenci');
  const sinifIster = ister.includes('sinif') || ogrenciIster;
  const duzeyIster = ister.includes('duzey');
  const danismanIster = !!(doc && (doc.etiketler || []).includes('danisman'));
  const duzeyler = (plans || []).filter((p) => p.grade);

  const [sinifId, setSinifId] = useState(null);
  const [duzey, setDuzey] = useState(null);
  const [danisman, setDanisman] = useState('');
  const [ogrenciId, setOgrenciId] = useState(null);

  useEffect(() => {
    if (!doc) return;
    const son = classes.find((c) => c.name === info.sonSinif) || classes[0];
    setSinifId(son ? son.id : BOS_SINIF);
    setDuzey(duzeyler.length ? duzeyler[0].grade : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);
  const sinif = classes.find((c) => c.id === sinifId) || null;
  useEffect(() => {
    setDanisman(sinif ? (info.danismanlar || {})[sinif.name] || '' : '');
    setOgrenciId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sinifId]);

  const secenek = (aktif, onPress, baslik, alt, key) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: aktif }}
      style={[st.secenek, { borderColor: aktif ? colors.accent : colors.border, backgroundColor: aktif ? colors.accent + '14' : colors.card }]}
    >
      <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.body }}>{baslik}</Text>
      {alt ? <Text style={{ color: colors.textMuted, fontSize: font.small, marginTop: 2 }}>{alt}</Text> : null}
    </Pressable>
  );
  const ogrencileri = (c) =>
    Object.values((c && c.students) || {})
      .filter((x) => (x.nk || '').trim())
      .sort((a, b) => (+a.no || 1e9) - (+b.no || 1e9));
  const ogrenci = sinif && ogrenciId ? (sinif.students || {})[ogrenciId] : null;
  const eksikOgrenci = ogrenciIster && !ogrenci;
  const ogrenciOzeti = (c) => {
    const list = Object.values(c.students || {});
    const adli = list.filter((s) => (s.nk || '').trim()).length;
    if (!list.length) return 'öğrenci eklenmemiş';
    return adli === list.length ? `${list.length} öğrenci` : `${list.length} öğrenci · ${list.length - adli} kişinin adı yok`;
  };

  return (
    <Modal visible={!!doc} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel="Kapat">
        <Pressable style={[st.sheet, { backgroundColor: colors.bg, paddingBottom: insets.bottom + spacing.md }]} onPress={() => {}}>
          <View style={[st.grabber, { backgroundColor: colors.border }]} />
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: font.h3 }}>{doc ? doc.kisa || doc.ad : ''}</Text>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }} keyboardShouldPersistTaps="handled">
            {sinifIster ? (
              <>
                <Text style={[st.baslik, { color: colors.textMuted }]}>HANGİ SINIF İÇİN?</Text>
                {classes.map((c) => secenek(sinifId === c.id, () => setSinifId(c.id), c.name, ogrenciOzeti(c), c.id))}
                {ogrenciIster ? null : secenek(sinifId === BOS_SINIF, () => setSinifId(BOS_SINIF), 'Sınıf seçmeden', 'Öğrenci tablosu boş satırlarla gelir', BOS_SINIF)}
                {danismanIster && sinif ? (
                  <Field label={`${sinif.name} sınıf rehber öğretmeni`} value={danisman} onChangeText={setDanisman} placeholder={info.ad ? `ör. ${info.ad}` : 'Adı soyadı'} />
                ) : null}
                {ogrenciIster && sinif ? (
                  <>
                    <Text style={[st.baslik, { color: colors.textMuted }]}>HANGİ ÖĞRENCİ İÇİN?</Text>
                    {ogrencileri(sinif).length ? (
                      <View style={st.satir}>
                        {ogrencileri(sinif).map((o) => (
                          <View key={o.id} style={{ flexBasis: '47%', flexGrow: 1 }}>
                            {secenek(ogrenciId === o.id, () => setOgrenciId(o.id), o.nk.trim(), o.no ? `No ${o.no}` : null, o.id)}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ color: colors.textMuted }}>Bu sınıfta adı yazılı öğrenci yok. Sınıf ekranında öğrencinin adını yaz.</Text>
                    )}
                  </>
                ) : null}
              </>
            ) : null}
            {duzeyIster ? (
              <>
                <Text style={[st.baslik, { color: colors.textMuted }]}>HANGİ SINIF DÜZEYİ?</Text>
                {duzeyler.length ? (
                  <View style={st.satir}>
                    {duzeyler.map((p) => (
                      <View key={p.id} style={{ flexBasis: '47%', flexGrow: 1 }}>
                        {secenek(duzey === p.grade, () => setDuzey(p.grade), `${p.grade}. sınıf`, p.builtin ? 'MEB çerçeve planı' : 'Senin yüklediğin plan', p.id)}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: colors.textMuted }}>Bu derste yıllık plan yok. Yıllık plan ekranından kendi planını yükleyebilirsin.</Text>
                )}
              </>
            ) : null}
          </ScrollView>
          <Pressable
            onPress={() =>
              onOk({
                sinif: sinifIster ? sinif : null,
                ogrenci: ogrenci ? { no: String(ogrenci.no || ''), ad: ogrenci.nk.trim() } : null,
                duzey: duzeyIster ? duzeyler.find((p) => p.grade === duzey) || null : null,
                danisman: danisman.trim(),
              })
            }
            disabled={(duzeyIster && !duzeyler.length) || eksikOgrenci}
            accessibilityRole="button"
            style={({ pressed }) => [st.tamam, { backgroundColor: colors.accent }, (pressed || (duzeyIster && !duzeyler.length) || eksikOgrenci) && { opacity: 0.5 }]}
          >
            <Text style={{ color: colors.onAccent, fontWeight: '900', fontSize: font.body }}>{eksikOgrenci ? 'Önce öğrenciyi seç' : '⬇ Doldur ve indir'}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  grabber: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  baslik: { fontSize: font.tiny, fontWeight: '900', letterSpacing: 1, marginTop: spacing.xs },
  secenek: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  satir: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tamam: { marginTop: spacing.sm, borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center' },
});
