import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, font } from '../theme';
import { useProgress } from '../context/ProgressContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { tickFor } from '../utils/srs';
import HighlightedSentence from '../components/HighlightedSentence';
import TickBadge from '../components/TickBadge';
import Button from '../components/Button';
import { speak } from '../utils/tts';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FILTERS = [
  { key: 'all', label: 'Tümü' },
  { key: 'mastered', label: 'Ezberlenenler' },
  { key: 'review', label: 'Tekrar Gerek' },
];

// Kütüphane — çalışılmış cümleler burada saklanır; dinle, tekrar et, test et.
export default function LibraryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { buildLibraryGrouped } = useProgress();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [filter, setFilter] = useState('all');
  const [openGroups, setOpenGroups] = useState({}); // patternId -> açık mı

  const groups = useMemo(() => buildLibraryGrouped(filter), [filter, buildLibraryGrouped]);
  const totalCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  const toggleGroup = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const testAll = () => {
    const sentences = groups.flatMap((g) => g.items.map((s) => ({ ...s })));
    if (sentences.length === 0) return;
    navigation.navigate('Study', { sentences, title: 'Kütüphane Testi' });
  };

  const testGroup = (g) => {
    navigation.navigate('Study', { sentences: g.items.map((s) => ({ ...s })), title: g.pattern.name });
  };

  const testOne = (item) => {
    navigation.navigate('Study', { sentences: [{ ...item }], title: 'Hızlı Test' });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Geri</Text>
        </Pressable>
        <Text style={styles.title}>📚 Kütüphane</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Filtre sekmeleri */}
      <View style={styles.tabs}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {totalCount > 0 ? (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 120 }}>
          {groups.map((g) => {
            const isOpen = !!openGroups[g.pattern.id];
            return (
              <View key={g.pattern.id} style={styles.group}>
                {/* Konu başlığı — dokun: aç/kapa */}
                <Pressable style={styles.groupHeader} onPress={() => toggleGroup(g.pattern.id)}>
                  <Text style={[styles.groupChevron, isOpen && styles.groupChevronOpen, { color: g.pattern.color }]}>▶</Text>
                  <View style={[styles.groupIcon, { backgroundColor: g.pattern.color + '22', borderColor: g.pattern.color }]}>
                    <Text style={{ fontSize: 18 }}>{g.pattern.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupName}>{g.pattern.name}</Text>
                    <Text style={styles.groupSub}>{g.items.length} cümle</Text>
                  </View>
                  <Pressable hitSlop={10} onPress={() => testGroup(g)} style={[styles.groupTestBtn, { borderColor: g.pattern.color }]}>
                    <Text style={[styles.groupTestText, { color: g.pattern.color }]}>📝 Test</Text>
                  </Pressable>
                </Pressable>

                {/* Cümleler — sadece açıkken */}
                {isOpen && g.items.map((item) => {
                  const tick = tickFor(item.card);
                  return (
                    <View key={item.id} style={[styles.card, { borderLeftColor: g.pattern.color }]}>
                      <View style={styles.cardRow}>
                        <View style={{ flex: 1 }}>
                          <HighlightedSentence text={item.en} chunk={item.chunk} color={g.pattern.color} size={font.body} style={styles.en} />
                          <Text style={styles.tr}>{item.tr}</Text>
                        </View>
                        <TickBadge tick={tick} />
                      </View>
                      <View style={styles.cardActions}>
                        <Pressable style={styles.actionBtn} onPress={() => speak(item.en, { id: item.id })}>
                          <Text style={styles.actionText}>🔊 Dinle</Text>
                        </Pressable>
                        <Pressable style={styles.actionBtn} onPress={() => testOne(item)}>
                          <Text style={styles.actionText}>📝 Test Et</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🗂️</Text>
          <Text style={styles.emptyTitle}>Henüz cümle yok</Text>
          <Text style={styles.emptyText}>
            {filter === 'all'
              ? 'Bir çalışma tamamladığında cümlelerin burada birikir.'
              : filter === 'mastered'
              ? 'Henüz ustalaştığın cümle yok. Tekrar ettikçe burası dolar.'
              : 'Şu an tekrar bekleyen cümle yok. 🎉'}
          </Text>
        </View>
      )}

      {/* Alttaki sabit "Hepsini Test Et" */}
      {totalCount > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button title={`📝 Tümünü Test Et (${totalCount})`} variant="accent" onPress={testAll} />
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors, shadow) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  back: { color: colors.accent, fontSize: font.body, fontWeight: '800' },
  title: { color: colors.text, fontSize: font.h3, fontWeight: '900' },

  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  tabActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.textMuted, fontWeight: '700', fontSize: font.small },
  tabTextActive: { color: colors.white },

  // Konu grubu
  group: { marginBottom: spacing.md },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadow },
  groupChevron: { fontSize: 12, width: 14 },
  groupChevronOpen: { transform: [{ rotate: '90deg' }] },
  groupIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  groupName: { color: colors.text, fontSize: font.body, fontWeight: '900' },
  groupSub: { color: colors.textMuted, fontSize: font.tiny, marginTop: 1 },
  groupTestBtn: { borderWidth: 1.5, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12 },
  groupTestText: { fontSize: font.small, fontWeight: '800' },

  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, marginLeft: spacing.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  en: { textAlign: 'left', lineHeight: 24 },
  tr: { color: colors.textMuted, fontSize: font.small, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1, backgroundColor: colors.bgSoft, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  actionText: { color: colors.text, fontWeight: '800', fontSize: font.small },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800', marginTop: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: font.body, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
});
