// Ödev son günü: "Gelecek hafta" (bugünden 7 gün sonra) ya da takvimden seçilen gün.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, font } from '../theme';
import { tatilBilgisi } from './evrak/takvim';
import { Chip, formatDate } from './ui';
import { PlanCalendar } from './planUi';
import { addDays } from './analytics';
import { dayKey } from '../utils/helpers';

export const nextWeekDue = () => addDays(dayKey(), 7);

export default function DuePicker({ value, onChange }) {
  const [cal, setCal] = useState(false);
  const today = dayKey();
  const week = nextWeekDue();
  const custom = value !== week;
  // Son gün tatile denk geliyorsa (ara tatil, bayram) atlanmaz, belirtilir: öğretmen isterse başka gün seçer.
  const tatil = value ? tatilBilgisi(value) : null;
  return (
    <View>
      <View style={st.wrap}>
        <Chip label={`Gelecek hafta · ${formatDate(week)}`} active={!custom} onPress={() => onChange(week)} />
        <Chip label={custom ? `📅 ${formatDate(value)}` : '📅 Ayarla'} active={custom} onPress={() => setCal(true)} />
        {cal ? (
          <PlanCalendar visible legend={false} selected={value} onClose={() => setCal(false)} onPick={(k) => onChange(k < today ? today : k)} />
        ) : null}
      </View>
      {tatil ? <Text style={{ color: '#B45309', fontSize: font.small, fontWeight: '700', marginTop: spacing.xs }}>🏖️ {tatil.etiket}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
