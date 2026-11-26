-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행한다 (schema.sql 다음에 한 번)
-- 관리자가 고치는 값: invite_code(초대 코드), notice(공지)
create table public.settings (
  key text primary key,
  value text not null default ''
);

alter table public.settings enable row level security;

-- 공지만 로그인한 사람이 읽는다. 초대 코드는 서버만 읽는다. 쓰기 정책은 없다
create policy "notice read" on public.settings
  for select to authenticated using (key = 'notice');
