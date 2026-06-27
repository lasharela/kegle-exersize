// Gentle pulse-target ladder: start light, ramp up.
// Steps of 50 up to 500, then 100 up to 1000, then 200 up to 2000.
export const LEVELS: number[] = [
  100, 150, 200, 250, 300, 350, 400, 450, 500,
  600, 700, 800, 900, 1000,
  1200, 1400, 1600, 1800, 2000,
]

// Index of the rung at or below `target` (snaps off-ladder values down, clamps to ends).
export function levelIndex(target: number): number {
  let idx = 0
  for (let i = 0; i < LEVELS.length; i++) {
    if (LEVELS[i] <= target) idx = i
    else break
  }
  return idx
}

export function nextTarget(target: number): number | null {
  const i = levelIndex(target)
  return i < LEVELS.length - 1 ? LEVELS[i + 1] : null
}

export function prevTarget(target: number): number | null {
  const i = levelIndex(target)
  return i > 0 ? LEVELS[i - 1] : null
}

// 1-based level number for display.
export function levelNumber(target: number): number {
  return levelIndex(target) + 1
}
