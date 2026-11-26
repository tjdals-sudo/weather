-- Supabase 대시보드 > SQL Editor 에 붙여넣고 실행한다 (한 번)
-- 캐릭터를 마지막으로 바꾼 때. 비어 있으면 아직 바꾼 적이 없다
alter table public.profiles add column character_changed_at timestamptz;
