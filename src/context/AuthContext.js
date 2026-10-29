// Öğretmen girişi (Supabase Auth): e-posta + şifre, Google ile giriş, "beni hatırla", şifremi unuttum.
//   * Beni hatırla kapalıysa oturum yalnızca uygulama açık kaldığı sürece geçerli; sonraki açılışta çıkış yapılır.
//   * Beni hatırla açıksa son e-posta da saklanır, giriş ekranında hazır gelir.
//   * Şifre sıfırlama ve Google dönüşü linkle gelir (ingapp://auth#access_token=…); burada oturuma çevrilir.
//     Sıfırlama linkinden gelindiyse `recovery` true olur ve uygulama yeni şifre ekranını açar.
//   * Link uygulamaya dönemezse (Expo Go, başka cihaz, sunucudaki yönlendirme ayarı) e-postadaki link
//     kopyalanıp uygulamaya yapıştırılır: `verifyLink` içindeki token ile oturum kurar (verifyOtp).
//     İlk sürümde hesaplar e-posta linkiyle (şifresiz) açıldı; bu hesaplar şifreyi bu yolla belirler.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase, cloudEnabled, authProviders } from '../lib/supabase';

const REMEMBER_KEY = '@ingapp/auth/remember';
const EMAIL_KEY = '@ingapp/auth/email';
const GUEST_KEY = '@ingapp/auth/guest';
// Yönetici: rol ve branş seçimine geri dönebilir (başkalarında seçim kalıcıdır).
const ADMIN_EMAILS = ['szgngst@gmail.com'];
const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

// Linkin döneceği adres (e-posta linki, Google). Expo Go'da uygulamanın şeması (ingapp://) çalışmaz;
// orada Metro adresi + "/--/auth" kullanılır (ör. exp://127.0.0.1:8091/--/auth).
const redirectUrl = () => {
  if (isWeb) return window.location.origin;
  if (Constants.executionEnvironment === 'storeClient') {
    const host = (Constants.expoConfig && Constants.expoConfig.hostUri) || '';
    if (host) return `exp://${host}/--/auth`;
  }
  return 'ingapp://auth';
};

const params = (str) => {
  const out = {};
  (str || '').split('&').forEach((kv) => {
    const i = kv.indexOf('=');
    const k = i < 0 ? kv : kv.slice(0, i);
    const v = i < 0 ? '' : kv.slice(i + 1);
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  });
  return out;
};

// Linkten oturum. Döner: null (oturum bilgisi yok) | { type } ('recovery', 'magiclink', ...).
async function sessionFromUrl(url) {
  if (!supabase || !url) return null;
  const hash = url.includes('#') ? params(url.split('#')[1]) : {};
  const query = url.includes('?') ? params(url.split('?')[1].split('#')[0]) : {};
  if (hash.error_description || query.error_description) throw new Error(hash.error_description || query.error_description);
  if (hash.access_token && hash.refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token: hash.access_token, refresh_token: hash.refresh_token });
    if (error) throw new Error(error.message);
    return { type: hash.type || null };
  }
  if (query.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(query.code);
    if (error) throw new Error(error.message);
    return { type: query.type || null };
  }
  return null;
}

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(!cloudEnabled);
  const [recovery, setRecovery] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false); // sunucuda Google girişi açık mı
  const [lastEmail, setLastEmail] = useState('');
  // Hesap açmadan devam: öğretmen ders programı, plan, evrak, etkinlik gibi cihazdaki özellikleri hesapsız kullanır
  // (App Store 5.1.1: hesaba bağlı olmayan özellikler için kayıt zorunlu tutulmaz). Sınıf kodu/ödev için hesap gerekir.
  const [guest, setGuestState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(EMAIL_KEY)
      .then((e) => e && setLastEmail(e))
      .catch(() => {});
    AsyncStorage.getItem(GUEST_KEY)
      .then((g) => g === '1' && setGuestState(true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    authProviders()
      .then((p) => alive && setGoogleEnabled(!!p.google))
      .catch(() => {});
    const fromLink = async (url) => {
      if (!url || !/access_token=|code=|error_description=/.test(url)) return;
      try {
        const r = await sessionFromUrl(url);
        if (r && r.type === 'recovery') setRecovery(true);
      } catch (e) {}
    };
    (async () => {
      // Beni hatırla kapalıysa önceki oturumu bu açılışta kapat.
      const remember = await AsyncStorage.getItem(REMEMBER_KEY);
      if (remember === '0') {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSession(data.session || null);
      setLoaded(true);
    })();
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s || null);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
    });
    let sub = null;
    if (isWeb) {
      if (/access_token=|code=/.test(window.location.href)) {
        fromLink(window.location.href);
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else {
      Linking.getInitialURL().then(fromLink).catch(() => {});
      sub = Linking.addEventListener('url', ({ url }) => fromLink(url));
    }
    return () => {
      alive = false;
      data.subscription.unsubscribe();
      if (sub) sub.remove();
    };
  }, []);

  const value = useMemo(() => {
    const must = ({ data, error }) => {
      if (error) throw new Error(error.message);
      return data;
    };
    const setRemember = (on) => AsyncStorage.setItem(REMEMBER_KEY, on ? '1' : '0');
    const keepEmail = (email, on) => {
      const e = email.trim().toLowerCase();
      setLastEmail(on ? e : '');
      return on ? AsyncStorage.setItem(EMAIL_KEY, e) : AsyncStorage.removeItem(EMAIL_KEY);
    };
    return {
      loaded,
      cloudEnabled,
      session,
      user: session ? session.user : null,
      recovery,
      googleEnabled,
      lastEmail,
      // Geliştirme sırasında giriş ekranı atlandığı için (App.js) oturumsuz geliştirici de yönetici sayılır.
      isAdmin: session
        ? ADMIN_EMAILS.includes(String(session.user.email || '').toLowerCase())
        : __DEV__,

      signIn: async (email, password, remember = true) => {
        await setRemember(remember);
        must(await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }));
        await keepEmail(email, remember);
      },
      // E-posta onayı kapalıysa hesap hemen açılır ve giriş yapılır; açıksa { needsConfirm: true } döner.
      signUp: async (email, password, remember = true) => {
        await setRemember(remember);
        const d = must(
          await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { emailRedirectTo: redirectUrl() } })
        );
        if (d.user && Array.isArray(d.user.identities) && d.user.identities.length === 0) {
          throw new Error('User already registered');
        }
        return { needsConfirm: !d.session };
      },
      resetPassword: async (email) => {
        must(await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: redirectUrl() }));
      },
      // E-postadaki linki (ya da 6 haneli kodu) yapıştırarak giriş: link açılmasa da çalışır.
      // Kabul edilenler: …/auth/v1/verify?token=…&type=recovery · …#access_token=… · 123456 (e-posta gerekir).
      verifyLink: async (text, email, remember = true) => {
        const raw = String(text || '').trim();
        if (!raw) throw new Error('Linki yapıştır.');
        await setRemember(remember);
        let type = 'recovery';
        if (/access_token=|code=/.test(raw)) {
          const r = await sessionFromUrl(raw);
          if (!r) throw new Error('Token has expired or is invalid');
          type = r.type || type;
        } else if (/^\d{6,10}$/.test(raw)) {
          if (!email) throw new Error('Kodla giriş için e-posta adresini de yaz.');
          must(await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: raw, type: 'recovery' }));
        } else {
          const q = params((raw.split('?')[1] || '').split('#')[0]);
          const token = q.token || q.token_hash;
          if (!token) throw new Error('Bu link tanınmadı. E-postadaki linkin tamamını kopyala.');
          type = q.type || type;
          must(await supabase.auth.verifyOtp({ token_hash: token, type }));
        }
        if (email) await keepEmail(email, remember);
        if (type === 'recovery') setRecovery(true);
      },
      updatePassword: async (password) => {
        must(await supabase.auth.updateUser({ password }));
        setRecovery(false);
      },
      cancelRecovery: () => setRecovery(false),

      // Google: telefonda uygulama içi tarayıcı açılır, dönüşte oturum kurulur; web'de sayfa yönlenir.
      signInWithGoogle: async (remember = true) => {
        await setRemember(remember);
        if (isWeb) {
          must(await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl() } }));
          return;
        }
        const WebBrowser = require('expo-web-browser');
        const d = must(
          await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl(), skipBrowserRedirect: true } })
        );
        const res = await WebBrowser.openAuthSessionAsync(d.url, redirectUrl());
        if (res.type !== 'success') return;
        await sessionFromUrl(res.url);
      },

      signOut: () => supabase && supabase.auth.signOut(),

      guest,
      // Hesap açmadan devam et / giriş ekranına dön.
      setGuest: (on) => {
        setGuestState(!!on);
        AsyncStorage.setItem(GUEST_KEY, on ? '1' : '0').catch(() => {});
      },

      // Hesabı sil (App Store 5.1.1(v)): önce öğretmenin ödev dosyaları Storage'dan, sonra sunucu fonksiyonu
      // auth kaydını ve zincirleme bütün sınıf/öğrenci/ödev verisini siler; en son yerel oturum kapanır.
      deleteAccount: async () => {
        if (!supabase || !session) throw new Error('Önce giriş yapmalısın.');
        const { data: hws } = await supabase.from('homeworks').select('attachments');
        const paths = (hws || []).flatMap((h) => (h.attachments || []).map((a) => a && a.path).filter(Boolean));
        for (let i = 0; i < paths.length; i += 100) {
          await supabase.storage.from('homework-media').remove(paths.slice(i, i + 100)).catch(() => {});
        }
        must(await supabase.rpc('delete_my_account'));
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        await AsyncStorage.removeItem(EMAIL_KEY).catch(() => {});
        setLastEmail('');
      },
    };
  }, [loaded, session, recovery, googleEnabled, lastEmail, guest]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return c;
}
