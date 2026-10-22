// İngilizce Çalış: kalıplar konu başlıkları altında + kütüphane ve performans kısayolları.
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { radius, spacing, font } from '../theme';
import { useProgress } from '../context/ProgressContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { CATEGORIES, patternsOfCategory } from '../data/patterns';
import { Header } from '../teacher/ui';

// Android'de LayoutAnimation'ı etkinleştir (açılır/kapanır geçiş için).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function LearnScreen({ navigation }) {
  const { patternStats, buildPatternSession } = useProgress();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // Hangi kategorilerin açık olduğu. Varsayılan: ilki açık, diğerleri kapalı.
  const [openCats, setOpenCats] = useState({ [CATEGORIES[0].id]: true });

  const toggleCat = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenCats((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startPattern = (patternId, name) => {
    const session = buildPatternSession(patternId);
    navigation.navigate('Study', { sentences: session, title: name });
  };

  return (
    <View style={styles.screen}>
      <Header title="İngilizce Çalış" subtitle="Kalıp seç, cümleleri tekrar et" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }}>
        <View style={styles.shortcutRow}>
          <Pressable style={styles.shortcut} onPress={() => navigation.navigate('Library')}>
            <Text style={{ fontSize: 22 }}>📚</Text>
            <Text style={styles.shortcutTitle}>Kütüphanem</Text>
            <Text style={styles.shortcutDesc}>Çalıştıklarını tekrar et</Text>
          </Pressable>
          <Pressable style={styles.shortcut} onPress={() => navigation.navigate('Progress')}>
            <Text style={{ fontSize: 22 }}>📊</Text>
            <Text style={styles.shortcutTitle}>Performansım</Text>
            <Text style={styles.shortcutDesc}>Grafikler ve tik dağılımı</Text>
          </Pressable>
        </View>

        {/* Kalıplar — konu başlıkları altında gruplandırılmış */}
        {CATEGORIES.map((cat) => {
          const pats = patternsOfCategory(cat.id);
          // Kategori toplam ilerlemesi
          let catMastered = 0;
          let catTotal = 0;
          pats.forEach((p) => {
            const ps = patternStats.find((x) => x.id === p.id);
            catMastered += ps ? ps.mastered : 0;
            catTotal += p.sentences.length;
          });
          const isOpen = !!openCats[cat.id];
          return (
            <View key={cat.id} style={styles.categoryBlock}>
              <Pressable style={styles.categoryHeader} onPress={() => toggleCat(cat.id)}>
                <Text style={[styles.categoryChevron, isOpen && styles.categoryChevronOpen]}>▶</Text>
                <Text style={styles.categoryTitle}>
                  {cat.emoji} {cat.name}
                </Text>
                <Text style={styles.categoryCount}>
                  {catMastered}/{catTotal}
                </Text>
              </Pressable>
              {!isOpen && <Text style={styles.categoryDescCollapsed}>{cat.description}</Text>}

              {isOpen && <Text style={styles.categoryDesc}>{cat.description}</Text>}
              {isOpen && pats.map((p) => {
                const ps = patternStats.find((x) => x.id === p.id) || { mastered: 0, total: p.sentences.length, ticks: {} };
                return (
                  <Pressable key={p.id} style={styles.patternCard} onPress={() => startPattern(p.id, p.name)}>
                    <View style={[styles.patternIcon, { backgroundColor: p.color + '22', borderColor: p.color }]}>
                      <Text style={{ fontSize: 22 }}>{p.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patternName}>{p.name}</Text>
                      <Text style={styles.patternDesc}>{p.nameTr}</Text>
                      <View style={{ marginTop: 8 }}>
                        <TickSegmentBar ticks={ps.ticks} total={ps.total} styles={styles} colors={colors} />
                      </View>
                    </View>
                    <Text style={styles.patternCount}>
                      {ps.mastered}/{ps.total}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Kalıbın tik dağılımını tek bir çok renkli çubukta gösterir.
function TickSegmentBar({ ticks = {}, total, styles, colors }) {
  const segs = [
    { key: 'sari', color: '#EAB308' },
    { key: 'yesil', color: '#22C55E' },
    { key: 'mavi', color: '#3B82F6' },
    { key: 'mor', color: '#A855F7' },
  ];
  return (
    <View style={[styles.segTrack, { backgroundColor: colors.bgSoft }]}>
      {segs.map((s) => {
        const n = ticks[s.key] || 0;
        if (n === 0) return null;
        return <View key={s.key} style={{ width: `${(n / total) * 100}%`, backgroundColor: s.color }} />;
      })}
    </View>
  );
}

const makeStyles = (colors, shadow) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  shortcutRow: { flexDirection: 'row', gap: spacing.sm },
  shortcut: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadow },
  shortcutTitle: { color: colors.text, fontWeight: '800', fontSize: font.body, marginTop: 4 },
  shortcutDesc: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  segTrack: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },

  categoryBlock: { marginTop: spacing.lg, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  categoryChevron: { color: colors.textFaint, fontSize: 12, width: 16 },
  categoryChevronOpen: { color: colors.primary, transform: [{ rotate: '90deg' }] },
  categoryTitle: { color: colors.text, fontSize: font.h3, fontWeight: '900', flex: 1 },
  categoryCount: { color: colors.textMuted, fontSize: font.small, fontWeight: '800' },
  categoryDesc: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing.sm, marginBottom: spacing.md, marginLeft: 24 },
  categoryDescCollapsed: { color: colors.textFaint, fontSize: font.tiny, marginTop: 4, marginLeft: 24 },
  patternCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadow },
  patternIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  patternName: { color: colors.text, fontSize: font.body, fontWeight: '800' },
  patternDesc: { color: colors.textMuted, fontSize: font.tiny },
  patternCount: { color: colors.textMuted, fontWeight: '800' },
});
