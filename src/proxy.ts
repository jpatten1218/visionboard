import { NextResponse, type NextRequest } from "next/server";

import { GATE_COOKIE, gateToken, safeEqual } from "@/lib/gate";

export async function proxy(request: NextRequest) {
  const passcode = process.env.VISION_BOARD_PASSCODE;

  // No passcode configured means the board runs open, which is only sensible
  // on a URL nobody else has. docs/SECURITY.md spells out the tradeoff.
  if (!passcode) return NextResponse.next();

  const presented = request.cookies.get(GATE_COOKIE)?.value ?? "";
  if (safeEqual(presented, await gateToken(passcode))) return NextResponse.next();

  const unlock = new URL("/unlock", request.url);
  unlock.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(unlock);
}

export const config = {
  matcher: [
    // Everything except the unlock screen itself, Next's internals, and the
    // icons and manifest iOS fetches before the user can possibly be let in.
    "/((?!unlock|_next/static|_next/image|icon.svg|apple-touch-icon.png|icon-192.png|icon-512.png|icon-maskable-512.png|manifest.webmanifest|favicon.ico).*)",
  ],
};
