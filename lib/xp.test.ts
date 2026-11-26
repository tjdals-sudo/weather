import test from 'node:test'
import assert from 'node:assert/strict'
import { score, statChange } from './xp.ts'
import { applyXp } from './level.ts'

const form = (o: Record<string, string>) => (k: string) => o[k] ?? ''

test('기록별 경험치', () => {
  assert.deepEqual(score('book', form({ name: '사피엔스', author: '하라리', pages: '30' })), { xp: 60, detail: '사피엔스 (하라리) 30쪽' })
  assert.equal((score('game', form({ name: '롤', type: 'high', hours: '1', minutes: '30' })) as { xp: number }).xp, -90)
  assert.equal((score('game', form({ name: '스도쿠', type: 'low', minutes: '60' })) as { xp: number }).xp, -12)
  assert.equal((score('exercise', form({ minutes: '30' })) as { xp: number }).xp, 30)
  assert.equal((score('sleep', form({ hours: '7.5' })) as { xp: number }).xp, 30)
  assert.equal((score('sleep', form({ hours: '5' })) as { xp: number }).xp, -30)
  assert.equal((score('sleep', form({ hours: '6.5' })) as { xp: number }).xp, 0)
  assert.equal((score('food', form({ food: '술' })) as { xp: number }).xp, -10)
  assert.deepEqual(score('sns', form({ name: '인스타', hours: '1', minutes: '20' })), { xp: -40, detail: '인스타 80분' })
  assert.deepEqual(score('youtube', form({ minutes: '30' })), { xp: -15, detail: '30분' })
  assert.equal(typeof score('sns', form({})), 'string')
})

test('잘못된 입력은 사유를 돌려준다', () => {
  for (const bad of [form({ name: '책', pages: '-5' }), form({ name: '책', pages: '1.5' }), form({ name: '책', pages: 'abc' }), form({ pages: '10' })])
    assert.equal(typeof score('book', bad), 'string')
  assert.equal(typeof score('food', form({ food: '없는 음식' })), 'string')
  assert.equal(typeof score('hack', form({})), 'string')
})

test('능력치는 경험치 방향을 따라 최대 5', () => {
  assert.deepEqual(statChange('book', 60), { focus: 3, memory: 3 })
  assert.deepEqual(statChange('game', -900), { focus: -5 })
  assert.deepEqual(statChange('sleep', 0), { energy: 0, mood: 0 })
})

test('기록 취소는 오른 만큼 여러 레벨을 되돌린다', () => {
  const up = applyXp(1, 10, 500)
  assert.deepEqual(applyXp(up.level, up.xp, -500, Infinity), { level: 1, xp: 10 })
})
