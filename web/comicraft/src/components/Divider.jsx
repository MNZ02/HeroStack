/** Thin blood-red rule capped with diamonds — the section separator from the mockup. */
export default function Divider({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`flex w-full items-center gap-3 ${className}`}
    >
      <span className="size-1.5 shrink-0 rotate-45 bg-blood" />
      <span className="h-px flex-1 bg-gradient-to-r from-blood/60 via-blood/25 to-blood/60" />
      <span className="size-1.5 shrink-0 rotate-45 bg-blood" />
    </div>
  )
}
