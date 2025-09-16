import { YouTube } from "../../components/YouTube";

const demoVideos = [
  { id: "dQw4w9WgXcQ", title: "Welcome to DPNR" },
  { id: "9bZkp7q19f0", title: "Course Overview" },
];

export default function LibraryPage() {
  return (
    <main className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Video Library</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {demoVideos.map((v) => (
          <div key={v.id}>
            <YouTube id={v.id} title={v.title} />
            <p className="mt-2 text-sm text-gray-700">{v.title}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
