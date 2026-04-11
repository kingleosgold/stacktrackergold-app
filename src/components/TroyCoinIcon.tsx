interface TroyCoinIconProps {
  size?: number;
  className?: string;
}

export function TroyCoinIcon({ size = 20, className }: TroyCoinIconProps) {
  return (
    <img
      src="/troy-avatar.png"
      alt="Troy"
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: '50%', objectFit: 'cover', display: 'block' }}
    />
  );
}
