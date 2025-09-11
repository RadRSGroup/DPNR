type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  return Response.json({ id: params.id, status: 'OPEN' }, { status: 200 });
}

