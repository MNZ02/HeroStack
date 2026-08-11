/**
 * The "prmpt" wordmark with its registered mark.
 *
 * The source spec asks for filled paths on a 0 0 355 110 viewBox but supplies
 * no path data, so the wordmark is set in Inter Tight at the same metrics.
 * Visually equivalent; swap in real outlines when the brand file exists.
 */
export default function Logo({ width }: { width: number }) {
  return (
    <svg
      width={width}
      viewBox="0 0 355 110"
      fill="none"
      role="img"
      aria-label="prmpt"
    >
      <text
        x="0"
        y="86"
        fill="#fff"
        fontFamily="'Inter Tight', sans-serif"
        fontWeight="500"
        fontSize="104"
        letterSpacing="-6"
      >
        prmpt
      </text>
      <circle cx="330" cy="30" r="18.75" stroke="#fff" strokeWidth="2.5" />
      <text
        x="330"
        y="38"
        fill="#fff"
        textAnchor="middle"
        fontFamily="'Inter Tight', sans-serif"
        fontWeight="500"
        fontSize="20"
        letterSpacing="-0.8"
      >
        R
      </text>
    </svg>
  )
}
