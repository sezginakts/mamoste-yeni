-- Ödev bildirimi: öğretmen ödev verince öğrencilerin telefonuna Expo push bildirimi.
--   * Öğrenci uygulaması Expo push token'ını student_set_push_token ile kaydeder (cihaz anahtarıyla doğrulanır).
--   * homeworks tablosuna satır eklenince tetikleyici, hedef öğrencilerin token'larına Expo'nun push servisine istek atar (pg_net).
--   * Öğretmen push token'ı göremez (students için sütun bazlı select yetkisi bu sütunu içermez).

create extension if not exists pg_net;

alter table public.students add column if not exists push_token text
  check (push_token is null or push_token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$');

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
  update public.students st set push_token = nullif(trim(p_push_token), '') where st.id = s.id;
end $$;

-- Yeni ödev → bildirim. Expo push servisi tek istekte en çok 100 mesaj alır; sınıflar bunun altında.
create or replace function public.notify_new_homework()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  msgs jsonb;
  cname text;
begin
  select c.name into cname from public.classes c where c.id = new.class_id;
  select jsonb_agg(jsonb_build_object(
           'to', s.push_token,
           'title', '📚 Yeni ödev: ' || new.title,
           'body', cname || coalesce(' · son gün ' || to_char(new.due_date, 'DD.MM'), ''),
           'sound', 'default',
           'data', jsonb_build_object('homeworkId', new.id)))
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

create trigger homeworks_notify
  after insert on public.homeworks
  for each row execute function public.notify_new_homework();

revoke execute on function public.student_set_push_token(uuid, text, text) from public;
revoke execute on function public.notify_new_homework() from public, anon, authenticated;
grant execute on function public.student_set_push_token(uuid, text, text) to anon, authenticated;
