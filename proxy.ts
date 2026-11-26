import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 만료된 로그인 토큰을 갱신해 쿠키에 다시 써주고(로그인 유지), 비로그인 접근을 로그인 화면으로 보낸다
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  const { data } = await supabase.auth.getUser()
  // 로그인 여부에 따른 이동은 여기서만 한다 (화면 렌더링 전의 진짜 HTTP 이동)
  const onLogin = request.nextUrl.pathname === '/login'
  if (!data.user === onLogin) return response
  const url = request.nextUrl.clone()
  url.pathname = data.user ? '/' : '/login'
  url.search = ''
  const moved = NextResponse.redirect(url)
  response.cookies.getAll().forEach((c) => moved.cookies.set(c))
  return moved
}

export const config = { matcher: ['/((?!_next/|favicon.ico|characters).*)'] }
