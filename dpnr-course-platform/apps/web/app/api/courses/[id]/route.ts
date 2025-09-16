export async function GET(_: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  return Response.json({ id, title: 'TBD' }, { status: 200 });
}
