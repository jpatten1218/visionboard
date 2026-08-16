"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center pad-safe-x">
      <h1 className="font-serif text-2xl">That didn&apos;t load.</h1>
      <p className="max-w-xs text-sm text-muted text-pretty">{error.message}</p>
      <button
        onClick={reset}
        className="min-h-11 rounded-full bg-accent px-6 text-sm font-medium text-accent-fg"
      >
        Try again
      </button>
    </main>
  );
}
