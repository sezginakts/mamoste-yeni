import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, font } from '../theme';
import { useProgress } from '../context/ProgressContext';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { isNew } from '../utils/srs';
import { isCloseEnough } from '../utils/helpers';
import HighlightedSentence from '../components/HighlightedSentence';
import WordBreakdown from '../components/WordBreakdown';
import ProgressBar from '../components/ProgressBar';
import Button from '../components/Button';
import { speak } from '../utils/tts';

// Üretim + yazılı test temelli akış.
//   1) TANIŞ  — yeni cümleleri öğren (İngilizce + ses + anlam + kelime kırılımı)
//   2) TEST   — YAZILI: her cümle iki yönde sorulur:
//        a) Türkçe verilir → İngilizcesini YAZ
//        b) İngilizcesi seslenir → Türkçesini YAZ
//      İki yönü de doğru yazınca cümle "geçti" (tik aşaması atlar).
export default function StudyScreen({ route, navigation }) {
  const { sentences, title, homeworkId } = route.params;
  const insets = useSafeAreaInsets();
  const { state, gradeSentence, completeSession, cardFor, completeHomework } = useProgress();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const autoSpeak = state.settings.autoSpeak;

  const introList = useMemo(() => sentences.filter((s) => isNew(cardFor(s.id))), []);

  const [phase, setPhase] = useState(introList.length > 0 ? 'intro' : 'test');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState([]); // {id, en, tr, grade}

  const list = phase === 'intro' ? introList : sentences;
  const current = list[index];
  const total = list.length;

  useEffect(() => {
    setRevealed(false);
    if (phase === 'intro' && autoSpeak && current) speak(current.en, { id: current.id });
  }, [phase, index]);

  if (!current) {
    return <View style={[styles.screen, { backgroundColor: colors.bg }]} />;
  }

  const accent = current.patternColor || colors.accent;

  const introNext = () => {
    if (index < introList.length - 1) setIndex((i) => i + 1);
    else { setPhase('test'); setIndex(0); }
  };
  const introPrev = () => { if (index > 0) setIndex((i) => i - 1); };

  // Yazılı test sonucu: passed = iki yön de doğru.
  const finishSentence = (passed) => {
    gradeSentence(current.id, passed);
    const grade = passed ? 'know' : 'forgot';
    const newResults = [...results, { id: current.id, en: current.en, tr: current.tr, grade }];
    setResults(newResults);
    if (index < sentences.length - 1) {
      setIndex((i) => i + 1);
    } else {
      completeSession(sentences.length);
      if (homeworkId) {
        const code = completeHomework(homeworkId, newResults);
        navigation.replace('HomeworkDone', { id: homeworkId, code });
      } else {
        navigation.replace('Result', { results: newResults, title });
      }
    }
  };

  const headerRatio = (index + 1) / total;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <View style={{ flex: 1, marginHorizontal: spacing.md }}>
          <ProgressBar ratio={headerRatio} color={phase === 'intro' ? colors.accent : colors.primary} />
        </View>
        <Text style={styles.counter}>{index + 1}/{total}</Text>
      </View>

      {phase === 'intro' ? (
        <IntroPhase
          current={current}
          accent={accent}
          revealed={revealed}
          setRevealed={setRevealed}
          onNext={introNext}
          onPrev={introPrev}
          canPrev={index > 0}
          isLast={index === introList.length - 1}
        />
      ) : (
        <TestPhase key={current.id} current={current} accent={accent} autoSpeak={autoSpeak} onFinish={finishSentence} />
      )}
    </View>
  );
}

// ---------- 1) TANIŞ ----------
function IntroPhase({ current, accent, revealed, setRevealed, onNext, onPrev, canPrev, isLast }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <>
      <Text style={styles.phase}>📖 TANIŞ &amp; TEKRAR ET</Text>
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={[styles.patternTag, { borderColor: accent }]}>
          <Text style={[styles.patternTagText, { color: accent }]}>{current.patternName || ''}</Text>
        </View>
        <HighlightedSentence text={current.en} chunk={current.chunk} color={accent} />
        <Pressable style={styles.speakBtn} onPress={() => speak(current.en, { id: current.id })}>
          <Text style={styles.speakText}>🔊 Dinle</Text>
        </Pressable>
        {revealed ? (
          <>
            <Text style={styles.tr}>{current.tr}</Text>
            {current.words && current.words.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>KELİMELER</Text>
                <WordBreakdown words={current.words} color={accent} />
              </>
            )}
          </>
        ) : (
          <Pressable style={styles.thinkBtn} onPress={() => setRevealed(true)}>
            <Text style={styles.thinkText}>🤔 Önce anlamını düşün, sonra aç</Text>
          </Pressable>
        )}
      </ScrollView>
      <Text style={styles.tip}>💡 Cümleyi sesli tekrar et — kalıbı ve kelimeleri birlikte kazı.</Text>
      <View style={styles.navRow}>
        {canPrev && <Button title="← Önceki" variant="secondary" style={styles.prevBtn} onPress={onPrev} />}
        <Button title={isLast ? 'Teste Geç →' : 'Sonraki →'} onPress={onNext} style={styles.nextBtn} />
      </View>
    </>
  );
}

// ---------- 2) YAZILI TEST ----------
// İki yön: step 0 = TR→EN yaz, step 1 = EN(ses)→TR yaz.
function TestPhase({ current, accent, autoSpeak, onFinish }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [step, setStep] = useState(0); // 0: yön TR→EN, 1: yön EN→TR
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [stepResults, setStepResults] = useState([]); // her yönün doğruluğu
  const inputRef = useRef(null);

  const isEnDirection = step === 0; // 0. adımda İngilizce YAZILIR
  const target = isEnDirection ? current.en : current.tr;
  const prompt = isEnDirection ? current.tr : current.en;

  // EN→TR adımında cümleyi seslendir (dinleyerek anlasın).
  useEffect(() => {
    setAnswer('');
    setChecked(false);
    if (step === 1 && autoSpeak) speak(current.en, { id: current.id });
    // küçük gecikmeyle odakla
    const t = setTimeout(() => inputRef.current && inputRef.current.focus && inputRef.current.focus(), 250);
    return () => clearTimeout(t);
  }, [step]);

  const correct = checked && isCloseEnough(answer, target);

  const check = () => {
    if (!answer.trim()) return;
    setChecked(true);
  };

  const next = () => {
    const ok = isCloseEnough(answer, target);
    const newStepResults = [...stepResults, ok];
    if (step === 0) {
      setStepResults(newStepResults);
      setStep(1);
    } else {
      // iki yön de doğruysa cümle geçti
      const passed = newStepResults.every(Boolean);
      onFinish(passed);
    }
  };

  return (
    <>
      <Text style={styles.phase}>
        ✍️ YAZILI TEST · {isEnDirection ? 'İNGİLİZCESİNİ YAZ' : 'TÜRKÇESİNİ YAZ'}
      </Text>
      <ScrollView contentContainerStyle={styles.testBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Yön göstergesi */}
        <View style={[styles.dirTag, { borderColor: accent }]}>
          <Text style={[styles.dirTagText, { color: accent }]}>
            {isEnDirection ? 'Türkçe → İngilizce' : '🔊 İngilizce → Türkçe'}
          </Text>
        </View>

        {/* Soru: EN→TR yönünde cümleyi dinlet + göster */}
        {isEnDirection ? (
          <Text style={styles.promptText}>{prompt}</Text>
        ) : (
          <>
            <HighlightedSentence text={current.en} chunk={current.chunk} color={accent} size={font.h3} />
            <Pressable style={styles.speakBtn} onPress={() => speak(current.en, { id: current.id })}>
              <Text style={styles.speakText}>🔊 Tekrar dinle</Text>
            </Pressable>
          </>
        )}

        {/* Yazı alanı */}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            checked && (correct ? styles.inputCorrect : styles.inputWrong),
          ]}
          value={answer}
          onChangeText={setAnswer}
          editable={!checked}
          placeholder={isEnDirection ? 'İngilizce cümleyi yaz…' : 'Türkçe karşılığını yaz…'}
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          onSubmitEditing={check}
          returnKeyType="done"
        />

        {/* Sonuç */}
        {checked && (
          <View style={styles.feedbackBox}>
            <Text style={[styles.feedbackTitle, { color: correct ? colors.success : colors.danger }]}>
              {correct ? '✅ Doğru!' : '❌ Yanlış'}
            </Text>
            {!correct && (
              <Text style={styles.feedbackAnswer}>
                Doğrusu: <Text style={{ fontWeight: '900', color: colors.text }}>{target}</Text>
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {!checked ? (
        <Button title="Kontrol Et" variant="accent" onPress={check} disabled={!answer.trim()} />
      ) : (
        <Button title={step === 0 ? 'Sonraki Yön →' : 'Devam Et →'} onPress={next} />
      )}
    </>
  );
}

const makeStyles = (colors, shadow) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  close: { color: colors.textMuted, fontSize: 22, fontWeight: '800' },
  counter: { color: colors.textMuted, fontWeight: '800' },
  phase: { color: colors.textFaint, fontSize: font.tiny, fontWeight: '800', textAlign: 'center', letterSpacing: 1, marginBottom: spacing.md },

  scrollBody: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.lg },
  testBody: { flexGrow: 1, justifyContent: 'center', gap: spacing.lg, paddingVertical: spacing.lg },

  patternTag: { borderWidth: 1.5, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 12 },
  patternTagText: { fontWeight: '800', fontSize: font.small },
  speakBtn: { alignSelf: 'center', backgroundColor: colors.card, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1, borderColor: colors.border, ...shadow },
  speakText: { color: colors.text, fontWeight: '800', fontSize: font.body },
  tr: { color: colors.text, fontSize: font.h3, textAlign: 'center', fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, alignSelf: 'stretch', marginVertical: spacing.xs },
  sectionLabel: { color: colors.textFaint, fontSize: font.tiny, fontWeight: '800', letterSpacing: 1 },
  thinkBtn: { backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  thinkText: { color: colors.textMuted, fontSize: font.body, fontWeight: '700', textAlign: 'center' },
  tip: { color: colors.textFaint, fontSize: font.small, textAlign: 'center', marginVertical: spacing.md },
  navRow: { flexDirection: 'row', gap: spacing.sm },
  prevBtn: { flex: 1 },
  nextBtn: { flex: 2 },

  // Yazılı test
  dirTag: { alignSelf: 'center', borderWidth: 1.5, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 14 },
  dirTagText: { fontWeight: '900', fontSize: font.body },
  promptText: { color: colors.text, fontSize: font.h2, textAlign: 'center', fontWeight: '800' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: font.h3,
    color: colors.text,
    minHeight: 64,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  inputCorrect: { borderColor: colors.success, backgroundColor: colors.successSoft },
  inputWrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  feedbackBox: { alignItems: 'center', gap: 4 },
  feedbackTitle: { fontSize: font.h3, fontWeight: '900' },
  feedbackAnswer: { color: colors.textMuted, fontSize: font.body, textAlign: 'center' },
});
