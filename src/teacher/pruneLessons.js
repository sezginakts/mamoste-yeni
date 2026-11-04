// Ders programındaki bir ders, silinmiş bir sınıfa aitse o hücreyi temizler.
// Sınıf silindiğinde programda "hayalet" sınıf (ör. 5-C) kalmasın: ana sayfa kartı ve
// program tablosu yalnızca gerçekten var olan sınıfları gösterir.
// Program TEKTİR (bütün dersler): sınıf, BÜTÜN derslerin sınıflarında aranır. Yalnız aktif dersin sınıflarına
// (t.classes) bakmak, ders değiştirince öbür dersin hücrelerini "sınıfı silinmiş" sanıp siliyordu.
// Saklanan hücreler (listeden çıkarılmış dersler) de aynı kuralla temizlenir (DeskContext.pruneClasses).
import { useEffect } from 'react';
import { useTeacher } from './TeacherContext';
import { useDesk } from './DeskContext';

export function usePruneStaleLessons() {
  const t = useTeacher();
  const desk = useDesk();

  useEffect(() => {
    if (!t.loaded || !desk.loaded || !Array.isArray(t.allClasses)) return;
    desk.pruneClasses(new Set(t.allClasses.map((c) => c.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.loaded, t.allClasses, desk.loaded]);
}
