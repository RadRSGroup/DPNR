export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return Response.json({ id, status: 'OPEN' }, { status: 200 });
}
