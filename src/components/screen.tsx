export function Screen({
  title,
  eyebrow,
  quote,
  children,
}: {
  title: string;
  eyebrow?: string;
  quote?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 overflow-y-auto scroll-touch pad-safe-x">
      <div className="mx-auto w-full max-w-2xl px-5 pb-10 pad-safe-top">
        <header className="pt-6 pb-5">
          {eyebrow ? (
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
          ) : null}
          <h1 className="font-serif text-3xl leading-tight">{title}</h1>
          {quote ? (
            <p className="mt-3 border-l-2 border-accent pl-3 text-sm italic text-muted text-pretty">
              {quote}
            </p>
          ) : null}
        </header>
        {children}
      </div>
    </main>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted text-pretty">{body}</p>
    </div>
  );
}
