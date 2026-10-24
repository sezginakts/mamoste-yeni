// Telefon ↔ akıllı tahta bağlantısı. Tahta sayfası (tools/tahta/index.html, app.json → extra.tahtaUrl) 6 haneli kod gösterir;
// telefon aynı kodla Supabase anlık kanalına ("tahta:<kod>") katılır. Mesajlar (broadcast):
//   telefon → tahta: merhaba · ac { id } · komut { k, ... } · kapat
//   tahta → telefon: hazir { acik } · durum { ... } (açık oyunun bildirdiği durum, ör. Kalıp Tahtası'nın cümlesi)
// Mesajlar küçük komutlardır; oyunun kendisi tahtada çalışır (bağlantı bir an kopsa da oyun bozulmaz).
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

const LAST_KEY = '@ingapp/tahta/son-kod';
const extra = (Constants.expoConfig && Constants.expoConfig.extra) || {};
export const TAHTA_URL = extra.tahtaUrl || '';
const FIND_MS = 6000; // tahta bu sürede cevap vermezse "bulunamadı"
const BEAT_MS = 20000; // telefon arada "merhaba" der
const LOST_MS = 50000; // tahtadan bu kadar ses gelmezse "bağlantı zayıf"

const Ctx = createContext(null);
const IDLE = { code: null, status: 'idle', error: null, open: null, durum: null };

export function BoardLinkProvider({ children }) {
  const [st, setSt] = useState(IDLE);
  const [lastCode, setLastCode] = useState(null);
  const ch = useRef(null);
  const last = useRef(0);
  const findTimer = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem(LAST_KEY).then((c) => c && setLastCode(c)).catch(() => {});
  }, []);

  const send = (event, payload) => {
    if (ch.current) ch.current.send({ type: 'broadcast', event, payload: payload || {} }).catch(() => {});
  };

  const drop = () => {
    clearTimeout(findTimer.current);
    if (ch.current && supabase) supabase.removeChannel(ch.current);
    ch.current = null;
  };

  const connect = (raw) => {
    const code = String(raw || '').replace(/\D/g, '');
    if (code.length !== 6) return;
    if (!supabase) {
      setSt({ ...IDLE, status: 'error', error: 'Sunucu bağlantısı ayarlı değil.' });
      return;
    }
    drop();
    last.current = 0;
    setSt({ ...IDLE, code, status: 'connecting' });
    const c = supabase.channel(`tahta:${code}`, { config: { broadcast: { self: false } } });
    c.on('broadcast', { event: 'hazir' }, ({ payload }) => {
      last.current = Date.now();
      clearTimeout(findTimer.current);
      setSt((s) => ({ ...s, status: 'connected', error: null, open: payload && payload.acik ? { ...(s.open || {}), id: payload.acik } : null, durum: payload && payload.acik ? s.durum : null }));
    })
      .on('broadcast', { event: 'durum' }, ({ payload }) => {
        last.current = Date.now();
        setSt((s) => ({ ...s, status: 'connected', durum: payload }));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') send('merhaba');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setSt((s) => (s.code === code ? { ...s, status: 'error', error: 'İnternete bağlanılamadı.' } : s));
      });
    ch.current = c;
    findTimer.current = setTimeout(() => {
      if (!last.current) {
        drop();
        setSt({ ...IDLE, code, status: 'error', error: 'Tahta bulunamadı. Kodu ve tahtanın internetini kontrol et.' });
      }
    }, FIND_MS);
    AsyncStorage.setItem(LAST_KEY, code).catch(() => {});
    setLastCode(code);
  };

  // Bağlıyken: arada merhaba; uzun süre ses yoksa "zayıf" göster (kanal kendisi yeniden bağlanmayı dener).
  useEffect(() => {
    if (st.status !== 'connected' && st.status !== 'lost') return undefined;
    const iv = setInterval(() => {
      send('merhaba');
      if (Date.now() - last.current > LOST_MS) setSt((s) => ({ ...s, status: 'lost' }));
    }, BEAT_MS);
    return () => clearInterval(iv);
  }, [st.status]);

  useEffect(() => drop, []);

  const value = useMemo(
    () => ({
      ...st,
      lastCode,
      linked: st.status === 'connected' || st.status === 'lost',
      connect,
      disconnect: () => {
        drop();
        setSt(IDLE);
      },
      // Etkinliği tahtada aç: act = data/activities öğesi.
      openActivity: (act) => {
        send('ac', { id: act.id });
        setSt((s) => ({ ...s, open: { id: act.id, type: act.type }, durum: null }));
      },
      command: (k, extraArgs) => send('komut', { k, ...(extraArgs || {}) }),
      closeActivity: () => {
        send('kapat');
        setSt((s) => ({ ...s, open: null, durum: null }));
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [st, lastCode]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBoardLink() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useBoardLink, BoardLinkProvider içinde kullanılmalı');
  return c;
}
