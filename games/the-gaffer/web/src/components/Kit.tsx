// Club shirt in the club's two colours, drawn in the design system's `.kit` box (48px; .sm .xs .md .lg sizes).
export function Kit({ colors, size = '' }: { colors: [string, string]; size?: '' | 'xs' | 'sm' | 'md' | 'lg' }) {
  const [body, trim] = colors;
  return (
    <span className={`kit ${size}`} aria-hidden="true">
      <svg viewBox="0 0 48 48">
        <path d="M16 6 L8 9 L2 18 L9 23 L12 20 L12 43 L36 43 L36 20 L39 23 L46 18 L40 9 L32 6 Q24 12 16 6 Z"
          fill={body} stroke="rgba(0,0,0,.35)" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M8 9 L2 18 L9 23 L12 20 Z M40 9 L46 18 L39 23 L36 20 Z" fill={trim} />
        <path d="M16 6 Q24 12 32 6" fill="none" stroke={trim} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
