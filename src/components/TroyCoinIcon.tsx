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

// Serif T path — pure geometry, no text rendering (prevents wiggle on CSS scale transforms)
// Traced as a bold serif T centered in 56×56, cap-height ~25px
const T_PATH =
  'M16.5,15.5H39.5V17.5L37,19.5H30.4V37.5L33.5,38.5V40.5H22.5V38.5L25.6,37.5V19.5H19L16.5,17.5Z';

export function TroyCoinIcon({ size = 20, className }: TroyCoinIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VB} ${VB}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
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
      <path d={T_PATH} fill="#FFE0A0" opacity={0.5} transform="translate(0,0.5)" />

      {/* 5. Embossed T — face */}
      <path d={T_PATH} fill="#7A5C1F" />
    </svg>
  );
}
