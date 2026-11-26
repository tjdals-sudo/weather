import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import Character, { CHARACTERS } from '@/components/Character'
import { MAX_LEVEL, stageOf } from '@/lib/level'
import { adminClient, setting } from '@/lib/supabase'
import { removeLog } from '@/app/actions'
import { KIND_NAMES, type Kind } from '@/lib/xp'
import { currentAdmin, deleteUser, resetPassword, saveSetting, updateProfile } from './actions'

const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'short' }) : '없음')

export default async function Admin({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  await connection()
  const me = await currentAdmin()
  if (!me) notFound() // 관리자가 아니면 이 주소가 있는지조차 알려 주지 않는다

  const { done, error } = await searchParams
  const admin = adminClient()
  const [{ data: profiles }, { data: logs }, { data: auth }] = await Promise.all([
    admin.from('profiles').select('*').order('created_at'),
    admin.from('logs').select('id, user_id, kind, detail, xp, created_at').order('created_at', { ascending: false }).limit(50),
    admin.auth.admin.listUsers({ perPage: 200 }),
  ])
  const [invite, notice] = await Promise.all([setting('invite_code'), setting('notice')])
  const lastSeen = new Map(auth?.users.map((u) => [u.id, u.last_sign_in_at]))
  const orphans = auth?.users.filter((u) => !profiles?.some((p) => p.id === u.id)) ?? []

  return (
    <main className="admin">
      <header>
        <h1>관리자</h1>
        <Link href="/" className="link">게임으로</Link>
      </header>
      {done && <p className="notice" role="status">{done}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <p className="sub">가입자 {profiles?.length ?? 0}명 · Supabase 무료 플랜은 일주일간 아무도 접속하지 않으면 일시 정지됩니다. 그럴 땐 Supabase 대시보드에서 다시 켜면 됩니다.</p>

      <section className="user">
        {invite === null && <p className="error" role="alert">설정 표가 없습니다. supabase/002_settings.sql을 Supabase SQL Editor에서 실행해 주세요.</p>}
        <form action={saveSetting}>
          <input type="hidden" name="key" value="invite_code" />
          <label>초대 코드<small>{invite ? '지금은 이 코드를 아는 사람만 가입합니다' : '지금은 주소만 알면 누구나 가입합니다'} · 비우면 누구나 가입</small>
            <input name="value" defaultValue={invite ?? ''} autoComplete="off" maxLength={40} />
          </label>
          <button className="small">초대 코드 저장</button>
        </form>
        <form action={saveSetting}>
          <input type="hidden" name="key" value="notice" />
          <label>공지<small>접속한 모두의 화면 위쪽에 뜹니다 · 비우고 저장하면 내려갑니다</small>
            <input name="value" defaultValue={notice ?? ''} autoComplete="off" maxLength={80} />
          </label>
          <button className="small">공지 저장</button>
        </form>
        <a className="link" href="https://supabase.com/dashboard/org/_/usage" target="_blank" rel="noreferrer">실시간 사용량 보기 (Supabase, 새 창)</a>
      </section>

      <h2>가입자</h2>
      {profiles?.map((p) => (
        <details key={p.id} className="user">
          <summary>
            <Character id={p.character} stage={stageOf(p.level)} size={56} />
            <span>
              <span className="name"><b>{p.nickname}</b>{p.is_admin && <em>관리자</em>}</span>
              <small>{p.username} · {CHARACTERS.find((c) => c.id === p.character)?.name} · LV {p.level}</small>
              <small>가입 {when(p.created_at)} · 최근 로그인 {when(lastSeen.get(p.id))}</small>
            </span>
          </summary>

          <form action={updateProfile}>
            <input type="hidden" name="id" value={p.id} />
            <label>닉네임<input name="nickname" defaultValue={p.nickname} required maxLength={12} /></label>
            <div className="row">
              <label>레벨<input name="level" type="number" defaultValue={p.level} min={1} max={MAX_LEVEL} required /></label>
              <label>경험치<input name="xp" type="number" defaultValue={p.xp} min={0} required /></label>
            </div>
            <label className="check"><input type="checkbox" name="is_admin" defaultChecked={p.is_admin} /> 관리자 권한</label>
            <button className="small">정보 저장</button>
          </form>

          <form action={resetPassword}>
            <input type="hidden" name="id" value={p.id} />
            <label>새 비밀번호<small>8자 이상. 바꾼 뒤 본인에게 직접 알려 주세요</small>
              <input name="password" type="text" autoComplete="off" required minLength={8} maxLength={72} />
            </label>
            <button className="small ghost">비밀번호 바꾸기</button>
          </form>

          {p.id !== me.id && (
            <form action={deleteUser}>
              <input type="hidden" name="id" value={p.id} />
              <label className="check"><input type="checkbox" name="confirm" required /> 이 계정과 모든 기록을 지웁니다. 되돌릴 수 없습니다</label>
              <button className="small danger">계정 삭제</button>
            </form>
          )}
        </details>
      ))}

      <h2>최근 기록 (50건까지)</h2>
      {!logs?.length && <p className="sub">아직 기록이 없습니다.</p>}
      {logs?.map((l) => (
        <form key={l.id} action={removeLog} className="user orphan">
          <input type="hidden" name="id" value={l.id} />
          <input type="hidden" name="back" value="admin" />
          <span><b>{profiles?.find((p) => p.id === l.user_id)?.nickname} · {KIND_NAMES[l.kind as Kind]} {l.xp > 0 ? '+' : ''}{l.xp}</b><small>{l.detail} · {when(l.created_at)}</small></span>
          <button className="small danger">취소</button>
        </form>
      ))}

      {orphans.length > 0 && (
        <section>
          <h2>캐릭터를 아직 만들지 않은 계정</h2>
          {orphans.map((u) => (
            <form key={u.id} action={deleteUser} className="user orphan">
              <input type="hidden" name="id" value={u.id} />
              <span><b>{u.email?.split('@')[0]}</b><small>가입 {when(u.created_at)}</small></span>
              <label className="check"><input type="checkbox" name="confirm" required /> 삭제 확인</label>
              <button className="small danger">삭제</button>
            </form>
          ))}
        </section>
      )}
    </main>
  )
}

// 로그인 쿠키를 읽는 화면이라 미리 만들어둘 수 없다
export const instant = false
