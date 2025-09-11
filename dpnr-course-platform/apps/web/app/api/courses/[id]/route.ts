type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  return Response.json({ id: params.id, title: 'TBD' }, { status: 200 });
}

