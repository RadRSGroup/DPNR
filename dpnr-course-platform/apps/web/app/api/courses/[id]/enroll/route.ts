export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return Response.json({ enrolled: true, courseId: id }, { status: 202 });
}
