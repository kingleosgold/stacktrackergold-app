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

      {/* Coin body */}
      <circle cx="28" cy="28" r="26" fill="url(#troyCoinGrad)" />

      {/* Raised rim — dark outer ring */}
      <circle cx="28" cy="28" r="26" fill="none" stroke="#8A6914" strokeWidth="2" />

      {/* Inner rim highlight — top-left arc for 3D */}
      <path
        d="M12 10 A22 22 0 0 1 46 14"
        fill="none"
        stroke="#FFE9A0"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Embossed serif "T" — shadow */}
      <text
        x="28"
        y="37"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="bold"
        fontSize="30"
        fill="#7A5F18"
      >
        T
      </text>

      {/* Embossed serif "T" — face */}
      <text
        x="28"
        y="36"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="bold"
        fontSize="30"
        fill="#FFF3D0"
      >
        T
      </text>
    </svg>
  );
}
