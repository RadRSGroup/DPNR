export async function GET(_: Request, { params }: { params: { id: string } }) {
  return Response.json({ id: params.id, title: 'TBD' }, { status: 200 });
}
