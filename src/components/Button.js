import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { radius, spacing, font } from '../theme';
import { useTheme } from '../context/ThemeContext';

// Tutarlı ana buton. variant: 'primary' | 'secondary' | 'ghost' | 'danger'
export default function Button({ title, onPress, variant = 'primary', disabled, loading, style }) {
  const { colors } = useTheme();
  const VARIANTS = {
    primary: { bg: colors.primary, border: colors.primary, text: colors.onPrimary },
    secondary: { bg: colors.cardSoft, border: colors.border, text: colors.text },
    ghost: { bg: 'transparent', border: 'transparent', text: colors.textMuted },
    danger: { bg: colors.danger, border: colors.danger, text: colors.white },
    accent: { bg: colors.accent, border: colors.accent, text: colors.white },
  };
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.text, { color: v.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.4 },
  text: { fontSize: font.body, fontWeight: '800', letterSpacing: 0.3 },
});
