-- Mamoste: çok branş + görev ödevi + tek uygulamada tüm dersler (öğrenci).
--   * classes.branch: sınıfın dersi (src/data/branches.js ile aynı kimlikler). Sonradan değişmez.
--   * homeworks.kind: 'sentences' (İngilizce cümle çalışması) | 'task' (görev: açıklama + öğretmenin foto/videosu).
--   * submissions: öğrencinin notu (görevde "Tamamladım" + kısa not), öğretmenin geri bildirimi ve puanı.
--   * Öğrenci cihazı TEK anahtar taşır: farklı öğretmenlerin sınıflarına katılırken aynı anahtar kullanılır
--     (her sınıftaki students satırının token_hash'i aynı). student_classes / student_feed bu anahtarla
--     tüm derslerini tek seferde getirir. Yeni telefona geçişte tek bağlama kodu bütün dersleri taşır.
--   * Medya: 'homework-media' kovası. Yolu <class_id>/<rastgele>/<dosya>; yalnızca sınıfın öğretmeni yükler/siler.
--     Kova herkese açık okunur (tahmin edilemez yol); öğrenci dosya yükleyemez.

-- ---------------------------------------------------------------------------
-- Branş
-- ---------------------------------------------------------------------------

create or replace function public.branch_label(b text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case b
    when 'ingilizce' then 'İngilizce'
    when 'teknoloji-tasarim' then 'Teknoloji ve Tasarım'
    when 'turkce' then 'Türkçe'
    when 'matematik' then 'Matematik'
    when 'fen' then 'Fen Bilimleri'
    when 'sosyal' then 'Sosyal Bilgiler'
    when 'inkilap' then 'İnkılap Tarihi'
    when 'din' then 'Din Kültürü'
    when 'gorsel' then 'Görsel Sanatlar'
    when 'muzik' then 'Müzik'
    when 'beden' then 'Beden Eğitimi'
    when 'bilisim' then 'Bilişim Teknolojileri'
    else b
  end
$$;

alter table public.classes add column branch text not null default 'ingilizce'
  check (branch in ('ingilizce', 'teknoloji-tasarim', 'turkce', 'matematik', 'fen', 'sosyal', 'inkilap', 'din', 'gorsel', 'muzik', 'beden', 'bilisim'));

-- ---------------------------------------------------------------------------
-- Görev ödevi
-- ---------------------------------------------------------------------------

alter table public.homeworks
  add column kind text not null default 'sentences' check (kind in ('sentences', 'task')),
  add column body text check (body is null or char_length(body) <= 4000),
  add column attachments jsonb not null default '[]'::jsonb
    check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 10);

alter table public.submissions
  add column note text check (note is null or char_length(note) <= 1000),
  add column feedback text check (feedback is null or char_length(feedback) <= 1000),
  add column score smallint check (score is null or score between 0 and 100),
  add column feedback_at timestamptz;

-- Öğretmen sonuca geri bildirim/puan yazar (sonucun kendisini değiştiremez).
create policy "öğretmen kendi sınıflarının sonuçlarına geri bildirim yazar" on public.submissions
  for update to authenticated
  using (exists (select 1 from public.homeworks h where h.id = homework_id and public.owns_class(h.class_id)))
  with check (exists (select 1 from public.homeworks h where h.id = homework_id and public.owns_class(h.class_id)));
grant update (feedback, score, feedback_at) on public.submissions to authenticated;

-- ---------------------------------------------------------------------------
-- Cihaz anahtarı: bir cihaz, birden çok sınıf üyeliği
-- ---------------------------------------------------------------------------

create index students_token_idx on public.students (token_hash) where token_hash is not null;

-- Sınıfa katıl. p_token: cihazda zaten bir anahtar varsa (başka bir derse katılmışsa) o verilir ve
-- yeni üyelik aynı anahtara bağlanır; anahtar tanınmazsa yeni anahtar üretilir.
drop function public.student_join(text, text, text);
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
  code text := upper(trim(p_join_code));
  num text := trim(p_number);
  nick text := nullif(left(trim(coalesce(p_nickname, '')), 30), '');
begin
  perform public.check_rate('join:' || code, 30, 600);
  if num !~ '^[0-9]{1,6}$' then
    return query select null::uuid, null::text, null::text, null::text, 'Okul numarası sadece rakam olmalı.';
    return;
  end if;
  select * into c from public.classes cl where cl.join_code = code;
  if not found then
    return query select null::uuid, null::text, null::text, null::text, 'Bu sınıf kodu bulunamadı.';
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
         push_token = coalesce(st.push_token,
           (select o.push_token from public.students o where o.token_hash = h and o.push_token is not null limit 1))
   where st.id = s.id;
  return query select s.id, t, c.name, c.branch, null::text;
end $$;

-- Yeni cihaza bağlan: bağlama kodu bu öğrencinin cihazındaki TÜM dersleri yeni cihaza taşır.
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
  old_hash text;
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
  select st.token_hash into old_hash from public.students st where st.id = l.student_id;
  update public.students st
     set token_hash = public.sha256_hex(t), joined_at = now(), push_token = null
   where st.id = l.student_id or (old_hash is not null and st.token_hash = old_hash);
  select * into s from public.students st where st.id = l.student_id;
  return query select s.id, t, (select cl.name from public.classes cl where cl.id = s.class_id), s.number, null::text;
end $$;

-- Cihazın tüm dersleri (sınıf üyelikleri).
create or replace function public.student_classes(p_token text)
returns table (student_id uuid, class_id uuid, class_name text, branch text, number text, nickname text, teacher_name text)
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
    select st.id, c.id, c.name, c.branch, st.number, st.nickname, t.display_name
      from public.students st
      join public.classes c on c.id = st.class_id
      join public.teachers t on t.id = c.teacher_id
     where st.token_hash = h
     order by c.branch, c.name;
end $$;

-- Cihazın tüm derslerindeki ödevler; son gönderim, öğrencinin notu ve öğretmenin geri bildirimiyle.
create or replace function public.student_feed(p_token text)
returns table (
  id uuid, student_id uuid, class_name text, branch text,
  title text, kind text, body text, attachments jsonb, payload jsonb,
  due_date date, created_at timestamptz,
  submitted_at timestamptz, note text, feedback text, score smallint
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
    select hw.id, st.id, c.name, c.branch,
           hw.title, hw.kind, hw.body, hw.attachments, hw.payload,
           hw.due_date, hw.created_at,
           sb.submitted_at, sb.note, sb.feedback, sb.score
      from public.students st
      join public.classes c on c.id = st.class_id
      join public.homeworks hw on hw.class_id = st.class_id and (hw.target_student_id is null or hw.target_student_id = st.id)
      left join lateral (
        select x.submitted_at, x.note, x.feedback, x.score
          from public.submissions x
         where x.homework_id = hw.id and x.student_id = st.id
         order by x.submitted_at desc limit 1
      ) sb on true
     where st.token_hash = h
     order by hw.due_date nulls last, hw.created_at desc;
end $$;

-- Sonuç gönder (cümle ödevi: results; görev: results '{}' + not).
drop function public.student_submit(uuid, text, uuid, jsonb, integer);
create or replace function public.student_submit(p_student_id uuid, p_token text, p_homework_id uuid, p_results jsonb, p_duration_s integer default null, p_note text default null)
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
  insert into public.submissions (homework_id, student_id, results, duration_s, note)
  values (p_homework_id, s.id, p_results, p_duration_s, nullif(left(trim(coalesce(p_note, '')), 1000), ''))
  returning id into new_id;
  return new_id;
end $$;

-- Push token cihazın bütün üyeliklerine yazılır (hangi dersten ödev gelirse gelsin bildirim gitsin).
create or replace function public.student_set_push_token(p_student_id uuid, p_token text, p_push_token text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  s public.students := public.verify_student(p_student_id, p_token);
begin
  update public.students st set push_token = nullif(trim(p_push_token), '') where st.token_hash = s.token_hash;
end $$;

-- Bildirim: başlıkta ders adı; dokununca ilgili ödev açılsın diye homeworkId + branch + studentId.
create or replace function public.notify_new_homework()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  msgs jsonb;
  c public.classes;
begin
  select * into c from public.classes cl where cl.id = new.class_id;
  select jsonb_agg(jsonb_build_object(
           'to', s.push_token,
           'title', '📚 ' || public.branch_label(c.branch) || ' · yeni ödev',
           'body', new.title || ' — ' || c.name || coalesce(' · son gün ' || to_char(new.due_date, 'DD.MM'), ''),
           'sound', 'default',
           'data', jsonb_build_object('homeworkId', new.id, 'branch', c.branch, 'studentId', s.id)))
    into msgs
    from public.students s
   where s.class_id = new.class_id
     and s.push_token is not null
     and (new.target_student_id is null or s.id = new.target_student_id);
  if msgs is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := msgs,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Medya kovası (öğretmenin foto/videoları)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('homework-media', 'homework-media', true, 52428800, array['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

-- Yol: <class_id>/... ; sınıfın sahibi yükler, değiştirir, siler. Uuid olmayan klasör adı reddedilir.
create or replace function public.owns_media_path(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  first text := split_part(p_name, '/', 1);
begin
  if first !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.owns_class(first::uuid);
end $$;

create policy "öğretmen kendi sınıfına medya yükler" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'homework-media' and public.owns_media_path(name));
create policy "öğretmen kendi sınıfının medyasını görür" on storage.objects
  for select to authenticated
  using (bucket_id = 'homework-media' and public.owns_media_path(name));
create policy "öğretmen kendi sınıfının medyasını günceller" on storage.objects
  for update to authenticated
  using (bucket_id = 'homework-media' and public.owns_media_path(name));
create policy "öğretmen kendi sınıfının medyasını siler" on storage.objects
  for delete to authenticated
  using (bucket_id = 'homework-media' and public.owns_media_path(name));

-- ---------------------------------------------------------------------------
-- Yetkiler
-- ---------------------------------------------------------------------------

revoke execute on function public.student_join(text, text, text, text) from public;
revoke execute on function public.student_classes(text) from public;
revoke execute on function public.student_feed(text) from public;
revoke execute on function public.student_submit(uuid, text, uuid, jsonb, integer, text) from public;
revoke execute on function public.branch_label(text) from public, anon;
revoke execute on function public.owns_media_path(text) from public, anon;
grant execute on function public.student_join(text, text, text, text) to anon, authenticated;
grant execute on function public.student_classes(text) to anon, authenticated;
grant execute on function public.student_feed(text) to anon, authenticated;
grant execute on function public.student_submit(uuid, text, uuid, jsonb, integer, text) to anon, authenticated;
grant execute on function public.owns_media_path(text) to authenticated;
grant execute on function public.branch_label(text) to authenticated;
