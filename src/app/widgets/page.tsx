export default function WidgetsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <header className="border-b border-rule pb-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-medium mb-1">
          Coming Soon
        </p>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">Widgets</h1>
      </header>

      <div className="border border-rule p-6 space-y-3">
        <p className="text-sm text-ink leading-relaxed">
          Widgets will let you pin a live snapshot of your day to your phone or
          desktop home screen — no need to open the app to check what&apos;s next.
        </p>
        <p className="text-sm text-ink-soft leading-relaxed">
          Once the core app is installed as a PWA, this page will let you
          preview and customize widget layouts here.
        </p>
      </div>
    </div>
  );
}
