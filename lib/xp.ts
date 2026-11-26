// 기록 한 번이 경험치와 능력치를 얼마나 바꾸는지. 수치는 전부 이 파일에서 고친다
export type Kind = 'book' | 'game' | 'exercise' | 'sleep' | 'food'
type Stat = 'focus' | 'memory' | 'mood' | 'energy'

export const KIND_NAMES: Record<Kind, string> = { book: '독서', game: '게임', exercise: '운동', sleep: '수면', food: '음식' }

// 게임 1분당 깎이는 경험치
export const GAME_TYPES = [
  ['low', '퍼즐·전략 (끝이 있고 생각을 많이 함)', 0.2],
  ['mid', '그 밖의 게임', 0.5],
  ['high', '끝없이 이어지는 보상 반복형', 1],
] as const

export const FOODS = [
  ['등푸른 생선', 10], ['견과류', 10], ['블루베리·베리류', 10], ['잎채소·나물', 10], ['달걀', 10], ['통곡물·잡곡밥', 10], ['콩·두부', 10], ['올리브유', 10],
  ['그 밖의 음식 (보통)', 0],
  ['탄산·가당 음료', -10], ['튀김', -10], ['패스트푸드', -10], ['과자·사탕', -10], ['라면·가공육', -10], ['술', -10],
] as const

const STATS: Record<Kind, Stat[]> = { book: ['focus', 'memory'], game: ['focus'], exercise: ['energy', 'mood'], sleep: ['energy', 'mood'], food: ['energy'] }

// 능력치는 경험치 20마다 1씩, 한 번에 최대 5까지 같은 방향으로 움직인다
export const statChange = (kind: Kind, xp: number): Partial<Record<Stat, number>> =>
  Object.fromEntries(STATS[kind].map((s) => [s, Math.sign(xp) * Math.min(5, Math.ceil(Math.abs(xp) / 20))]))

// 입력값으로 경험치와 기록 문구를 만든다. 잘못된 입력이면 사유(문자열)를 돌려준다
export function score(kind: string, get: (name: string) => string): { xp: number; detail: string } | string {
  const name = get('name').trim().slice(0, 60)
  // 상한은 하루 제한이 아니라 DB 숫자 범위를 지키기 위한 것
  const amount = (field: string, max: number, whole = true) => {
    const n = Number(get(field) || 0)
    return Number.isFinite(n) && n >= 0 && n <= max && (!whole || Number.isInteger(n)) ? n : null
  }
  if (kind === 'book') {
    const pages = amount('pages', 100000)
    if (!name) return '책 제목을 적어 주세요'
    if (!pages) return '읽은 쪽수를 적어 주세요'
    const by = [get('author'), get('publisher')].map((v) => v.trim().slice(0, 40)).filter(Boolean).join(' · ')
    return { xp: pages * 2, detail: `${name}${by ? ` (${by})` : ''} ${pages}쪽` }
  }
  if (kind === 'game') {
    const h = amount('hours', 1000), m = amount('minutes', 100000), type = GAME_TYPES.find((t) => t[0] === get('type'))
    if (!name) return '게임 이름을 적어 주세요'
    if (!type) return '게임 종류를 골라 주세요'
    if (h === null || m === null || h * 60 + m === 0) return '게임한 시간을 적어 주세요'
    return { xp: -Math.round((h * 60 + m) * type[2]), detail: `${name} ${h * 60 + m}분` }
  }
  if (kind === 'exercise') {
    const m = amount('minutes', 100000)
    if (!m) return '운동한 시간(분)을 적어 주세요'
    return { xp: m, detail: `${name || '운동'} ${m}분` }
  }
  if (kind === 'sleep') {
    const h = amount('hours', 24, false)
    if (!h) return '잔 시간을 적어 주세요'
    return { xp: h >= 7 && h <= 9 ? 30 : h < 6 ? -30 : 0, detail: `${h}시간` }
  }
  if (kind === 'food') {
    const food = FOODS.find((f) => f[0] === get('food'))
    if (!food) return '음식을 골라 주세요'
    return { xp: food[1], detail: name || food[0] }
  }
  return '잘못된 요청입니다'
}
