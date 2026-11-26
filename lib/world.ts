// 송도 중심부를 단순화한 맵. 좌표 단위는 픽셀, 위쪽이 북쪽이다
export const W = 3200
export const H = 3600
export const ROAD = 64 // 차도 반폭 (4차로)
export const SIDE = 30 // 인도 폭
export const VX = [600, 2600] // 세로 도로 중심 x: 인천타워대로, 센트럴로
export const HY = [600, 3000] // 가로 도로 중심 y: 컨벤시아대로, 아트센터대로
export const PARK = { x: 694, y: 694, w: 1812, h: 2212 } // 센트럴파크
export const POND = { x: 980, y: 1500, r: 150 } // 트라이볼 수변
export const SPAWN = { x: 1000, y: 1760 }

export type Style = 'glass' | 'office' | 'apt' | 'civic' | 'shop' | 'convention' | 'hanok'
export type Building = { x: number; y: number; w: number; d: number; h: number; style: Style; label?: string }
const B = (x: number, y: number, w: number, d: number, h: number, style: Style, label?: string): Building => ({ x, y, w, d, h, style, label })

export const BUILDINGS: Building[] = [
  // 북쪽 (컨벤시아대로 위)
  B(90, 300, 200, 180, 180, 'office'), B(330, 330, 160, 150, 120, 'shop'),
  B(760, 330, 260, 150, 70, 'civic', '도서관'), B(1080, 290, 230, 190, 220, 'office'),
  B(1480, 280, 210, 200, 460, 'glass', '포스코타워'), B(1760, 320, 300, 160, 150, 'shop', '쇼핑몰'),
  B(2140, 280, 180, 200, 300, 'glass'), B(2360, 330, 130, 150, 140, 'office'),
  B(2720, 300, 200, 180, 260, 'apt'), B(2960, 320, 180, 160, 200, 'office'),
  // 서쪽 (인천타워대로 왼쪽)
  B(80, 760, 400, 500, 70, 'convention', '송도컨벤시아'), B(140, 1400, 330, 190, 50, 'shop', '식당가'),
  B(140, 1730, 310, 180, 60, 'shop', 'PC방'), B(140, 2060, 310, 200, 60, 'civic', '헬스장'),
  B(110, 2420, 360, 400, 280, 'office'),
  // 동쪽 (센트럴로 오른쪽)
  B(2760, 760, 170, 170, 400, 'apt', '아파트 단지'), B(2980, 820, 160, 160, 360, 'apt'),
  B(2760, 1150, 170, 170, 380, 'apt'), B(2980, 1230, 160, 160, 340, 'apt'),
  B(2760, 1560, 170, 170, 400, 'apt'), B(2980, 1640, 160, 160, 360, 'apt'),
  B(2760, 2000, 360, 160, 50, 'shop', '편의점'), B(2760, 2300, 180, 200, 260, 'glass'),
  B(2980, 2360, 160, 180, 200, 'office'), B(2760, 2640, 380, 200, 120, 'office'),
  // 남쪽 (아트센터대로 아래)
  B(100, 3300, 380, 200, 160, 'office'), B(760, 3280, 280, 200, 140, 'shop'),
  B(1120, 3300, 240, 180, 200, 'office'), B(1480, 3330, 260, 190, 360, 'glass', 'G타워'),
  B(1840, 3290, 300, 200, 120, 'civic'), B(2200, 3300, 260, 190, 220, 'apt'),
  B(2740, 3300, 380, 200, 180, 'office'),
  // 공원 안
  B(2180, 1280, 150, 80, 34, 'hanok', '한옥마을'), B(2360, 1300, 110, 70, 30, 'hanok'),
  B(2200, 1420, 110, 70, 30, 'hanok'), B(2340, 1430, 130, 80, 34, 'hanok'),
  B(2230, 1560, 200, 90, 38, 'hanok', '경원재'), B(1480, 1900, 120, 70, 30, 'civic', '보트하우스'),
]

// 수로: 조절점을 부드럽게 이은 점들 (그리기와 충돌 판정이 같은 점을 쓴다)
const CANAL_CTRL = [[1750, 660], [1700, 1000], [1820, 1300], [1650, 1650], [1780, 2000], [1640, 2350], [1720, 2650], [1700, 2940]]
export const CANAL_HALF = 72
export const CANAL: [number, number][] = (() => {
  const p = CANAL_CTRL, out: [number, number][] = []
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], d = p[Math.min(p.length - 1, i + 2)]
    for (let t = 0; t < 1; t += 0.05) {
      const t2 = t * t, t3 = t2 * t
      const f = (k: number) => 0.5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t3)
      out.push([f(0), f(1)])
    }
  }
  out.push(p[p.length - 1] as [number, number])
  return out
})()
export const canalX = (y: number) => CANAL.reduce((best, pt) => (Math.abs(pt[1] - y) < Math.abs(best[1] - y) ? pt : best))[0]
// 공원 산책로: 가로줄(PATH_Y)은 전부 다리로 수로를 건넌다
export const PATH_Y = [764, 1150, 1830, 2500, 2836]
export const PATH_X = [764, 1300, 2100, 2436]
export const BRIDGES = PATH_Y.map((y) => ({ x: canalX(y) - 115, y: y - 36, w: 230, h: 72 }))

export function blocked(x: number, y: number) {
  if (x < 24 || y < 24 || x > W - 24 || y > H - 24) return true
  for (const b of BUILDINGS) if (x > b.x - 8 && x < b.x + b.w + 8 && y > b.y - 8 && y < b.y + b.d + 8) return true
  if (Math.hypot(x - POND.x, y - POND.y) < POND.r) return true
  if (x > 1500 && x < 1960) {
    // 다리 위(난간 안쪽)는 지나갈 수 있다
    for (const g of BRIDGES) if (x > g.x && x < g.x + g.w && y > g.y + 8 && y < g.y + g.h - 8) return false
    for (const [cx, cy] of CANAL) if (Math.hypot(x - cx, y - cy) < CANAL_HALF) return true
  }
  return false
}

// 항상 같은 맵이 나오도록 씨앗이 고정된 난수
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Tree = { x: number; y: number; r: number; tone: number }
export const TREES: Tree[] = (() => {
  const r = rng(7), out: Tree[] = []
  while (out.length < 230) {
    const x = PARK.x + 40 + r() * (PARK.w - 80), y = PARK.y + 40 + r() * (PARK.h - 80)
    if (PATH_X.some((p) => Math.abs(x - p) < 40) || PATH_Y.some((p) => Math.abs(y - p) < 40)) continue
    if (blocked(x, y) || blocked(x - 50, y) || blocked(x + 50, y) || blocked(x, y - 50) || blocked(x, y + 50)) continue
    out.push({ x, y, r: 22 + r() * 14, tone: r() })
  }
  // 가로수: 인도 위에 일정 간격으로, 교차로 근처는 비운다
  const nearCross = (v: number, list: number[]) => list.some((c) => Math.abs(v - c) < 140)
  for (const c of VX) for (const s of [-1, 1]) for (let y = 60; y < H; y += 120) if (!nearCross(y, HY)) out.push({ x: c + s * (ROAD + SIDE / 2), y, r: 17, tone: 0.5 })
  for (const c of HY) for (const s of [-1, 1]) for (let x = 60; x < W; x += 120) if (!nearCross(x, VX)) out.push({ x, y: c + s * (ROAD + SIDE / 2), r: 17, tone: 0.5 })
  return out
})()

// 차량 순환 경로: 네 도로를 잇는 둥근 사각형. d만큼 안쪽(음수면 바깥쪽) 차로를 따라 s만큼 간 위치
const RING_R = 36
export function ringLength(d: number) {
  return 2 * (VX[1] - VX[0] - 2 * d - 2 * RING_R) + 2 * (HY[1] - HY[0] - 2 * d - 2 * RING_R) + 2 * Math.PI * RING_R
}
export function ringPos(d: number, s: number, clockwise: boolean) {
  const x0 = VX[0] + d, y0 = HY[0] + d, x1 = VX[1] - d, y1 = HY[1] - d, R = RING_R
  const tw = x1 - x0 - 2 * R, th = y1 - y0 - 2 * R, arc = (Math.PI * R) / 2, total = 2 * tw + 2 * th + 4 * arc
  s = (((clockwise ? s : -s) % total) + total) % total
  const flip = clockwise ? 0 : Math.PI
  const straights = [[x0 + R, y0, 0, tw], [x1, y0 + R, 1, th], [x1 - R, y1, 2, tw], [x0, y1 - R, 3, th]]
  const centers = [[x1 - R, y0 + R], [x1 - R, y1 - R], [x0 + R, y1 - R], [x0 + R, y0 + R]]
  for (let i = 0; i < 4; i++) {
    const [sx, sy, dir, len] = straights[i], a = (dir * Math.PI) / 2
    if (s < len) return { x: sx + Math.cos(a) * s, y: sy + Math.sin(a) * s, angle: a + flip }
    s -= len
    if (s < arc) {
      const t = a - Math.PI / 2 + s / R
      return { x: centers[i][0] + Math.cos(t) * R, y: centers[i][1] + Math.sin(t) * R, angle: t + Math.PI / 2 + flip }
    }
    s -= arc
  }
  return { x: x0 + R, y: y0, angle: flip }
}
