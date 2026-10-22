// AKILLI TAHTA — ZAMAN ŞERİDİ (Sosyal Bilgiler / İnkılap Tarihi). Uygulama temasıyla (useTheme) çizilir.
// Görselli olay kartları karışık gelir; öğrenci bir kartı seçip soldan sağa uzanan şeritte yerine dokunur.
// Tarihler sıralamadan önce HİÇ görünmez (yarışmada kopya olmasın); "Kontrol et" doğru/yanlışı ve tarihleri açar.
// Zorluk sınıf düzeyinden gelir (kart sayısı, olayların yakınlığı, ipucu) — bkz. data/timelines.js → GRADE_LEVELS.
// Öğretmen kendi olaylarını da yazabilir (cihazda saklanır).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { useRole } from '../../context/RoleContext';
import { GRADE_CYCLE } from '../../theme';
import { useTeacher } from '../../teacher/TeacherContext';
import BoardClassPanel, { appBoardPalette } from '../../components/BoardClassPanel';
import { shuffle } from '../../utils/helpers';
import { TIMELINE_SETS, GRADE_LEVELS, GRADES, hintOf, parseCustomLines, pickItems, gradeFromClassName } from '../../data/timelines';

const CUSTOM_KEY = '@ingapp/timeline-custom/v1';
const GAP = 12;

export default function TimelineScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, shadow } = useTheme();
  const pal = useMemo(() => appBoardPalette(colors), [colors]);
  const wide = width >= 820;
  const t = useTeacher();
  const [classId, setClassId] = useState(route.params?.classId || (t.classes[0] && t.classes[0].id) || null);
  const cls = classId ? t.getClass(classId) : null;

  const { branchId } = useRole();
  // Etkinlikler listesinden gelince düzey oradan; yoksa sınıf adından ("7-B" → 7).
  const [grade, setGrade] = useState(() => route.params?.grade || gradeFromClassName(cls && cls.name) || 5);
  const firstClass = useRef(true);
  const level = GRADE_LEVELS[grade];
  const [custom, setCustom] = useState([]); // [{ id, title, text }]
  const [setId, setSetId] = useState(route.params?.set || null);
  const [count, setCount] = useState(level.count);
  const [showHint, setShowHint] = useState(false);
  const [round, setRound] = useState(null); // { items (doğru sırada), pool: [i], slots: [i|null] }
  const [sel, setSel] = useState(null); // { from: 'pool'|'slot', i }
  const [checked, setChecked] = useState(false);
  const [solved, setSolved] = useState(false); // "Doğru sıra" ile açıldı (puan sayılmaz)
  const [editor, setEditor] = useState(null); // { id?, title, text }
  const [timer, setTimer] = useState(0);
  const [others, setOthers] = useState(false); // "Başka düzeyler" açık mı
  const tick = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_KEY)
      .then((s) => s && setCustom(JSON.parse(s)))
      .catch(() => {});
  }, []);
  const saveCustom = (next) => {
    setCustom(next);
    AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(next)).catch(() => {});
  };

  // Sınıf değişince düzeyi sınıf adından al.
  useEffect(() => {
    if (firstClass.current && route.params?.grade) return void (firstClass.current = false);
    firstClass.current = false;
    const g = gradeFromClassName(cls && cls.name);
    if (g) setGrade(g);
  }, [classId]);
  // Ekran açıkken Etkinlikler'den başka düzeyle yeniden açılırsa o düzeye geç.
  useEffect(() => {
    if (route.params?.grade) setGrade(route.params.grade);
    setSetId(route.params?.set || null);
  }, [route.params?.grade, route.params?.set]);

  // Düzeye uygun setler önce; diğerleri altta "başka düzeyler" olarak.
  const allSets = useMemo(() => {
    const own = custom.map((c) => ({ id: c.id, title: c.title || 'Kendi setim', emoji: '✏️', color: '#64748B', grades: GRADES, custom: true, ...parseCustomLines(c.text) }));
    return [...TIMELINE_SETS, ...own];
  }, [custom]);
  const fits = (s) => s.custom || s.grades.includes(grade);
  const set = allSets.find((s) => s.id === setId && fits(s)) || allSets.find(fits) || allSets[0];
  const tint = set.color || colors.accent;

  // Düzey değişince o düzeyin varsayılanına dön.
  useEffect(() => {
    setCount(level.count);
    setShowHint(false);
  }, [grade]);

  const newRound = () => {
    const items = pickItems(set, count, set.custom ? 'random' : level.pick);
    let pool = shuffle(items.map((_, i) => i));
    // Karışık sıra tesadüfen doğru sıra olmasın.
    if (pool.length > 1 && pool.every((x, i) => x === i)) pool = [...pool.slice(1), pool[0]];
    setRound({ items, pool, slots: items.map(() => null) });
    setSel(null);
    setChecked(false);
    setSolved(false);
  };
  useEffect(() => {
    if (set && set.items.length >= 2) newRound();
    else setRound(null);
  }, [set && set.id, set && set.items.length, count, grade]);

  useEffect(() => {
    if (timer <= 0) return;
    tick.current = setTimeout(() => setTimer((x) => x - 1), 1000);
    return () => clearTimeout(tick.current);
  }, [timer]);

  // ---- Yerleştirme: kartı seç → şeritte yere dokun. Dolu yere koyunca eski kart havuza döner; iki şerit kartı yer değiştirir.
  const update = (fn) => {
    setRound((r) => fn({ ...r, pool: [...r.pool], slots: [...r.slots] }));
    setSel(null);
    setChecked(false);
  };
  const onPool = (i) => !solved && setSel(sel && sel.from === 'pool' && sel.i === i ? null : { from: 'pool', i });
  const onSlot = (s) => {
    if (!round || solved) return;
    if (!sel) {
      if (round.slots[s] != null) setSel({ from: 'slot', i: s });
      return;
    }
    if (sel.from === 'slot' && sel.i === s) return setSel(null);
    update((r) => {
      if (sel.from === 'pool') {
        if (r.slots[s] != null) r.pool.push(r.slots[s]);
        r.pool = r.pool.filter((x) => x !== sel.i);
        r.slots[s] = sel.i;
      } else {
        [r.slots[s], r.slots[sel.i]] = [r.slots[sel.i], r.slots[s]];
      }
      return r;
    });
  };
  const toPool = () => {
    if (!sel || sel.from !== 'slot') return;
    update((r) => {
      r.pool.push(r.slots[sel.i]);
      r.slots[sel.i] = null;
      return r;
    });
  };
  // Kontrolden sonra: doğru kartlar yerinde kalır, yanlışlar havuza döner (tekrar denensin; tarihleri yine gizli).
  const retryWrong = () =>
    update((r) => {
      r.slots.forEach((k, s) => {
        if (k != null && k !== s) {
          r.pool.push(k);
          r.slots[s] = null;
        }
      });
      r.pool = shuffle(r.pool);
      return r;
    });
  const solve = () => {
    setRound((r) => ({ ...r, pool: [], slots: r.items.map((_, i) => i) }));
    setSel(null);
    setChecked(true);
    setSolved(true);
  };

  const n = round ? round.items.length : 0;
  const filled = round ? round.slots.filter((x) => x != null).length : 0;
  const correct = round ? round.slots.filter((x, i) => x === i).length : 0;
  const hasBC = set && set.kind === 'year' && set.items.some((x) => x.v < 0);
  // Tarih yalnızca kontrol edilmiş ve doğru yerde duran kartta görünür; geri kalan her yerde gizli.
  const dateShown = (where, k, slot) => checked && where === 'slot' && (solved || k === slot);
  const teamHint = checked && round && !solved ? `Bu turda ${correct} kart doğru yerde — puanı sırası olan takıma ekle.` : null;

  // ---- Ölçüler
  const sideW = wide ? Math.min(340, width * 0.26) : 0;
  const innerW = width - sideW - (wide ? 48 : 32) - 32;
  const slotW = n ? Math.max(140, Math.min(230, (innerW - (n - 1) * GAP) / n)) : 160;
  const cardFont = Math.max(13, Math.min(18, slotW / 10));
  const emojiSize = Math.max(30, Math.min(48, slotW / 4));

  const Card = ({ k, where, slot }) => {
    const item = round.items[k];
    const isSel = sel && sel.from === where && sel.i === (where === 'pool' ? k : slot);
    const ok = checked && where === 'slot' ? k === slot : null;
    const showDate = dateShown(where, k, slot);
    const hint = !checked && showHint ? hintOf(item, set.kind) : null;
    const edge = isSel ? colors.accent : ok === true ? colors.primary : ok === false ? colors.danger : colors.border;
    return (
      <View style={[st.card, shadow, { width: slotW, backgroundColor: colors.card, borderColor: edge }, isSel && { transform: [{ translateY: -4 }] }]}>
        <View style={[st.cardArt, { backgroundColor: tint + '1F' }]}>
          <Text style={{ fontSize: emojiSize }}>{item.i || '📌'}</Text>
          {ok != null && !solved ? (
            <View style={[st.badge, { backgroundColor: ok ? colors.primary : colors.danger }]}>
              <Text style={st.badgeT}>{ok ? '✓' : '✗'}</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ color: colors.text, fontSize: cardFont, fontWeight: '800', textAlign: 'center', lineHeight: cardFont * 1.3, paddingHorizontal: 10, paddingTop: 8 }}>{item.e}</Text>
        <View style={{ alignItems: 'center', paddingVertical: 10, minHeight: 40, justifyContent: 'center' }}>
          {showDate ? (
            <View style={[st.date, { backgroundColor: tint }]}>
              <Text style={st.dateT}>{item.d}</Text>
            </View>
          ) : hint ? (
            <Text style={{ color: colors.textMuted, fontWeight: '800' }}>💡 {hint}</Text>
          ) : (
            <Text style={{ color: colors.textFaint, fontWeight: '900', letterSpacing: 2 }}>• • •</Text>
          )}
        </View>
      </View>
    );
  };

  const Chip = ({ on, label, onPress, color = colors.accent, dim }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      style={[st.chip, { borderColor: on ? color : colors.border, backgroundColor: on ? color + '22' : colors.card, opacity: dim && !on ? 0.6 : 1 }]}
    >
      <Text style={{ color: on ? color : colors.text, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
  const Btn = ({ label, onPress, color = colors.card, textColor = colors.text, flex, big, disabled }) => (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [st.btn, color === colors.card && [shadow, { borderWidth: 1, borderColor: colors.border }], { backgroundColor: color, flex: flex ? 1 : undefined, minHeight: big ? 60 : 46, opacity: disabled ? 0.4 : 1 }, pressed && !disabled && { opacity: 0.8 }]}
    >
      <Text style={{ color: textColor, fontWeight: '900', fontSize: big ? 20 : 16 }}>{label}</Text>
    </Pressable>
  );

  const editorCount = editor ? parseCustomLines(editor.text).items.length : 0;
  const Editor = editor ? (
    <View style={[st.panel, shadow, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      <Text style={[st.h, { color: colors.textMuted }]}>KENDİ OLAYLARIN</Text>
      <TextInput value={editor.title} onChangeText={(x) => setEditor({ ...editor, title: x })} placeholder="Set adı (ör. Osmanlı padişahları)" placeholderTextColor={colors.textFaint} style={[st.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardSoft }]} />
      <TextInput
        value={editor.text}
        onChangeText={(x) => setEditor({ ...editor, text: x })}
        multiline
        placeholder={'Her satıra: tarih | olay\n1453 | İstanbul’un fethi\nMÖ 3200 | Yazının bulunuşu\n29.10.1923 | Cumhuriyet’in ilanı'}
        placeholderTextColor={colors.textFaint}
        style={[st.input, { minHeight: 170, textAlignVertical: 'top', color: colors.text, borderColor: colors.border, backgroundColor: colors.cardSoft }]}
      />
      <Text style={{ color: colors.textMuted }}>{editorCount} olay okundu. Tarihler oyunda kontrol edilene kadar gizli kalır; kart sayısı seçili düzeyden gelir.</Text>
      <View style={st.row}>
        <Btn
          label="Kaydet"
          color={colors.primary}
          textColor={colors.onPrimary}
          flex
          disabled={editorCount < 2}
          onPress={() => {
            const id = editor.id || `custom-${Date.now()}`;
            const entry = { id, title: editor.title.trim(), text: editor.text };
            saveCustom(editor.id ? custom.map((c) => (c.id === id ? entry : c)) : [...custom, entry]);
            setSetId(id);
            setEditor(null);
          }}
        />
        {editor.id ? (
          <Btn
            label="Sil"
            color={colors.danger}
            textColor="#fff"
            onPress={() => {
              saveCustom(custom.filter((c) => c.id !== editor.id));
              setSetId(null);
              setEditor(null);
            }}
          />
        ) : null}
        <Btn label="Vazgeç" onPress={() => setEditor(null)} />
      </View>
    </View>
  ) : null;

  // ---- Şerit: soldan (eski) sağa (yeni); dar ekranda yatay kaydırılır.
  const Strip = round ? (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 6 }}>
      <View>
        <View style={{ flexDirection: 'row', gap: GAP }}>
          {round.slots.map((k, s) => (
            <Pressable
              key={s}
              onPress={() => onSlot(s)}
              accessibilityRole="button"
              accessibilityLabel={`${s + 1}. yer${k != null ? ': ' + round.items[k].e : ', boş'}`}
              style={{ width: slotW, alignItems: 'center' }}
            >
              {k != null ? (
                <Card k={k} where="slot" slot={s} />
              ) : (
                <View style={[st.card, st.empty, { width: slotW, borderColor: sel && sel.from === 'pool' ? colors.accent : colors.border, backgroundColor: sel && sel.from === 'pool' ? colors.accent + '12' : 'transparent' }]}>
                  <Text style={{ color: sel && sel.from === 'pool' ? colors.accent : colors.textFaint, fontWeight: '900', fontSize: 28 }}>＋</Text>
                  <Text style={{ color: sel && sel.from === 'pool' ? colors.accent : colors.textFaint, fontWeight: '800' }}>{sel && sel.from === 'pool' ? 'Buraya koy' : 'Boş'}</Text>
                </View>
              )}
              <View style={[st.stem, { backgroundColor: tint }]} />
            </Pressable>
          ))}
        </View>
        {/* Zaman ekseni */}
        <View style={{ height: 34, justifyContent: 'center' }}>
          <View style={[st.axis, { backgroundColor: tint }]} />
          <View style={[st.arrow, { borderLeftColor: tint }]} />
          <View style={{ flexDirection: 'row', gap: GAP, position: 'absolute', left: 0, right: 0 }}>
            {round.slots.map((k, s) => (
              <View key={s} style={{ width: slotW, alignItems: 'center' }}>
                <View style={[st.dot, { borderColor: tint, backgroundColor: checked && k != null ? (k === s || solved ? colors.primary : colors.danger) : colors.card }]}>
                  <Text style={{ color: checked && k != null ? '#fff' : tint, fontWeight: '900', fontSize: 13 }}>{s + 1}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[st.era, { color: tint }]}>◀ ESKİ</Text>
          <Text style={[st.era, { color: tint }]}>YENİ ▶</Text>
        </View>
      </View>
    </ScrollView>
  ) : null;

  const Result = checked && round ? (
    <View style={[st.result, { backgroundColor: solved ? colors.cardSoft : correct === n ? colors.successSoft : colors.dangerSoft }]}>
      <Text style={{ fontSize: 30 }}>{solved ? '👁' : correct === n ? '🎉' : '🧐'}</Text>
      <View style={{ flex: 1, minWidth: 200 }}>
        <Text style={{ color: colors.text, fontWeight: '900', fontSize: 20 }}>
          {solved ? 'Doğru sıra gösterildi' : correct === n ? `Harika! ${n}/${n} doğru` : `${correct}/${n} kart doğru yerde`}
        </Text>
        <Text style={{ color: colors.textMuted, marginTop: 2 }}>
          {solved ? 'Bu tur puan sayılmaz. Yeni turla devam edebilirsin.' : correct === n ? 'Tüm tarihler açıldı.' : 'Doğru kartların tarihi açıldı. Kırmızılar havuza dönüp yeniden denenebilir.'}
        </Text>
      </View>
      {!solved && correct < n ? <Btn label="↺ Yanlışları yeniden dene" color={colors.accent} textColor="#fff" onPress={retryWrong} /> : null}
    </View>
  ) : null;

  const Main = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: wide ? 24 : 16, gap: 16 }}>
      {/* Ayarlar */}
      <View style={[st.panel, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[st.row, { alignItems: 'center' }]}>
          <Text style={[st.h, { color: colors.textMuted }]}>SINIF DÜZEYİ</Text>
          {GRADES.map((g) => (
            <Chip key={g} on={g === grade} color={GRADE_CYCLE[(g - 5 + 40) % 4]} label={`${g}. sınıf`} onPress={() => setGrade(g)} />
          ))}
          <Text style={{ color: colors.textMuted, fontWeight: '700' }}>
            {level.label} · {level.desc}
          </Text>
        </View>
        <View style={[st.row, { alignItems: 'center' }]}>
          <Text style={[st.h, { color: colors.textMuted }]}>KONU</Text>
          {allSets.filter(fits).map((s) => (
            <Chip
              key={s.id}
              on={s.id === set.id}
              color={s.color || colors.accent}
              label={`${s.emoji} ${s.title}`}
              onPress={() => (s.custom && s.id === set.id ? setEditor({ id: s.id, title: s.title, text: custom.find((c) => c.id === s.id).text }) : setSetId(s.id))}
            />
          ))}
          <Chip label="＋ Kendi olaylarım" color={colors.primary} onPress={() => setEditor({ title: '', text: '' })} />
        </View>
        {allSets.some((s) => !fits(s)) ? (
          <View style={[st.row, { alignItems: 'center' }]}>
            <Pressable onPress={() => setOthers(!others)} hitSlop={8}>
              <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '800' }}>Başka düzeylerin konuları {others ? '▴' : '▾'}</Text>
            </Pressable>
            {others && allSets
              .filter((s) => !fits(s))
              .map((s) => (
                <Chip key={s.id} dim label={`${s.emoji} ${s.title} (${s.grades.join(', ')})`} onPress={() => { setGrade(s.grades[0]); setSetId(s.id); }} />
              ))}
          </View>
        ) : null}
      </View>

      {Editor}

      {/* Şerit */}
      <View style={[st.panel, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[st.row, { alignItems: 'center', justifyContent: 'space-between' }]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 22 }}>{set.emoji} {set.title}</Text>
            {set.note ? <Text style={{ color: colors.textMuted, marginTop: 2 }}>🎯 {set.note}</Text> : null}
          </View>
          {round ? (
            <View style={[st.pill, { backgroundColor: tint + '1F' }]}>
              <Text style={{ color: tint, fontWeight: '900' }}>{filled}/{n} yerleşti</Text>
            </View>
          ) : null}
        </View>
        {hasBC && grade <= 6 ? (
          <Text style={{ color: colors.warning, fontWeight: '700' }}>💡 MÖ’de sayı büyüdükçe olay daha eskidir. MÖ’den sonra MS gelir.</Text>
        ) : null}
        {round ? Strip : <Text style={{ color: colors.textMuted }}>Bu sette en az 2 olay olmalı.</Text>}
        {Result}
      </View>

      {/* Kart havuzu */}
      {round && round.pool.length ? (
        <View style={[st.panel, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[st.h, { color: colors.textMuted }]}>KARTLAR — birini seç, sonra şeritte yerine dokun</Text>
          <View style={[st.row, { gap: GAP }]}>
            {round.pool.map((k) => (
              <Pressable
                key={k}
                onPress={() => onPool(k)}
                accessibilityRole="button"
                accessibilityLabel={round.items[k].e}
                accessibilityState={{ selected: !!sel && sel.from === 'pool' && sel.i === k }}
              >
                <Card k={k} where="pool" />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Kontroller */}
      {round ? (
        <View style={{ gap: 10 }}>
          <View style={st.row}>
            <Btn label="✔ Kontrol et" big flex color={colors.primary} textColor={colors.onPrimary} disabled={filled < n || checked} onPress={() => setChecked(true)} />
            <Btn label="👁 Doğru sıra" big onPress={solve} disabled={solved} />
            <Btn label="🔀 Yeni tur" big onPress={newRound} />
          </View>
          <View style={[st.row, { alignItems: 'center' }]}>
            {sel && sel.from === 'slot' ? <Btn label="↩ Kartı geri al" onPress={toPool} /> : null}
            {level.hint || set.custom ? (
              <Btn label={showHint ? '💡 İpucunu kapat' : `💡 İpucu (${set.kind === 'date' ? 'yıl' : set.kind === 'day' ? 'ay' : 'yüzyıl'})`} onPress={() => setShowHint(!showHint)} />
            ) : null}
            <Btn label="−" onPress={() => setCount(Math.max(3, count - 1))} disabled={count <= 3} />
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>{n} kart</Text>
            <Btn label="＋" onPress={() => setCount(Math.min(set.items.length, count + 1))} disabled={count >= set.items.length} />
            <Btn label={timer > 0 ? `⏱ ${timer}` : '⏱ 60 sn'} onPress={() => setTimer(timer > 0 ? 0 : 60)} color={timer > 0 && timer <= 10 ? colors.danger : colors.card} textColor={timer > 0 && timer <= 10 ? '#fff' : colors.text} />
          </View>
        </View>
      ) : null}
      {!wide ? <BoardClassPanel pal={pal} inline classId={classId} onClassChange={setClassId} teamHint={teamHint} /> : null}
    </ScrollView>
  );

  return (
    <View style={[st.root, { backgroundColor: colors.bg, paddingBottom: insets.bottom }]}>
      <View style={[st.hero, { backgroundColor: colors.accentDeep, paddingTop: insets.top + 12 }]}>
        <View style={[st.blob, { width: 200, height: 200, top: -90, right: -40 }]} />
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Geri" style={st.heroBtn}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={st.heroT}>🕰️ Zaman Şeridi</Text>
          <Text style={st.heroS} numberOfLines={1}>
            {cls ? `${cls.name} · ` : ''}
            {grade}. sınıf · {set.title}
          </Text>
        </View>
        {branchId === 'sosyal' ? (
          <Pressable onPress={() => navigation.replace('MapGame', { classId, grade: Math.min(7, grade) })} hitSlop={8} style={st.heroPill}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>🗺️ Türkiye haritası</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column' }}>
        {Main}
        {wide ? <BoardClassPanel pal={pal} classId={classId} onClassChange={setClassId} style={{ width: sideW, flexGrow: 0, flexShrink: 0 }} teamHint={teamHint} /> : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 16, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroT: { color: '#fff', fontSize: 22, fontWeight: '900' },
  heroS: { color: 'rgba(255,255,255,0.8)', fontWeight: '700', marginTop: 2 },
  heroPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.18)' },
  panel: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  h: { fontWeight: '900', letterSpacing: 1.2, fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  btn: { borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 2, borderRadius: 18, overflow: 'hidden', minHeight: 190 },
  cardArt: { height: 78, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeT: { color: '#fff', fontWeight: '900', fontSize: 16 },
  date: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  dateT: { color: '#fff', fontWeight: '900', fontSize: 15 },
  empty: { borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  stem: { width: 3, height: 14, opacity: 0.6 },
  axis: { height: 5, borderRadius: 3, marginRight: 10 },
  arrow: { position: 'absolute', right: 0, width: 0, height: 0, borderTopWidth: 9, borderBottomWidth: 9, borderLeftWidth: 14, borderTopColor: 'transparent', borderBottomColor: 'transparent' },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  era: { fontWeight: '900', letterSpacing: 1.5, fontSize: 13 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, flexWrap: 'wrap' },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
});
