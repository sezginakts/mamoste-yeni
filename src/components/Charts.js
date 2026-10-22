import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path, Rect, Line, Polyline, Polygon, Text as SvgText } from 'react-native-svg';
import { font } from '../theme';

// ---------- DONUT (halka/pasta) ----------
// data: [{ value, color, label }]
export function DonutChart({ data, size = 180, thickness = 28, centerLabel, centerSub, colors }) {
  const arr = Array.isArray(data) ? data : [];
  const total = arr.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const segments = total > 0
    ? arr.filter((d) => d.value > 0).map((d) => {
        const frac = d.value / total;
        const seg = { ...d, dash: frac * circ, offset: offset * circ };
        offset += frac;
        return seg;
      })
    : [];

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r} stroke={colors.bgSoft} strokeWidth={thickness} fill="none" />
        {segments.map((s, i) => (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            stroke={s.color}
            strokeWidth={thickness}
            fill="none"
            strokeDasharray={`${s.dash} ${circ - s.dash}`}
            /* saat-12'den başlat: çeyrek çevre kaydır (rotation prop'u yerine matematik) */
            strokeDashoffset={circ * 0.25 - s.offset}
            strokeLinecap="butt"
          />
        ))}
      </Svg>
      {(centerLabel != null) && (
        <View style={styles.donutCenter} pointerEvents="none">
          <Text style={[styles.donutNum, { color: colors.text }]}>{centerLabel}</Text>
          {centerSub ? <Text style={[styles.donutSub, { color: colors.textMuted }]}>{centerSub}</Text> : null}
        </View>
      )}
    </View>
  );
}

// ---------- BAR (dikey çubuk) ----------
// data: [{ value, color, label }]
export function BarChart({ data, width = 320, height = 160, colors, maxValue }) {
  const pad = 24;
  const max = maxValue || Math.max(1, ...data.map((d) => d.value));
  const innerH = height - pad * 1.5;
  const gap = 12;
  const barW = (width - pad - (data.length - 1) * gap) / data.length;

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const h = (d.value / max) * innerH;
        const x = pad / 2 + i * (barW + gap);
        const y = height - pad - h;
        return (
          <G key={i}>
            <Rect x={x} y={y} width={barW} height={Math.max(2, h)} rx={6} fill={d.color} />
            <SvgText x={x + barW / 2} y={y - 6} fontSize="12" fontWeight="800" fill={colors.text} textAnchor="middle">
              {d.value}
            </SvgText>
            <SvgText x={x + barW / 2} y={height - 6} fontSize="10" fill={colors.textMuted} textAnchor="middle">
              {d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ---------- LINE/AREA (öğrenme eğrisi) ----------
// points: [{ label, count }]
export function LineChart({ points, width = 320, height = 160, color, colors }) {
  const pts = Array.isArray(points) ? points : [];
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 22;
  if (pts.length === 0) return <Svg width={width} height={height} />;
  const max = Math.max(1, ...pts.map((p) => p.count));
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const stepX = pts.length > 1 ? innerW / (pts.length - 1) : innerW;

  const coords = pts.map((p, i) => {
    const x = padL + i * stepX;
    const y = padT + innerH - (p.count / max) * innerH;
    return { x, y, ...p };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ');
  // alan dolgusu için kapalı poligon
  const areaPts = `${padL},${padT + innerH} ${polyline} ${padL + innerW},${padT + innerH}`;

  // sadece birkaç etiket göster (ilk, orta, son)
  const labelIdx = new Set([0, Math.floor(pts.length / 2), pts.length - 1]);

  return (
    <Svg width={width} height={height}>
      {/* taban çizgisi */}
      <Line x1={padL} y1={padT + innerH} x2={padL + innerW} y2={padT + innerH} stroke={colors.border} strokeWidth={1} />
      <Polygon points={areaPts} fill={color} opacity={0.15} />
      <Polyline points={polyline} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c, i) => (
        <G key={i}>
          {c.count > 0 && <Circle cx={c.x} cy={c.y} r={3.5} fill={color} />}
          {labelIdx.has(i) && (
            <SvgText x={c.x} y={height - 6} fontSize="10" fill={colors.textMuted} textAnchor="middle">
              {c.label}
            </SvgText>
          )}
        </G>
      ))}
    </Svg>
  );
}

// ---------- Yatay ilerleme satırı (kategori) ----------
export function HBar({ ratio, color, track, height = 10 }) {
  const pct = Math.max(0, Math.min(1, ratio));
  return (
    <View style={{ height, backgroundColor: track, borderRadius: height, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

const styles = StyleSheet.create({
  donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  donutNum: { fontSize: font.h1, fontWeight: '900' },
  donutSub: { fontSize: font.tiny, fontWeight: '700', marginTop: 2 },
});
