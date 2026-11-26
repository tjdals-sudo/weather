-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행한다
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  nickname text not null,
  character text not null,
  level int not null default 1 check (level between 1 and 100),
  xp int not null default 0 check (xp >= 0),
  focus int not null default 10 check (focus between 0 and 100),
  memory int not null default 10 check (memory between 0 and 100),
  mood int not null default 10 check (mood between 0 and 100),
  energy int not null default 10 check (energy between 0 and 100),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 읽기는 본인 것만. 쓰기 정책은 없다: 경험치 조작을 막기 위해 서버만 쓴다
create policy "own profile read" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
