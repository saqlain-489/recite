import { scoreTone } from '../lib/format';

const TONE_COLOR = {
  great: 'var(--ok)',
  good: '#ca8a04',
  fair: 'var(--sub)',
  poor: 'var(--del)',
} as const;

export function ScoreRing({ score, size = 112 }: { readonly score: number; readonly size?: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const color = TONE_COLOR[scoreTone(score)];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Score ${score} percent`}>
      <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--sunken)" strokeWidth="9" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - score / 100)}
        transform="rotate(-90 50 50)"
        className="transition-[stroke-dashoffset] duration-700"
      />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="var(--ink)" fontSize="24" fontWeight="650">
        {score}%
      </text>
    </svg>
  );
}
