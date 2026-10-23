// Öğretmen profili: görünen ad, avatar (emoji), okul, tanıtım, iletişim saatleri.
// Cihazda önbellek (AsyncStorage) + sunucu (teachers tablosu). Öğrenciler derslerinde görür.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { cloudTeacherProfile, cloudSaveTeacherProfile } from './cloud';

const KEY = 'mamoste-teacher-profile-v1';
const EMPTY = { display_name: '', avatar: '', school: '', bio: '', contact_hours: '' };
export const PROFILE_LIMITS = { display_name: 60, school: 80, bio: 300, contact_hours: 80 };

let cache = null;
const subs = new Set();
const emit = (p) => {
  cache = p;
  subs.forEach((f) => f(p));
  AsyncStorage.setItem(KEY, JSON.stringify(p)).catch(() => {});
};

export function useTeacherProfile() {
  const auth = useAuth();
  const userId = auth.user ? auth.user.id : null;
  const [profile, setProfile] = useState(cache || EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    subs.add(setProfile);
    (async () => {
      if (!cache) {
        try {
          const saved = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null');
          if (saved && !cache) emit({ ...EMPTY, ...saved });
        } catch (e) {}
      }
      if (!userId) return;
      try {
        const row = await cloudTeacherProfile(userId);
        // Sunucuda boş olan alan cihazdakini silmesin (ör. girişten önce cihaza kaydedilmiş profil).
        if (row) emit({ ...EMPTY, ...cache, ...Object.fromEntries(Object.entries(row).filter(([, v]) => v)) });
      } catch (e) {
        // Sunucu henüz güncellenmediyse (yeni sütunlar yok) önbellekteki kalır.
        setError(e.message || '');
      }
    })();
    return () => subs.delete(setProfile);
  }, [userId]);

  const save = async (p) => {
    const clean = {};
    Object.keys(EMPTY).forEach((k) => {
      const v = String(p[k] ?? '').trim();
      clean[k] = PROFILE_LIMITS[k] ? v.slice(0, PROFILE_LIMITS[k]) : v;
    });
    if (userId) {
      await cloudSaveTeacherProfile(userId, Object.fromEntries(Object.entries(clean).map(([k, v]) => [k, v || null])));
    }
    emit(clean);
  };

  return { profile, save, signedIn: !!userId, loadError: error };
}
