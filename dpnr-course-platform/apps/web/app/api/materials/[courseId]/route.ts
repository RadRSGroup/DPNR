type Params = { params: { courseId: string } };

export async function GET(_: Request, { params }: Params) {
  return Response.json({ courseId: params.courseId, materials: [] }, { status: 200 });
}

