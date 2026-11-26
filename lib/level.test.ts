import test from 'node:test'
import assert from 'node:assert/strict'
import { applyXp, stageOf, xpToNext } from './level.ts'

test('필요 경험치: 1→2는 50, 99→100은 1030, 총합 53460', () => {
  assert.equal(xpToNext(1), 50)
  assert.equal(xpToNext(99), 1030)
  let sum = 0
  for (let l = 1; l < 100; l++) sum += xpToNext(l)
  assert.equal(sum, 53460)
})

test('레벨업: 남는 경험치는 이월되고 여러 레벨을 한 번에 오른다', () => {
  assert.deepEqual(applyXp(1, 0, 50), { level: 2, xp: 0 })
  assert.deepEqual(applyXp(1, 40, 80), { level: 3, xp: 10 }) // 120 = 50 + 60 + 10
  assert.deepEqual(applyXp(1, 0, 53460), { level: 100, xp: 0 })
  assert.deepEqual(applyXp(100, 0, 5000), { level: 100, xp: 5000 })
})

test('레벨 다운: 한 번에 최대 1레벨, 레벨 1은 0에서 멈춘다', () => {
  assert.deepEqual(applyXp(5, 10, -30), { level: 4, xp: 60 }) // 레벨4 필요치 80 - 20
  assert.deepEqual(applyXp(5, 10, -9999), { level: 4, xp: 0 })
  assert.deepEqual(applyXp(1, 10, -9999), { level: 1, xp: 0 })
  assert.deepEqual(applyXp(5, 10, -10), { level: 5, xp: 0 })
})

test('소수 경험치는 반올림한다 (게임 1분당 0.2)', () => {
  assert.deepEqual(applyXp(5, 10, -0.2 * 37), { level: 5, xp: 3 })
})

test('진화 단계 경계', () => {
  assert.deepEqual([1, 9, 10, 24, 25, 44, 45, 69, 70, 99, 100].map(stageOf), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5])
})
