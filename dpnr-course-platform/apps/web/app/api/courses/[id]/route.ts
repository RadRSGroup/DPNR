export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return Response.json({ id, title: 'TBD' }, { status: 200 });
}
