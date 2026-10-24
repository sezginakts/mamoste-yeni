// Kullanım modu: 'student' | 'teacher' | null (henüz seçilmedi) + öğretmenin branşı (data/branches.js).
// Rol ilk açılışta seçilir ve kalıcıdır. Branş Ayarlar'dan değiştirilebilir; her branşın öğretmen verisi ayrı tutulur
// (sınıflar branşla etiketli, plan / program / notlar branş anahtarında). İlerlemeden ayrı anahtarda tutulur.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BRANCH_BY_ID, branchOf } from '../data/branches';

const KEY = '@ingapp/role/v1';
const BRANCH_KEY = '@ingapp/branch/v1';
const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const [role, setRoleState] = useState(null);
  const [branchId, setBranchState] = useState(null);
  const [prevBranch, setPrevBranch] = useState(null); // branş değiştirirken vazgeçilirse dönülecek branş
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [saved, br] = await Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(BRANCH_KEY)]);
        if (saved === 'student' || saved === 'teacher') setRoleState(saved);
        if (br && BRANCH_BY_ID[br]) setBranchState(br);
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
  const setBranch = (b) => {
    if (branchId || !BRANCH_BY_ID[b]) return;
    setBranchState(b);
    setPrevBranch(null);
    AsyncStorage.setItem(BRANCH_KEY, b).catch(() => {});
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
    AsyncStorage.removeItem(BRANCH_KEY).catch(() => {});
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
      resetBranch,
      prevBranch,
      cancelBranchChange,
      resetRole,
      loaded,
      isTeacher: role === 'teacher',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [role, branchId, prevBranch, loaded]
  );
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole, RoleProvider içinde kullanılmalı');
  return ctx;
}
