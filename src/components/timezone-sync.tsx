"use client";

import { useEffect } from "react";

import { rememberTimezone } from "@/lib/actions";

/**
 * The server runs in UTC. Without knowing the browser's zone, "today" would
 * roll over in the afternoon for anyone in the Americas, so the zone is
 * reported once and kept in a cookie.
 */
export function TimezoneSync({ current }: { current: string }) {
  useEffect(() => {
    const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (resolved && resolved !== current) {
      void rememberTimezone(resolved);
    }
  }, [current]);

  return null;
}
