import { redirect } from 'next/navigation'
import Game from '@/components/Game'
import Setup from '@/components/Setup'
import { sessionClient } from '@/lib/supabase'

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await sessionClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/login')
  const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
  // 화면 안에서 redirect하면 브라우저가 그 이동을 기억해 로그인 뒤에도 되풀이한다. 그래서 바로 그린다
  if (!p) return <Setup error={(await searchParams).error} />

  return <Game profile={p} />
}

// 로그인 쿠키를 읽는 화면이라 미리 만들어둘 수 없다
export const instant = false
