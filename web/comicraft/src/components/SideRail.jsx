/** Left-edge vertical label + hairline + diamond terminus. */
export default function SideRail() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-6 z-20 hidden flex-col items-center justify-center gap-6 py-20 lg:left-10 lg:flex"
    >
      <span
        data-rail-label
        className="writing-vertical rotate-180 font-sans text-[0.65rem] font-light tracking-[0.55em] text-fog/80"
      >
        THE SHADOWS
      </span>

      <span
        data-rail-line
        className="w-px flex-1 origin-top bg-gradient-to-b from-blood via-blood/45 to-blood/10"
      />

      <span data-rail-diamond className="mb-2 size-2 rotate-45 bg-blood" />
    </div>
  )
}
