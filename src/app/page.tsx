export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pad-safe-x pad-safe-top pad-safe-bottom text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Vision Board</p>
      <h1 className="font-serif text-4xl leading-tight text-balance">
        The frame is up.
      </h1>
      <p className="max-w-xs text-sm text-muted text-pretty">
        The board itself is next — it gets built to match the workbook.
      </p>
    </main>
  );
}
