export async function GET(_: Request, { params }: any) {
  const resolved = params && typeof params.then === 'function' ? await params : params;
  const { id } = resolved || {};
  return Response.json({ id, status: 'OPEN' }, { status: 200 });
}
