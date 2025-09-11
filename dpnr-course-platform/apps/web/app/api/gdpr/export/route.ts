import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(process.env.IRON_SESSION_COOKIE_NAME || 'dpnr_session');
  if (!sessionCookie) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // TODO: Query DB and build CSV/JSON export for the user.
  const csv = 'type,id\nuser,u_demo';
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="export.csv"',
    },
  });
}

