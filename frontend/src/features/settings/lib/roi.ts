export interface RoiBox {
  position: number
  x: number
  y: number
  w: number
  h: number
}

const ROI_COUNT = 6
const MIN_SIZE = 0.08
const UNIT = 10_000
const EDGE = 1 / UNIT

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Rounds to 4 decimals and keeps the box strictly inside the frame. */
function normalizeBox(box: RoiBox): RoiBox {
  const x = clamp(Math.round(box.x * UNIT), 0, UNIT - 2)
  const y = clamp(Math.round(box.y * UNIT), 0, UNIT - 2)
  const w = clamp(Math.round(box.w * UNIT), 1, UNIT - 1 - x)
  const h = clamp(Math.round(box.h * UNIT), 1, UNIT - 1 - y)
  return {
    position: box.position,
    x: x / UNIT,
    y: y / UNIT,
    w: w / UNIT,
    h: h / UNIT,
  }
}

export function moveBox(box: RoiBox, dx: number, dy: number): RoiBox {
  return normalizeBox({
    ...box,
    x: clamp(box.x + dx, 0, 1 - box.w - EDGE),
    y: clamp(box.y + dy, 0, 1 - box.h - EDGE),
  })
}

export function resizeBox(box: RoiBox, dw: number, dh: number): RoiBox {
  return normalizeBox({
    ...box,
    w: clamp(box.w + dw, MIN_SIZE, 1 - box.x - EDGE),
    h: clamp(box.h + dh, MIN_SIZE, 1 - box.y - EDGE),
  })
}

const GRID_COLUMNS = 3
const GRID_ROWS = 2
// The grid of the Live Kamera artboard. The top margin leaves room for the LIVE badge.
const MARGIN = { left: 0.04, right: 0.04, top: 0.09, bottom: 0.055 }
const GAP = { x: 0.02, y: 0.025 }

/**
 * Three columns by two rows, numbered row by row, with the same margins and
 * gaps as the artboard. Keep it equal to DEFAULT_ROI_CONFIG in the backend.
 */
export function defaultBoxes(): RoiBox[] {
  const width =
    (1 - MARGIN.left - MARGIN.right - (GRID_COLUMNS - 1) * GAP.x) / GRID_COLUMNS
  const height =
    (1 - MARGIN.top - MARGIN.bottom - (GRID_ROWS - 1) * GAP.y) / GRID_ROWS

  return Array.from({ length: ROI_COUNT }, (_, index) => {
    const column = index % GRID_COLUMNS
    const row = Math.floor(index / GRID_COLUMNS)
    return normalizeBox({
      position: index + 1,
      x: MARGIN.left + column * (width + GAP.x),
      y: MARGIN.top + row * (height + GAP.y),
      w: width,
      h: height,
    })
  })
}

export function sortBoxes(boxes: RoiBox[]): RoiBox[] {
  return [...boxes].sort((a, b) => a.position - b.position)
}

export function boxesEqual(a: RoiBox[], b: RoiBox[]): boolean {
  if (a.length !== b.length) return false
  const left = sortBoxes(a)
  const right = sortBoxes(b)
  return left.every((box, index) => {
    const other = right[index]
    return (
      other !== undefined &&
      box.position === other.position &&
      box.x === other.x &&
      box.y === other.y &&
      box.w === other.w &&
      box.h === other.h
    )
  })
}
