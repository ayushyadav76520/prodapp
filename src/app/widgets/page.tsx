export default function WidgetsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Widgets</h1>
        <p className="text-sm text-black/50 dark:text-white/50 mt-0.5">
          Home-screen widgets showing today&apos;s events, tasks and streaks.
        </p>
      </header>

      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-6 space-y-3">
        <p className="text-sm text-black/70 dark:text-white/70">
          Widgets will let you pin a live snapshot of your day to your phone or
          desktop home screen — no need to open the app to check what&apos;s next.
        </p>
        <p className="text-sm text-black/50 dark:text-white/50">
          Once the core app is installed as a PWA, this page will let you
          preview and customize widget layouts here.
        </p>
      </div>
    </div>
  );
}
