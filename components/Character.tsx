import { useId } from 'react'

// 너구리 "라쿤": 단계(0~5)가 오를수록 커지고 소품이 붙는다
const SCALE = [0.55, 0.68, 0.8, 0.9, 1, 1.08]
const INK = '#0b0b0b'
const FUR = '#9aa0ab'
const FUR_SHADE = '#6b707b'
const LIGHT = '#e8e4da'
const GOLD = '#f5c518'

export const CHARACTERS = [
  { id: 'raccoon', name: '라쿤', ready: true },
  { id: 'owl', name: '올빼미', ready: false },
  { id: 'octopus', name: '문어', ready: false },
]

export default function Character({ stage, size = 260 }: { stage: number; size?: number }) {
  const id = useId()
  const o = { stroke: INK, strokeWidth: 5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  return (
    <svg viewBox="0 0 200 230" width={size} height={size * 1.15} role="img" aria-label={`라쿤 ${stage + 1}단계`}>
      <defs>
        <clipPath id={`${id}h`}><ellipse cx="100" cy="95" rx="50" ry="42" /></clipPath>
        <clipPath id={`${id}b`}><ellipse cx="100" cy="162" rx="42" ry="44" /></clipPath>
      </defs>
      {stage === 5 && (
        <g fill={GOLD} opacity=".9">
          {Array.from({ length: 12 }, (_, i) => (
            <polygon key={i} points="100,112 92,-10 108,-10" transform={`rotate(${i * 30} 100 112)`} opacity={i % 2 ? 0.35 : 0.7} />
          ))}
        </g>
      )}
      <g transform={`translate(100 215) scale(${SCALE[stage]}) translate(-100 -215)`}>
        <ellipse cx="100" cy="212" rx="60" ry="8" fill="#000" opacity=".45" />
        {stage >= 1 && (
          <g {...o}>
            <path d="M138 180 C185 185 190 130 165 118 C178 140 160 160 135 158 Z" fill={FUR} />
            <path d="M172 150 L186 146 M163 164 L176 170" fill="none" strokeWidth="7" />
          </g>
        )}
        {/* 몸: 어두운 바탕 위에 밝은 면을 얹어 명암 경계를 뚜렷하게 */}
        <ellipse cx="100" cy="162" rx="42" ry="44" fill={stage >= 4 ? '#131317' : FUR_SHADE} />
        <ellipse cx="90" cy="154" rx="42" ry="44" fill={stage >= 4 ? '#26262e' : FUR} clipPath={`url(#${id}b)`} />
        <ellipse cx="100" cy="170" rx="24" ry="28" fill={stage >= 4 ? '#f2f2f2' : LIGHT} clipPath={`url(#${id}b)`} />
        {stage >= 4 && <path d="M76 126 L100 168 L124 126 L112 122 L100 146 L88 122 Z" fill="#ff5a1f" {...o} strokeWidth="4" />}
        <ellipse cx="100" cy="162" rx="42" ry="44" fill="none" {...o} />
        <g {...o} fill={FUR_SHADE}>
          <ellipse cx="78" cy="204" rx="15" ry="9" />
          <ellipse cx="122" cy="204" rx="15" ry="9" />
        </g>
        <g {...o}>
          <path d="M58 72 L52 38 L84 56 Z" fill={FUR} />
          <path d="M142 72 L148 38 L116 56 Z" fill={FUR_SHADE} />
        </g>
        <ellipse cx="100" cy="95" rx="50" ry="42" fill={FUR_SHADE} />
        <ellipse cx="90" cy="87" rx="50" ry="42" fill={FUR} clipPath={`url(#${id}h)`} />
        <path d="M50 92 C70 74 88 84 100 96 C112 84 130 74 150 92 C140 112 112 112 100 104 C88 112 60 112 50 92 Z" fill="#26282e" clipPath={`url(#${id}h)`} />
        <ellipse cx="100" cy="95" rx="50" ry="42" fill="none" {...o} />
        {stage >= 3 ? (
          <g {...o} strokeWidth="4">
            <path d="M58 86 H142" />
            <rect x="60" y="84" width="34" height="22" rx="7" fill={INK} />
            <rect x="106" y="84" width="34" height="22" rx="7" fill={INK} />
            <path d="M67 90 L78 90 M113 90 L124 90" stroke="#fff" strokeWidth="3" opacity=".7" />
          </g>
        ) : (
          <g>
            <circle cx="79" cy="95" r={stage === 0 ? 10 : 8} fill="#fff" stroke={INK} strokeWidth="3" />
            <circle cx="121" cy="95" r={stage === 0 ? 10 : 8} fill="#fff" stroke={INK} strokeWidth="3" />
            <circle cx="81" cy="96" r="4" fill={INK} />
            <circle cx="123" cy="96" r="4" fill={INK} />
            {stage === 2 && <path d="M68 89 H91 M110 89 H133" stroke={INK} strokeWidth="6" strokeLinecap="round" />}
          </g>
        )}
        <ellipse cx="100" cy="116" rx="17" ry="12" fill={LIGHT} {...o} strokeWidth="4" />
        <ellipse cx="100" cy="110" rx="6" ry="4" fill={INK} />
        <path d={stage === 0 ? 'M94 119 Q100 124 106 119' : 'M93 119 Q103 126 110 116'} fill="none" {...o} strokeWidth="3" />
        {stage >= 2 && (
          <g>
            <path d="M70 130 Q100 160 130 130" fill="none" stroke={INK} strokeWidth="10" strokeLinecap="round" />
            <path d="M70 130 Q100 160 130 130" fill="none" stroke={GOLD} strokeWidth="5" strokeLinecap="round" strokeDasharray="2 7" />
            <circle cx="100" cy="150" r="8" fill={GOLD} stroke={INK} strokeWidth="3" />
          </g>
        )}
        {stage === 5 && <path d="M66 58 L62 24 L82 42 L100 16 L118 42 L138 24 L134 58 Z" fill={GOLD} {...o} />}
      </g>
    </svg>
  )
}
