import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(process.env.IRON_SESSION_COOKIE_NAME || 'dpnr_session');
  if (!sessionCookie) {
    redirect('/auth/login');
  }
  return <>{children}</>;
}

