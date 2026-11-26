import { useId } from 'react'

// 너구리 "라쿤": 단계(0~5)가 오를수록 몸이 길어지고 커지며 소품이 붙는다
const SCALE = [0.6, 0.72, 0.82, 0.9, 0.97, 1.04]
const BODY = [34, 40, 46, 50, 54, 56] // 몸통 세로 반지름
const INK = '#1c1b22'
const MASK = '#2c2e37'

export const CHARACTERS = [
  { id: 'raccoon', name: '라쿤', ready: true },
  { id: 'owl', name: '올빼미', ready: false },
  { id: 'octopus', name: '문어', ready: false },
]

export default function Character({ stage, size = 260 }: { stage: number; size?: number }) {
  const id = useId()
  const u = (n: string) => `url(#${id}${n})`
  const o = { stroke: INK, strokeWidth: 3.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  const bh = BODY[stage]
  const rx = 40 + (bh - 34) * 0.25
  const cy = 248 - bh // 몸통 중심
  const top = 248 - 2 * bh // 몸통 꼭대기
  const jacket = stage >= 4
  const eyeR = stage === 0 ? 11 : 9
  const mirror = 'translate(240 0) scale(-1 1)'

  const arm = (
    <g>
      <path d={`M${120 - rx + 6} ${cy - 10} q-14 16 -6 34`} fill="none" stroke={INK} strokeWidth="21" strokeLinecap="round" />
      <path d={`M${120 - rx + 6} ${cy - 10} q-14 16 -6 34`} fill="none" stroke={jacket ? '#2b2d38' : '#a2a8b4'} strokeWidth="14" strokeLinecap="round" />
      <circle cx={120 - rx} cy={cy + 25} r="8" fill="#4a4e59" stroke={INK} strokeWidth="3" />
    </g>
  )
  const ear = (
    <g>
      <path d="M70 80 Q60 40 78 33 Q99 44 105 68 Z" fill={u('fur')} {...o} />
      <path d="M78 71 Q73 49 81 45 Q92 53 96 65 Z" fill="#f4aab3" />
    </g>
  )
  const tuft = <path d="M72 112 L50 123 L69 130 L54 144 L84 146 Z" fill={u('fur')} {...o} />
  const maskPatch = <path d="M113 105 C101 91 76 93 66 113 C73 129 101 128 113 117 Z" fill={u('mask')} />
  const eye = (cx: number) => (
    <g>
      <circle cx={cx} cy="110" r={eyeR} fill="#fff" />
      <circle cx={cx + 1} cy="111" r={eyeR * 0.68} fill="#17161c" />
      <circle cx={cx - 2} cy="107" r={eyeR * 0.28} fill="#fff" />
      {stage === 2 && <path d={`M${cx - eyeR - 1} 109 A${eyeR + 1} ${eyeR + 1} 0 0 1 ${cx + eyeR + 1} 109 Z`} fill={MASK} />}
    </g>
  )
  const lens = <path d="M70 100 H112 Q114 100 114 104 Q113 126 92 126 Q72 126 68 106 Q67 100 70 100 Z" fill={u('lens')} stroke={u('gold')} strokeWidth="3" />

  return (
    <svg viewBox="0 0 240 280" width={size} height={(size * 280) / 240} role="img" aria-label={`라쿤 ${stage + 1}단계`}>
      <defs>
        <radialGradient id={`${id}fur`} cx=".35" cy=".28" r=".9">
          <stop offset="0" stopColor="#cdd2dc" /><stop offset=".55" stopColor="#9aa1ae" /><stop offset="1" stopColor="#6d7482" />
        </radialGradient>
        <radialGradient id={`${id}belly`} cx=".4" cy=".3" r=".9">
          <stop offset="0" stopColor="#fffdf7" /><stop offset="1" stopColor="#ddd5c4" />
        </radialGradient>
        <radialGradient id={`${id}mask`} cx=".4" cy=".3" r=".9">
          <stop offset="0" stopColor="#454956" /><stop offset="1" stopColor="#23252c" />
        </radialGradient>
        <linearGradient id={`${id}gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe98a" /><stop offset="1" stopColor="#f0a800" />
        </linearGradient>
        <linearGradient id={`${id}jacket`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#40434f" /><stop offset="1" stopColor="#15161b" />
        </linearGradient>
        <linearGradient id={`${id}lens`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b4a63" /><stop offset=".5" stopColor="#0d0e13" /><stop offset="1" stopColor="#1f2733" />
        </linearGradient>
        <radialGradient id={`${id}glow`}>
          <stop offset="0" stopColor="#ffd84a" stopOpacity=".75" /><stop offset="1" stopColor="#ffd84a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}shadow`}>
          <stop offset="0" stopColor="#000" stopOpacity=".55" /><stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}head`}><ellipse cx="120" cy="110" rx="56" ry="48" /></clipPath>
      </defs>

      {stage === 5 && (
        <g>
          <circle cx="120" cy="140" r="138" fill={u('glow')} />
          {Array.from({ length: 16 }, (_, i) => (
            <path key={i} d="M120 140 L113 -10 L127 -10 Z" fill="#ffd84a" opacity={i % 2 ? 0.14 : 0.28} transform={`rotate(${i * 22.5} 120 140)`} />
          ))}
        </g>
      )}

      <g transform={`translate(120 262) scale(${SCALE[stage]}) translate(-120 -262)`}>
        <ellipse cx="120" cy="258" rx="74" ry="11" fill={u('shadow')} />

        {/* 꼬리: 굵은 선 세 겹(외곽선, 털, 줄무늬)으로 부드럽게 */}
        <g transform={stage === 0 ? 'translate(148 238) scale(.62) translate(-148 -238)' : undefined} fill="none" strokeLinecap="round">
          <path d="M148 238 C198 246 218 204 192 170" stroke={INK} strokeWidth="35" />
          <path d="M148 238 C198 246 218 204 192 170" stroke="#a2a8b4" strokeWidth="28" />
          <path d="M148 238 C198 246 218 204 192 170" stroke={MASK} strokeWidth="28" strokeDasharray="11 15" strokeDashoffset="-14" strokeLinecap="butt" />
        </g>

        <g fill="#4a4e59" {...o}>
          <ellipse cx="100" cy="251" rx="17" ry="9.5" />
          <ellipse cx="140" cy="251" rx="17" ry="9.5" />
        </g>

        {arm}
        <g transform={mirror}>{arm}</g>

        <ellipse cx="120" cy={cy} rx={rx} ry={bh} fill={jacket ? u('jacket') : u('fur')} {...o} />
        <ellipse cx="120" cy={cy + 4} rx={jacket ? 14 : rx * 0.62} ry={bh * (jacket ? 0.86 : 0.72)} fill={u('belly')} />
        {jacket && (
          <g>
            <path d={`M120 ${top + 16} V${cy + bh - 6}`} stroke="#b9bcc6" strokeWidth="2" strokeDasharray="3 3" />
            <path d={`M${120 - rx + 4} ${cy + bh - 16} Q120 ${cy + bh + 2} ${120 + rx - 4} ${cy + bh - 16}`} fill="none" stroke="#ff6a2b" strokeWidth="6" strokeLinecap="round" />
            <g fill="#ff6a2b" {...o} strokeWidth="3">
              <path d={`M119 ${top + 18} L${120 - 30} ${top + 20} L${120 - 16} ${top + 46} Z`} />
              <path d={`M121 ${top + 18} L${120 + 30} ${top + 20} L${120 + 16} ${top + 46} Z`} />
            </g>
          </g>
        )}
        {stage === 1 && (
          <g fill="#ff5a3c" {...o} strokeWidth="3">
            <path d={`M${120 + 10} ${top + 30} l14 22 l8 -14 Z`} />
            <path d={`M${120 - 30} ${top + 14} Q120 ${top + 38} ${120 + 30} ${top + 14} L${120 + 25} ${top + 27} Q120 ${top + 48} ${120 - 25} ${top + 27} Z`} />
          </g>
        )}
        {stage >= 2 && (
          <g fill="none" strokeLinecap="round">
            <path d={`M${120 - 27} ${top + 14} Q120 ${top + 52} ${120 + 27} ${top + 14}`} stroke={INK} strokeWidth="9" />
            <path d={`M${120 - 27} ${top + 14} Q120 ${top + 52} ${120 + 27} ${top + 14}`} stroke={u('gold')} strokeWidth="5" strokeDasharray="1 6.5" />
            <circle cx="120" cy={top + 37} r="8.5" fill={u('gold')} stroke={INK} strokeWidth="3" />
            <circle cx="118" cy={top + 35} r="2.5" fill="#fff" opacity=".7" stroke="none" />
          </g>
        )}

        <g transform={`translate(0 ${222 - 2 * bh - 110})`}>
          {ear}
          <g transform={mirror}>{ear}</g>
          {tuft}
          <g transform={mirror}>{tuft}</g>
          <ellipse cx="120" cy="110" rx="56" ry="48" fill={u('fur')} />
          <g clipPath={u('head')}>
            <ellipse cx="120" cy="134" rx="46" ry="30" fill={u('belly')} />
            <path d="M88 92 Q98 78 112 84 Q102 90 96 100 Z M152 92 Q142 78 128 84 Q138 90 144 100 Z" fill="#fffdf7" opacity=".9" />
            {maskPatch}
            <g transform={mirror}>{maskPatch}</g>
            <path d="M115 62 Q120 92 117 112 H123 Q120 92 125 62 Z" fill="#5a5f6c" />
          </g>
          <ellipse cx="120" cy="110" rx="56" ry="48" fill="none" {...o} />

          {stage <= 1 && (
            <g fill="#ff8fa0" opacity=".55">
              <ellipse cx="80" cy="134" rx="9" ry="5.5" />
              <ellipse cx="160" cy="134" rx="9" ry="5.5" />
            </g>
          )}

          {stage >= 3 ? (
            <g>
              {lens}
              <g transform={mirror}>{lens}</g>
              <path d="M112 104 Q120 99 128 104" fill="none" stroke={u('gold')} strokeWidth="3" strokeLinecap="round" />
              <path d="M76 106 L88 106 M134 106 L146 106" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".55" />
            </g>
          ) : (
            <g>{eye(94)}{eye(146)}</g>
          )}

          <ellipse cx="120" cy="132" rx="20" ry="14" fill={u('belly')} stroke={INK} strokeWidth="2" strokeOpacity=".45" />
          <path d="M112 123 Q120 118 128 123 Q125 131 120 132 Q115 131 112 123 Z" fill={INK} />
          <ellipse cx="118" cy="123.5" rx="3" ry="1.4" fill="#fff" opacity=".6" />
          <path
            d={stage <= 1 ? 'M120 132 V136 M120 136 Q114 142 108 137 M120 136 Q126 142 132 137' : 'M120 132 V136 Q128 143 137 133'}
            fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round"
          />

          {stage === 5 && (
            <g>
              <path d="M90 72 L84 34 L103 52 L120 24 L137 52 L156 34 L150 72 Q120 62 90 72 Z" fill={u('gold')} {...o} />
              <circle cx="120" cy="56" r="5" fill="#ff3d5a" stroke={INK} strokeWidth="2" />
              <circle cx="101" cy="62" r="3.5" fill="#4ad0ff" stroke={INK} strokeWidth="2" />
              <circle cx="139" cy="62" r="3.5" fill="#4ad0ff" stroke={INK} strokeWidth="2" />
            </g>
          )}
        </g>
      </g>
    </svg>
  )
}
