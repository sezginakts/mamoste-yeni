// Öğretmen girişi (Supabase Auth): e-posta + şifre, Google ile giriş, "beni hatırla", şifremi unuttum.
//   * Beni hatırla kapalıysa oturum yalnızca uygulama açık kaldığı sürece geçerli; sonraki açılışta çıkış yapılır.
//   * Şifre sıfırlama ve Google dönüşü linkle gelir (ingapp://auth#access_token=…); burada oturuma çevrilir.
//     Sıfırlama linkinden gelindiyse `recovery` true olur ve uygulama yeni şifre ekranını açar.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase, cloudEnabled, authProviders } from '../lib/supabase';

const REMEMBER_KEY = '@ingapp/auth/remember';
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
    return {
      loaded,
      cloudEnabled,
      session,
      user: session ? session.user : null,
      recovery,
      googleEnabled,
      // Geliştirme sırasında giriş ekranı atlandığı için (App.js) oturumsuz geliştirici de yönetici sayılır.
      isAdmin: session
        ? ADMIN_EMAILS.includes(String(session.user.email || '').toLowerCase())
        : __DEV__,

      signIn: async (email, password, remember = true) => {
        await setRemember(remember);
        must(await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }));
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
    };
  }, [loaded, session, recovery, googleEnabled]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return c;
}
