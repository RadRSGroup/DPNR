export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-white">
      <div className="mx-auto max-w-[1200px] px-6 py-12 grid gap-8 md:grid-cols-3">
        <div>
          <a href="/" className="font-semibold text-primary">DPNR</a>
          <p className="text-gray-400 mt-3 text-sm">Practical, in-person courses and materials.</p>
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Navigate</div>
          <ul className="text-sm text-gray-400 space-y-1">
            <li><a href="/about" className="hover:text-white">About</a></li>
            <li><a href="/course" className="hover:text-white">Courses</a></li>
            <li><a href="/library" className="hover:text-white">Library</a></li>
            <li><a href="/shop" className="hover:text-white">Shop</a></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Contact</div>
          <ul className="text-sm text-gray-400 space-y-1">
            <li><a href="mailto:info@dpnr.local" className="hover:text-white">info@dpnr.local</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800">
        <div className="mx-auto max-w-[1200px] px-6 py-4 text-xs text-gray-500">© {year} DPNR. All rights reserved.</div>
      </div>
    </footer>
  );
}

