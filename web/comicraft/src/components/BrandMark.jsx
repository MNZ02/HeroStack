export default function BrandMark({ className = '', ...props }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} {...props}>
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="h-8 w-8 shrink-0 text-blood"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 6h7.5a4.5 4.5 0 0 1 4.5 4.5V27a3.5 3.5 0 0 0-3.5-3.5H4z" />
        <path d="M28 6h-7.5a4.5 4.5 0 0 0-4.5 4.5V27a3.5 3.5 0 0 1 3.5-3.5H28z" />
      </svg>

      <span className="leading-none">
        <span className="block font-sans text-[0.95rem] font-medium tracking-[0.22em] text-bone">
          COMICRAFT
        </span>
        <span className="mt-1 block text-right font-sans text-[0.6rem] font-light tracking-[0.42em] text-fog">
          STUDIO
        </span>
      </span>
    </div>
  )
}
