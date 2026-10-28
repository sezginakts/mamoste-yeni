// Kullanım modu: 'student' | 'teacher' | null (henüz seçilmedi) + öğretmenin dersleri (data/branches.js).
// Rol ilk açılışta seçilir ve kalıcıdır. Öğretmen en çok 3 ders (branş) seçebilir; bunlar Profil → DERSLERİM'den
// değiştirilebilir. Her dersin verisi ayrı tutulur (sınıflar branşla etiketli, planlar branş anahtarında);
// ders programı ise TEKTİR ve hücreler hangi derse ait olduğunu taşır (bkz. DeskContext).
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRANCH_BY_ID, branchOf } from '../data/branches';

const KEY = '@ingapp/role/v1';
const BRANCH_KEY = '@ingapp/branch/v1';
const LIST_KEY = '@ingapp/branch-list/v1';
export const MAX_BRANCHES = 3;
const RoleContext = createContext(null);

const temizListe = (list) => {
  const out = [];
  for (const id of Array.isArray(list) ? list : []) {
    if (BRANCH_BY_ID[id] && !out.includes(id) && out.length < MAX_BRANCHES) out.push(id);
  }
  return out;
};

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(null);
  const [branchId, setBranchState] = useState(null);
  const [myBranches, setMyBranchesState] = useState([]);
  const [prevBranch, setPrevBranch] = useState(null); // branş değiştirirken vazgeçilirse dönülecek branş
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [saved, br, list] = await Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(BRANCH_KEY), AsyncStorage.getItem(LIST_KEY)]);
        if (saved === 'student' || saved === 'teacher') setRoleState(saved);
        if (br && BRANCH_BY_ID[br]) {
          setBranchState(br);
          const kayitli = temizListe(list ? JSON.parse(list) : []);
          setMyBranchesState(kayitli.length ? (kayitli.includes(br) ? kayitli : temizListe([br, ...kayitli])) : [br]);
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  // Rol yalnızca bir kez seçilir (ilk açılış); sonradan değiştirilemez.
  const setRole = (r) => {
    if (role) return;
    setRoleState(r);
    AsyncStorage.setItem(KEY, r).catch(() => {});
  };

  const kaydetListe = (list) => {
    const next = temizListe(list);
    setMyBranchesState(next);
    AsyncStorage.setItem(LIST_KEY, JSON.stringify(next)).catch(() => {});
    return next;
  };

  // İlk giriş: ders seçimi (tek ders ya da en çok 3 ders birlikte).
  // list verilirse çoklu seçim kaydedilir; yalnız b verilirse tek ders.
  const setBranch = (b, list) => {
    if (branchId) return;
    const secili = list ? temizListe(list) : [];
    const ilk = secili[0] || b;
    if (!BRANCH_BY_ID[ilk]) return;
    setBranchState(ilk);
    setPrevBranch(null);
    AsyncStorage.setItem(BRANCH_KEY, ilk).catch(() => {});
    kaydetListe(secili.length ? secili : [ilk]);
  };

  // Profil → DERSLERİM: listeyi güncelle (en çok 3). Aktif ders listede yoksa ilkine geç.
  const setMyBranches = (list) => {
    const next = kaydetListe(list);
    if (next.length && !next.includes(branchId)) {
      setBranchState(next[0]);
      AsyncStorage.setItem(BRANCH_KEY, next[0]).catch(() => {});
    }
    return next;
  };

  // Ders ekle/çıkar (profil): en çok 3.
  const toggleMyBranch = (id) => {
    if (!BRANCH_BY_ID[id]) return myBranches;
    const var_ = myBranches.includes(id);
    if (!var_ && myBranches.length >= MAX_BRANCHES) return myBranches;
    return setMyBranches(var_ ? myBranches.filter((x) => x !== id) : [...myBranches, id]);
  };

  // Aktif dersi değiştir (yalnız seçili dersler arasında).
  const switchBranch = (id) => {
    if (!myBranches.includes(id)) return;
    setBranchState(id);
    AsyncStorage.setItem(BRANCH_KEY, id).catch(() => {});
  };

  // Branş seçimine dön (her öğretmen). Kayıtlı branş, yenisi seçilene kadar silinmez: uygulama kapanırsa eskisiyle açılır.
  const resetBranch = () => {
    if (branchId) setPrevBranch(branchId);
    setBranchState(null);
  };
  const cancelBranchChange = () => {
    if (prevBranch) setBranchState(prevBranch);
    setPrevBranch(null);
  };
  // Yalnızca yönetici (AuthContext.isAdmin) için: rol seçimine geri dön.
  const resetRole = () => {
    setBranchState(null);
    setPrevBranch(null);
    setMyBranchesState([]);
    AsyncStorage.removeItem(BRANCH_KEY).catch(() => {});
    AsyncStorage.removeItem(LIST_KEY).catch(() => {});
    setRoleState(null);
    AsyncStorage.removeItem(KEY).catch(() => {});
  };

  const value = useMemo(
    () => ({
      role,
      setRole,
      branchId,
      branch: branchId ? branchOf(branchId) : null,
      setBranch,
      myBranches,
      myBranchObjects: myBranches.map((id) => branchOf(id)),
      setMyBranches,
      toggleMyBranch,
      switchBranch,
      resetBranch,
      prevBranch,
      cancelBranchChange,
      resetRole,
      loaded,
      isTeacher: role === 'teacher',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, branchId, myBranches, prevBranch, loaded]
  );
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole, RoleProvider içinde kullanılmalı');
  return ctx;
}
