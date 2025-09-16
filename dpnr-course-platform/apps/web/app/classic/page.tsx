import ForestStreamHero from "../components/ForestStreamHero";

export default function Page() {
  return (
    <main>
      <section className="p-4 md:p-8">
        <ForestStreamHero priority>
          <h1 className="text-3xl md:text-5xl font-bold">Learn with DPNR</h1>
          <p className="mt-3 md:text-lg text-white/90">Practical, in‑person courses with materials and community.</p>
          <div className="mt-5 flex gap-3">
            <a href="/dashboard" className="px-4 py-2 rounded bg-primary text-primary-foreground">Go to Dashboard</a>
            <a href="/auth/login" className="px-4 py-2 rounded border border-primary">Login</a>
          </div>
        </ForestStreamHero>
      </section>

      <section className="p-8 max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-3">Learn With DPNR</h2>
        <p className="text-muted-foreground mb-6">
          Build practical skills through in‑person courses. Auth, materials, and more.
        </p>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded border p-4 bg-background">
            <h3 className="font-medium mb-1">Secure Auth</h3>
            <p className="text-sm text-muted-foreground">Cognito + server sessions.</p>
          </div>
          <div className="rounded border p-4 bg-background">
            <h3 className="font-medium mb-1">Video Library</h3>
            <p className="text-sm text-muted-foreground">Privacy mode YouTube embeds.</p>
          </div>
          <div className="rounded border p-4 bg-background">
            <h3 className="font-medium mb-1">Responsive UI</h3>
            <p className="text-sm text-muted-foreground">Tailwind + shadcn patterns.</p>
          </div>
        </div>
      </section>

      <section className="p-8 max-w-4xl mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <a href="/dashboard" className="px-4 py-2 rounded bg-primary text-primary-foreground">Go to Dashboard</a>
          <a href="/auth/login" className="px-4 py-2 rounded border border-primary text-foreground">Login</a>
        </div>
      </section>

      {/* Additional sections to drive camera path */}
      <section className="p-8 max-w-4xl mx-auto min-h-screen flex items-center">
        <div>
          <h2 className="text-2xl font-semibold mb-3">About</h2>
          <p className="text-muted-foreground">Our teaching ethos and approach to practical learning.</p>
        </div>
      </section>
      <section className="p-8 max-w-4xl mx-auto min-h-screen flex items-center">
        <div>
          <h2 className="text-2xl font-semibold mb-3">Courses</h2>
          <p className="text-muted-foreground">Explore upcoming in‑person sessions and modules.</p>
        </div>
      </section>
      <section className="p-8 max-w-4xl mx-auto min-h-screen flex items-center">
        <div>
          <h2 className="text-2xl font-semibold mb-3">Materials</h2>
          <p className="text-muted-foreground">Library access and enrolled downloads.</p>
        </div>
      </section>
      <section className="p-8 max-w-4xl mx-auto min-h-screen flex items-center">
        <div>
          <h2 className="text-2xl font-semibold mb-3">Contact</h2>
          <p className="text-muted-foreground">Reach out for schedules and group bookings.</p>
        </div>
      </section>
    </main>
  );
}
