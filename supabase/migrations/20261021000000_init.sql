-- Cümle Cümle İngilizce — ilk veritabanı şeması.
--
-- İlkeler (docs/SUNUCU-MIMARISI.md):
--   * Gerçek ad soyad sunucuya GELMEZ; öğrenci = sınıf + okul numarası (+ isteğe bağlı takma ad).
--   * Öğretmen Supabase Auth ile giriş yapar; her öğretmen yalnızca kendi sınıflarını görür (RLS).
--   * Öğrencinin hesabı YOK: sınıf koduyla katılır, cihazına gizli bir anahtar (token) verilir.
--     Öğrenci tablolara doğrudan erişemez; yalnızca aşağıdaki student_* fonksiyonlarını çağırır,
--     bunlar anahtarı kontrol eder. Böylece aktif kullanıcı olarak sadece öğretmenler sayılır.
--   * Anahtarlar ve cihaz bağlama kodları düz değil, SHA-256 özeti olarak saklanır.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tablolar
-- ---------------------------------------------------------------------------

-- Öğretmen: auth.users ile bire bir. Kayıt olunca tetikleyiciyle oluşur.
create table public.teachers (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- Sınıf: "7-B" gibi. join_code öğrencinin katılırken yazdığı 6 haneli kod.
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  join_code text not null unique,
  created_at timestamptz not null default now()
);
create index classes_teacher_idx on public.classes (teacher_id);

-- Öğrenci: sınıf + okul numarası. token_hash: cihazdaki anahtarın özeti (null = henüz katılmadı).
create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  number text not null check (number ~ '^[0-9]{1,6}$'),
  nickname text check (nickname is null or char_length(nickname) <= 30),
  token_hash text,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (class_id, number)
);
create index students_class_idx on public.students (class_id);

-- Ödev: payload = uygulamadaki ödev nesnesi (cümle id'leri, kalıplar, tekrar sayısı…).
-- target_student_id null ise sınıfın tamamına.
create table public.homeworks (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  payload jsonb not null default '{}'::jsonb,
  due_date date,
  target_student_id uuid references public.students (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index homeworks_class_idx on public.homeworks (class_id);

-- Sonuç: results = { "<cümle id>": 0 | 1 }. Öğrenci aynı ödevi tekrar gönderebilir.
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homeworks (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  results jsonb not null,
  duration_s integer check (duration_s is null or duration_s between 0 and 86400),
  submitted_at timestamptz not null default now()
);
create index submissions_homework_idx on public.submissions (homework_id);
create index submissions_student_idx on public.submissions (student_id);

-- Yeni cihaza bağlama: öğretmen 6 haneli, 10 dakika geçerli, tek kullanımlık kod üretir.
create table public.device_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index device_links_code_idx on public.device_links (code_hash);

-- Kaba kuvvet denemelerine karşı sayaç (sınıf kodu / bağlama kodu tahmini).
create table public.rate_limits (
  bucket text not null,
  at timestamptz not null default now()
);
create index rate_limits_bucket_idx on public.rate_limits (bucket, at);

-- ---------------------------------------------------------------------------
-- Yardımcılar
-- ---------------------------------------------------------------------------

create or replace function public.sha256_hex(t text)
returns text
language sql
immutable
set search_path = ''
as $$ select encode(extensions.digest(t, 'sha256'), 'hex') $$;

-- Karışmayan karakterlerle (0/O, 1/I yok) benzersiz sınıf kodu.
-- security definer: öğretmen RLS yüzünden başkasının sınıfını göremez ama kod tüm sınıflarda benzersiz olmalı.
create or replace function public.new_join_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alphabet)), 1);
    end loop;
    exit when not exists (select 1 from public.classes c where c.join_code = code);
  end loop;
  return code;
end $$;

alter table public.classes alter column join_code set default public.new_join_code();

-- Deneme sınırı: son `window_s` saniyede `bucket` için `max_n`'den fazla deneme varsa hata.
create or replace function public.check_rate(bucket text, max_n integer, window_s integer)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.rate_limits r
      where r.bucket = check_rate.bucket and r.at > now() - make_interval(secs => window_s)) >= max_n then
    raise exception 'Çok fazla deneme. Biraz sonra tekrar dene.' using errcode = 'P0001';
  end if;
  insert into public.rate_limits (bucket) values (check_rate.bucket);
  delete from public.rate_limits r where r.at < now() - interval '1 day';
end $$;

-- Öğretmen sahipliği: bu sınıf giriş yapan öğretmenin mi?
create or replace function public.owns_class(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select exists (select 1 from public.classes c where c.id = cid and c.teacher_id = (select auth.uid())) $$;

-- Öğrencinin anahtarını doğrula; doğruysa öğrenci satırını döndür.
create or replace function public.verify_student(p_student_id uuid, p_token text)
returns public.students
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.students;
begin
  select * into s from public.students st
   where st.id = p_student_id and st.token_hash is not null and st.token_hash = public.sha256_hex(p_token);
  if not found then
    raise exception 'Bu cihaz sınıfa bağlı değil. Öğretmeninden bağlama kodu iste.' using errcode = 'P0001';
  end if;
  return s;
end $$;

-- Yeni kullanıcı kaydolunca öğretmen satırı oluştur.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.teachers (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Satır bazlı yetki (RLS): öğretmen yalnızca kendi verisini görür.
-- Öğrenci (anon) hiçbir tabloya doğrudan erişemez — politika yok = erişim yok.
-- ---------------------------------------------------------------------------

alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.homeworks enable row level security;
alter table public.submissions enable row level security;
alter table public.device_links enable row level security;
alter table public.rate_limits enable row level security;

create policy "öğretmen kendi kaydını görür" on public.teachers
  for select to authenticated using (id = (select auth.uid()));
create policy "öğretmen kendi kaydını günceller" on public.teachers
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "öğretmen kendi sınıfları" on public.classes
  for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

create policy "öğretmen kendi sınıflarının öğrencileri" on public.students
  for all to authenticated
  using (public.owns_class(class_id))
  with check (public.owns_class(class_id));

create policy "öğretmen kendi sınıflarının ödevleri" on public.homeworks
  for all to authenticated
  using (public.owns_class(class_id))
  with check (
    public.owns_class(class_id)
    and (target_student_id is null
         or exists (select 1 from public.students s where s.id = target_student_id and s.class_id = homeworks.class_id))
  );

-- Sonuçları öğretmen okur ve silebilir; yazma yalnızca öğrenci fonksiyonundan.
create policy "öğretmen kendi sınıflarının sonuçlarını okur" on public.submissions
  for select to authenticated
  using (exists (select 1 from public.homeworks h where h.id = homework_id and public.owns_class(h.class_id)));
create policy "öğretmen kendi sınıflarının sonuçlarını siler" on public.submissions
  for delete to authenticated
  using (exists (select 1 from public.homeworks h where h.id = homework_id and public.owns_class(h.class_id)));

-- device_links ve rate_limits: politika yok; yalnızca fonksiyonlar kullanır.

-- Öğrenci (anon) hiçbir tabloya doğrudan dokunamaz.
revoke all on all tables in schema public from anon;

-- Öğretmen token_hash'i göremesin/değiştiremesin: sütun yetkileri.
revoke all on public.students from authenticated;
grant select (id, class_id, number, nickname, joined_at, created_at) on public.students to authenticated;
grant insert (class_id, number, nickname) on public.students to authenticated;
grant update (number, nickname) on public.students to authenticated;
grant delete on public.students to authenticated;

grant select, update (display_name) on public.teachers to authenticated;
grant select, insert, update (name), delete on public.classes to authenticated;
grant select, insert, update, delete on public.homeworks to authenticated;
grant select, delete on public.submissions to authenticated;

-- ---------------------------------------------------------------------------
-- Öğretmen fonksiyonu: öğrenciyi yeni cihaza bağlamak için tek kullanımlık kod
-- ---------------------------------------------------------------------------

create or replace function public.create_device_link(p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  cid uuid;
  code text;
begin
  select s.class_id into cid from public.students s where s.id = p_student_id;
  if cid is null or not public.owns_class(cid) then
    raise exception 'Öğrenci bulunamadı.' using errcode = 'P0001';
  end if;
  -- 6 haneli sayı; eski kullanılmamış kodlar geçersiz olur.
  code := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000))::text, 6, '0');
  update public.device_links set used_at = now() where student_id = p_student_id and used_at is null;
  insert into public.device_links (student_id, code_hash, expires_at)
  values (p_student_id, public.sha256_hex(code), now() + interval '10 minutes');
  return code;
end $$;

-- ---------------------------------------------------------------------------
-- Öğrenci fonksiyonları (anon çağırır; hepsi anahtar ya da kod kontrolü yapar)
-- ---------------------------------------------------------------------------

-- Sınıfa katıl: sınıf kodu + okul numarası. Numara başka cihazda kayıtlıysa reddedilir
-- (o zaman öğretmenden bağlama kodu istenir). Döner: öğrenci id, cihaz anahtarı, sınıf adı.
-- Hatalı denemede HATA FIRLATMAZ, `error` döner: hata fırlatılırsa deneme sayacı da geri alınır
-- ve kaba kuvvet tahmini sınırlanamaz.
create or replace function public.student_join(p_join_code text, p_number text, p_nickname text default null)
returns table (student_id uuid, token text, class_name text, error text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c public.classes;
  s public.students;
  t text := encode(extensions.gen_random_bytes(24), 'hex');
  code text := upper(trim(p_join_code));
  num text := trim(p_number);
begin
  perform public.check_rate('join:' || code, 30, 600);
  if num !~ '^[0-9]{1,6}$' then
    return query select null::uuid, null::text, null::text, 'Okul numarası sadece rakam olmalı.';
    return;
  end if;
  select * into c from public.classes cl where cl.join_code = code;
  if not found then
    return query select null::uuid, null::text, null::text, 'Bu sınıf kodu bulunamadı.';
    return;
  end if;
  select * into s from public.students st where st.class_id = c.id and st.number = num;
  if found and s.token_hash is not null then
    return query select null::uuid, null::text, null::text, 'Bu numara başka bir cihazda kayıtlı. Öğretmeninden bağlama kodu iste.';
    return;
  end if;
  if not found then
    insert into public.students (class_id, number, nickname)
    values (c.id, num, nullif(left(trim(coalesce(p_nickname, '')), 30), ''))
    returning * into s;
  end if;
  update public.students st
     set token_hash = public.sha256_hex(t),
         joined_at = now(),
         nickname = coalesce(st.nickname, nullif(left(trim(coalesce(p_nickname, '')), 30), ''))
   where st.id = s.id;
  return query select s.id, t, c.name, null::text;
end $$;

-- Yeni cihaza bağlan: öğretmenin verdiği 6 haneli kod. Eski cihazın anahtarı geçersiz olur.
-- student_join gibi hatalı denemede `error` döner (deneme sayacı kalıcı olsun diye).
create or replace function public.student_link_device(p_code text)
returns table (student_id uuid, token text, class_name text, number text, error text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  l public.device_links;
  s public.students;
  t text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  perform public.check_rate('link', 200, 600);
  select * into l from public.device_links d
   where d.code_hash = public.sha256_hex(trim(p_code)) and d.used_at is null and d.expires_at > now()
   order by d.created_at desc limit 1;
  if not found then
    return query select null::uuid, null::text, null::text, null::text, 'Kod geçersiz ya da süresi dolmuş.';
    return;
  end if;
  update public.device_links d set used_at = now() where d.id = l.id;
  update public.students st set token_hash = public.sha256_hex(t), joined_at = now()
   where st.id = l.student_id
   returning * into s;
  return query select s.id, t, (select cl.name from public.classes cl where cl.id = s.class_id), s.number, null::text;
end $$;

-- Öğrencinin ödevleri: sınıfa ya da sadece kendisine verilenler, teslim durumuyla.
create or replace function public.student_homeworks(p_student_id uuid, p_token text)
returns table (id uuid, title text, payload jsonb, due_date date, created_at timestamptz, submitted_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.students := public.verify_student(p_student_id, p_token);
begin
  return query
    select h.id, h.title, h.payload, h.due_date, h.created_at,
           (select max(sb.submitted_at) from public.submissions sb where sb.homework_id = h.id and sb.student_id = s.id)
      from public.homeworks h
     where h.class_id = s.class_id and (h.target_student_id is null or h.target_student_id = s.id)
     order by h.due_date nulls last, h.created_at desc;
end $$;

-- Sonuç gönder. results: { "<cümle id>": 0 | 1 }.
create or replace function public.student_submit(p_student_id uuid, p_token text, p_homework_id uuid, p_results jsonb, p_duration_s integer default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  s public.students := public.verify_student(p_student_id, p_token);
  new_id uuid;
begin
  if not exists (
    select 1 from public.homeworks h
     where h.id = p_homework_id and h.class_id = s.class_id
       and (h.target_student_id is null or h.target_student_id = s.id)
  ) then
    raise exception 'Ödev bulunamadı.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_results) <> 'object' or pg_column_size(p_results) > 20000 then
    raise exception 'Sonuç biçimi hatalı.' using errcode = 'P0001';
  end if;
  insert into public.submissions (homework_id, student_id, results, duration_s)
  values (p_homework_id, s.id, p_results, p_duration_s)
  returning id into new_id;
  return new_id;
end $$;

-- ---------------------------------------------------------------------------
-- Fonksiyon yetkileri: varsayılan olarak herkese açık olanları kapat, sadece gerekenleri aç.
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.student_join(text, text, text) to anon, authenticated;
grant execute on function public.student_link_device(text) to anon, authenticated;
grant execute on function public.student_homeworks(uuid, text) to anon, authenticated;
grant execute on function public.student_submit(uuid, text, uuid, jsonb, integer) to anon, authenticated;
grant execute on function public.create_device_link(uuid) to authenticated;
-- RLS politikalarında ve sınıf oluştururken (varsayılan kod) kullanılır.
grant execute on function public.owns_class(uuid) to authenticated;
grant execute on function public.new_join_code() to authenticated;
