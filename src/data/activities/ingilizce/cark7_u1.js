// Çarkıfelek · 7. sınıf · 1. Ünite: Appearance and Personality (dış görünüş ve kişilik)
// Her satır: [soru, cevap, resim (emoji), seviye (1 kolay · 2 orta · 3 zor), (isteğe bağlı) seçenekler]
// Seçenek varsa oyun kendisi puanlar (doğru cevap seçeneklerde AYNEN yazılmalı); yoksa öğretmen ✓/✗ der, cevap örnek olarak gösterilir.
// Büyük puanlı dilimlerde zor sorular gelir.
export default [
  ["Describe your hair.", "I have long / short, straight / curly, brown / black hair.", "💇", 1],
  ["What colour are your eyes?", "My eyes are brown / blue / green.", "👁️", 1],
  ["What's the opposite of 'tall'?", "short", "📏", 1, ["short", "slim", "old"]],
  ["Comparative of 'tall'?", "taller", "📈", 1, ["taller", "more tall", "tallest"]],
  ["Say 3 positive personality adjectives.", "kind, friendly, generous, honest, helpful, patient…", "😊", 1],
  ["Say 2 negative personality adjectives.", "rude, selfish, lazy, mean, bad-tempered…", "😠", 1],
  ["Which word is about appearance?", "curly", "🔍", 1, ["curly", "honest", "lazy"]],
  ["Complete: She ___ got green eyes.", "has", "👀", 1, ["has", "have", "is"]],
  ["Complete: They ___ very friendly.", "are", "🤗", 1, ["are", "is", "has"]],
  ["What's the opposite of 'hard-working'?", "lazy", "😴", 2, ["lazy", "funny", "kind"]],
  ["A person who gives things to others is …", "generous", "🎁", 2, ["generous", "selfish", "shy"]],
  ["A person who doesn't talk much with new people is …", "shy", "🙈", 2, ["shy", "talkative", "rude"]],
  ["What's the meaning of 'patient'?", "sabırlı", "⏳", 2, ["sabırlı", "hasta", "cimri"]],
  ["Comparative of 'beautiful'?", "more beautiful", "🌸", 2, ["more beautiful", "beautifuller", "most beautiful"]],
  ["Is 'middle-aged' about appearance or personality?", "appearance", "🧑", 2, ["appearance", "personality"]],
  ["Ask about personality: 'What … like?'", "What is he / she like?", "🤔", 2],
  ["Describe your best friend in 2 sentences.", "My best friend is … She/He has … hair. She/He is very …", "👫", 2],
  ["He has got a beard and grey hair. Who can he be?", "my grandfather / an old man…", "🧔", 2],
  ["Comparative of 'good'?", "better", "👍", 3, ["better", "gooder", "best"]],
  ["Superlative of 'funny'?", "the funniest", "😂", 3, ["the funniest", "the most funny", "funnier"]],
  ["Ask about appearance: your brother.", "What does your brother look like?", "❓", 3],
  ["Compare two people in the class.", "Ali is taller than Can. / Ayşe is more talkative than Zeynep.", "⚖️", 3],
  ["Describe a famous person. The class guesses!", "He/She is … He/She has … He/She is very …", "🌟", 3],
  ["Describe your teacher: appearance and personality.", "Our teacher is tall. She/He has … hair. She/He is kind and patient.", "👩‍🏫", 3],
];
