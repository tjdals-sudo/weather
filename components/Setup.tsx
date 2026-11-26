import Character, { CHARACTERS } from '@/components/Character'
import { createProfile } from '@/app/actions'

export default function Setup({ error }: { error?: string }) {
  return (
    <main className="panel">
      <h1>캐릭터 생성</h1>
      {error && <p className="error" role="alert">{error}</p>}
      <form action={createProfile}>
        <label>닉네임<input name="nickname" required maxLength={12} /></label>
        <fieldset>
          <legend>시작 캐릭터</legend>
          <div className="picks">
            {CHARACTERS.map((c, i) => (
              <label key={c.id} className={c.ready ? 'pick' : 'pick locked'}>
                <input type="radio" name="character" value={c.id} disabled={!c.ready} defaultChecked={i === 0} />
                {c.ready ? <Character stage={0} size={90} /> : <div className="soon">?</div>}
                <b>{c.name}</b>
                {!c.ready && <small>준비 중</small>}
              </label>
            ))}
          </div>
        </fieldset>
        <button>시작</button>
      </form>
    </main>
  )
}
