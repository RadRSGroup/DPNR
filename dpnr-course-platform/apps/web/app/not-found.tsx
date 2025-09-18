export default function NotFound() {
  return (
    <main className="p-8 max-w-3xl mx-auto text-center">
      <h1 className="text-2xl font-semibold">404 - Page Not Found</h1>
      <p className="mt-2 text-muted-foreground">The page you requested does not exist.</p>
      <div className="mt-6">
        <a className="underline" href="/">Return home</a>
      </div>
    </main>
  );
}

