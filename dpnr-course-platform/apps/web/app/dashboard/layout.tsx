import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { sessionOptions, type AppSession } from '../../lib/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies();
  const session = await getIronSession<AppSession>(c, sessionOptions);
  if (!session.user?.id) {
    redirect('/auth/login');
  }
  return <>{children}</>;
}
