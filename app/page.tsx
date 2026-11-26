import { redirect } from 'next/navigation'
import Character from '@/components/Character'
import Setup from '@/components/Setup'
import { MAX_LEVEL, STAGE_NAMES, STAGE_START, stageOf, xpToNext } from '@/lib/level'
import { sessionClient } from '@/lib/supabase'
import { signOut } from './actions'

const STATS = [
  ['focus', '집중력'],
  ['memory', '기억력'],
  ['mood', '기분'],
  ['energy', '에너지'],
] as const

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await sessionClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/login')
  const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
  // 화면 안에서 redirect하면 브라우저가 그 이동을 기억해 로그인 뒤에도 되풀이한다. 그래서 바로 그린다
  if (!p) return <Setup error={(await searchParams).error} />

  const stage = stageOf(p.level)
  const need = xpToNext(p.level)
  const maxed = p.level >= MAX_LEVEL
  return (
    <main className="hud">
      <header>
        <div>
          <small>PLAYER</small>
          <b>{p.nickname}</b>
        </div>
        <form action={signOut}><button className="ghost small">로그아웃</button></form>
      </header>

      <section className="stage">
        <Character stage={stage} />
        <p className="rank">{STAGE_NAMES[stage]}</p>
        {!maxed && <p className="next">다음 진화: LV {STAGE_START[stage + 1]}</p>}
      </section>

      <section className="level">
        <div className="lv">LV <strong>{p.level}</strong></div>
        <div className="bar xp" role="progressbar" aria-label="경험치" aria-valuemin={0} aria-valuemax={need} aria-valuenow={Math.min(p.xp, need)}>
          <i style={{ width: `${maxed ? 100 : (p.xp / need) * 100}%` }} />
        </div>
        <small>{maxed ? `MAX · ${p.xp} XP` : `${p.xp} / ${need} XP`}</small>
      </section>

      <section className="stats">
        {STATS.map(([key, label]) => (
          <div key={key}>
            <span>{label}</span>
            <div className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p[key]}>
              <i style={{ width: `${p[key]}%` }} />
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}

// 로그인 쿠키를 읽는 화면이라 미리 만들어둘 수 없다
export const instant = false
