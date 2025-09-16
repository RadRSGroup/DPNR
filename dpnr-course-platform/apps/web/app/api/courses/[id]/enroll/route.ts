export async function POST(_: Request, { params }: any) {
  const resolved = params && typeof params.then === 'function' ? await params : params;
  const { id } = resolved || {};
  return Response.json({ enrolled: true, courseId: id }, { status: 202 });
}
