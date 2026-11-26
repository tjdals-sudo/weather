import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 로그인한 사용자 권한으로 동작 (RLS 적용)
export async function sessionClient() {
  const store = await cookies()
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // 서버 컴포넌트에서는 쿠키를 못 쓴다. 갱신은 proxy.ts가 맡는다
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options))
        } catch {}
      },
    },
  })
}

// RLS를 건너뛰는 서버 전용 클라이언트. 경험치·프로필 쓰기는 전부 이쪽으로만 한다
export const adminClient = () =>
  createClient(URL, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })

// Supabase 로그인은 이메일이 필요해서 아이디를 가짜 주소로 감싼다 (메일은 발송되지 않음)
export const emailOf = (username: string) => `${username}@brainup.local`
