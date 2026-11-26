export const MAX_LEVEL = 100
export const xpToNext = (level: number) => 50 + 10 * (level - 1)

// 진화 단계가 시작되는 레벨 (6단계)
export const STAGE_START = [1, 10, 25, 45, 70, 100]
export const STAGE_NAMES = ['새끼', '동네 신참', '골목 해결사', '구역 실세', '도시의 거물', '브레인 킹']
export const stageOf = (level: number) => STAGE_START.findLastIndex((s) => level >= s)

export function applyXp(level: number, xp: number, delta: number) {
  xp += Math.round(delta)
  while (level < MAX_LEVEL && xp >= xpToNext(level)) {
    xp -= xpToNext(level)
    level++
  }
  if (xp < 0) {
    // 한 번 입력으로 최대 1레벨만 내려가고, 넘치는 손실은 버린다
    if (level > 1) {
      level--
      xp = Math.max(0, xpToNext(level) + xp)
    } else xp = 0
  }
  return { level, xp }
}
