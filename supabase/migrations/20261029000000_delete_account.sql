-- Okul: öğretmen hesabını uygulama içinden silme (App Store kuralı 5.1.1(v): hesap açılabilen uygulamada
-- hesap uygulama içinden silinebilmeli).
-- Sırayla uygulanır: … → 20261023000000_join_code_profiles → bu dosya.
--
--   * delete_my_account(): giriş yapmış öğretmenin auth.users kaydını siler. Zincirleme silme (on delete cascade):
--     teachers → classes → students → homeworks → submissions → device_links. Öğrencilerin telefonlarındaki
--     bu dersler bir sonraki yenilemede kalkar.
--   * Ödev medyası (Storage 'homework-media') SQL ile silinemez; uygulama hesabı silmeden önce kendi sınıflarının
--     dosyalarını Storage API ile siler (teacher/cloud.js → cloudDeleteAccount).

create or replace function public.delete_my_account()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Önce giriş yapmalısın.' using errcode = 'P0001';
  end if;
  delete from public.teachers t where t.id = uid;
  delete from auth.users u where u.id = uid;
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
