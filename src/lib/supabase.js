// Supabase istemcisi. Adres ve herkese açık (publishable/anon) anahtar app.json → expo.extra'dan gelir.
// Anahtar boşsa uygulama sunucusuz (yalnızca cihazda) çalışmaya devam eder.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const extra = (Constants.expoConfig && Constants.expoConfig.extra) || {};
export const SUPABASE_URL = extra.supabaseUrl || '';
const SUPABASE_KEY = extra.supabaseKey || '';

export const cloudEnabled = !!(SUPABASE_URL && SUPABASE_KEY);

export const supabase = cloudEnabled
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    })
  : null;

// Sunucuda açık giriş yöntemleri ({ email, google, … }). Google kapalıysa düğme gösterilmez.
export async function authProviders() {
  if (!cloudEnabled) return {};
  const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
  const d = await r.json();
  return (d && d.external) || {};
}

// RPC çağrısı: hata varsa fırlatır; student_join/link gibi `error` satırı dönenlerde onu da hata sayar.
export async function rpc(fn, args) {
  if (!supabase) throw new Error('Sunucu bağlantısı ayarlı değil.');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (row && typeof row === 'object' && row.error) throw new Error(row.error);
  return data;
}
