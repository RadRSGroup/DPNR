export default function AboutPage() {
  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">About</h1>
      <div className="aspect-video w-full bg-black/5 rounded">
        <iframe
          className="w-full h-full"
          src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </main>
  );
}

