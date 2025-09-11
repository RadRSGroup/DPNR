type Params = { params: { id: string } };

export async function POST(_: Request, { params }: Params) {
  return Response.json({ enrolled: true, courseId: params.id }, { status: 202 });
}

