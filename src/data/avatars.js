// Profil avatarları: yalnızca emoji (fotoğraf yok; çocuk verisi tutulmaz). Sunucuya emoji olarak gider (≤16 karakter).
export const STUDENT_AVATARS = [
  '🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🐨', '🐰', '🐻', '🐶', '🐱', '🦉',
  '🐧', '🐢', '🐬', '🦄', '🐲', '🦖', '🐙', '🦋', '🐝', '🐞', '🦜', '🐺',
  '🚀', '⚽', '🏀', '🎸', '🎨', '🎮', '📚', '🌟', '🌈', '⚡', '🔥', '🍀',
];

export const TEACHER_AVATARS = [
  '🧑‍🏫', '👩‍🏫', '👨‍🏫', '🦉', '📚', '🌍', '🧪', '🧮', '🎨', '🎵', '⚽', '💻',
  '📐', '🔭', '🗺️', '✏️', '🌱', '🌟', '🦊', '🐼', '🐢', '🦁', '☕', '🍎',
];

// Seviye: seviye L için gereken toplam XP = 50·L·(L−1)  (2 → 100, 3 → 300, 4 → 600, 5 → 1000 …)
export function levelOf(xp) {
  let L = 1;
  while (50 * (L + 1) * L <= xp) L += 1;
  const from = 50 * L * (L - 1);
  const to = 50 * (L + 1) * L;
  return { level: L, from, to, ratio: to > from ? (xp - from) / (to - from) : 0 };
}
