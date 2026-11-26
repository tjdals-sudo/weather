import Character from '@/components/Character'
import { STAGE_NAMES, STAGE_START } from '@/lib/level'

// 진화 단계 미리보기 (로그인 없이 볼 수 있다)
export default function Characters() {
  return (
    <main className="gallery">
      <h1>라쿤 진화 6단계</h1>
      <div>
        {STAGE_NAMES.map((name, i) => (
          <figure key={name}>
            <Character stage={i} size={200} />
            <figcaption><b>{name}</b><small>LV {STAGE_START[i]}{i < 5 ? `~${STAGE_START[i + 1] - 1}` : ''}</small></figcaption>
          </figure>
        ))}
      </div>
    </main>
  )
}
