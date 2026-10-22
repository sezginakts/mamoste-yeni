// AKILLI TAHTA — TÜRKİYE HARİTASI (Sosyal Bilgiler). Uygulama temasıyla (useTheme) çizilir.
// Kategori seç (önce İller; sonra dağlar, akarsular, göller, ovalar, platolar, madenler, ulaşım) → üç kip:
//   🔎 Keşfet : kategorideki yerler haritada; dokununca bilgi kartı. İllerde ad/plaka etiketi açılabilir.
//   ❓ Hangisi?: harita bir yeri parlatır, öğrenci adını seçer.
//   📍 Bul    : adı verilen yere öğrenci haritada dokunur; uzaklık (km) ve doğru yer gösterilir.
//               İllerde hata payı yok: dokunulan nokta o ilin içinde olmalı.
// Zorluk sınıf düzeyinden gelir (data/mapFeatures.js → MAP_LEVELS): hangi yerler, kip, seçenek sayısı, hata payı.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect, Circle, G, Line, Text as SvgText, Polyline } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { AMBER, GRADE_CYCLE } from '../../theme';
import { useTeacher } from '../../teacher/TeacherContext';
import BoardClassPanel, { appBoardPalette } from '../../components/BoardClassPanel';
import { MAP_W, MAP_H, PROVINCES, NEIGHBORS, LAKE_PATHS, RIVER_PATHS } from '../../data/turkeyMap';
import { CATEGORIES, CATEGORY_BY_ID, FEATURES, MAP_LEVELS, MAP_GRADES, featuresFor, shapesOf, distanceKm, anchorOf, project, provinceAt } from '../../data/mapFeatures';
import { gradeFromClassName } from '../../data/timelines';
import { shuffle } from '../../utils/helpers';

// Harita renkleri: aydınlık temada açık deniz, karanlıkta koyu deniz.
const MAP_COLORS = {
  light: { sea: '#BFDBFE', land: '#F6EDD6', border: '#C9B88F', neighbor: '#E2E8F0', neighborEdge: '#CBD5E1', water: '#3B82F6', dim: '#E9E1CC' },
  dark: { sea: '#0F2D4A', land: '#E9DFC4', border: '#BFAF8A', neighbor: '#2A3646', neighborEdge: '#3B4A5E', water: '#3B8EEA', dim: '#CFC6AE' },
};
const HI = AMBER; // vurgu: temanın kehribarı
const MODES = [
  { id: 'explore', label: '🔎 Keşfet' },
  { id: 'which', label: '❓ Hangisi?' },
  { id: 'find', label: '📍 Bul' },
];
const LABELS = [
  { id: 'name', label: 'Ad' },
  { id: 'plate', label: 'Plaka' },
  { id: 'none', label: 'Etiketsiz' },
];
// Göl noktaları (veride poligonu olmayan küçük göller) her zaman çizilir; haritanın parçası.
const SMALL_LAKES = FEATURES.filter((f) => f.cat === 'gol' && f.kind === 'point');
// İllerde sınır çizgisinin sadeleştirilmesine karşı küçük pay (km).
const PROVINCE_TOL_KM = 3;

export default function MapGameScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { colors, shadow, mode: themeMode } = useTheme();
  const pal = useMemo(() => appBoardPalette(colors), [colors]);
  const M = MAP_COLORS[themeMode] || MAP_COLORS.light;
  const wide = width >= 820;
  const t = useTeacher();
  const [classId, setClassId] = useState(route.params?.classId || (t.classes[0] && t.classes[0].id) || null);
  const cls = classId ? t.getClass(classId) : null;

  const classGrade = gradeFromClassName(cls && cls.name);
  // Etkinlikler listesinden gelince düzey oradan; yoksa sınıf adından.
  const [grade, setGrade] = useState(() => Math.min(7, route.params?.grade || classGrade || 5));
  const firstClass = useRef(true);
  const level = MAP_LEVELS[grade];
  const [cat, setCat] = useState('il'); // Önce iller öğrenilsin
  const [mode, setMode] = useState('explore');
  const [labelMode, setLabelMode] = useState('name');
  const [round, setRound] = useState(null); // { queue: [id], i, score }
  const [answer, setAnswer] = useState(null); // { tap?, km?, choice?, ok, tapped? }
  const [options, setOptions] = useState([]);
  const [info, setInfo] = useState(null); // Keşfet: seçili yer id

  useEffect(() => {
    if (firstClass.current && route.params?.grade) return void (firstClass.current = false);
    firstClass.current = false;
    if (classGrade) setGrade(Math.min(7, classGrade));
  }, [classId]);

  const pool = useMemo(() => featuresFor(cat, level.tier), [cat, grade]);
  const poolIds = useMemo(() => new Set(pool.map((f) => f.id)), [pool]);
  const category = CATEGORY_BY_ID[cat];
  const isIl = cat === 'il';

  const newRound = () => {
    const queue = shuffle(pool.map((f) => f.id)).slice(0, Math.min(level.questions, pool.length));
    setRound({ queue, i: 0, score: 0 });
    setAnswer(null);
    setInfo(null);
  };
  useEffect(() => {
    if (mode === 'explore') {
      setRound(null);
      setAnswer(null);
      setInfo(null);
    } else newRound();
  }, [cat, grade, mode]);

  const target = round && round.i < round.queue.length ? FEATURES.find((f) => f.id === round.queue[round.i]) : null;
  const finished = round && round.i >= round.queue.length;

  // Hangisi? seçenekleri: aynı kategoriden. 7. düzeyde çeldiriciler yakındaki yerlerden (komşu iller vb.);
  // düzeyde yeterli yer yoksa üst düzeyden çeldirici alınır.
  useEffect(() => {
    if (!target || mode !== 'which') return setOptions([]);
    let same = shuffle(featuresFor(cat, 3).filter((f) => f.id !== target.id));
    if (level.near) {
      const [tx, ty] = anchorOf(target);
      same = same
        .map((f) => {
          const [x, y] = anchorOf(f);
          return { f, d: Math.hypot(x - tx, y - ty) };
        })
        .sort((a, b) => a.d - b.d)
        .slice(0, 6)
        .map((x) => x.f);
      same = shuffle(same);
    } else {
      same.sort((a, b) => (a.tier <= level.tier ? 0 : 1) - (b.tier <= level.tier ? 0 : 1));
    }
    setOptions(shuffle([target, ...same.slice(0, level.options - 1)]));
  }, [target && target.id, mode]);

  const next = () => {
    setRound((r) => ({ ...r, i: r.i + 1 }));
    setAnswer(null);
  };
  const choose = (f) => {
    if (answer) return;
    const ok = f.id === target.id;
    setAnswer({ choice: f.id, ok });
    if (ok) setRound((r) => ({ ...r, score: r.score + 1 }));
  };

  // ---- Harita boyutu: kalan alana sığdır
  const sideW = wide ? Math.min(340, width * 0.26) : 0;
  const availW = width - sideW - (wide ? 48 : 32) - 28;
  const availH = wide ? height - insets.top - insets.bottom - 330 : availW * (MAP_H / MAP_W);
  const scale = Math.max(0.2, Math.min(availW / MAP_W, Math.max(availH, 260) / MAP_H));
  const mapW = MAP_W * scale;
  const mapH = MAP_H * scale;
  const u = (px) => px / scale; // ekran pikselini harita birimine çevir

  const onMapPress = (e) => {
    // Telefonda locationX/Y, tarayıcıda (tahta) fare olayının offsetX/Y'si gelir.
    const ne = e.nativeEvent;
    const lx = Number.isFinite(ne.locationX) ? ne.locationX : ne.offsetX;
    const ly = Number.isFinite(ne.locationY) ? ne.locationY : ne.offsetY;
    if (!Number.isFinite(lx) || !Number.isFinite(ly)) return;
    const p = [lx / scale, ly / scale];
    if (mode === 'explore') {
      if (isIl) {
        const name = provinceAt(p);
        const f = name && pool.find((x) => x.name === name);
        setInfo(f ? f.id : null);
        return;
      }
      let best = null;
      for (const f of pool) {
        const km = distanceKm(f, p);
        if (!best || km < best.km) best = { f, km };
      }
      setInfo(best && best.km < 60 ? best.f.id : null);
      return;
    }
    if (mode !== 'find' || !target || answer) return;
    const km = Math.round(distanceKm(target, p));
    const tol = target.kind === 'province' ? PROVINCE_TOL_KM : level.tolKm * (target.kind === 'range' ? 1.3 : 1);
    const ok = km <= tol;
    setAnswer({ tap: p, km, ok, tapped: provinceAt(p) });
    if (ok) setRound((r) => ({ ...r, score: r.score + 1 }));
  };

  // ---- Çizim
  const shapeEls = (f, { color, width: w = 4, fill, key, big, opacity = 1 }) =>
    shapesOf(f).map(({ pts, closed }, i) =>
      pts.length === 1 ? (
        <G key={`${key}-${i}`}>
          {big ? <Circle cx={pts[0][0]} cy={pts[0][1]} r={u(26)} fill={color} opacity={0.3} /> : null}
          <Circle cx={pts[0][0]} cy={pts[0][1]} r={u(big ? 13 : 9)} fill={fill || color} stroke="#fff" strokeWidth={u(big ? 3 : 2)} />
        </G>
      ) : closed ? (
        <Path key={`${key}-${i}`} d={'M' + pts.map((q) => q.join(' ')).join('L') + 'Z'} fill={fill || color} fillOpacity={opacity} stroke={color} strokeWidth={u(w)} />
      ) : (
        <Polyline key={`${key}-${i}`} points={pts.map((q) => q.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={u(w)} strokeLinecap="round" strokeLinejoin="round" />
      )
    );
  const label = (f, color = '#111', text = f.name, size = wide ? 15 : 12, center = false) => {
    const [x, y] = anchorOf(f);
    const fs = u(size);
    return (
      <SvgText
        key={`l-${f.id}`}
        x={center ? x : x + u(12)}
        y={y + fs * 0.35}
        fontSize={fs}
        fontWeight="bold"
        textAnchor={center ? 'middle' : 'start'}
        fill={color}
        stroke="#fff"
        strokeWidth={u(3)}
        paintOrder="stroke"
      >
        {text}
      </SvgText>
    );
  };

  const showAll = mode === 'explore';
  const revealed = !!answer || mode === 'which';
  const highlight = target && revealed ? target : mode === 'explore' && info ? FEATURES.find((f) => f.id === info) : null;
  const ilFont = wide ? 11 : 8;

  const MapView = (
    <View style={{ width: mapW, height: mapH, alignSelf: 'center', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
      <Svg width={mapW} height={mapH} viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
        <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill={M.sea} />
        {NEIGHBORS.map((d, i) => (
          <Path key={`n${i}`} d={d} fill={M.neighbor} stroke={M.neighborEdge} strokeWidth={u(1)} />
        ))}
        <G>
          {PROVINCES.map((p) => (
            <Path
              key={p.name}
              d={p.d}
              fill={isIl && !poolIds.has('il-' + p.name) ? M.dim : M.land}
              stroke={isIl ? '#9C8A5F' : M.border}
              strokeWidth={u(isIl ? 1.4 : 0.8)}
            />
          ))}
        </G>
        {Object.entries(LAKE_PATHS).map(([id, d]) => (
          <Path key={`lk-${id}`} d={d} fill={M.water} stroke="#2563EB" strokeWidth={u(1)} />
        ))}
        {(isIl ? [] : SMALL_LAKES).map((f) => {
          const [x, y] = project(f.at);
          return <Circle key={`sl-${f.id}`} cx={x} cy={y} r={u(5)} fill={M.water} stroke="#2563EB" strokeWidth={u(1)} />;
        })}
        {Object.entries(RIVER_PATHS).map(([id, d]) => (
          <Path key={`rv-${id}`} d={d} fill="none" stroke={M.water} strokeWidth={u(isIl ? 1.4 : 2.2)} opacity={isIl ? 0.6 : 1} strokeLinecap="round" strokeLinejoin="round" />
        ))}

        {/* Keşfet: seçili il vurgusu + il etiketleri / kategorinin tüm yerleri */}
        {showAll && isIl ? (
          <G>
            {highlight ? shapeEls(highlight, { color: HI, width: 3, fill: HI, opacity: 0.55, key: 'hi' }) : null}
            {labelMode !== 'none'
              ? pool.map((f) =>
                  label(f, f.id === info ? '#7C2D12' : '#1F2937', labelMode === 'plate' ? String(f.plate).padStart(2, '0') : f.name, labelMode === 'plate' ? ilFont + 3 : ilFont, true)
                )
              : null}
          </G>
        ) : null}
        {showAll && !isIl
          ? pool.map((f) => (
              <G key={`e-${f.id}`}>
                {shapeEls(f, { color: f.id === info ? HI : category.color, width: f.kind === 'range' ? 9 : 5, fill: f.kind === 'lake' ? 'none' : undefined, key: `e-${f.id}` })}
                {label(f, f.id === info ? '#92400E' : '#111')}
              </G>
            ))
          : null}

        {/* Soru / cevap vurgusu */}
        {highlight && !showAll ? (
          <G>
            {shapeEls(highlight, {
              color: HI,
              width: highlight.kind === 'range' ? 12 : highlight.kind === 'province' ? 3 : 7,
              fill: highlight.kind === 'lake' ? HI + '88' : HI,
              opacity: highlight.kind === 'province' ? 0.75 : 1,
              key: 'hi',
              big: true,
            })}
            {answer ? label(highlight, '#7C2D12', highlight.name, wide ? 15 : 12, highlight.kind === 'province') : null}
          </G>
        ) : null}

        {/* Bul: öğrencinin dokunduğu yer */}
        {answer && answer.tap ? (
          <G>
            {!answer.ok ? (() => {
              const near = nearestPoint(target, answer.tap);
              return <Line x1={answer.tap[0]} y1={answer.tap[1]} x2={near[0]} y2={near[1]} stroke="#DC2626" strokeWidth={u(3)} strokeDasharray={`${u(8)},${u(6)}`} />;
            })() : null}
            <Circle cx={answer.tap[0]} cy={answer.tap[1]} r={u(11)} fill={answer.ok ? colors.primary : colors.danger} stroke="#fff" strokeWidth={u(3)} />
          </G>
        ) : null}
      </Svg>
      <Pressable style={StyleSheet.absoluteFill} onPress={onMapPress} accessibilityLabel="Türkiye haritası" />
    </View>
  );

  const infoF = info ? FEATURES.find((f) => f.id === info) : null;

  const Chip = ({ on, label: text, onPress, color = colors.accent }) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!on }} style={[st.chip, { borderColor: on ? color : colors.border, backgroundColor: on ? color + '22' : colors.card }]}>
      <Text style={{ color: on ? color : colors.text, fontWeight: '800' }}>{text}</Text>
    </Pressable>
  );
  const Btn = ({ label: text, onPress, color = colors.card, textColor = colors.text, flex, big }) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [st.btn, color === colors.card && [shadow, { borderWidth: 1, borderColor: colors.border }], { backgroundColor: color, flex: flex ? 1 : undefined, minHeight: big ? 58 : 46 }, pressed && { opacity: 0.8 }]}
    >
      <Text style={{ color: textColor, fontWeight: '900', fontSize: big ? 19 : 16, textAlign: 'center' }}>{text}</Text>
    </Pressable>
  );

  const feedback = () => {
    if (!answer) return null;
    if (!answer.tap) return answer.ok ? '✅ Doğru! ' : `❌ Doğrusu: ${target.name}. `;
    if (target.kind === 'province') return answer.ok ? '✅ Doğru! ' : `❌ ${answer.tapped ? `Sen ${answer.tapped} iline dokundun.` : 'İl dışına dokundun.'} `;
    const where = answer.tapped ? ` (${answer.tapped})` : '';
    return answer.ok ? `✅ Doğru! ${answer.km} km${where}. ` : `❌ ${answer.km} km uzakta${where}. `;
  };

  const Prompt = () => {
    if (mode === 'explore') {
      return (
        <View style={[st.panel, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[st.promptT, { color: colors.text, fontSize: 20 }]}>
            {infoF ? `${category.emoji} ${infoF.name}${infoF.plate ? ` · ${String(infoF.plate).padStart(2, '0')}` : ''}` : `${category.emoji} ${category.name}: bir yere dokun`}
          </Text>
          {infoF ? (
            <Text style={[st.infoT, { color: colors.text }]}>{infoF.info}</Text>
          ) : (
            <Text style={[st.infoT, { color: colors.textMuted }]}>
              {isIl ? `${pool.length} il bu düzeyde öğreniliyor (diğerleri soluk). İlleri öğrendikten sonra “Hangisi?” ve “Bul” ile oynayın.` : `${pool.length} yer gösteriliyor. Oyuna geçmek için “Hangisi?” ya da “Bul”u seç.`}
            </Text>
          )}
        </View>
      );
    }
    if (finished) {
      return (
        <View style={[st.panel, shadow, { backgroundColor: round.score === round.queue.length ? colors.successSoft : colors.card, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}>
          <Text style={{ fontSize: 30 }}>{round.score === round.queue.length ? '🎉' : '🏁'}</Text>
          <Text style={[st.promptT, { flex: 1, color: colors.text }]}>{round.score}/{round.queue.length} doğru</Text>
          <Btn label="🔀 Yeni tur" big color={colors.primary} textColor={colors.onPrimary} onPress={newRound} />
        </View>
      );
    }
    if (!target) return null;
    return (
      <View style={[st.panel, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={[st.promptT, { flex: 1, color: colors.text }]}>
            {mode === 'find' ? `📍 Haritada bul: ${target.name}` : '❓ Haritada parlayan yer hangisi?'}
          </Text>
          <View style={[st.pill, { backgroundColor: colors.accent + '1F' }]}>
            <Text style={{ color: colors.accent, fontWeight: '900' }}>
              {round.i + 1}/{round.queue.length} · ✅ {round.score}
            </Text>
          </View>
        </View>
        {mode === 'which' ? (
          <View style={st.row}>
            {options.map((f) => {
              const isAns = answer && f.id === target.id;
              const isWrong = answer && answer.choice === f.id && !answer.ok;
              return <Btn key={f.id} label={f.name} flex color={isAns ? colors.primary : isWrong ? colors.danger : colors.card} textColor={isAns ? colors.onPrimary : isWrong ? '#fff' : colors.text} onPress={() => choose(f)} />;
            })}
          </View>
        ) : null}
        {answer ? (
          <View style={[st.row, { alignItems: 'center' }]}>
            <Text style={[st.infoT, { flex: 1, minWidth: 200, color: colors.text }]}>
              <Text style={{ fontWeight: '900', color: answer.ok ? colors.primary : colors.danger }}>{feedback()}</Text>
              {target.info}
            </Text>
            <Btn label="Sonraki ▶" big color={colors.accent} textColor="#fff" onPress={next} />
          </View>
        ) : mode === 'find' ? (
          <Text style={[st.infoT, { color: colors.textMuted }]}>{target.kind === 'province' ? 'İlin sınırları içine dokun.' : `Hata payı: ${level.tolKm} km`}</Text>
        ) : null}
      </View>
    );
  };

  const teamHint = answer && answer.ok ? 'Doğru cevap — puanı sırası olan takıma ekle.' : null;

  const Main = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: wide ? 24 : 16, gap: 14 }}>
      <View style={[st.panel, shadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[st.row, { alignItems: 'center' }]}>
          <Text style={[st.h, { color: colors.textMuted }]}>SINIF DÜZEYİ</Text>
          {MAP_GRADES.map((g) => (
            <Chip key={g} on={g === grade} color={GRADE_CYCLE[(g - 5 + 40) % 4]} label={`${g}. sınıf`} onPress={() => setGrade(g)} />
          ))}
          <Text style={{ color: colors.textMuted, fontWeight: '700' }}>
            {level.label} · {level.desc}
          </Text>
        </View>
        {classGrade === 8 ? <Text style={{ color: colors.warning, fontWeight: '700' }}>8. sınıf programında (İnkılap Tarihi) Türkiye coğrafyası yok; 7. sınıf düzeyi tekrar olarak açıldı.</Text> : null}
        <View style={[st.row, { alignItems: 'center' }]}>
          <Text style={[st.h, { color: colors.textMuted }]}>KATEGORİ</Text>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} on={c.id === cat} color={c.color} label={`${c.emoji} ${c.name} (${featuresFor(c.id, level.tier).length})`} onPress={() => setCat(c.id)} />
          ))}
        </View>
        {!isIl ? <Text style={{ color: colors.textMuted, fontSize: 13 }}>💡 Bu oyunlardan önce “İller” ile illerin yerini öğrenmek işi kolaylaştırır.</Text> : null}
        <View style={[st.row, { alignItems: 'center' }]}>
          <Text style={[st.h, { color: colors.textMuted }]}>KİP</Text>
          {MODES.map((m) => (
            <Chip key={m.id} on={m.id === mode} label={m.label} onPress={() => setMode(m.id)} />
          ))}
          {isIl && mode === 'explore' ? (
            <>
              <Text style={[st.h, { color: colors.textMuted, marginLeft: 8 }]}>ETİKET</Text>
              {LABELS.map((l) => (
                <Chip key={l.id} on={l.id === labelMode} color={colors.primary} label={l.label} onPress={() => setLabelMode(l.id)} />
              ))}
            </>
          ) : null}
          {cat === 'dag' ? <Text style={{ color: colors.textMuted, fontSize: 13 }}>Dağ sıraları şematik çizilmiştir.</Text> : null}
        </View>
      </View>
      <Prompt />
      <View style={[st.panel, shadow, { backgroundColor: colors.card, borderColor: colors.border, padding: 14 }]}>{MapView}</View>
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
          <Text style={st.heroT}>🗺️ Türkiye Haritası</Text>
          <Text style={st.heroS} numberOfLines={1}>
            {cls ? `${cls.name} · ` : ''}
            {grade}. sınıf · {category.emoji} {category.name}
          </Text>
        </View>
        <Pressable onPress={() => navigation.replace('Timeline', { classId, grade })} hitSlop={8} style={st.heroPill}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>🕰️ Zaman şeridi</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column' }}>
        {Main}
        {wide ? <BoardClassPanel pal={pal} classId={classId} onClassChange={setClassId} style={{ width: sideW, flexGrow: 0, flexShrink: 0 }} teamHint={teamHint} /> : null}
      </View>
    </View>
  );
}

// Yanlış dokunuşta çizgi çekmek için yerin en yakın noktası.
function nearestPoint(f, p) {
  let best = null;
  for (const { pts, closed } of shapesOf(f)) {
    const segs = pts.length === 1 ? [[pts[0], pts[0]]] : pts.slice(1).map((q, i) => [pts[i], q]);
    if (closed && pts.length > 2) segs.push([pts[pts.length - 1], pts[0]]);
    for (const [a, b] of segs) {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy;
      const tt = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
      const q = [a[0] + tt * dx, a[1] + tt * dy];
      const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (!best || d < best.d) best = { q, d };
    }
  }
  return best ? best.q : anchorOf(f);
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
  promptT: { fontWeight: '900', fontSize: 22 },
  infoT: { fontSize: 17, lineHeight: 24 },
});
