export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  return Response.json({ ok: true, feedbackId: 'demo', ...body }, { status: 201 });
}

