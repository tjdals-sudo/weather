export const MAX_LEVEL = 100
export const xpToNext = (level: number) => 50 + 10 * (level - 1)

// 진화 단계가 시작되는 레벨 (6단계)
export const STAGE_START = [1, 10, 25, 45, 70, 100]
export const STAGE_NAMES = ['새끼', '동네 신참', '골목 해결사', '구역 실세', '도시의 거물', '브레인 킹']
export const stageOf = (level: number) => STAGE_START.findLastIndex((s) => level >= s)

// maxDown: 한 번에 내려갈 수 있는 레벨 수. 기록 입력은 1, 기록 취소는 제한 없이 되돌린다
export function applyXp(level: number, xp: number, delta: number, maxDown = 1) {
  xp += Math.round(delta)
  while (level < MAX_LEVEL && xp >= xpToNext(level)) {
    xp -= xpToNext(level)
    level++
  }
  for (let down = 0; xp < 0 && level > 1 && down < maxDown; down++) {
    level--
    xp += xpToNext(level)
  }
  // 더 못 내려가면 넘치는 손실은 버린다
  return { level, xp: Math.max(0, xp) }
}
