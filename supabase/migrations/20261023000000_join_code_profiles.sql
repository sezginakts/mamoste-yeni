-- Mamoste: sınıf davet kodu (öğretmen tahtaya yazar) + öğretmen/öğrenci profilleri.
-- Sırayla uygulanır: …000000_init → …010000_push → …020000_branches → bu dosya.
--
--   * Her sınıfın 8 karakterlik davet kodu var (invite_code, ör. K7MQ-4XPA). Öğretmen tahtaya yazar, öğrenci evde
--     uygulamaya yazar → student_join(kod, okul no, takma ad). 32 harf/rakam ^ 8 ≈ 1,1 trilyon olasılık + deneme sınırı.
--     Init'teki 6 karakterlik join_code artık katılmada KULLANILMAZ (eski QR sonuç kodlarının kimliği olarak kalır).
--   * Öğretmen istediği an kodu yeniler (tek sınıf ya da tüm sınıfları): eski kod çalışmaz; sınıftaki öğrenciler
--     etkilenmez, öğretmen çıkarana kadar kalır. Yeni öğrenci gelirse öğretmen ona güncel kodu söyler.
--   * Profil: öğretmen görünen ad, avatar (emoji), okul, tanıtım, iletişim saatleri; öğrenci takma ad + avatar.
--     Öğrenci derslerinde öğretmenin adını/avatarını/tanıtımını görür; öğretmen öğrencinin avatarını görür.
--     Öğrencinin gerçek adı yine sunucuya GİTMEZ.

-- ---------------------------------------------------------------------------
-- Davet kodu
-- ---------------------------------------------------------------------------

-- 8 karakter; karışmasın diye 0/O, 1/I yok (init'teki alfabe). Benzersiz olana kadar dener.
create or replace function public.new_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alphabet)), 1);
    end loop;
    exit when not exists (select 1 from public.classes c where c.invite_code = code);
  end loop;
  return code;
end $$;

alter table public.classes add column invite_code text unique;
update public.classes set invite_code = public.new_invite_code() where invite_code is null;
alter table public.classes alter column invite_code set default public.new_invite_code();
alter table public.classes alter column invite_code set not null;

-- Öğretmen davet kodunu doğrudan yazamaz (seçilmiş/kolay kod olmasın); yalnızca aşağıdaki fonksiyonlarla.
-- (Supabase tablolara varsayılan olarak tüm yetkiyi verir; init'teki "update (name)" bunu daraltmıyordu.)
revoke insert, update on public.classes from authenticated;
grant insert (teacher_id, name, branch) on public.classes to authenticated;
grant update (name) on public.classes to authenticated;

-- Tek sınıfın kodunu yenile.
create or replace function public.teacher_new_code(p_class_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  s text := public.new_invite_code();
begin
  if not public.owns_class(p_class_id) then
    raise exception 'Bu sınıf senin değil.' using errcode = 'P0001';
  end if;
  update public.classes c set invite_code = s where c.id = p_class_id;
  return s;
end $$;

-- Öğretmenin TÜM sınıflarının kodunu yenile.
create or replace function public.teacher_new_codes_all()
returns table (class_id uuid, invite_code text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if (select auth.uid()) is null then
    raise exception 'Önce giriş yapmalısın.' using errcode = 'P0001';
  end if;
  for r in select c.id from public.classes c where c.teacher_id = (select auth.uid()) loop
    update public.classes c set invite_code = public.new_invite_code() where c.id = r.id;
  end loop;
  return query select c.id, c.invite_code from public.classes c where c.teacher_id = (select auth.uid());
end $$;

-- Sınıfa katıl: p_join_code artık davet kodu (boşluk/tire yok sayılır, büyük-küçük harf fark etmez).
-- Gövde branches.sql'deki ile aynı; yalnızca sınıf invite_code ile bulunur.
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
  code text := upper(regexp_replace(coalesce(p_join_code, ''), '[^A-Za-z0-9]', '', 'g'));
  num text := trim(coalesce(p_number, ''));
  nick text := nullif(left(trim(coalesce(p_nickname, '')), 30), '');
begin
  -- Deneme sınırı: kod başına ve genel (kod tahmini denemelerine karşı).
  perform public.check_rate('join:' || left(code, 12), 30, 600);
  perform public.check_rate('join-all', 2000, 600);
  if num !~ '^[0-9]{1,6}$' then
    return query select null::uuid, null::text, null::text, null::text, 'Okul numarası sadece rakam olmalı.';
    return;
  end if;
  if code !~ '^[A-Z0-9]{8}$' then
    return query select null::uuid, null::text, null::text, null::text, 'Sınıf kodu 8 harf/rakam olmalı.';
    return;
  end if;
  select * into c from public.classes cl where cl.invite_code = code;
  if not found then
    return query select null::uuid, null::text, null::text, null::text, 'Bu kod geçersiz ya da yenilenmiş. Öğretmeninden güncel kodu iste.';
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

revoke execute on function public.new_invite_code() from public, anon;
grant execute on function public.new_invite_code() to authenticated; -- sütun varsayılanı, öğretmen sınıf açarken çalışır
revoke execute on function public.teacher_new_code(uuid) from public, anon;
revoke execute on function public.teacher_new_codes_all() from public, anon;
revoke execute on function public.student_set_profile(text, text, text) from public;
revoke execute on function public.student_classes(text) from public;
grant execute on function public.teacher_new_code(uuid) to authenticated;
grant execute on function public.teacher_new_codes_all() to authenticated;
grant execute on function public.student_set_profile(text, text, text) to anon, authenticated;
grant execute on function public.student_classes(text) to anon, authenticated;
