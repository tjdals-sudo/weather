import Link from 'next/link'
import { ProfileFields } from '@/components/Setup'
import { connection } from 'next/server'
import { setting } from '@/lib/supabase'
import { signUp } from '../actions'

export default async function Signup({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection()
  const { error } = await searchParams
  const invite = await setting('invite_code')
  return (
    <main className="panel signup">
      <h1>가입</h1>
      {error && <p className="error" role="alert">{error}</p>}
      <form action={signUp}>
        <label>아이디<small>영문 소문자·숫자·밑줄 3~20자</small>
          <input name="username" autoComplete="username" required minLength={3} maxLength={20} />
        </label>
        <label>비밀번호<small>8자 이상</small>
          <input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
        </label>
        <label>비밀번호 확인
          <input name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
        </label>
        {invite && (
          <label>초대 코드<small>관리자에게 받은 코드</small>
            <input name="invite" autoComplete="off" required maxLength={40} />
          </label>
        )}
        <ProfileFields />
        <button>가입하고 시작</button>
      </form>
      <Link href="/login" className="link">이미 계정이 있으면 로그인</Link>
    </main>
  )
}

// 로그인 쿠키를 읽는 화면이라 미리 만들어둘 수 없다
export const instant = false
