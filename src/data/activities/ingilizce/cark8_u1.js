// Çarkıfelek · 8. sınıf · 1. Ünite: Friendship (davet kabul/ret, özür dileme, öneri, arkadaşlık)
// Her satır: [soru, cevap, resim (emoji), seviye (1 kolay · 2 orta · 3 zor), (isteğe bağlı) seçenekler]
// Seçenek varsa oyun kendisi puanlar (doğru cevap seçeneklerde AYNEN yazılmalı); yoksa öğretmen ✓/✗ der, cevap örnek olarak gösterilir.
// Büyük puanlı dilimlerde zor sorular gelir.
export default [
  ["Invite your friend to your party.", "Would you like to come to my party? / Do you want to come to my party?", "🎉", 1],
  ["Accept an invitation.", "Sure, I'd love to! / That sounds great!", "👍", 1],
  ["Apologize for being late.", "I'm sorry for being late. / Sorry, I'm late.", "⏰", 1],
  ["Which one is ACCEPTING?", "Sure, why not?", "✅", 1, ["Sure, why not?", "I'm afraid I can't.", "Sorry, I'm busy."]],
  ["Complete: Thanks ___ inviting me.", "for", "🙏", 1, ["for", "to", "of"]],
  ["Make a suggestion with 'Let's …'", "Let's play football! / Let's watch a film.", "⚽", 1],
  ["Your friend says 'I'm sorry.' Answer.", "That's OK. / No problem. / Never mind.", "🤝", 1],
  ["Complete: I have ___ study for the exam.", "to", "📖", 1, ["to", "for", "at"]],
  ["What do friends do together? Say 3 activities.", "play games, go to the cinema, study together, chat…", "🎮", 1],
  ["Refuse an invitation politely and give a reason.", "Sorry, I can't. I have to study for my exam.", "🙅", 2],
  ["Which one is REFUSING?", "I'd love to, but I can't.", "❌", 2, ["I'd love to, but I can't.", "That sounds fun!", "Of course!"]],
  ["Complete: I'm sorry ___ breaking your pen.", "for", "✏️", 2, ["for", "to", "about"]],
  ["Complete: Would you like ___ to the cinema?", "to go", "🎬", 2, ["to go", "going", "go"]],
  ["Make a suggestion with 'How about …?'", "How about going to the park?", "🌳", 2],
  ["What's the meaning of 'trustworthy'?", "güvenilir", "🔐", 2, ["güvenilir", "kıskanç", "bencil"]],
  ["What does 'I'm afraid I can't' mean?", "Maalesef yapamam.", "😕", 2, ["Maalesef yapamam.", "Korkuyorum.", "Gelebilirim."]],
  ["Which one is NOT polite?", "No. I don't want to.", "🙊", 2, ["No. I don't want to.", "Sorry, I can't.", "Maybe next time."]],
  ["What makes a good friend? Say 2 things.", "A good friend is honest, supportive, keeps secrets…", "💙", 2],
  ["Your friend is sad. What do you say?", "What's wrong? / Don't worry. / Can I help you?", "😢", 2],
  ["Give an excuse: you can't go to the concert.", "Sorry, I have to help my mother. / I have a lot of homework.", "🎵", 2],
  ["Describe your best friend's personality.", "My best friend is … She/He always …", "👫", 3],
  ["Say a sentence with 'never' about friendship.", "A good friend never lies. / A true friend never leaves you alone.", "🚫", 3],
  ["Phone call: invite a friend to a picnic and decide the day and time.", "Hi …! Would you like to come to a picnic on Sunday? Let's meet at 10.", "📞", 3],
  ["Act it out: apologize and offer help.", "I'm really sorry. Let me help you.", "🎭", 3],
];
