export const CHARACTERS = [
  { id: 'raccoon', name: '라쿤' },
  { id: 'owl', name: '올빼미' },
  { id: 'octopus', name: '문어' },
  { id: 'fox', name: '여우' },
  { id: 'panda', name: '판다' },
  { id: 'penguin', name: '펭귄' },
  { id: 'tiger', name: '호랑이' },
  { id: 'rabbit', name: '토끼' },
  { id: 'shiba', name: '시바견' },
  { id: 'bear', name: '불곰' },
  { id: 'otter', name: '수달' },
  { id: 'frog', name: '개구리' },
  { id: 'koala', name: '코알라' },
  { id: 'hamster', name: '햄스터' },
  { id: 'cat', name: '검은 고양이' },
  { id: 'seagull', name: '갈매기' },
  { id: 'turtle', name: '거북이' },
  { id: 'deer', name: '사슴' },
  { id: 'shark', name: '상어' },
  { id: 'capybara', name: '카피바라' },
]
export const spriteUrl = (id: string, stage: number) => `/characters/${id}-${stage}.webp`

// 그림은 종류마다 같은 크기 틀에 발끝을 맞춰 담겨 있어서, 단계가 오르면 틀 안에서 몸집이 커진다
export default function Character({ id, stage, size = 260 }: { id: string; stage: number; size?: number }) {
  const name = CHARACTERS.find((c) => c.id === id)?.name ?? id
  // eslint-disable-next-line @next/next/no-img-element -- 작은 고정 그림이라 이미지 최적화 서버가 필요 없다
  return <img src={spriteUrl(id, stage)} alt={`${name} ${stage + 1}단계`} height={size} style={{ height: size, width: 'auto', maxWidth: '100%' }} draggable={false} />
}
