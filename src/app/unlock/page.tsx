import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { GATE_COOKIE, gateToken } from "@/lib/gate";

export const dynamic = "force-dynamic";

async function unlock(formData: FormData) {
  "use server";

  const passcode = process.env.VISION_BOARD_PASSCODE;
  const attempt = String(formData.get("passcode") ?? "");
  const next = String(formData.get("next") ?? "/") || "/";

  if (!passcode || attempt !== passcode) {
    redirect(`/unlock?error=1&next=${encodeURIComponent(next)}`);
  }

  (await cookies()).set(GATE_COOKIE, await gateToken(passcode), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  // Only same-origin paths, so a crafted ?next= cannot bounce you elsewhere.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export default async function UnlockPage({ searchParams }: PageProps<"/unlock">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const failed = params.error === "1";

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pad-safe-x">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Vision Board</p>
        <h1 className="mt-1 font-serif text-3xl">You&apos;re not dead yet.</h1>
      </div>

      <form action={unlock} className="w-full max-w-xs space-y-3">
        <input type="hidden" name="next" value={next} />
        <input
          name="passcode"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Passcode"
          aria-invalid={failed}
          className="min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-center outline-none focus:border-accent"
        />
        {failed ? (
          <p role="alert" className="text-center text-sm text-tier-atomic">
            Not it. Try again.
          </p>
        ) : null}
        <button
          type="submit"
          className="min-h-12 w-full rounded-xl bg-accent font-medium text-accent-fg"
        >
          Open the board
        </button>
      </form>
    </main>
  );
}
