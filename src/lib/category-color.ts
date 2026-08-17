/**
 * Resolves a category's palette slot to the CSS variable holding its colour.
 * The variable carries both the light and the dark step, so callers never
 * branch on theme.
 */
export function categoryColor(slot: number | null | undefined): string {
  if (!slot || slot < 1 || slot > 8) return "var(--color-muted)";
  return `var(--cat-${slot})`;
}

/** The palette has eight slots; a ninth category reuses the first. */
export const PALETTE_SLOTS = 8;
