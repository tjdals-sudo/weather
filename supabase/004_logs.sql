-- 생활 기록: 한 줄이 한 번의 입력. 쓰기 정책은 없다: 경험치 조작을 막기 위해 서버만 쓴다
create table public.logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('book', 'game', 'exercise', 'sleep', 'food')),
  detail text not null,
  xp int not null,
  created_at timestamptz not null default now()
);

create index logs_user_recent on public.logs (user_id, created_at desc);

alter table public.logs enable row level security;

create policy "own logs read" on public.logs
  for select to authenticated using ((select auth.uid()) = user_id);
