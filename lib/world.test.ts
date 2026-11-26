import test from 'node:test'
import assert from 'node:assert/strict'
import { BRIDGES, BUILDINGS, HY, POND, ROAD, SIDE, SPAWN, TREES, VX, W, H, blocked, canalX, insideCar, ringLength, ringPos } from './world.ts'

test('시작 위치와 도로는 걸을 수 있다', () => {
  assert.equal(blocked(SPAWN.x, SPAWN.y), false)
  assert.equal(blocked(VX[0], 1800), false)
  assert.equal(blocked(1600, HY[1]), false)
})

test('건물, 연못, 수로, 맵 밖은 막혀 있다', () => {
  for (const b of BUILDINGS) assert.equal(blocked(b.x + b.w / 2, b.y + b.d / 2), true)
  assert.equal(blocked(POND.x, POND.y), true)
  assert.equal(blocked(canalX(1500), 1500), true)
  assert.equal(blocked(-5, 100), true)
  assert.equal(blocked(W + 5, H - 100), true)
})

test('다리 위로는 수로를 건널 수 있다', () => {
  for (const g of BRIDGES) for (let x = g.x + 2; x < g.x + g.w; x += 6) assert.equal(blocked(x, g.y + g.h / 2), false)
})

test('건물은 도로·인도와 겹치지 않고 맵 안에 있다', () => {
  const m = ROAD + SIDE
  for (const b of BUILDINGS) {
    assert.ok(b.x >= 40 && b.y - b.h / 2 >= 0 && b.x + b.w <= W - 40 && b.y + b.d <= H - 40, `맵 밖: ${b.label ?? b.x}`)
    for (const c of VX) assert.ok(b.x + b.w <= c - m || b.x >= c + m, `세로 도로와 겹침: ${b.label ?? b.x}`)
    for (const c of HY) assert.ok(b.y + b.d <= c - m || b.y >= c + m, `가로 도로와 겹침: ${b.label ?? b.x}`)
  }
})

test('공원 나무는 막힌 곳에 심기지 않는다', () => {
  for (const t of TREES.slice(0, 230)) assert.equal(blocked(t.x, t.y), false)
})

test('차량 경로는 한 바퀴 돌면 제자리이고 차도를 벗어나지 않는다', () => {
  for (const [d, cw] of [[16, true], [48, true], [-16, false], [-48, false]] as const) {
    const len = ringLength(d)
    const a = ringPos(d, 0, cw), b = ringPos(d, len, cw)
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.001)
    for (let s = 0; s < len; s += 37) {
      const p = ringPos(d, s, cw)
      const onV = VX.some((c) => Math.abs(p.x - c) <= ROAD), onH = HY.some((c) => Math.abs(p.y - c) <= ROAD)
      assert.ok(onV || onH, `차도 이탈 d=${d} s=${s}`)
    }
  }
})

test('우측통행: 시계 방향 차는 진행 방향의 오른쪽 차로에 있다', () => {
  const p = ringPos(16, 500, true) // 위쪽 도로에서 동쪽으로 가는 중
  assert.ok(Math.abs(p.angle) < 0.001 && p.y > HY[0])
  const q = ringPos(-16, 500, false) // 반시계 방향: 왼쪽 도로에서 남쪽으로 가는 중
  assert.ok(Math.abs(Math.sin(q.angle) - 1) < 0.001 && q.x < VX[0])
})

test('차체 판정: 차가 어느 방향을 보든 차체 안쪽만 막는다', () => {
  const east = { x: 100, y: 100, angle: 0 }, south = { x: 100, y: 100, angle: Math.PI / 2 }
  assert.equal(insideCar(125, 100, east, false), true) // 길이 방향 끝
  assert.equal(insideCar(100, 125, east, false), false) // 옆으로는 폭이 좁다
  assert.equal(insideCar(100, 125, south, false), true) // 90도 돌면 반대
  assert.equal(insideCar(125, 100, south, false), false)
  assert.equal(insideCar(150, 100, east, true), true) // 버스는 더 길다
  assert.equal(insideCar(150, 100, east, false), false)
})
