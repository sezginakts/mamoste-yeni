// Etkinliği tam ekran oynat: oyunun HTML'i WebView'da, internetsiz.
// Web sürümünde (akıllı tahta tarayıcısı) react-native-webview çalışmaz; aynı HTML iframe içinde açılır.
// Üst çubuk: çıkış, oyun adı, sınıf düzeyi (oyunun branştaki her içeriği; son seçilen hatırlanır), ⬇ İndir.
// params: { type } (Etkinlikler kartı) ya da eski { id } (tek içerik).
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, Alert, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRole } from '../../context/RoleContext';
import { activityById, activitiesFor, ACTIVITY_TYPES } from '../../data/activities';
import { buildHtml } from '../../data/activities/build';
import { exportActivity } from '../../teacher/activityExport';

const BG = '#0B1220';
const gradeKey = (branchId, type) => `@ingapp/activity-grade/${branchId}-${type}`;

export default function ActivityPlayScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { branchId } = useRole();
  const p = route.params || {};
  const legacy = useMemo(() => (p.id ? activityById(p.id) : null), [p.id]);
  const type = p.type || (legacy && legacy.type);
  const bId = (legacy && legacy.branchId) || branchId;
  const items = useMemo(() => activitiesFor(bId).filter((a) => a.type === type).sort((a, b) => a.grade - b.grade || (a.unit || 0) - (b.unit || 0)), [bId, type]);
  const [actId, setActId] = useState(legacy ? legacy.id : null);
  const [busy, setBusy] = useState(false);

  // Son seçilen düzeyi hatırla; yoksa en küçük düzey.
  useEffect(() => {
    if (actId || !items.length) return;
    AsyncStorage.getItem(gradeKey(bId, type))
      .then((id) => setActId(items.some((a) => a.id === id) ? id : items[0].id))
      .catch(() => setActId(items[0].id));
  }, [items]);

  const act = items.find((a) => a.id === actId) || legacy;
  const html = useMemo(() => (act ? buildHtml(act) : ''), [act && act.id]);
  const choose = (a) => {
    setActId(a.id);
    AsyncStorage.setItem(gradeKey(bId, type), a.id).catch(() => {});
  };
  const sameGrade = (a) => items.filter((x) => x.grade === a.grade).length > 1;

  const download = async () => {
    if (!act) return;
    setBusy(true);
    try {
      await exportActivity(act);
    } catch (e) {
      const msg = 'Dosya hazırlanamadı. Tekrar dene.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('İndirilemedi', msg);
    } finally {
      setBusy(false);
    }
  };

  if (!act) return <View style={{ flex: 1, backgroundColor: BG }} />;
  const t = ACTIVITY_TYPES[act.type];
  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={st.bar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={st.close} accessibilityLabel="Oyundan çık">
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>✕</Text>
        </Pressable>
        <Text style={st.title} numberOfLines={1}>
          {t.icon} {t.name}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }} style={{ flexGrow: 0, flexShrink: 1 }}>
          {items.length > 1
            ? items.map((a) => {
                const on = a.id === act.id;
                return (
                  <Pressable key={a.id} onPress={() => choose(a)} style={[st.pill, on && st.pillOn]} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${a.grade}. sınıf${a.unit ? `, ${a.unit}. ünite` : ''}`}>
                    <Text style={[st.pillT, on && { color: BG }]}>
                      {a.grade}. sınıf{sameGrade(a) && a.unit ? ` · ${a.unit}. ün.` : ''}
                    </Text>
                  </Pressable>
                );
              })
            : null}
        </ScrollView>
        <Pressable onPress={download} disabled={busy} style={st.dl} accessibilityLabel="Akıllı tahta için indir">
          {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '800' }}>⬇ İndir</Text>}
        </Pressable>
      </View>
      {Platform.OS === 'web' ? (
        <iframe key={act.id} title={act.id} srcDoc={html} allow="autoplay; fullscreen" style={{ flex: 1, width: '100%', height: '100%', border: 0, backgroundColor: BG }} />
      ) : (
        <WebView
          key={act.id}
          originWhitelist={['*']}
          // Kalıcı bir adres: oyunun hafızası (gösterilen sorular, geçmiş) localStorage'da saklanabilsin.
          source={{ html, baseUrl: `https://mamoste.app/etkinlik/${act.id}/` }}
          domStorageEnabled
          javaScriptEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          setSupportMultipleWindows={false}
          bounces={false}
          style={{ flex: 1, backgroundColor: BG }}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: BG, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontWeight: '900', fontSize: 16, flexShrink: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.12)' },
  pillOn: { backgroundColor: '#fff' },
  pillT: { color: '#fff', fontWeight: '800', fontSize: 13 },
  dl: { marginLeft: 'auto', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
});
