export async function POST(_: Request, context: { params: { id: string } }) {
  const { id } = context.params;
  return Response.json({ enrolled: true, courseId: id }, { status: 202 });
}
