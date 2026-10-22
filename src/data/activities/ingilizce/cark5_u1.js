// Çarkıfelek · 5. sınıf · Theme 1: School Life (okuldaki kişiler, yerler, kurallar; kulüpler; ülkeler; millî bayramlar)
// Her satır: [soru, cevap, resim (emoji), seviye (1 kolay · 2 orta · 3 zor), (isteğe bağlı) seçenekler]
// Seçenek varsa oyun kendisi puanlar (doğru cevap seçeneklerde AYNEN yazılmalı); yoksa öğretmen ✓/✗ der, cevap örnek olarak gösterilir.
// Büyük puanlı dilimlerde zor sorular gelir.
export default [
  ["What's your name?", "My name is …", "🙋", 1],
  ["Greet your teacher in English.", "Good morning, teacher! / Hello, how are you?", "👋", 1],
  ["Say 3 places at school.", "library, canteen, classroom, gym, garden, science lab…", "🏫", 1],
  ["Where do you eat lunch at school?", "In the canteen.", "🍽️", 1, ["In the canteen.", "In the library.", "In the gym."]],
  ["Where can you read books?", "In the library.", "📚", 1, ["In the library.", "In the canteen.", "In the garden."]],
  ["Is it OK to use your phone in class?", "No, it isn't.", "📵", 1, ["No, it isn't.", "Yes, it is."]],
  ["Where are you from?", "I'm from Türkiye.", "🌍", 1],
  ["When is Republic Day?", "On 29 October.", "🎉", 1, ["On 29 October.", "On 23 April.", "On 19 May."]],
  ["Who is the head of a school?", "The principal.", "🧑‍💼", 2, ["The principal.", "The cook.", "The student."]],
  ["Where do you do PE?", "In the gym.", "🏀", 2, ["In the gym.", "In the library.", "In the canteen."]],
  ["Say 2 school rules.", "Don't run in the corridor. / Be quiet in the library. / Raise your hand.", "📋", 2],
  ["Complete: Don't ___ in the classroom.", "eat / run / shout", "🚫", 2],
  ["Name 3 school clubs.", "chess club, music club, drama club, art club, sports club…", "♟️", 2],
  ["Say 4 countries in English.", "Türkiye, Germany, England, Italy, France, Spain, Japan…", "🗺️", 2],
  ["Which country is Berlin in?", "Germany", "🏙️", 2, ["Germany", "Italy", "Japan"]],
  ["What do we celebrate on 23 April?", "Children's Day", "🎈", 2, ["Children's Day", "Republic Day", "Teachers' Day"]],
  ["How do you say 'Tanıştığımıza memnun oldum' in English?", "Nice to meet you.", "😊", 2, ["Nice to meet you.", "See you later.", "Good night."]],
  ["Ask your friend where he or she is from.", "Where are you from?", "❓", 2],
  ["Spell the word 'school'.", "S-C-H-O-O-L", "🔠", 2],
  ["What is the nationality of a person from Japan?", "Japanese", "🎌", 3, ["Japanese", "Japan", "Japanish"]],
  ["Introduce your friend to the class.", "This is … She/He is from … She/He is in the … club.", "🤝", 3],
  ["Which club do you want to join? Why?", "I want to join the … club because …", "🎭", 3],
  ["Describe your school in 2 sentences.", "My school is big. It has a library and a garden.", "🏫", 3],
  ["Say 3 rules for the library.", "Be quiet. / Don't eat. / Don't run. / Return the books.", "🤫", 3],
];
