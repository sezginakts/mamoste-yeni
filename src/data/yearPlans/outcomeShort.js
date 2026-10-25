// İngilizce 2, 3, 5 ve 6. sınıflarda MEB TYMM yıllık planındaki kazanım metni tema başına
// ~23 kazanımı tek blokta veriyor (6-8 bin karakter). Ana sayfa kartında bu metnin tamamı
// basılınca ekran doluyordu. Bu tablo, yalnızca ana sayfa kartı için 1-2 cümlelik İngilizce
// özet tutar (kaynak metnin üslubuyla: "Pupils/Students can ..."); tam metin "Dersin planı"
// ekranında aynen görünmeye devam eder.
// Diğer sınıflar (4, 7, 8) zaten kısa kazanım listesi kullandığı için burada yer almaz.

const SHORT = {
  2: {
    'THEME 1: SCHOOL LIFE':
      'Pupils can greet and introduce themselves, and recognise people and places at school, the days of the week and national days in very simple terms.',
    'THEME 2: CLASSROOM LIFE':
      'Pupils can understand and follow classroom instructions, and name classroom objects and colours.',
    'THEME 3: PERSONAL LIFE':
      'Pupils can name parts of the body, physical features and clothes, and say their age, birthday and the weather in very simple terms.',
    'THEME 4: FAMILY LIFE':
      'Pupils can introduce family members and describe their appearance and physical features.',
    'THEME 5: HOMES & HOUSES & NEIGHBOURHOODS':
      'Pupils can name the parts, rooms and furniture of a house and the pets at home.',
    'THEME 6: LIFE IN THE CITY & THE WORLD':
      'Pupils can name basic food types, food items and meals.',
  },
  3: {
    'THEME 1: SCHOOL LIFE':
      'Pupils can greet and introduce themselves, and talk about people and places at school, months, ages, birthdays and national days in simple terms.',
    'THEME 2: CLASSROOM LIFE':
      'Pupils can follow classroom instructions and name classroom objects, school subjects and seasons.',
    'THEME 3: PERSONAL LIFE':
      'Pupils can describe parts of the body, physical features and character, and choose clothes according to weather conditions.',
    'THEME 4: FAMILY LIFE':
      'Pupils can talk about family members’ ages, daily routines and chores, and their hobbies and abilities.',
    'THEME 5: HOMES & HOUSES & THE NEIGHBOURHOOD':
      'Pupils can talk about life in the countryside, farmhouses and farm animals, and activities and chores on a farm.',
    'THEME 6: LIFE IN THE CITY & THE WORLD':
      'Pupils can name food items and meals and order food when eating out.',
  },
  5: {
    'THEME 1: SCHOOL LIFE':
      'Students can talk about people, places and rules at school, school clubs, countries and national days.',
    'THEME 2: CLASSROOM LIFE':
      'Students can talk about classroom rules and language, school subjects, timetables, times and days of the week.',
    'THEME 3: PERSONAL LIFE':
      'Students can describe body parts and physical features, clothes, and daily routines and activities.',
    'THEME 4: FAMILY LIFE':
      'Students can talk about family members’ routines, hobbies and activities.',
    'THEME 5: LIFE IN THE NEIGHBOURHOOD AND CITY':
      'Students can talk about places for recreation and attractions in the neighbourhood and city, and different types of houses.',
    'THEME 6: LIFE IN THE WORLD':
      'Students can talk about basic food types, order in a restaurant and describe food events in the city.',
    'THEME 7: LIFE IN NATURE':
      'Students can talk about types of animals in nature, wild animals and their habitats.',
    'THEME 8: LIFE IN THE UNIVERSE AND FUTURE':
      'Students can talk about planet Earth, holidays, holiday places and activities, and holiday plans.',
  },
  6: {
    'THEME 1: SCHOOL LIFE':
      'Students can talk about roles and responsibilities at school, school routines and national days.',
    'THEME 2: CLASSROOM LIFE':
      'Students can talk about daily and study routines and learning activities in the classroom, and use cardinal numbers 100-500 and ordinal numbers 1-50.',
    'THEME 3: PERSONAL LIFE':
      'Students can describe body parts, physical appearance and clothes, and personality and character.',
    'THEME 4: FAMILY LIFE':
      'Students can talk about family members’ jobs, workplaces and job routines, and different types of family homes.',
    'THEME 5: LIFE IN THE NEIGHBOURHOOD AND CITY':
      'Students can talk about festivals and events (sports, music, arts) in the neighbourhood and city, and transportation.',
    'THEME 6: LIFE IN THE WORLD AND CULTURE':
      'Students can talk about countries, nationalities and languages, and food types and events from different parts of the world.',
    'THEME 7: LIFE IN NATURE':
      'Students can talk about activities in nature, and environmental problems in the world and their solutions.',
    'THEME 8: LIFE IN THE UNIVERSE AND FUTURE':
      'Students can talk about planets and the Earth as a planet, and life on Earth in the future.',
  },
};

// "THEME 5: ..." karşılaştırması için: büyük harf, tek boşluk, kırpılmış.
function keyOf(s) {
  return String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();
}

// Haftanın kazanım metni kısaltılmalı mı? Evet ise 1-2 cümlelik metni, değilse null döner.
// Yalnızca 2, 3, 5, 6. sınıf ve tanıdık tema adlarında devreye girer; öğretmenin kendi
// yüklediği planlarda eşleşme bulunmazsa tam metin gösterilir.
export function shortOutcome(grade, week) {
  if (!week || week.holiday) return null;
  const table = SHORT[grade];
  if (!table) return null;
  return table[keyOf(week.unit)] || null;
}

export const hasShortOutcome = (grade) => Boolean(SHORT[grade]);
