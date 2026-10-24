// Ödev son günü: "Gelecek hafta" (bugünden 7 gün sonra) ya da takvimden seçilen gün.
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../theme';
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
  return (
    <View style={st.wrap}>
      <Chip label={`Gelecek hafta · ${formatDate(week)}`} active={!custom} onPress={() => onChange(week)} />
      <Chip label={custom ? `📅 ${formatDate(value)}` : '📅 Ayarla'} active={custom} onPress={() => setCal(true)} />
      {cal ? (
        <PlanCalendar visible legend={false} selected={value} onClose={() => setCal(false)} onPick={(k) => onChange(k < today ? today : k)} />
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
