/** Column count per breakpoint: mobile / tablet / desktop. */
export function columnsFor(width: number): number {
  if (width < 640) return 2
  if (width < 1024) return 3
  return 4
}

/**
 * Scatters `count` images across a `cols`-wide grid, one per row with an
 * occasional second, so the gallery reads as an archive contact sheet rather
 * than a catalogue. `-1` marks an empty cell.
 *
 * The primary column walks by two every row and picks up an extra step on odd
 * rows, which is what stops the images from settling into a diagonal.
 */
export function buildLayout(count: number, cols: number): number[][] {
  const rows: number[][] = []
  let placed = 0

  for (let r = 0; placed < count; r++) {
    const row: number[] = new Array(cols).fill(-1)

    const a = (r * 2 + (r % 2)) % cols
    row[a] = placed++

    if (r % 3 === 0 && placed < count) {
      let b = (a + 2) % cols
      if (b === a) b = (a + 1) % cols
      row[b] = placed++
    }

    rows.push(row)
  }

  return rows
}
