// Öğretmenin yıllık planları — SADECE bu cihazda. Her plan: { id, grade (5, 6, 7…), name, file, importedAt, weeks: [...] }.
// Branşın MEB çerçeve planları (data/yearPlans) hazır gelir: { builtin: true }. Öğretmen o düzeye kendi planını
// yüklerse MEB planı gizlenir; kendi planını silerse MEB planı geri gelir.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shortId } from '../utils/codec';
import { useRole } from '../context/RoleContext';
import { mebPlans, MEB_PLAN_YEAR } from '../data/yearPlans';

const KEY = '@ingapp/teacher/v1/plans';
const Ctx = createContext(null);

export function PlanProvider({ children }) {
  const [plans, setPlans] = useState([]); // öğretmenin yüklediği planlar
  const { branchId, branch } = useRole();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setPlans(JSON.parse(raw));
      } catch (e) {
        console.warn('yıllık plan okunamadı', e);
      }
      setLoaded(true);
    })();
  }, []);

  const save = (next) => {
    setPlans(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch((e) => console.warn('yıllık plan kaydedilemedi', e));
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
    [plans, shown, loaded]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlans() {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePlans, PlanProvider içinde kullanılmalı');
  return c;
}
