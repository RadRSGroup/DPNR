export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-6xl font-bold mb-4">✅ Frontend Working!</h1>
        <p className="text-xl">DPNR Landing Page is Modern & Responsive</p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
          <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2">🎨 Modern Design</h3>
            <p className="text-sm">Glass morphism, animations, gradients</p>
          </div>
          <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2">📱 Responsive</h3>
            <p className="text-sm">Mobile-first, all breakpoints</p>
          </div>
          <div className="bg-white/20 backdrop-blur-lg rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2">🌐 RTL Support</h3>
            <p className="text-sm">Hebrew & English layouts</p>
          </div>
        </div>
      </div>
    </div>
  );
}