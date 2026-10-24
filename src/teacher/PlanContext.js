// Öğretmenin yıllık planları — SADECE bu cihazda, her branşın ayrı (utils/branchStore). Her plan: { id, grade (5, 6, 7…), name, file, importedAt, weeks: [...] }.
// Branşın MEB çerçeve planları (data/yearPlans) hazır gelir: { builtin: true }. Öğretmen o düzeye kendi planını
// yüklerse MEB planı gizlenir; kendi planını silerse MEB planı geri gelir.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { shortId } from '../utils/codec';
import { getBranchItem, setBranchItem } from '../utils/branchStore';
import { useRole } from '../context/RoleContext';
import { mebPlans, MEB_PLAN_YEAR } from '../data/yearPlans';

const KEY = '@ingapp/teacher/v1/plans';
const Ctx = createContext(null);

export function PlanProvider({ children }) {
  const [plans, setPlans] = useState([]); // öğretmenin yüklediği planlar
  const { branchId, branch } = useRole();
  const [loadedFor, setLoadedFor] = useState(null); // hangi branşın planları yüklü
  const loaded = !branchId || loadedFor === branchId;

  useEffect(() => {
    if (!branchId) return undefined;
    let live = true;
    (async () => {
      let list = [];
      try {
        const raw = await getBranchItem(KEY, branchId);
        if (raw) list = JSON.parse(raw);
      } catch (e) {
        console.warn('yıllık plan okunamadı', e);
      }
      if (!live) return;
      setPlans(list);
      setLoadedFor(branchId);
    })();
    return () => {
      live = false;
    };
  }, [branchId]);

  const save = (next) => {
    setPlans(next);
    setBranchItem(KEY, branchId, JSON.stringify(next)).catch((e) => console.warn('yıllık plan kaydedilemedi', e));
  };

  // Branşın MEB planları; öğretmenin yüklediği bir düzey varsa o düzeyinki alınmaz.
  const builtin = useMemo(() => {
    if (!branchId) return [];
    const all = mebPlans(branchId);
    const grades = (branch && branch.grades) || [];
    return Object.keys(all)
      .map(Number)
      .filter((g) => !grades.length || grades.includes(g))
      .map((g) => ({ id: `meb-${branchId}-${g}`, grade: g, name: `${g}. Sınıf`, file: `MEB ${MEB_PLAN_YEAR} çerçeve yıllık planı`, builtin: true, weeks: all[g] }));
  }, [branchId, branch]);
  const shown = useMemo(() => {
    const own = new Set(plans.map((p) => p.grade).filter(Boolean));
    return [...plans, ...builtin.filter((b) => !own.has(b.grade))].sort((a, b) => (a.grade || 99) - (b.grade || 99));
  }, [plans, builtin]);

  const value = useMemo(
    () => ({
      loaded,
      plans: shown,
      // Aynı sınıf düzeyinde plan varsa yenisi onun yerine geçer (her düzeye bir plan).
      addPlan: ({ grade, name, file, weeks }) => {
        const plan = { id: shortId(), grade: grade || null, name: grade ? `${grade}. Sınıf` : (name || '').trim() || 'Yıllık plan', file, importedAt: Date.now(), weeks };
        const rest = grade ? plans.filter((p) => p.grade !== grade) : plans;
        save([...rest, plan].sort((a, b) => (a.grade || 99) - (b.grade || 99)));
        return plan.id;
      },
      planForGrade: (grade) => (grade ? shown.find((p) => p.grade === grade) : null),
      removePlan: (id) => save(plans.filter((p) => p.id !== id)),
    }),
    [plans, shown, loaded, branchId]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlans() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePlans, PlanProvider içinde kullanılmalı');
  return c;
}
