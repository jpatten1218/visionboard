"use client";

import { useRef, useState } from "react";

/**
 * One macro goal fills the screen at a time and you swipe sideways between
 * them. Seeing everything at once is what makes a phone-sized board useless —
 * and the workbook is explicit that focus is the point.
 */
export function BoardCarousel({ panels }: { panels: { key: string; node: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  function onScroll() {
    const el = track.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(index: number) {
    track.current?.scrollTo({ left: index * track.current.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={track}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-touch [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {panels.map((panel) => (
          <section
            key={panel.key}
            className="w-full shrink-0 snap-center overflow-y-auto scroll-touch"
          >
            {panel.node}
          </section>
        ))}
      </div>

      {panels.length > 1 ? (
        <div className="flex items-center justify-center gap-2 py-3">
          {panels.map((panel, index) => (
            <button
              key={panel.key}
              onClick={() => goTo(index)}
              aria-label={`Go to board ${index + 1} of ${panels.length}`}
              aria-current={index === active}
              className="grid h-8 w-6 place-items-center"
            >
              <span
                className={`block rounded-full transition-all ${
                  index === active ? "h-2 w-5 bg-accent" : "h-2 w-2 bg-border"
                }`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
