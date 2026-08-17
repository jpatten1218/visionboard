/**
 * Capacity at a glance. No cap and no scolding — these are the numbers you
 * need to judge what you are already carrying before you add another thing.
 */

export type Tile = { label: string; value: number; note?: string; alert?: boolean };

/**
 * The single number the view leads with. Sans rather than the serif used for
 * headings — a display face on a figure reads as decoration — and proportional
 * figures, since tabular spacing looks loose at this size.
 */
export function HeroFigure({ value, label, note }: { value: number; label: string; note?: string }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-5xl font-semibold">{value}</span>
        <span className="text-sm text-muted">{label}</span>
      </div>
      {note ? <p className="mt-1 text-xs text-muted text-pretty">{note}</p> : null}
    </div>
  );
}

export function TileRow({ tiles }: { tiles: Tile[] }) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {tiles.map((tile) => (
        <li
          key={tile.label}
          className={`rounded-xl border px-3 py-2.5 ${
            tile.alert && tile.value > 0
              ? "border-tier-atomic/40 bg-tier-atomic/5"
              : "border-border bg-surface"
          }`}
        >
          {/* tabular-nums here because these sit in a grid and should align. */}
          <p
            className={`text-xl font-semibold tabular-nums ${
              tile.alert && tile.value > 0 ? "text-tier-atomic" : ""
            }`}
          >
            {tile.value}
          </p>
          <p className="mt-0.5 text-[11px] leading-tight text-muted text-pretty">{tile.label}</p>
        </li>
      ))}
    </ul>
  );
}
