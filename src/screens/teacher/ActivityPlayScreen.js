// Etkinliği tam ekran oynat: oyunun HTML'i WebView'da, internetsiz. Sol üstteki ✕ ile çıkılır.
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activityById } from '../../data/activities';
import { buildHtml } from '../../data/activities/build';

export default function ActivityPlayScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const id = route.params && route.params.id;
  const act = useMemo(() => activityById(id), [id]);
  const html = useMemo(() => (act ? buildHtml(act) : ''), [act]);
  if (!act) return null;
  return (
    <View style={{ flex: 1, backgroundColor: '#0B1220', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <WebView
        originWhitelist={['*']}
        // Kalıcı bir adres: oyunun hafızası (gösterilen sorular, geçmiş) localStorage'da saklanabilsin.
        source={{ html, baseUrl: `https://mamoste.app/etkinlik/${act.id}/` }}
        domStorageEnabled
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        bounces={false}
        style={{ flex: 1, backgroundColor: '#0B1220' }}
      />
      <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={[st.close, { top: insets.top + 8, left: insets.left + 8 }]} accessibilityLabel="Etkinlikten çık">
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>✕</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  close: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});
