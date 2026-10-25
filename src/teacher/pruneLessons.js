// Ders programındaki bir ders, silinmiş bir sınıfa aitse o hücreyi temizler.
// Sınıf silindiğinde programda "hayalet" sınıf (ör. 5-C) kalmasın: ana sayfa kartı ve
// program tablosu yalnızca gerçekten var olan sınıfları gösterir.
import { useEffect } from 'react';
import { useTeacher } from './TeacherContext';
import { useDesk } from './DeskContext';

export function usePruneStaleLessons() {
  const t = useTeacher();
  const desk = useDesk();

  useEffect(() => {
    if (!t.loaded || !desk.loaded) return;
    Object.entries(desk.lessons).forEach(([key, l]) => {
      if (!l || !l.classId) return; // sınıfsız (düzey bazlı) derslere dokunma
      if (t.classes[l.classId]) return; // sınıf duruyor
      const [day, period] = key.split('-').map(Number);
      if (!day || !period) return;
      desk.setLesson(day, period, null);
    });
  }, [t.loaded, t.classes, desk.loaded, desk.lessons]);
}
