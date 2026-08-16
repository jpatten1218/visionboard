"use client";

import { useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";

type Props = {
  onComplete: () => Promise<void>;
  /** Shown in the track revealed behind the card as it slides. */
  actionLabel?: string;
  disabled?: boolean;
  children: React.ReactNode;
};

const COMMIT_DISTANCE = 96;
const AXIS_LOCK_SLOP = 8;

/**
 * The digital stand-in for moving a sticky note: drag the card to the right
 * and it leaves the board for the evidence pile. Vertical scrolling still has
 * to work, so the gesture locks to an axis after the first few pixels rather
 * than swallowing every touch.
 */
export function SwipeToComplete({ onComplete, actionLabel = "Done", disabled, children }: Props) {
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pending, startTransition] = useTransition();

  const start = useRef<{ x: number; y: number } | null>(null);
  const axis = useRef<"undecided" | "horizontal" | "vertical">("undecided");

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || pending || leaving) return;
    // A mouse or pen press is unambiguous; a touch might still become a scroll.
    start.current = { x: event.clientX, y: event.clientY };
    axis.current = event.pointerType === "touch" ? "undecided" : "horizontal";
    setSettling(false);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;

    if (axis.current === "undecided") {
      if (Math.abs(dx) < AXIS_LOCK_SLOP && Math.abs(dy) < AXIS_LOCK_SLOP) return;
      axis.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      if (axis.current === "horizontal") {
        // Take the pointer so the browser stops sending it to the scroller.
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
    if (axis.current !== "horizontal") return;

    // Rightward drags track the finger; leftward ones resist, so the gesture
    // reads as one-directional without being locked outright.
    setOffset(dx > 0 ? dx : dx / 4);
  }

  function onPointerUp() {
    if (!start.current) return;
    const travelled = offset;
    start.current = null;
    axis.current = "undecided";
    setSettling(true);

    if (travelled < COMMIT_DISTANCE) {
      setOffset(0);
      return;
    }

    setLeaving(true);
    startTransition(async () => {
      await onComplete();
    });
  }

  const progress = Math.min(1, Math.max(0, offset / COMMIT_DISTANCE));
  const armed = progress >= 1;

  return (
    <div className="relative isolate overflow-hidden rounded-2xl">
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-start rounded-2xl bg-emerald-600 pl-5 text-sm font-medium text-white"
        style={{ opacity: leaving ? 1 : progress }}
      >
        <span style={{ transform: `scale(${armed ? 1 : 0.9})`, transition: "transform 120ms" }}>
          {actionLabel}
        </span>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative touch-pan-y select-none rounded-2xl border border-border bg-surface"
        style={{
          transform: `translate3d(${leaving ? "110%" : `${offset}px`}, 0, 0)`,
          transition: settling || leaving ? "transform 220ms cubic-bezier(0.2, 0, 0, 1)" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
