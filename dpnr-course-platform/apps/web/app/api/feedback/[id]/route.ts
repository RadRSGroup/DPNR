export async function GET(_: Request, { params }: { params: { id: string } }) {
  return Response.json({ id: params.id, status: 'OPEN' }, { status: 200 });
}
