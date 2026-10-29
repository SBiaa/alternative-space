export function Star({ size = 56, className = "", color = "#ab392f" }: { size?: number; className?: string; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <path d="M50 0 C54 36 64 46 100 50 C64 54 54 64 50 100 C46 64 36 54 0 50 C36 46 46 36 50 0Z" fill={color} />
    </svg>
  );
}
