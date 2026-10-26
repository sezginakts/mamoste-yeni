// Yıllık plan görünümleri: renkli hafta kartı + plan haftalarını gösteren küçük takvim.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { spacing, font, radius, pairColor } from '../theme';
import { useTheme } from '../context/ThemeContext';
import { formatDate } from './ui';
import Collapsible from '../components/Collapsible';
import { dayKey } from '../utils/helpers';

// Ünite rengi: üniteler sırayla uygulama rengi / ikinci renk (aynı ünite her yerde aynı renk); tatil haftası gri.
const HOLIDAY_COLOR = '#94A3B8';
export function unitColor(w) {
  if (!w || w.holiday) return HOLIDAY_COLOR;
  const name = String(w.unit || w.topic || '').toLowerCase();
  const num = name.match(/(?:unit|ünite|unite|theme|tema)\s*(\d+)/);
  if (num) return pairColor(+num[1] - 1);
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pairColor(h);
}

// Öğrenme çıktısı satırındaki beceri: ikon + Türkçe ad.
const SKILLS = [
  [/^spoken interaction/i, '💬', 'Karşılıklı konuşma'],
  [/^spoken production|^speaking|^konuşma/i, '🗣️', 'Sözlü anlatım'],
  [/^listening|^dinleme/i, '👂', 'Dinleme'],
  [/^reading|^okuma/i, '📖', 'Okuma'],
  [/^writing|^yazma/i, '✍️', 'Yazma'],
];
// Kazanım kodu: "E7.2.L1." (eski program) ya da "ENG.5.1.S2." (Maarif modeli).
const CODE_RE = /^([A-Z]{1,4}\.?\d{1,2}\.\d+\.([A-Z]{1,3})\d+\.?)\s*/;
// Koddaki harften beceri: L dinleme, SI karşılıklı konuşma, SP / S konuşma, R okuma, W yazma.
const SKILL_BY_CODE = {
  L: ['👂', 'Dinleme'],
  SI: ['💬', 'Karşılıklı konuşma'],
  SP: ['🗣️', 'Sözlü anlatım'],
  S: ['🗣️', 'Konuşma'],
  R: ['📖', 'Okuma'],
  W: ['✍️', 'Yazma'],
  P: ['🔊', 'Sesletim'],
  V: ['📚', 'Kelime'],
  G: ['🧩', 'Dil bilgisi'],
};
export function splitOutcome(line) {
  for (const [re, icon, label] of SKILLS) {
    const m = line.match(re);
    if (m) {
      let rest = line.slice(m[0].length).trim();
      const code = rest.match(CODE_RE);
      if (code) rest = rest.slice(code[0].length);
      return { icon, label, code: code ? code[1].replace(/\.$/, '') : null, text: rest };
    }
  }
  // Beceri adı yazmıyor ama kod var: beceriyi koddan çıkar.
  const code = line.match(CODE_RE);
  if (code) {
    const sk = SKILL_BY_CODE[code[2]];
    return { icon: sk ? sk[0] : '🎯', label: sk ? sk[1] : null, code: code[1].replace(/\.$/, ''), text: line.slice(code[0].length) };
  }
  // Diğer derslerin kodu (TT.7.3.1., M.7.1.2.3., F.7.1.1.1.): beceri yok, yalnızca kod ayrılır.
  // Bölümler rakam ya da tek büyük harf olabilir: TT.8.B.1.2.
  const tr = line.match(/^([A-ZÇĞİÖŞÜ]{1,4}\.\d{1,2}(?:\.(?:\d+|[A-ZÇĞİÖŞÜ])){1,5}\.?)\s+/);
  if (tr) return { icon: '🎯', label: null, code: tr[1].replace(/\.$/, ''), text: line.slice(tr[0].length) };
  return { icon: '🎯', label: null, code: null, text: line };
}

// "Contexts … / Tasks/Activities … / Assignments …" bloklarını ayır.
const ACT_PARTS = [
  [/^contexts\s*/i, '🧭', 'Bağlamlar'],
  [/^tasks\/activities\s*/i, '🎲', 'Görev ve etkinlikler'],
  [/^assignments\s*/i, '📝', 'Ödev'],
];
function splitActivities(text) {
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      for (const [re, icon, label] of ACT_PARTS) if (re.test(line)) return { icon, label, text: line.replace(re, '') };
      return { icon: '🎲', label: null, text: line };
    });
}

export function WeekCard({ w, big }) {
  const { colors, shadow, mode } = useTheme();
  const c = unitColor(w);
  const tint = (alpha) => c + alpha;
  const outcomes = outcomeLines(w).map(splitOutcome);
  const bodySize = big ? font.body : font.small;

  if (w.holiday) {
    return (
      <View style={[s.card, shadow, { backgroundColor: colors.card, borderColor: tint('55') }]}>
        <View style={[s.hero, { backgroundColor: tint(mode === 'dark' ? '33' : '1F') }]}>
          <Text style={[s.heroMeta, { color: colors.textMuted }]}>{formatDate(w.start)}</Text>
          <Text style={{ fontSize: 40, marginTop: spacing.sm }}>🏖️</Text>
          <Text style={[s.heroTitle, { color: colors.text }]}>{w.unit || 'Tatil'}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 2 }}>Bu hafta ders yok — iyi dinlenmeler!</Text>
        </View>
        {w.notes ? <Notes text={w.notes} colors={colors} /> : null}
      </View>
    );
  }

  return (
    <View style={[s.card, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Üst bant: ünite rengi */}
      <View style={[s.hero, { backgroundColor: c }]}>
        <View style={s.heroRow}>
          {w.week ? (
            <View style={s.weekBadge}>
              <Text style={s.weekBadgeNum}>{w.week}</Text>
              <Text style={s.weekBadgeLbl}>HAFTA</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={s.heroDate}>{w.week ? `${w.week}. hafta` : 'Hafta'}</Text>
            <Text style={[s.heroUnit, !big && { fontSize: font.body }]} numberOfLines={2}>{w.unit || w.topic || 'Bu hafta'}</Text>
            {w.unit && w.topic ? <Text style={s.heroTopic}>{w.topic}</Text> : null}
          </View>
        </View>
      </View>

      <View style={{ padding: spacing.md, gap: spacing.md }}>
        {outcomes.length ? (
          <View>
            <SectionLabel icon="🎯" text="ÖĞRENME ÇIKTILARI" color={c} />
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {outcomes.map((o, i) => (
                <View key={i} style={[s.outRow, { backgroundColor: tint(mode === 'dark' ? '1A' : '10'), borderLeftColor: c }]}>
                  <Text style={s.outIcon}>{o.icon}</Text>
                  <View style={{ flex: 1 }}>
                    {o.label || o.code ? (
                      <View style={s.outHead}>
                        {o.label ? <Text style={[s.outLabel, { color: colors.text }]}>{o.label}</Text> : null}
                        {o.code ? (
                          <View style={[s.code, { borderColor: tint('66') }]}>
                            <Text style={[s.codeText, { color: c }]}>{o.code}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    <Text style={{ color: colors.text, fontSize: bodySize, lineHeight: bodySize + 7 }}>{o.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {w.functions ? (
          <View>
            <SectionLabel icon="💡" text="İŞLEVLER VE KULLANILACAK DİL" color={c} />
            <View style={[s.quote, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
              {w.functions
                .split(/\s(?=—)/)
                .map((part, i) => (
                  <Text
                    key={i}
                    style={
                      i === 0
                        ? { color: colors.text, fontWeight: '700', fontSize: bodySize, lineHeight: bodySize + 7 }
                        : { color: colors.textMuted, fontStyle: 'italic', fontSize: font.small, lineHeight: 21, marginTop: 4 }
                    }
                  >
                    {part.trim()}
                  </Text>
                ))}
            </View>
          </View>
        ) : null}

        {w.activities ? (
          <View>
            <SectionLabel icon="🎲" text="ETKİNLİKLER" color={c} />
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {splitActivities(w.activities).map((a, i) => (
                <View key={i} style={[s.actRow, { backgroundColor: colors.cardSoft }]}>
                  <Text style={{ fontSize: 16 }}>{a.icon}</Text>
                  <View style={{ flex: 1 }}>
                    {a.label ? <Text style={[s.outLabel, { color: colors.text }]}>{a.label}</Text> : null}
                    <Text style={{ color: colors.textMuted, fontSize: font.small, lineHeight: 20 }}>{a.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {contentSections(w.content).length || w.evaluation ? (
          <View>
            <SectionLabel icon="📚" text="İÇERİK VE DEĞERLENDİRME" color={c} />
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              {contentSections(w.content).map((x, i) => (
                <Fold key={i} icon={x.icon} label={x.label} text={x.text} color={c} />
              ))}
              {w.evaluation ? (
                <Fold icon="📝" label="Değerlendirme" text={joinWrapped(w.evaluation.replace(/^EVALUATION FOR THE SKILLS AND THE CONTENT:\s*/i, '').replace(/PERFORMANCE ASSIGNMENT:\s*/i, ''))} color={c} />
              ) : null}
            </View>
          </View>
        ) : null}

        {w.notes ? <Notes text={w.notes} colors={colors} /> : null}
      </View>
    </View>
  );
}

// ---- Gün gün hafta görünümü ----
// Hafta aralığı yazılmaz; her günün başında yalnız o günün tarihi olur, altında o güne düşen kazanımlar.
const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

function addDays(key, n) {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function WeekDaysCard({ w, today, lessons }) {
  const { colors, shadow, mode } = useTheme();
  if (w.holiday) return <WeekCard w={w} />;
  const c = unitColor(w);
  // Tek kaynak: gün + ders bazlı dağıtım (ders programı varsa gerçek günlere).
  const days = weekDays(w, lessons);

  return (
    <View style={[s.card, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[s.hero, { backgroundColor: c }]}>
        <Text style={s.heroDate}>{w.week ? `${w.week}. hafta` : 'Hafta'}</Text>
        <Text style={[s.heroUnit, { fontSize: font.h3 }]} numberOfLines={2}>{w.unit || w.topic || 'Bu hafta'}</Text>
      </View>
      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        {days.map((d, i) => {
          const date = addDays(w.start, d.day - 1);
          const isToday = date === today;
          const title = `${DAY_NAMES[d.day - 1]} · ${formatDate(date)}${d.period ? ` · ${d.period}. ders` : ''}`;
          return (
            <Collapsible
              key={i}
              title={title}
              titleStyle={[s.dayName, { color: isToday ? c : colors.text, fontSize: font.small, letterSpacing: 0 }]}
              right={
                isToday ? (
                  <View style={[s.dayToday, { backgroundColor: c }]}>
                    <Text style={s.dayTodayT}>BUGÜN</Text>
                  </View>
                ) : null
              }
              style={[s.dayRow, { borderColor: colors.border }, isToday && { borderColor: c + '66', backgroundColor: c + (mode === 'dark' ? '1F' : '12') }]}
            >
              <View style={{ gap: 6 }}>
                {d.lines.map((line, k) => {
                  const o = splitOutcome(line);
                  return (
                    <View key={k} style={s.dayOut}>
                      <Text style={{ fontSize: 14 }}>{o.icon}</Text>
                      {o.code ? <Text style={[s.codeText, { color: c }]}>{o.code}</Text> : null}
                      <Text style={{ flex: 1, color: colors.text, fontSize: font.small, lineHeight: 20 }}>{o.text}</Text>
                    </View>
                  );
                })}
              </View>
            </Collapsible>
          );
        })}
      </View>
    </View>
  );
}

// Bu ders haftanın kaçıncı ders saati? Önce ders programındaki gerçek ders sayısı, yoksa plandaki saat.
// Döner { idx (0'dan), count }.
export function lessonSlot(w, lesson) {
  const count = (lesson && lesson.count) || (w && w.hours) || 1;
  const idx = lesson && lesson.idx >= 0 ? Math.min(lesson.idx, count - 1) : 0;
  return { idx, count };
}

// Haftanın öğrenme çıktılarını haftanın ders saatlerine sırayla paylaştır (her kazanım bir satır).
// Döner { lines, review } — review: bu derse yeni çıktı düşmedi, tekrar/pekiştirme dersi.
// Kazanım dersten azsa yeni kazanım haftanın İLK derslerine düşer, sonrakiler pekiştirme olur
// (ör. 1 kazanım / 2 ders → 1. ders kazanım, 2. ders pekiştirme).
// Pekiştirme dersinde haftanın tamamı basılmaz: en fazla 3 satır (ana sayfa şişmesin), tamamı `total`da.
// Kazanım metnini tek tek kazanımlara ayırır.
// Bazı planlarda (ör. 5/6. sınıf) kazanımlar yeni satır yerine boşlukla ayrılmış geliyor:
// "… carefully. ENG.5.1.L2. Students can …". Kodun önünden bölerek her kazanımı ayrı satır yaparız.
const CODE_BEFORE = /\s+(?=(?:ENG|[A-ZÇĞİÖŞÜ]{1,4})\.\d{1,2}\.\d+\.[A-ZÇĞİÖŞÜ]*\d+\.)/g;
export function outcomeLines(w) {
  const raw = String((w && w.outcomes) || '');
  if (!raw.trim()) return [];
  return raw
    .split(/\n+/)
    .flatMap((chunk) => chunk.replace(CODE_BEFORE, '\n').split('\n'))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function outcomesForLesson(w, idx, count) {
  const lines = outcomeLines(w);
  if (!count || count <= 1 || idx == null || idx < 0) return { lines, review: false };
  const mine = lines.filter((_, i) => Math.floor((i * count) / lines.length) === idx);
  if (mine.length) return { lines: mine, review: false };
  return { lines: lines.slice(0, 3), review: true, total: lines.length };
}

// Haftanın kazanımlarını GÜN + DERS bazında böler. Tek doğru kaynak: ana sayfa, haftalık görünüm ve
// ders kartı buradan beslenir.
//   lessons: o sınıfın o haftadaki dersleri (DeskContext: day/period/idx/count). Varsa kazanım gün ve
//            ders sırasına göre bölünür; kazanım düşmeyen gün hiç görünmez.
//   Program yoksa: hafta 5 okul gününe yayılır, boş gün gösterilmez.
// Döner: [{ day (1=Pzt), period?, start?, end?, label?, lines: [kazanım satırı] }]
export function weekDays(w, lessons) {
  const lines = outcomeLines(w);
  if (!w || w.holiday || !lines.length) return [];
  if (lessons && lessons.length) {
    const n = lessons.length;
    return lessons
      .map((l, i) => ({
        day: l.day,
        period: l.period,
        start: l.start,
        end: l.end,
        label: l.label,
        lines: lines.filter((_, k) => Math.floor((k * n) / lines.length) === i),
      }))
      .filter((x) => x.lines.length);
  }
  const n = lines.length;
  const dayCount = Math.min(5, n);
  const out = Array.from({ length: dayCount }, (_, i) => ({ day: i + 1, lines: [] }));
  lines.forEach((line, i) => {
    const d = n <= 5 ? i : Math.floor((i * 5) / n);
    out[Math.min(d, out.length - 1)].lines.push(line);
  });
  return out.filter((x) => x.lines.length);
}

// "CONTENT FRAME" hücresini başlıklarına göre böl: kelimeler, dil yapıları, sınıf dili…
const CONTENT_HEADS = [
  [/^sub-?themes?\s*:?/i, '🧭', 'Alt temalar'],
  [/^target vocabulary[^:]*:?/i, '📚', 'Hedef kelimeler'],
  [/^functions of the target grammatical structures[^:]*:?/i, '🔧', 'Yapıların kullanımı'],
  [/^target grammatical structures[^:]*:?/i, '🧩', 'Dil yapıları'],
  [/^target social language[^:]*:?/i, '💬', 'Sınıf dili'],
  [/^target phonological[^:]*:?/i, '🔊', 'Sesletim'],
  [/^\*/, null, null], // programın genel açıklamaları — gösterilmez
];
export function contentSections(text) {
  if (!text) return [];
  const s = String(text).replace(/\s*(Sub-Themes?:|Target Vocabulary|Target Grammatical|Functions of the Target|Target Social Language|Target Phonological|\*National|\*\(Relevant|\*Local Cultural)/g, '\n$1');
  const out = [];
  let cur = null;
  s.split('\n').forEach((raw) => {
    const line = raw.trim();
    if (!line) return;
    const head = CONTENT_HEADS.find(([re]) => re.test(line));
    if (head) {
      cur = head[1] ? { icon: head[1], label: head[2], text: line.replace(head[0], '').trim() } : { skip: true, text: '' };
      out.push(cur);
    } else if (cur) {
      // Cümle ortasındaki satır kırılmaları birleşir; madde ("-…") ve cümle sonları yeni satır.
      const newLine = !cur.text || /[.!?:)"”]$/.test(cur.text) || /^[-•]/.test(line);
      cur.text = cur.text ? `${cur.text}${newLine ? '\n' : ' '}${line}` : line;
    }
    else out.push((cur = { icon: '📄', label: 'İçerik', text: line }));
  });
  return out.filter((x) => !x.skip && x.text);
}

// PDF'ten dönüşen metinlerde cümle ortasındaki satır kırılmalarını birleştir.
export const joinWrapped = (t) =>
  String(t || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .reduce((acc, l) => (!acc ? l : /[.!?:)"”]$/.test(acc) || /^[-•]/.test(l) ? `${acc}\n${l}` : `${acc} ${l}`), '');

// Uzun metin: ilk birkaç satır görünür, dokununca açılır.
function Fold({ icon, label, text, color, lines = 3 }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const long = text.length > 180 || text.split('\n').length > lines;
  return (
    <Pressable onPress={() => long && setOpen(!open)} style={[s.actRow, { backgroundColor: colors.cardSoft }]}>
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.outLabel, { color: colors.text }]}>{label}</Text>
        <Text style={{ color: colors.textMuted, fontSize: font.small, lineHeight: 20 }} numberOfLines={open ? undefined : lines}>
          {text}
        </Text>
        {long ? <Text style={{ color, fontWeight: '800', fontSize: font.tiny, marginTop: 4 }}>{open ? 'Daha az ▴' : 'Devamını göster ▾'}</Text> : null}
      </View>
    </Pressable>
  );
}

// Bugünkü ders kartı: o derse düşen öğrenme çıktıları + o derste yapılacaklar (içerik, işlev, etkinlik, değerlendirme).
// lesson: { label, period, idx, count, dayName, upcoming } — ders programından; yoksa haftanın 1. dersi.
export function LessonCard({ w, lesson, onShowWeek, onPickSlot }) {
  const { colors, shadow, mode } = useTheme();
  const [open, setOpen] = useState(false); // "Bu derste neler yapılacak" açık mı
  const c = unitColor(w);
  if (w.holiday) return <WeekCard w={w} big />;
  const slot = lessonSlot(w, lesson);
  const { lines, review } = outcomesForLesson(w, slot.idx, slot.count);
  const outs = lines.map(splitOutcome);
  const fn = (w.functions || '').split(/\s(?=—)/);
  const content = contentSections(w.content);
  const evaluation = joinWrapped((w.evaluation || '').replace(/^EVALUATION FOR THE SKILLS AND THE CONTENT:\s*/i, ''));
  const mismatch = lesson && lesson.count && w.hours && lesson.count !== w.hours;
  const details = !!(fn[0] || content.length || w.activities || evaluation);

  return (
    <View style={[s.card, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[s.hero, { backgroundColor: c }]}>
        <Text style={s.heroDate}>
          {lesson && lesson.period
            ? `${lesson.dayName || ''}${lesson.date ? `${lesson.dayName ? ' · ' : ''}${formatDate(lesson.date)}` : ''}`
            : `${formatDate(w.start)}${w.week ? ` · ${w.week}. hafta` : ''}`}
        </Text>
        {lesson && lesson.upcoming ? (
          <View style={s.upcoming}>
            <Text style={{ color: '#fff', fontSize: font.tiny, fontWeight: '900', letterSpacing: 0.5 }}>SIRADAKİ DERSİN</Text>
          </View>
        ) : null}
        <Text style={s.heroUnit} numberOfLines={2}>{w.unit || w.topic || 'Bu hafta'}</Text>
        {lesson && lesson.period ? (
          <Text style={s.heroTopic}>
            {lesson.period}. ders{lesson.start ? ` (${lesson.start}–${lesson.end})` : ''} · {lesson.label}
          </Text>
        ) : null}
        {slot.count > 1 ? (
          <View style={s.lessonSteps}>
            {Array.from({ length: slot.count }, (_, i) => (
              <Pressable key={i} onPress={onPickSlot ? () => onPickSlot(i) : undefined} hitSlop={6} accessibilityLabel={`Haftanın ${i + 1}. dersi`}>
                <View style={[s.step, { backgroundColor: i === slot.idx ? '#fff' : 'rgba(255,255,255,0.35)' }]} />
              </Pressable>
            ))}
            <Text style={s.stepText}>Haftanın {slot.idx + 1}. dersi / {slot.count}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: spacing.md, gap: spacing.md }}>
        {outs.length ? (
          <View style={[s.focus, { borderColor: c, backgroundColor: c + (mode === 'dark' ? '22' : '12') }]}>
            {/* Başlık katlanır: kazanımlar uzun, ekranı kaplamasın. Kapalıyken sadece başlık + sayı görünür. */}
            <Collapsible
              key={`${w.week || ''}-${lesson?.day || 0}-${lesson?.period || 0}-${lesson?.label || ''}`}
              defaultOpen
              header={({ open, toggle }) => (
                <Pressable
                  onPress={toggle}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  style={({ pressed }) => [s.focusTag, { backgroundColor: c, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8 }, pressed && { opacity: 0.85 }]}
                >
                  <Text style={s.focusTagText}>🎯 {review ? 'TEKRAR VE PEKİŞTİRME' : 'BU DERSİN ÖĞRENME ÇIKTISI'}</Text>
                  <View style={{ flex: 1 }} />
                  {outs.length > 1 ? <Text style={[s.focusTagText, { opacity: 0.9 }]}>{outs.length}</Text> : null}
                  <Text style={[s.focusTagText, { opacity: 0.9 }]}>{open ? '⌃' : '⌄'}</Text>
                </Pressable>
              )}
            >
              <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
                {outs.map((o, i) => (
                  <View key={i}>
                    {o.label || o.code ? (
                      <View style={s.outHead}>
                        <Text style={{ fontSize: 16 }}>{o.icon}</Text>
                        {o.label ? <Text style={[s.outLabel, { color: colors.textMuted }]}>{o.label}</Text> : null}
                        {o.code ? (
                          <View style={[s.code, { borderColor: c + '66' }]}>
                            <Text style={[s.codeText, { color: c }]}>{o.code}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    <Text style={[s.focusText, { color: colors.text }]}>{o.text}</Text>
                  </View>
                ))}
              </View>
            </Collapsible>
          </View>
        ) : null}

        {details ? (
          <View>
            <Pressable onPress={() => setOpen(!open)} style={[s.detailBtn, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
              <Text style={{ fontSize: 15 }}>🛠️</Text>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: font.small, flex: 1 }}>Bu derste neler yapılacak</Text>
              <Text style={{ color: c, fontWeight: '800', fontSize: font.small }}>{open ? 'Gizle ▴' : 'Göster ▾'}</Text>
            </Pressable>
            {open ? (
              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                {fn[0] ? (
                  <Fold
                    icon="💡"
                    label="İşlevler ve kullanılacak dil"
                    text={fn.map((x) => x.trim()).join('\n')}
                    color={c}
                  />
                ) : null}
                {content.map((x, i) => (
                  <Fold key={`c${i}`} icon={x.icon} label={x.label} text={x.text} color={c} />
                ))}
                {w.activities ? splitActivities(w.activities).map((a, i) => <Fold key={`a${i}`} icon={a.icon} label={a.label || 'Etkinlikler'} text={a.text} color={c} />) : null}
                {evaluation ? (
                  <Fold
                    icon="📝"
                    label={/performance assignment/i.test(evaluation) ? 'Performans görevi / değerlendirme' : 'Değerlendirme'}
                    text={evaluation.replace(/PERFORMANCE ASSIGNMENT:\s*/i, '')}
                    color={c}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {w.notes ? <Notes text={w.notes} colors={colors} /> : null}

        {mismatch ? (
          <Text style={{ color: colors.warning, fontSize: font.tiny }}>
            Planda bu hafta {w.hours} ders saati var; ders programında {lesson.label} için {lesson.count} ders görünüyor. Eksik dersleri programa eklersen çıktılar doğru günlere düşer.
          </Text>
        ) : null}
        <Pressable onPress={onShowWeek} style={[s.weekBtn, { borderColor: c }]}>
          <Text style={{ color: c, fontWeight: '800' }}>Haftayı gün gün gör ▾</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SectionLabel({ icon, text, color }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontSize: 14 }}>{icon}</Text>
      <Text style={[s.secLabel, { color }]}>{text}</Text>
    </View>
  );
}

// MEB planlarındaki "ölçme araçları" listesi karta gereksiz kalabalık yapıyor: o cümle süzülür.
const NOT_AT = /gözlem formu|kontrol listesi|dereceli puanlama|akran değerlendirme|ürün dosyası|performans görevi/i;

function notTemizle(text) {
  return String(text || '')
    .split(/\s*·\s*|\n+/)
    .map((p) => p.trim())
    .filter((p) => p && !NOT_AT.test(p))
    .join(' · ')
    .replace(/^[,;.\s]+|[,;.\s]+$/g, '');
}

function Notes({ text, colors }) {
  const temiz = notTemizle(text);
  if (!temiz) return null;
  return (
    <View style={[s.notes, { backgroundColor: HOLIDAY_COLOR + '1F', borderColor: HOLIDAY_COLOR + '55' }]}>
      <Text style={{ fontSize: 16 }}>📌</Text>
      <Text style={{ color: colors.text, fontSize: font.small, flex: 1, lineHeight: 20 }}>{temiz.replace(/,\s*\n/g, ', ').replace(/\n/g, ' · ')}</Text>
    </View>
  );
}

// ---- Takvim ----
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// Ay ızgarası: 6 satır × 7 gün (pazartesi başlangıçlı).
function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - lead);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

// visible: açık mı · weeks: planın haftaları · selected: seçili haftanın başlangıcı · onPick(dayKey)
export function PlanCalendar({ visible, onClose, weeks = [], selected, onPick, legend = true }) {
  const { colors, shadow } = useTheme();
  const initial = selected ? new Date(selected + 'T00:00:00') : new Date();
  const [ym, setYm] = useState({ y: initial.getFullYear(), m: initial.getMonth() });
  const today = dayKey();

  // gün -> o günü içeren plan haftası
  const weekOfDay = useMemo(() => {
    const map = {};
    (weeks || []).forEach((w) => {
      const d = new Date(w.start + 'T00:00:00');
      const end = new Date(w.end + 'T00:00:00');
      while (d <= end) {
        map[dayKey(d)] = w;
        d.setDate(d.getDate() + 1);
      }
    });
    return map;
  }, [weeks]);

  const shift = (n) => setYm(({ y, m }) => {
    const d = new Date(y, m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const grid = monthGrid(ym.y, ym.m);
  // Plan haftası seçiliyse tüm hafta, değilse (not tarihi) sadece o gün vurgulanır.
  const selWeek = selected ? weeks.find((w) => w.start === selected) || { start: selected, end: selected } : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Takvimi kapat">
        <Pressable style={[s.calCard, shadow, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={s.calHead}>
            <Pressable onPress={() => shift(-1)} hitSlop={10} style={[s.calNav, { backgroundColor: colors.cardSoft }]} accessibilityLabel="Önceki ay">
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>‹</Text>
            </Pressable>
            <Text style={{ color: colors.text, fontSize: font.h3, fontWeight: '900' }}>{MONTHS_TR[ym.m]} {ym.y}</Text>
            <Pressable onPress={() => shift(1)} hitSlop={10} style={[s.calNav, { backgroundColor: colors.cardSoft }]} accessibilityLabel="Sonraki ay">
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>›</Text>
            </Pressable>
          </View>
          <View style={s.calRow}>
            {DAYS_TR.map((d) => (
              <Text key={d} style={[s.calDow, { color: colors.textFaint }]}>{d}</Text>
            ))}
          </View>
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <View key={row} style={s.calRow}>
              {grid.slice(row * 7, row * 7 + 7).map((d) => {
                const k = dayKey(d);
                const w = weekOfDay[k];
                const inMonth = d.getMonth() === ym.m;
                const isSel = selWeek && k >= selWeek.start && k <= selWeek.end;
                const col = w ? unitColor(w) : null;
                return (
                  <Pressable
                    key={k}
                    onPress={() => {
                      onPick(k);
                      onClose();
                    }}
                    style={[s.calCell, col && { backgroundColor: col + (isSel ? 'FF' : '26') }, isSel && !col && { backgroundColor: colors.accent }, k === today && { borderWidth: 2, borderColor: colors.text }]}
                    accessibilityLabel={`${d.getDate()} ${MONTHS_TR[d.getMonth()]}${w ? ', ' + (w.holiday ? 'tatil' : w.unit || '') : ''}`}
                  >
                    <Text style={{ color: isSel ? '#fff' : inMonth ? colors.text : colors.textFaint, fontWeight: k === today || isSel ? '900' : '600', fontSize: font.small }}>
                      {d.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={s.calFoot}>
            {legend ? (
              <View style={s.legend}>
                <View style={[s.legendDot, { backgroundColor: pairColor(0) + '55' }]} />
                <Text style={{ color: colors.textMuted, fontSize: font.tiny }}>Ders haftası</Text>
                <View style={[s.legendDot, { backgroundColor: HOLIDAY_COLOR + '55', marginLeft: spacing.sm }]} />
                <Text style={{ color: colors.textMuted, fontSize: font.tiny }}>Tatil</Text>
              </View>
            ) : (
              <View />
            )}
            <Pressable
              onPress={() => {
                onPick(today);
                onClose();
              }}
              style={[s.todayBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: font.small }}>Bugün</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden', marginBottom: spacing.md },
  hero: { padding: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroMeta: { fontSize: font.small, fontWeight: '700' },
  heroTitle: { fontSize: font.h2, fontWeight: '900', marginTop: spacing.sm },
  heroDate: { color: 'rgba(255,255,255,0.85)', fontSize: font.small, fontWeight: '700' },
  heroUnit: { color: '#fff', fontSize: font.h2, fontWeight: '900', marginTop: 2 },
  heroTopic: { color: 'rgba(255,255,255,0.9)', fontSize: font.small, marginTop: 2 },
  dayRow: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 2, gap: 4 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  dayName: { fontSize: font.small, fontWeight: '900' },
  dayDate: { fontSize: font.tiny, fontWeight: '700' },
  dayToday: { borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 1 },
  dayTodayT: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  dayOut: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 2 },
  weekBadge: { width: 58, height: 58, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  weekBadgeNum: { color: '#fff', fontSize: 24, fontWeight: '900', lineHeight: 26 },
  weekBadgeLbl: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  secLabel: { fontSize: font.tiny, fontWeight: '900', letterSpacing: 1 },
  outRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm + 2, borderRadius: radius.md, borderLeftWidth: 3 },
  outIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  outHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' },
  outLabel: { fontSize: font.small, fontWeight: '800' },
  code: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  codeText: { fontSize: 11, fontWeight: '800' },
  quote: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  actRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm + 2, borderRadius: radius.md },
  upcoming: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  lessonSteps: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  step: { width: 22, height: 6, borderRadius: 3 },
  stepText: { color: 'rgba(255,255,255,0.9)', fontSize: font.tiny, fontWeight: '800', marginLeft: 6 },
  weekBtn: { alignSelf: 'center', borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 8 },
  focus: { borderWidth: 2, borderRadius: radius.lg, padding: spacing.md },
  focusTag: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  focusTagText: { color: '#fff', fontSize: font.tiny, fontWeight: '900', letterSpacing: 0.8 },
  focusText: { fontSize: 18, lineHeight: 27, fontWeight: '700' },
  detailBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  notes: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', padding: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1 },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.md },
  calCard: { width: '100%', maxWidth: 380, borderRadius: radius.lg, padding: spacing.md },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  calNav: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  calRow: { flexDirection: 'row' },
  calDow: { flex: 1, textAlign: 'center', fontSize: font.tiny, fontWeight: '800', paddingVertical: 6 },
  calCell: { flex: 1, aspectRatio: 1, margin: 2, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  calFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  todayBtn: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill },
});
