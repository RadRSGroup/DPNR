export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return Response.json({ ok: true, user: body }, { status: 201 });
}

