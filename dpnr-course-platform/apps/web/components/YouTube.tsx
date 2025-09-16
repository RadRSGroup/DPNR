export function YouTube({ id, title }: { id: string; title?: string }) {
  const src = `https://www.youtube-nocookie.com/embed/${id}`;
  return (
    <div className="aspect-video w-full overflow-hidden rounded bg-black/5">
      <iframe
        className="h-full w-full"
        src={src}
        title={title || 'YouTube video'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

