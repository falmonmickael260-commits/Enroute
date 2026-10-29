/**
 * Compact starting grid for the 3D road. Two cars fit side by side on the
 * narrow road; additional cars form staggered rows behind them.
 */
export function slotsFor(count: number): { lateral: number; along: number }[] {
  const safeCount = Math.max(0, Math.floor(count));
  const columns = [-0.5, 0.5];
  const rowGap = 1.1;

  return Array.from({ length: safeCount }, (_, index) => {
    const row = Math.floor(index / columns.length);
    const inRow = Math.min(columns.length, safeCount - row * columns.length);
    const column = index % columns.length;
    return {
      lateral: inRow === 1 ? 0 : columns[column],
      along: row === 0 ? 0 : -row * rowGap,
    };
  });
}
