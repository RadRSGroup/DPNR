export async function POST(_: Request, { params }: { params: { id: string } }) {
  return Response.json({ enrolled: true, courseId: params.id }, { status: 202 });
}
