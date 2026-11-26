import Link from 'next/link'
import { signIn } from '../actions'

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  return (
    <main className="panel">
      <h1 className="logo">BRAIN<span>UP</span></h1>
      <p className="sub">뇌를 키워라. 아니면 퇴화하든가.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <form action={signIn}>
        <label>아이디<input name="username" autoComplete="username" required minLength={3} maxLength={20} /></label>
        <label>비밀번호<input name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={72} /></label>
        <button>로그인</button>
      </form>
      <Link href="/signup" className="link">처음이면 가입</Link>
    </main>
  )
}

// 로그인 쿠키를 읽는 화면이라 미리 만들어둘 수 없다
export const instant = false
