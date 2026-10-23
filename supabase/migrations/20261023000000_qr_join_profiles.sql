-- Mamoste: QR ile sınıfa katılma + öğretmen/öğrenci profilleri.
-- Sırayla uygulanır: …000000_init → …010000_push → …020000_branches → bu dosya.
--
--   * Sınıfa katılma artık yalnızca QR ile: her sınıfın tahmin edilemez bir QR anahtarı (join_secret, 32 hex) var.
--     Öğrenci uygulamada QR'ı okutur → student_join(join_secret, okul no, takma ad).
--     6 karakterlik eski sınıf kodu (join_code) artık katılmada KULLANILMAZ (kolay paylaşılıp tahmin edilebiliyordu).
--   * Öğretmen "Yeni QR" dediğinde anahtar değişir: eski QR (fotoğrafı çekilip paylaşılmış olsa bile) işe yaramaz.
--     Sınıftaki öğrenciler etkilenmez; öğretmen çıkarana kadar kalırlar (cihaz anahtarıyla bağlılar).
--   * Öğretmen katılımı tamamen kapatabilir (join_open = false); kapalıyken hiçbir QR çalışmaz.
--   * Profil: öğretmen görünen ad, avatar (emoji), okul, tanıtım, iletişim saatleri; öğrenci takma ad + avatar.
--     Öğrenci derslerinde öğretmenin adını/avatarını/tanıtımını görür; öğretmen öğrencinin avatarını görür.
--     Öğrencinin gerçek adı yine sunucuya GİTMEZ.

-- ---------------------------------------------------------------------------
-- QR anahtarı
-- ---------------------------------------------------------------------------

create or replace function public.new_join_secret()
returns text
language sql
volatile
set search_path = ''
as $$ select encode(extensions.gen_random_bytes(16), 'hex') $$;

alter table public.classes
  add column join_secret text unique default public.new_join_secret(),
  add column join_open boolean not null default true;
update public.classes set join_secret = public.new_join_secret() where join_secret is null;
alter table public.classes alter column join_secret set not null;

-- Öğretmen QR anahtarını ve katılım durumunu doğrudan yazamaz; yalnızca aşağıdaki fonksiyonlarla, kendi sınıfı için.
-- (Supabase tablolara varsayılan olarak tüm yetkiyi verir; init'teki "update (name)" bunu daraltmıyordu.)
revoke insert, update on public.classes from authenticated;
grant insert (teacher_id, name, branch) on public.classes to authenticated;
grant update (name) on public.classes to authenticated;
create or replace function public.teacher_new_qr(p_class_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  s text := public.new_join_secret();
begin
  if not public.owns_class(p_class_id) then
    raise exception 'Bu sınıf senin değil.' using errcode = 'P0001';
  end if;
  update public.classes c set join_secret = s, join_open = true where c.id = p_class_id;
  return s;
end $$;

create or replace function public.teacher_set_join_open(p_class_id uuid, p_open boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.owns_class(p_class_id) then
    raise exception 'Bu sınıf senin değil.' using errcode = 'P0001';
  end if;
  update public.classes c set join_open = coalesce(p_open, false) where c.id = p_class_id;
end $$;

-- Sınıfa katıl: p_join_code artık QR'daki join_secret. Gövde branches.sql'deki ile aynı; yalnızca sınıf
-- join_secret ile bulunur ve katılım kapalıysa reddedilir.
create or replace function public.student_join(p_join_code text, p_number text, p_nickname text default null, p_token text default null)
returns table (student_id uuid, token text, class_name text, branch text, error text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c public.classes;
  s public.students;
  t text;
  h text;
  code text := lower(trim(coalesce(p_join_code, '')));
  num text := trim(coalesce(p_number, ''));
  nick text := nullif(left(trim(coalesce(p_nickname, '')), 30), '');
begin
  -- Deneme sınırı: QR anahtarı başına ve genel (anahtar tahmini denemelerine karşı).
  perform public.check_rate('join:' || left(code, 12), 30, 600);
  perform public.check_rate('join-all', 2000, 600);
  if num !~ '^[0-9]{1,6}$' then
    return query select null::uuid, null::text, null::text, null::text, 'Okul numarası sadece rakam olmalı.';
    return;
  end if;
  if code !~ '^[0-9a-f]{32}$' then
    return query select null::uuid, null::text, null::text, null::text, 'Bu bir Mamoste sınıf QR kodu değil.';
    return;
  end if;
  select * into c from public.classes cl where cl.join_secret = code;
  if not found then
    return query select null::uuid, null::text, null::text, null::text, 'Bu QR kod geçersiz ya da yenilenmiş. Öğretmeninden güncel QR kodu iste.';
    return;
  end if;
  if not c.join_open then
    return query select null::uuid, null::text, null::text, null::text, 'Bu sınıfın katılımı kapalı. Öğretmeninden yeni QR kodu iste.';
    return;
  end if;
  -- Cihazın mevcut anahtarı geçerliyse onu kullan.
  if p_token is not null and exists (select 1 from public.students st where st.token_hash = public.sha256_hex(p_token)) then
    t := p_token;
  else
    t := encode(extensions.gen_random_bytes(24), 'hex');
  end if;
  h := public.sha256_hex(t);
  select * into s from public.students st where st.class_id = c.id and st.number = num;
  if found and s.token_hash is not null and s.token_hash <> h then
    return query select null::uuid, null::text, null::text, null::text, 'Bu numara başka bir cihazda kayıtlı. Öğretmeninden bağlama kodu iste.';
    return;
  end if;
  if not found then
    insert into public.students (class_id, number, nickname) values (c.id, num, nick) returning * into s;
  end if;
  update public.students st
     set token_hash = h,
         joined_at = coalesce(st.joined_at, now()),
         nickname = coalesce(st.nickname, nick),
         avatar = coalesce(st.avatar, (select o.avatar from public.students o where o.token_hash = h and o.avatar is not null limit 1)),
         push_token = coalesce(st.push_token,
           (select o.push_token from public.students o where o.token_hash = h and o.push_token is not null limit 1))
   where st.id = s.id;
  return query select s.id, t, c.name, c.branch, null::text;
end $$;

-- ---------------------------------------------------------------------------
-- Profiller
-- ---------------------------------------------------------------------------

alter table public.teachers
  add column avatar text check (avatar is null or char_length(avatar) <= 16),
  add column school text check (school is null or char_length(school) <= 80),
  add column bio text check (bio is null or char_length(bio) <= 300),
  add column contact_hours text check (contact_hours is null or char_length(contact_hours) <= 80);
alter table public.teachers add constraint teachers_display_name_len check (display_name is null or char_length(display_name) <= 60);
revoke insert, update on public.teachers from authenticated;
grant update (display_name, avatar, school, bio, contact_hours) on public.teachers to authenticated;

alter table public.students add column avatar text check (avatar is null or char_length(avatar) <= 16);
grant select (avatar) on public.students to authenticated;

-- Öğrenci profilini (takma ad, avatar) cihazın TÜM ders üyeliklerine yazar.
create or replace function public.student_set_profile(p_token text, p_nickname text, p_avatar text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  h text := public.sha256_hex(coalesce(p_token, ''));
begin
  perform public.check_rate('profile:' || left(h, 12), 60, 600);
  update public.students st
     set nickname = nullif(left(trim(coalesce(p_nickname, '')), 30), ''),
         avatar = nullif(left(trim(coalesce(p_avatar, '')), 16), '')
   where st.token_hash = h;
  if not found then
    raise exception 'Bu cihaz sınıfa bağlı değil. Öğretmeninden bağlama kodu iste.' using errcode = 'P0001';
  end if;
end $$;

-- Cihazın tüm dersleri; öğretmenin profiliyle (ad, avatar, okul, tanıtım, iletişim saatleri).
drop function public.student_classes(text);
create function public.student_classes(p_token text)
returns table (
  student_id uuid, class_id uuid, class_name text, branch text, number text, nickname text, avatar text,
  teacher_name text, teacher_avatar text, teacher_school text, teacher_bio text, teacher_hours text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  h text := public.sha256_hex(coalesce(p_token, ''));
begin
  if not exists (select 1 from public.students st where st.token_hash = h) then
    raise exception 'Bu cihaz sınıfa bağlı değil. Öğretmeninden bağlama kodu iste.' using errcode = 'P0001';
  end if;
  return query
    select st.id, c.id, c.name, c.branch, st.number, st.nickname, st.avatar,
           t.display_name, t.avatar, t.school, t.bio, t.contact_hours
      from public.students st
      join public.classes c on c.id = st.class_id
      join public.teachers t on t.id = c.teacher_id
     where st.token_hash = h
     order by c.branch, c.name;
end $$;

-- ---------------------------------------------------------------------------
-- Yetkiler
-- ---------------------------------------------------------------------------

revoke execute on function public.new_join_secret() from public, anon;
revoke execute on function public.teacher_new_qr(uuid) from public, anon;
revoke execute on function public.teacher_set_join_open(uuid, boolean) from public, anon;
revoke execute on function public.student_set_profile(text, text, text) from public;
revoke execute on function public.student_classes(text) from public;
grant execute on function public.new_join_secret() to authenticated;
grant execute on function public.teacher_new_qr(uuid) to authenticated;
grant execute on function public.teacher_set_join_open(uuid, boolean) to authenticated;
grant execute on function public.student_set_profile(text, text, text) to anon, authenticated;
grant execute on function public.student_classes(text) to anon, authenticated;
