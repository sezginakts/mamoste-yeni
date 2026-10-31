-- Okul Öğrenci: öğrencinin kendi verisini uygulama içinden silmesi (App Store kuralı 5.1.1(v)).
-- Öğrenci hesap açmaz ama katılınca sunucuda takma ad, avatar, bildirim anahtarı ve ödev sonuçları tutulur.
-- Sırayla uygulanır: … → 20261029000000_delete_account → bu dosya.
--
--   * student_delete_my_data(p_token): cihaz anahtarının bağlı olduğu BÜTÜN ders üyeliklerinde
--       - öğrencinin gönderdiği sonuçlar/notlar (submissions) ve bekleyen bağlama kodları (device_links) silinir,
--       - takma ad, avatar, bildirim anahtarı, katılma zamanı ve cihaz anahtarı (token_hash) boşaltılır.
--     Öğretmenin sınıf listesindeki satır (sınıf + okul numarası) öğretmenin verisidir, KALIR; öğrenci aynı
--     kodla yeniden katılabilir. Dönüş: temizlenen üyelik sayısı.

create or replace function public.student_delete_my_data(p_token text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  h text := public.sha256_hex(coalesce(p_token, ''));
  n integer;
begin
  perform public.check_rate('forget:' || left(h, 12), 10, 600);
  if not exists (select 1 from public.students st where st.token_hash = h) then
    raise exception 'Bu cihaz sınıfa bağlı değil.' using errcode = 'P0001';
  end if;
  delete from public.submissions su
   using public.students st
   where su.student_id = st.id and st.token_hash = h;
  delete from public.device_links dl
   using public.students st
   where dl.student_id = st.id and st.token_hash = h;
  update public.students st
     set nickname = null, avatar = null, push_token = null, joined_at = null, token_hash = null
   where st.token_hash = h;
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.student_delete_my_data(text) from public;
grant execute on function public.student_delete_my_data(text) to anon, authenticated;
