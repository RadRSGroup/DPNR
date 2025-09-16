export async function GET(_: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  return Response.json({ id, status: 'OPEN' }, { status: 200 });
}
