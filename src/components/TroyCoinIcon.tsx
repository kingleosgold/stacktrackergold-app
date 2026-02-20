interface TroyCoinIconProps {
  size?: number;
  className?: string;
}

export function TroyCoinIcon({ size = 20, className }: TroyCoinIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="troyCoinGrad" cx="40%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#F5D780" />
          <stop offset="100%" stopColor="#A07C28" />
        </radialGradient>
      </defs>

      {/* 1. Coin body */}
      <circle cx="28" cy="28" r="26" fill="url(#troyCoinGrad)" />

      {/* 2. Dark ridge channel */}
      <circle cx="28" cy="28" r="25" fill="none" stroke="#6B4E1B" strokeWidth="3" />

      {/* 3. Reeded edge ticks */}
      <circle
        cx="28"
        cy="28"
        r="25"
        fill="none"
        stroke="#9A7B2D"
        strokeWidth="1.5"
        strokeDasharray="1.5 1.5"
      />

      {/* 4. Outer rim stroke */}
      <circle cx="28" cy="28" r="26" fill="none" stroke="#8B6914" strokeWidth="1.5" />

      {/* 5. Embossed T — highlight (offset down) */}
      <text
        x="28"
        y="37.5"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="bold"
        fontSize="34"
        fill="#FFE0A0"
        opacity="0.5"
      >
        T
      </text>

      {/* 5. Embossed T — face */}
      <text
        x="28"
        y="37"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="bold"
        fontSize="34"
        fill="#7A5C1F"
      >
        T
      </text>
    </svg>
  );
}
