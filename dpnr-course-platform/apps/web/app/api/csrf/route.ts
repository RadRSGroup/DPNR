import { issueCsrfToken } from '../../../lib/csrf';

export async function GET() {
  const token = await issueCsrfToken();
  return Response.json({ token }, { status: 200 });
}
