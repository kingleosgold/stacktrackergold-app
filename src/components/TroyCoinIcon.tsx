interface TroyCoinIconProps {
  size?: number;
  className?: string;
}

// Precompute reeded-edge tick path at viewBox scale (56px)
// Matches mobile: reedR=25.75, tickLen=1.35, ~81 ticks
const VB = 56;
const HALF = VB / 2;
const RIM_W = 1.5;
const BODY_R = HALF - RIM_W;           // 26.5
const RIM_R = HALF - RIM_W / 2;        // 27.25
const REED_R = HALF - RIM_W * 1.5;     // 25.75
const TICK_LEN = RIM_W * 0.9;          // 1.35
const TICK_COUNT = Math.max(24, Math.round(2 * Math.PI * REED_R / 2));

let reedPath = '';
for (let i = 0; i < TICK_COUNT; i++) {
  const angle = (i / TICK_COUNT) * 2 * Math.PI;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x1 = HALF + (REED_R - TICK_LEN / 2) * cos;
  const y1 = HALF + (REED_R - TICK_LEN / 2) * sin;
  const x2 = HALF + (REED_R + TICK_LEN / 2) * cos;
  const y2 = HALF + (REED_R + TICK_LEN / 2) * sin;
  reedPath += `M${x1.toFixed(2)},${y1.toFixed(2)}L${x2.toFixed(2)},${y2.toFixed(2)}`;
}

const FONT_SIZE = VB * 0.6; // 33.6 — matches mobile: size * 0.6

export function TroyCoinIcon({ size = 20, className }: TroyCoinIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
    >
      <defs>
        <radialGradient id="troyCoinGrad" cx="45%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#F5D780" />
          <stop offset="100%" stopColor="#A07C28" />
        </radialGradient>
      </defs>

      {/* 1. Coin body */}
      <circle cx={HALF} cy={HALF} r={BODY_R} fill="url(#troyCoinGrad)" />

      {/* 2. Dark ridge channel */}
      <circle cx={HALF} cy={HALF} r={REED_R} fill="none" stroke="#6B4E1B" strokeWidth={3} />

      {/* 3. Reeded edge — radial ticks */}
      <path d={reedPath} stroke="#9A7B2D" strokeWidth={0.8} strokeLinecap="butt" />

      {/* 4. Outer rim stroke */}
      <circle cx={HALF} cy={HALF} r={RIM_R} fill="none" stroke="#8B6914" strokeWidth={RIM_W} />

      {/* 5. Embossed T — highlight (offset 0.5px down) */}
      <text
        x={HALF}
        y={HALF + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="bold"
        fontSize={FONT_SIZE}
        fill="#FFE0A0"
        opacity={0.5}
      >
        T
      </text>

      {/* 5. Embossed T — face */}
      <text
        x={HALF}
        y={HALF}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="bold"
        fontSize={FONT_SIZE}
        fill="#7A5C1F"
      >
        T
      </text>
    </svg>
  );
}
