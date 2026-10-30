/**
 * Starting grid for the four-lane race road. Cars use the lane centres, with
 * smaller groups kept balanced around the middle of the track.
 */
export function slotsFor(count: number): { lateral: number; along: number }[] {
  const safeCount = Math.max(0, Math.floor(count));
  const columns = [-0.75, -0.25, 0.25, 0.75];
  const rowGap = 1.1;

  return Array.from({ length: safeCount }, (_, index) => {
    const row = Math.floor(index / columns.length);
    const inRow = Math.min(columns.length, safeCount - row * columns.length);
    const column = index % columns.length;
    const lanes = inRow === 1
      ? [0]
      : inRow === 2
        ? [-0.25, 0.25]
        : inRow === 3
          ? [-0.5, 0, 0.5]
          : columns;
    return {
      lateral: lanes[column] ?? 0,
      along: row === 0 ? 0 : -row * rowGap,
    };
  });
}
