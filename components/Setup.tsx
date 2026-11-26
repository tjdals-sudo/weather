import Character, { CHARACTERS } from '@/components/Character'
import { createProfile } from '@/app/actions'

// 가입 화면과 캐릭터 생성 화면이 같이 쓰는 입력칸
export function ProfileFields() {
  return (
    <>
      <label>닉네임<input name="nickname" required maxLength={12} /></label>
      <fieldset>
        <legend>시작 캐릭터</legend>
        <div className="picks">
          {CHARACTERS.map((c, i) => (
            <label key={c.id} className="pick">
              <input type="radio" name="character" value={c.id} defaultChecked={i === 0} />
              <span className="baby"><Character id={c.id} stage={0} size={150} /></span>
              <b>{c.name}</b>
            </label>
          ))}
        </div>
      </fieldset>
    </>
  )
}

// 계정은 있는데 프로필이 없을 때(가입 도중 끊긴 경우)만 보인다
export default function Setup({ error }: { error?: string }) {
  return (
    <main className="panel">
      <h1>캐릭터 생성</h1>
      {error && <p className="error" role="alert">{error}</p>}
      <form action={createProfile}>
        <ProfileFields />
        <button>시작</button>
      </form>
    </main>
  )
}
