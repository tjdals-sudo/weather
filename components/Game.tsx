'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useRef, useState } from 'react'
import { signOut } from '@/app/actions'
import Character, { spriteUrl } from '@/components/Character'
import { MAX_LEVEL, STAGE_NAMES, STAGE_START, stageOf, xpToNext } from '@/lib/level'
import {
  BRIDGES, BUILDINGS, CANAL, CANAL_HALF, H, HY, PARK, PATH_X, PATH_Y, POND, ROAD, SIDE, SPAWN, TREES, VX, W,
  blocked, carSize, insideCar, pushOut, ringLength, ringPos, rng, type Building, type Tree,
} from '@/lib/world'

type Profile = { id: string; is_admin: boolean; nickname: string; character: string; level: number; xp: number; focus: number; memory: number; mood: number; energy: number }
type G = CanvasRenderingContext2D

const STATS = [['focus', '집중력'], ['memory', '기억력'], ['mood', '기분'], ['energy', '에너지']] as const
const HK = 0.5 // 건물 높이를 화면에서 얼마나 세워 보일지
const SPEED = 230
const BODY = 22 // 발 위로 이만큼의 몸통도 차에 부딪힌다 (캐릭터 그림이 차 위에 겹쳐 보이지 않게)
const ACT_TIME = 0.24
type Act = 'L' | 'R' | 'H' | 'J' // 왼손 펀치, 오른손 펀치, 박치기, 점프

// 맵에서 보이는 캐릭터 키 (단계가 오를수록 크다)
const tallOf = (stage: number) => [0.5, 0.6, 0.7, 0.8, 0.9, 1][stage] * 100

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.ceil(w)
  c.height = Math.ceil(h)
  return c
}

// ── 바닥: 한 번만 그려 두고 매 프레임 복사한다 ──────────────────────────
function buildGround() {
  const c = makeCanvas(W, H), g = c.getContext('2d')!, r = rng(3)
  g.fillStyle = '#b9b6ab'
  g.fillRect(0, 0, W, H)
  g.strokeStyle = 'rgba(0,0,0,.045)'
  g.lineWidth = 1
  g.beginPath()
  for (let x = 0; x < W; x += 36) { g.moveTo(x, 0); g.lineTo(x, H) }
  for (let y = 0; y < H; y += 36) { g.moveTo(0, y); g.lineTo(W, y) }
  g.stroke()

  // 공원 잔디
  g.save()
  g.beginPath()
  g.rect(PARK.x, PARK.y, PARK.w, PARK.h)
  g.clip()
  g.fillStyle = '#62a04c'
  g.fillRect(PARK.x, PARK.y, PARK.w, PARK.h)
  for (let i = 0; i < 900; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(38,104,40,.16)' : 'rgba(170,205,96,.13)'
    g.beginPath()
    g.ellipse(PARK.x + r() * PARK.w, PARK.y + r() * PARK.h, 30 + r() * 90, 18 + r() * 50, r() * 3, 0, 7)
    g.fill()
  }
  // 수로
  g.lineJoin = 'round'
  const canal = () => { g.beginPath(); CANAL.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))) }
  for (const [color, width] of [['#8d8873', CANAL_HALF * 2 + 16], ['#c9c2a8', CANAL_HALF * 2 + 8], ['#2f7fa8', CANAL_HALF * 2], ['#3f97be', CANAL_HALF * 1.5], ['#55abcf', CANAL_HALF * 0.8]] as const) {
    canal(); g.strokeStyle = color; g.lineWidth = width; g.stroke()
  }
  g.strokeStyle = 'rgba(255,255,255,.28)'
  g.lineWidth = 2
  g.lineCap = 'round'
  for (let i = 4; i < CANAL.length - 4; i += 3) {
    const [x, y] = CANAL[i], ox = (r() - 0.5) * CANAL_HALF * 1.4
    g.beginPath(); g.moveTo(x + ox - 9, y); g.quadraticCurveTo(x + ox, y - 3, x + ox + 9, y); g.stroke()
  }
  g.lineCap = 'butt'
  // 산책로
  const paths = () => {
    g.beginPath()
    for (const y of PATH_Y) { g.moveTo(PATH_X[0], y); g.lineTo(PATH_X[3], y) }
    for (const x of PATH_X) { g.moveTo(x, PATH_Y[0]); g.lineTo(x, PATH_Y[4]) }
    g.moveTo(POND.x + POND.r + 26, POND.y); g.arc(POND.x, POND.y, POND.r + 26, 0, 7)
  }
  for (const [color, width] of [['#a99c7c', 36], ['#dcd2b7', 30]] as const) { paths(); g.strokeStyle = color; g.lineWidth = width; g.stroke() }
  // 다리
  for (const b of BRIDGES) {
    g.fillStyle = '#c7b48d'
    g.fillRect(b.x, b.y, b.w, b.h)
    g.strokeStyle = 'rgba(70,50,25,.25)'
    g.lineWidth = 1
    g.beginPath()
    for (let x = b.x + 8; x < b.x + b.w; x += 10) { g.moveTo(x, b.y); g.lineTo(x, b.y + b.h) }
    g.stroke()
    g.fillStyle = '#6f5a3a'
    g.fillRect(b.x, b.y, b.w, 6)
    g.fillRect(b.x, b.y + b.h - 6, b.w, 6)
  }
  // 트라이볼 수변
  g.fillStyle = '#c9c2a8'
  g.beginPath(); g.arc(POND.x, POND.y, POND.r + 8, 0, 7); g.fill()
  const water = g.createRadialGradient(POND.x - 40, POND.y - 40, 20, POND.x, POND.y, POND.r)
  water.addColorStop(0, '#6fbfdd'); water.addColorStop(1, '#2f7fa8')
  g.fillStyle = water
  g.beginPath(); g.arc(POND.x, POND.y, POND.r, 0, 7); g.fill()
  g.restore()

  // 인도 → 차도 → 차선
  const m = ROAD + SIDE
  g.fillStyle = '#cdc9bd'
  for (const x of VX) g.fillRect(x - m, 0, m * 2, H)
  for (const y of HY) g.fillRect(0, y - m, W, m * 2)
  g.fillStyle = '#8f8b80'
  for (const x of VX) { g.fillRect(x - ROAD - 3, 0, 3, H); g.fillRect(x + ROAD, 0, 3, H) }
  for (const y of HY) { g.fillRect(0, y - ROAD - 3, W, 3); g.fillRect(0, y + ROAD, W, 3) }
  g.fillStyle = '#3a3d43'
  for (const x of VX) g.fillRect(x - ROAD, 0, ROAD * 2, H)
  for (const y of HY) g.fillRect(0, y - ROAD, W, ROAD * 2)
  for (let i = 0; i < 9000; i++) {
    const v = r() < 0.5, c0 = (v ? VX : HY)[r() < 0.5 ? 0 : 1] + (r() - 0.5) * ROAD * 2, t = r() * (v ? H : W)
    g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.14)' : 'rgba(255,255,255,.05)'
    g.fillRect(v ? c0 : t, v ? t : c0, 2, 2)
  }
  // 세로 도로 기준으로 그리고, 가로 도로는 x·y를 바꿔 같은 코드를 쓴다 (swap이면 좌우가 뒤집히므로 side로 보정)
  const mark = (c: number, crosses: number[], len: number, swap: boolean) => {
    g.save()
    if (swap) g.transform(0, 1, 1, 0, 0, 0)
    const side = swap ? -1 : 1, z = m + 34
    const segs: [number, number][] = [[0, crosses[0] - z], [crosses[0] + z, crosses[1] - z], [crosses[1] + z, len]]
    for (const [a, b] of segs) {
      g.strokeStyle = '#e3b41f'; g.lineWidth = 2.5; g.setLineDash([])
      g.beginPath(); g.moveTo(c - 3, a); g.lineTo(c - 3, b); g.moveTo(c + 3, a); g.lineTo(c + 3, b); g.stroke()
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2
      g.beginPath(); g.moveTo(c - 60, a); g.lineTo(c - 60, b); g.moveTo(c + 60, a); g.lineTo(c + 60, b); g.stroke()
      g.setLineDash([22, 26])
      g.beginPath(); g.moveTo(c - 32, a); g.lineTo(c - 32, b); g.moveTo(c + 32, a); g.lineTo(c + 32, b); g.stroke()
      g.setLineDash([])
    }
    g.fillStyle = 'rgba(255,255,255,.9)'
    for (const k of crosses) {
      // 정지선: 교차로로 들어가는 쪽 차로에만
      g.fillRect(side > 0 ? c - 60 : c + 3, k - z - 2, 57, 5)
      g.fillRect(side > 0 ? c + 3 : c - 60, k + z - 3, 57, 5)
      for (let x = c - 58; x < c + 58; x += 15) { g.fillRect(x, k - m - 30, 9, 26); g.fillRect(x, k + m + 4, 9, 26) }
    }
    g.restore()
  }
  for (const x of VX) mark(x, HY, H, false)
  for (const y of HY) mark(y, VX, W, true)

  // 그림자 (해는 북서쪽)
  g.fillStyle = 'rgba(0,0,0,.2)'
  for (const b of BUILDINGS) {
    const s = b.h * 0.32
    g.beginPath()
    g.moveTo(b.x + b.w, b.y); g.lineTo(b.x + b.w + s, b.y + s * 0.4); g.lineTo(b.x + b.w + s, b.y + b.d + s * 0.4)
    g.lineTo(b.x + s, b.y + b.d + s * 0.4); g.lineTo(b.x, b.y + b.d); g.closePath(); g.fill()
  }
  for (const t of TREES) { g.beginPath(); g.ellipse(t.x + 8, t.y + 5, t.r * 0.95, t.r * 0.55, 0, 0, 7); g.fill() }
  return c
}

// ── 건물: 지붕(위)과 남쪽 벽(아래)을 한 장으로 그려 둔다 ────────────────
const LOOK = {
  glass: { wall: ['#6fa3c4', '#2c4f69'], roof: '#40586a', win: '' },
  office: { wall: ['#979ba3', '#5b5f67'], roof: '#757981', win: '#26364a' },
  apt: { wall: ['#e0d4bd', '#a5987f'], roof: '#bfb39c', win: '#465263' },
  civic: { wall: ['#ebe7dd', '#b3aea3'], roof: '#d2cdc0', win: '#55798f' },
  shop: { wall: ['#d9d2c4', '#a39b8c'], roof: '#8c9198', win: '#2f4254' },
  convention: { wall: ['#d3d7dc', '#9399a1'], roof: '#c2c8cf', win: '#4d6a80' },
  hanok: { wall: ['#f1ebde', '#cfc6b3'], roof: '#46505c', win: '' },
}
function buildingSprite(b: Building, seed: number) {
  const hk = b.h * HK, c = makeCanvas(b.w, b.d + hk), g = c.getContext('2d')!, r = rng(seed), L = LOOK[b.style]
  const wall = g.createLinearGradient(0, b.d, 0, b.d + hk)
  wall.addColorStop(0, L.wall[0]); wall.addColorStop(1, L.wall[1])
  g.fillStyle = wall
  g.fillRect(0, b.d, b.w, hk)

  if (b.style === 'glass') {
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1
    g.beginPath(); for (let x = 5; x < b.w; x += 10) { g.moveTo(x, b.d); g.lineTo(x, b.d + hk) } g.stroke()
    g.strokeStyle = 'rgba(8,24,40,.3)'
    g.beginPath(); for (let y = b.d + 6; y < b.d + hk; y += 11) { g.moveTo(0, y); g.lineTo(b.w, y) } g.stroke()
    const sheen = g.createLinearGradient(0, b.d, b.w, b.d + hk)
    sheen.addColorStop(0, 'rgba(255,255,255,.32)'); sheen.addColorStop(0.45, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(0,10,30,.25)')
    g.fillStyle = sheen; g.fillRect(0, b.d, b.w, hk)
  } else if (b.style === 'hanok') {
    g.fillStyle = '#5c3f29'
    for (let x = 0; x < b.w; x += 26) g.fillRect(x, b.d, 4, hk)
    g.fillRect(0, b.d + hk - 4, b.w, 4)
    g.fillStyle = '#7a5637'; g.fillRect(b.w / 2 - 9, b.d + 5, 18, hk - 5)
  } else {
    const top = b.style === 'shop' ? 16 : 6, bottom = b.style === 'shop' ? 16 : 4
    for (let y = b.d + top; y + 9 < b.d + hk - bottom; y += 15) {
      if (b.style === 'apt') { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(0, y + 10, b.w, 2) }
      for (let x = 6; x + 8 < b.w - 4; x += 14) { g.fillStyle = r() < 0.13 ? '#ffe6a0' : L.win; g.fillRect(x, y, 8, 9) }
    }
    if (b.style === 'shop') {
      g.fillStyle = '#2a2d33'; g.fillRect(0, b.d + 3, b.w, 11)
      const hue = Math.floor(r() * 360)
      for (let x = 0; x < b.w; x += 12) { g.fillStyle = (x / 12) % 2 ? '#f4f1ea' : `hsl(${hue} 62% 48%)`; g.fillRect(x, b.d + hk - 14, 12, 10) }
    }
  }
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, b.d, b.w, 3)
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, b.d, 2, hk); g.fillRect(b.w - 2, b.d, 2, hk)

  // 지붕
  g.fillStyle = L.roof
  g.fillRect(0, 0, b.w, b.d)
  if (b.style === 'hanok') {
    const tile = g.createLinearGradient(0, 0, 0, b.d)
    tile.addColorStop(0, '#333b45'); tile.addColorStop(0.5, '#5d6875'); tile.addColorStop(1, '#333b45')
    g.fillStyle = tile; g.fillRect(0, 0, b.w, b.d)
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1
    g.beginPath(); for (let x = 3; x < b.w; x += 5) { g.moveTo(x, 0); g.lineTo(x, b.d) } g.stroke()
    g.fillStyle = '#252b33'; g.fillRect(0, b.d / 2 - 3, b.w, 6)
    g.fillStyle = '#e9e4d6'; g.fillRect(0, 0, b.w, 2); g.fillRect(0, b.d - 2, b.w, 2)
  } else if (b.style === 'convention') {
    for (let x = 0; x < b.w; x += 40) {
      const ridge = g.createLinearGradient(x, 0, x + 40, 0)
      ridge.addColorStop(0, '#e2e6ea'); ridge.addColorStop(0.5, '#a9b0b8'); ridge.addColorStop(1, '#7f8790')
      g.fillStyle = ridge; g.fillRect(x, 0, 40, b.d)
    }
  } else {
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 2; g.strokeRect(7, 7, b.w - 14, b.d - 14)
    if (b.style === 'glass' && b.h > 250) {
      g.strokeStyle = '#e8d34a'; g.lineWidth = 3
      g.beginPath(); g.arc(b.w / 2, b.d / 2, Math.min(b.w, b.d) * 0.28, 0, 7); g.stroke()
      g.fillStyle = '#e8d34a'; g.font = `700 ${Math.min(b.w, b.d) * 0.3}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText('H', b.w / 2, b.d / 2 + 2)
    } else {
      for (let i = 0; i < 2 + Math.floor((b.w * b.d) / 14000); i++) {
        const w = 16 + r() * 26, d = 12 + r() * 18, x = 12 + r() * (b.w - w - 24), y = 12 + r() * (b.d - d - 24)
        g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 4, y + 4, w, d)
        g.fillStyle = r() < 0.5 ? '#aab0b8' : '#8d939b'; g.fillRect(x, y, w, d)
        g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, y, w, 2)
      }
    }
  }
  g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.strokeRect(1, 1, b.w - 2, b.d - 2)
  return c
}

// 트라이볼: 물 위에 선 뒤집힌 원뿔 세 개
function tribowlSprite() {
  const c = makeCanvas(320, 230), g = c.getContext('2d')!
  for (const [cx, base] of [[160, 120], [88, 190], [232, 190]]) {
    const top = base - 78
    const body = g.createLinearGradient(cx - 70, 0, cx + 70, 0)
    body.addColorStop(0, '#f2f5f7'); body.addColorStop(0.55, '#b4bec7'); body.addColorStop(1, '#77838e')
    g.fillStyle = body
    g.beginPath(); g.moveTo(cx - 68, top); g.quadraticCurveTo(cx - 40, base - 10, cx - 16, base); g.lineTo(cx + 16, base)
    g.quadraticCurveTo(cx + 40, base - 10, cx + 68, top); g.closePath(); g.fill()
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.stroke()
    g.fillStyle = '#e9eef2'
    g.beginPath(); g.ellipse(cx, top, 68, 30, 0, 0, 7); g.fill(); g.stroke()
    g.fillStyle = '#c3ccd4'
    g.beginPath(); g.ellipse(cx, top + 3, 50, 20, 0, 0, 7); g.fill()
  }
  return c
}

function drawTree(g: G, t: Tree) {
  const pink = t.tone > 0.86, lime = t.tone < 0.12
  g.fillStyle = '#5b4028'
  g.fillRect(t.x - 3, t.y - 12, 6, 14)
  const cy = t.y - t.r * 0.9 - 6
  g.fillStyle = pink ? '#e79fbd' : lime ? '#8fbf4a' : '#2f7d38'
  g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1.5
  g.beginPath(); g.arc(t.x, cy, t.r, 0, 7); g.fill(); g.stroke()
  g.fillStyle = pink ? 'rgba(255,225,238,.6)' : lime ? 'rgba(210,240,140,.5)' : 'rgba(120,190,90,.5)'
  g.beginPath(); g.arc(t.x - t.r * 0.28, cy - t.r * 0.28, t.r * 0.6, 0, 7); g.fill()
}

type Car = { d: number; s: number; v: number; max: number; cw: boolean; color: string; bus: boolean }
const CAR_COLORS = ['#e9e9ec', '#1f2227', '#8d939b', '#c7372f', '#2f5fae', '#f08a1c', '#e9e9ec', '#3c4047']
function makeCars() {
  const r = rng(11), cars: Car[] = []
  for (const [d, cw, max] of [[16, true, 170], [48, true, 135], [-16, false, 170], [-48, false, 135]] as const) {
    const len = ringLength(d), n = 9
    for (let i = 0; i < n; i++) {
      const bus = Math.abs(d) === 48 && i % 4 === 0
      cars.push({ d, cw, max, v: max, s: (len / n) * i + r() * 120, bus, color: bus ? '#3b8f4a' : CAR_COLORS[Math.floor(r() * CAR_COLORS.length)] })
    }
  }
  return cars
}
function drawCar(g: G, car: Car, p: { x: number; y: number; angle: number }) {
  const { len: L, wid: Wd } = carSize(car.bus)
  g.save()
  g.translate(p.x, p.y)
  g.fillStyle = 'rgba(0,0,0,.3)'
  g.save(); g.translate(3, 5); g.rotate(p.angle); g.beginPath(); g.roundRect(-L / 2, -Wd / 2, L, Wd, 6); g.fill(); g.restore()
  g.rotate(p.angle)
  g.fillStyle = car.color; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1.5
  g.beginPath(); g.roundRect(-L / 2, -Wd / 2, L, Wd, car.bus ? 5 : 7); g.fill(); g.stroke()
  if (car.bus) {
    g.fillStyle = '#1b2530'; g.fillRect(-L / 2 + 5, -Wd / 2 + 2, L - 12, 3); g.fillRect(-L / 2 + 5, Wd / 2 - 5, L - 12, 3)
    g.fillRect(L / 2 - 7, -Wd / 2 + 3, 4, Wd - 6)
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(-L / 2 + 8, -Wd / 2 + 7, L - 22, Wd - 14)
  } else {
    g.fillStyle = '#18222d'
    g.beginPath(); g.roundRect(-L * 0.26, -Wd / 2 + 2.5, L * 0.56, Wd - 5, 4); g.fill()
    g.fillStyle = car.color
    g.beginPath(); g.roundRect(-L * 0.13, -Wd / 2 + 3.5, L * 0.28, Wd - 7, 3); g.fill()
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(-L * 0.13, -Wd / 2 + 3.5, L * 0.28, 3)
  }
  g.fillStyle = '#fff3c0'; g.fillRect(L / 2 - 3, -Wd / 2 + 2, 3, 5); g.fillRect(L / 2 - 3, Wd / 2 - 7, 3, 5)
  g.fillStyle = '#d2261f'; g.fillRect(-L / 2, -Wd / 2 + 2, 2.5, 5); g.fillRect(-L / 2, Wd / 2 - 7, 2.5, 5)
  g.restore()
}

type Body = { x: number; y: number; face: number; walk: number; z: number; vz: number; act: { kind: Act; t: number } | null; say: string; sayUntil: number }
// 다른 사람: 받은 위치(tx, ty)를 향해 부드럽게 따라간다
type Remote = Body & { tx: number; ty: number; nickname: string; character: string; stage: number }

function stepBody(b: Body, dt: number) {
  if (b.z > 0 || b.vz > 0) {
    b.z += b.vz * dt
    b.vz -= 1500 * dt
    if (b.z <= 0) { b.z = 0; b.vz = 0 }
  }
  if (b.act && (b.act.t += dt) > ACT_TIME) b.act = null
}

function drawAvatar(g: G, img: HTMLImageElement, b: Body, stage: number) {
  const air = Math.min(1, b.z / 70)
  g.fillStyle = `rgba(0,0,0,${0.32 - air * 0.14})`
  g.beginPath(); g.ellipse(b.x, b.y, 17 - air * 5, 6.5 - air * 2, 0, 0, 7); g.fill()
  if (!img.complete || !img.naturalWidth) return
  const h = 104, w = (h * img.naturalWidth) / img.naturalHeight, bob = b.z ? 0 : Math.abs(Math.sin(b.walk)) * 4
  // 그림이 한 장이라 팔다리는 못 움직인다. 몸을 내밀고 기울이고, 주먹은 따로 그려 동작을 표현한다
  const kind = b.act?.kind, swing = b.act ? Math.sin((b.act.t / ACT_TIME) * Math.PI) : 0
  const dir = kind === 'L' ? -1 : kind === 'R' ? 1 : b.face
  const fy = b.y - bob - b.z, tall = tallOf(stage)
  g.save()
  g.translate(b.x + dir * swing * (kind === 'H' ? 16 : 7), fy + (kind === 'H' ? swing * 5 : 0))
  if (kind === 'H') g.rotate(dir * swing * 0.5)
  g.scale(b.face, 1)
  g.drawImage(img, -w / 2, -h + 5, w, h)
  g.restore()
  if (kind === 'L' || kind === 'R') {
    const px = b.x + dir * (tall * 0.22 + 8 + swing * 30), py = fy - tall * 0.42
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.lineCap = 'round'
    g.beginPath()
    for (const o of [-7, 0, 7]) { g.moveTo(px - dir * 14, py + o); g.lineTo(px - dir * (20 + swing * 16), py + o) }
    g.stroke()
    g.fillStyle = '#fff'; g.strokeStyle = '#1c1b22'; g.lineWidth = 3
    g.beginPath(); g.arc(px, py, 10, 0, 7); g.fill(); g.stroke()
    g.beginPath(); g.moveTo(px + dir * 3, py - 6); g.lineTo(px + dir * 3, py + 6); g.stroke()
    g.lineCap = 'butt'
  }
  if (kind && swing > 0.75) {
    // 타격 순간의 별 모양 섬광
    const sx = b.x + dir * (kind === 'H' ? tall * 0.45 + 22 : tall * 0.22 + 54), sy = fy - tall * (kind === 'H' ? 0.75 : 0.42)
    g.fillStyle = '#ffe14a'; g.strokeStyle = '#1c1b22'; g.lineWidth = 2
    g.beginPath()
    for (let i = 0; i < 16; i++) { const r = i % 2 ? 6 : 15, t = (i / 16) * Math.PI * 2; g.lineTo(sx + Math.cos(t) * r, sy + Math.sin(t) * r) }
    g.closePath(); g.fill(); g.stroke()
  }
}

// 이름표와, 말하는 중이면 그 위에 말풍선
function drawTag(g: G, b: Body, stage: number, name: string, now: number, mine: boolean) {
  const top = b.y - b.z - 14 - tallOf(stage)
  g.font = '700 13px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
  g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(name, b.x, top)
  g.fillStyle = mine ? '#fff' : '#9fe8ff'; g.fillText(name, b.x, top)
  if (!b.say || now > b.sayUntil) return
  g.font = '600 14px system-ui, sans-serif'
  const lines: string[] = []
  let line = ''
  for (const ch of b.say) {
    if (g.measureText(line + ch).width > 190) { lines.push(line); line = '' }
    line += ch
  }
  lines.push(line)
  const bw = Math.max(...lines.map((l) => g.measureText(l).width)) + 20, bh = lines.length * 19 + 12, by = top - 16 - bh
  g.fillStyle = '#fff'; g.strokeStyle = '#1c1b22'; g.lineWidth = 2.5
  g.beginPath(); g.roundRect(b.x - bw / 2, by, bw, bh, 10); g.fill(); g.stroke()
  g.beginPath(); g.moveTo(b.x - 7, by + bh - 1); g.lineTo(b.x, by + bh + 9); g.lineTo(b.x + 7, by + bh - 1); g.fill()
  g.beginPath(); g.moveTo(b.x - 7, by + bh); g.lineTo(b.x, by + bh + 9); g.lineTo(b.x + 7, by + bh); g.stroke()
  g.fillStyle = '#16151b'
  lines.forEach((l, i) => g.fillText(l, b.x, by + 16 + i * 19))
}

// 남이 보낸 값은 믿지 않는다: 숫자인지 확인하고 범위 안으로 자른다
const num = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null)
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export default function Game({ profile }: { profile: Profile }) {
  const view = useRef<HTMLCanvasElement>(null)
  const mini = useRef<HTMLCanvasElement>(null)
  const dot = useRef<HTMLElement>(null)
  const actRef = useRef<(kind: Act) => void>(() => {})
  const chatRef = useRef<(said: string) => void>(() => {})
  const chatInput = useRef<HTMLInputElement>(null)
  const [online, setOnline] = useState(1)
  const [sheet, setSheet] = useState(false)
  const [notice, setNotice] = useState('')
  const stage = stageOf(profile.level)
  const need = xpToNext(profile.level)
  const maxed = profile.level >= MAX_LEVEL

  useEffect(() => {
    const canvas = view.current!, g = canvas.getContext('2d')!
    const ground = buildGround()
    const sprites = BUILDINGS.map((b, i) => buildingSprite(b, i + 1))
    const tribowl = tribowlSprite()
    const cars = makeCars()
    const images = new Map<string, HTMLImageElement>()
    const imageOf = (character: string, st: number) => {
      const url = spriteUrl(character, st)
      let img = images.get(url)
      if (!img) { img = new Image(); img.src = url; images.set(url, img) }
      return img
    }

    const mg = mini.current!.getContext('2d')!
    mg.drawImage(ground, 0, 0, mini.current!.width, mini.current!.height)
    mg.fillStyle = 'rgba(20,22,26,.8)'
    const mk = mini.current!.width / W
    for (const b of BUILDINGS) mg.fillRect(b.x * mk, b.y * mk, b.w * mk, b.d * mk)

    // 고정된 것들(건물·나무·트라이볼)은 발밑 y로 미리 정렬 기준을 잡아 둔다
    type Item = { base: number; x0: number; y0: number; x1: number; y1: number; draw: () => void }
    const fixed: Item[] = [
      ...BUILDINGS.map((b, i) => ({ base: b.y + b.d, x0: b.x, y0: b.y - b.h * HK, x1: b.x + b.w, y1: b.y + b.d, draw: () => g.drawImage(sprites[i], b.x, b.y - b.h * HK) })),
      ...TREES.map((t) => ({ base: t.y, x0: t.x - t.r, y0: t.y - t.r * 2 - 8, x1: t.x + t.r, y1: t.y + 4, draw: () => drawTree(g, t) })),
      { base: POND.y + 70, x0: POND.x - 160, y0: POND.y - 150, x1: POND.x + 160, y1: POND.y + 80, draw: () => g.drawImage(tribowl, POND.x - 160, POND.y - 150) },
    ]

    const me: Body = { x: SPAWN.x, y: SPAWN.y, face: 1, walk: 0, z: 0, vz: 0, act: null, say: '', sayUntil: 0 }
    const others = new Map<string, Remote>()

    // shortcut: 누구나 들어올 수 있는 공개 채널이라 보낸 사람 id를 속일 수 있다. 지인끼리만 쓰는 동안은 충분하고, 공개 서비스로 가면 비공개 채널 + RLS로 올린다
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const channel = supabase.channel('songdo', { config: { broadcast: { self: false }, presence: { key: profile.id } } })
    let live = false, sentAt = 0, sentX = me.x, sentY = me.y, sentFace = me.face, chatAt = 0
    const send = (event: string, payload: Record<string, unknown>) => { if (live) channel.send({ type: 'broadcast', event, payload: { id: profile.id, ...payload } }) }
    const sendPos = () => { sentAt = performance.now(); sentX = me.x; sentY = me.y; sentFace = me.face; send('pos', { x: Math.round(me.x), y: Math.round(me.y), f: me.face }) }
    const from = (payload: Record<string, unknown>) => (typeof payload.id === 'string' && payload.id !== profile.id ? others.get(payload.id) : undefined)
    // 공지 내용은 서버만 쓸 수 있는 표에서 읽는다. 방송은 "다시 읽어라"는 신호일 뿐이다
    const loadNotice = () => supabase.from('settings').select('value').eq('key', 'notice').maybeSingle().then(({ data }) => setNotice(text(data?.value, 80)))
    loadNotice()
    channel
      .on('broadcast', { event: 'notice' }, loadNotice)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        for (const id of [...others.keys()]) if (!state[id]) others.delete(id)
        for (const [id, metas] of Object.entries(state)) {
          if (id === profile.id) continue
          const m = metas[0] as Record<string, unknown>
          const x = num(m.x, 0, W) ?? SPAWN.x, y = num(m.y, 0, H) ?? SPAWN.y
          const who = { nickname: text(m.nickname, 12) || '???', character: text(m.character, 20), stage: num(m.stage, 0, 5) ?? 0 }
          const old = others.get(id)
          if (old) Object.assign(old, who)
          else others.set(id, { x, y, tx: x, ty: y, face: 1, walk: 0, z: 0, vz: 0, act: null, say: '', sayUntil: 0, ...who })
        }
        setOnline(others.size + 1)
      })
      .on('presence', { event: 'join' }, () => sendPos()) // 새로 들어온 사람이 내 현재 위치를 알도록
      .on('broadcast', { event: 'pos' }, ({ payload }) => {
        const o = from(payload), x = num(payload.x, 0, W), y = num(payload.y, 0, H)
        if (!o || x === null || y === null) return
        o.tx = x; o.ty = y; o.face = payload.f === -1 ? -1 : 1
      })
      .on('broadcast', { event: 'act' }, ({ payload }) => {
        const o = from(payload), kind = payload.k
        if (!o) return
        if (kind === 'J') { if (o.z === 0) o.vz = 430 }
        else if (kind === 'L' || kind === 'R' || kind === 'H') o.act = { kind, t: 0 }
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        const o = from(payload), said = text(payload.t, 60)
        if (o && said) { o.say = said; o.sayUntil = performance.now() + 6000 }
      })
      .subscribe(async (status) => {
        live = status === 'SUBSCRIBED'
        if (live) await channel.track({ nickname: profile.nickname, character: profile.character, stage, x: Math.round(me.x), y: Math.round(me.y) })
      })
    chatRef.current = (raw: string) => {
      const said = text(raw, 60), now = performance.now()
      if (!said || now - chatAt < 700) return
      chatAt = now; me.say = said; me.sayUntil = now + 6000
      send('chat', { t: said })
    }

    const doAct = (kind: Act) => {
      if (kind === 'J') { if (me.z !== 0) return; me.vz = 430 }
      else me.act = { kind, t: 0 }
      send('act', { k: kind })
    }
    actRef.current = doAct
    const keys = new Set<string>()
    let stick: { ox: number; oy: number; dx: number; dy: number } | null = null
    let vw = 0, vh = 0, dpr = 1, zoom = 1, raf = 0, last = performance.now()

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      vw = window.innerWidth; vh = window.innerHeight
      canvas.width = vw * dpr; canvas.height = vh * dpr
      zoom = Math.max(0.85, Math.min(1.15, Math.min(vw, vh * 1.3) / 820)) // 폰에서도 캐릭터가 너무 작아지지 않게
    }
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (key === 'Enter') { e.preventDefault(); keys.clear(); chatInput.current?.focus(); return }
      if (key.startsWith('Arrow') || key === ' ') e.preventDefault()
      const kind = ({ ' ': 'J', a: 'L', s: 'H', d: 'R' } as Record<string, Act>)[key]
      if (kind && !e.repeat) doAct(kind)
      keys.add(key)
    }
    const up = (e: KeyboardEvent) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    const clear = () => keys.clear()
    const pdown = (e: PointerEvent) => { stick = { ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 }; canvas.setPointerCapture(e.pointerId) }
    const pmove = (e: PointerEvent) => { if (stick) { stick.dx = e.clientX - stick.ox; stick.dy = e.clientY - stick.oy } }
    const pup = () => { stick = null }

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      // 차: 자기 차로 앞쪽 구역에 플레이어(발 또는 몸통)가 있거나 앞차가 가까우면 선다. 옆 차로는 상관없다
      const carPos = cars.map((car) => {
        const { len: cl, wid: cwid } = carSize(car.bus), len = ringLength(car.d), at = ringPos(car.d, car.s, car.cw)
        let near = Infinity
        for (const oy of [0, BODY]) {
          const dx = me.x - at.x, dy = me.y - oy - at.y
          const along = dx * Math.cos(at.angle) + dy * Math.sin(at.angle), across = Math.abs(-dx * Math.sin(at.angle) + dy * Math.cos(at.angle))
          if (along > 0 && across < cwid / 2 + 11) near = Math.min(near, along) // 충돌 폭(9)보다 조금만 넓게: 옆에 선 사람 때문에 서 있지 않도록
        }
        const jam = cars.some((o) => o !== car && o.d === car.d && (((o.s - car.s) % len) + len) % len < carSize(o.bus).len / 2 + cl / 2 + 18 + car.v * 0.3)
        if (near < cl / 2 + 20) car.v = 0 // 코앞이면 급정거
        else car.v += ((jam || near < cl / 2 + 50 + car.v * 0.3 ? 0 : car.max) - car.v) * Math.min(1, dt * 6)
        car.s += car.v * dt
        return ringPos(car.d, car.s, car.cw)
      })
      // 그래도 차체와 겹치면(달리는 차 옆구리에 뛰어든 경우 등) 차 밖으로 밀려난다
      const touching = (x: number, y: number) => cars.some((car, i) => insideCar(x, y, carPos[i], car.bus) || insideCar(x, y - BODY, carPos[i], car.bus))
      cars.forEach((car, i) => {
        for (const oy of [0, BODY]) {
          const push = pushOut(me.x, me.y - oy, carPos[i], car.bus)
          if (push && !blocked(me.x + push.x, me.y + push.y)) { me.x += push.x; me.y += push.y }
        }
      })

      // 이동: 방향키와 화면 드래그(가상 조이스틱)
      let ix = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0)
      let iy = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0)
      if (stick && Math.hypot(stick.dx, stick.dy) > 8) { ix = stick.dx / 60; iy = stick.dy / 60 }
      const mag = Math.hypot(ix, iy)
      if (mag > 1) { ix /= mag; iy /= mag }
      if (mag > 0.05) {
        const nx = me.x + ix * SPEED * dt, ny = me.y + iy * SPEED * dt
        // 밀어내기가 벽에 막혀 차에 낀 채라면 움직임을 풀어 준다 (갇힘 방지)
        const stuck = touching(me.x, me.y)
        if (!blocked(nx, me.y) && (stuck || !touching(nx, me.y))) me.x = nx
        if (!blocked(me.x, ny) && (stuck || !touching(me.x, ny))) me.y = ny
        if (Math.abs(ix) > 0.1) me.face = ix > 0 ? 1 : -1
        me.walk += dt * 11
      } else me.walk = 0

      stepBody(me, dt)
      for (const o of others.values()) {
        const gap = Math.hypot(o.tx - o.x, o.ty - o.y)
        if (gap > 400) { o.x = o.tx; o.y = o.ty } // 너무 멀면 순간이동
        else { o.x += (o.tx - o.x) * Math.min(1, dt * 9); o.y += (o.ty - o.y) * Math.min(1, dt * 9) }
        o.walk = gap > 3 ? o.walk + dt * 11 : 0
        stepBody(o, dt)
      }
      // 내 위치 전송: 움직였을 때만, 사람이 많을수록 드물게 (전체가 무료 한도인 초당 100건을 넘지 않도록 약 60건에 맞춘다)
      const people = others.size + 1, every = Math.max(200, Math.min(2000, (people * people * 1000) / 60))
      if (people > 1 && now - sentAt > every && (Math.hypot(me.x - sentX, me.y - sentY) > 1 || me.face !== sentFace)) sendPos()

      // 카메라
      const sw = vw / zoom, sh = vh / zoom
      const cx = Math.max(0, Math.min(W - sw, me.x - sw / 2)), cy = Math.max(0, Math.min(H - sh, me.y - sh / 2))
      const k = zoom * dpr
      g.setTransform(k, 0, 0, k, -cx * k, -cy * k)
      g.imageSmoothingQuality = 'high'
      g.drawImage(ground, cx, cy, sw, sh, cx, cy, sw, sh)

      const items: Item[] = fixed.filter((i) => i.x1 > cx && i.x0 < cx + sw && i.y1 > cy && i.y0 < cy + sh)
      cars.forEach((car, i) => {
        const p = carPos[i]
        if (p.x > cx - 100 && p.x < cx + sw + 100 && p.y > cy - 100 && p.y < cy + sh + 100) items.push({ base: p.y + 10, x0: 0, y0: 0, x1: 0, y1: 0, draw: () => drawCar(g, car, p) })
      })
      for (const o of others.values()) {
        if (o.x < cx - 120 || o.x > cx + sw + 120 || o.y < cy - 40 || o.y > cy + sh + 160) continue
        items.push({ base: o.y - 0.5, x0: 0, y0: 0, x1: 0, y1: 0, draw: () => drawAvatar(g, imageOf(o.character, o.stage), o, o.stage) })
      }
      items.push({ base: me.y, x0: 0, y0: 0, x1: 0, y1: 0, draw: () => drawAvatar(g, imageOf(profile.character, stage), me, stage) })
      items.sort((a, b) => a.base - b.base)
      for (const item of items) item.draw()

      // 이름표: 건물과 내 캐릭터
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 13px system-ui, sans-serif'
      for (const b of BUILDINGS) {
        if (!b.label || b.x > cx + sw || b.x + b.w < cx || b.y - 40 > cy + sh || b.y + b.d + 30 < cy) continue
        const tw = g.measureText(b.label).width + 16, tx = b.x + b.w / 2, ty = b.y + b.d + 16
        g.fillStyle = 'rgba(8,9,11,.8)'; g.beginPath(); g.roundRect(tx - tw / 2, ty - 11, tw, 22, 4); g.fill()
        g.fillStyle = '#f5c518'; g.fillText(b.label, tx, ty + 1)
      }
      for (const o of others.values()) drawTag(g, o, o.stage, o.nickname, now, false)
      drawTag(g, me, stage, profile.nickname, now, true)

      // 조이스틱 표시 (화면 좌표)
      if (stick) {
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        const m = Math.hypot(stick.dx, stick.dy), f = m > 60 ? 60 / m : 1
        g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(stick.ox, stick.oy, 60, 0, 7); g.fill()
        g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(stick.ox + stick.dx * f, stick.oy + stick.dy * f, 24, 0, 7); g.fill()
      }
      if (dot.current) { dot.current.style.left = `${(me.x / W) * 100}%`; dot.current.style.top = `${(me.y / H) * 100}%` }
      raf = requestAnimationFrame(frame)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    canvas.addEventListener('pointerdown', pdown)
    canvas.addEventListener('pointermove', pmove)
    canvas.addEventListener('pointerup', pup)
    canvas.addEventListener('pointercancel', pup)
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      supabase.removeChannel(channel)
      window.removeEventListener('resize', resize)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      canvas.removeEventListener('pointerdown', pdown)
      canvas.removeEventListener('pointermove', pmove)
      canvas.removeEventListener('pointerup', pup)
      canvas.removeEventListener('pointercancel', pup)
    }
  }, [profile.id, profile.character, profile.nickname, stage])

  return (
    <div className="game">
      <canvas ref={view} className="view" aria-label="송도 맵. 방향키로 이동합니다" />
      <div className="card who">
        <small>PLAYER · 접속 {online}명</small>
        <b>{profile.nickname}</b>
        <div className="lvl">LV <strong>{profile.level}</strong><span>{maxed ? 'MAX' : `${profile.xp} / ${need} XP`}</span></div>
        <div className="bar xp" role="progressbar" aria-label="경험치" aria-valuemin={0} aria-valuemax={need} aria-valuenow={Math.min(profile.xp, need)}>
          <i style={{ width: `${maxed ? 100 : (profile.xp / need) * 100}%` }} />
        </div>
      </div>
      {notice && <p className="card bulletin" role="status">공지 · {notice}</p>}
      <div className="menu">
        <button className="small" onClick={() => setSheet(true)}>프로필</button>
        {profile.is_admin && <a className="small" href="/admin">관리자</a>}
        <form action={signOut}><button className="small">로그아웃</button></form>
      </div>
      <div className="card mini" aria-hidden="true">
        <canvas ref={mini} width={264} height={297} />
        <i ref={dot} />
      </div>
      <p className="card tip">방향키·드래그 이동 · 스페이스 점프 · A 왼펀치 · S 박치기 · D 오른펀치 · Enter 채팅</p>
      <form
        className="chat"
        onSubmit={(e) => {
          e.preventDefault()
          const input = chatInput.current!
          chatRef.current(input.value)
          input.value = ''
          input.blur()
        }}
      >
        <input ref={chatInput} maxLength={60} placeholder="채팅 (Enter)" aria-label="채팅 입력" autoComplete="off" enterKeyHint="send" />
      </form>
      <div className="pad">
        {([['L', '왼펀치'], ['H', '박치기'], ['R', '오른펀치'], ['J', '점프']] as const).map(([kind, label]) => (
          <button key={kind} className="small" onPointerDown={() => actRef.current(kind)}>{label}</button>
        ))}
      </div>

      {sheet && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="프로필">
          <div>
            <section className="stage">
              <Character id={profile.character} stage={stage} size={240} />
              <p className="rank">{STAGE_NAMES[stage]}</p>
              {!maxed && <p className="next">다음 진화: LV {STAGE_START[stage + 1]}</p>}
            </section>
            <section className="stats">
              {STATS.map(([key, label]) => (
                <div key={key}>
                  <span>{label}</span>
                  <div className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={profile[key]}>
                    <i style={{ width: `${profile[key]}%` }} />
                  </div>
                </div>
              ))}
            </section>
            <button className="close ghost" onClick={() => setSheet(false)} autoFocus>닫기</button>
          </div>
        </div>
      )}
    </div>
  )
}
