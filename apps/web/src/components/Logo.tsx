/** Corrix mark — open ring C + verification node */

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/logo.svg"
      alt=""
      width={size}
      height={size}
      className="logo-mark-img"
      aria-hidden
    />
  );
}

export function LogoWord({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo">
      <LogoMark size={compact ? 28 : 32} />
      Corrix
    </span>
  );
}
