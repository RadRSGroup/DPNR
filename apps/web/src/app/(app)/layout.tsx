import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:flex lg:min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      <MobileNav />
    </div>
  )
}
