type Params = { params: { id: string } };

export async function GET(_: Request, { params }: Params) {
  // Replace with S3 signed URL generation
  return Response.json({ id: params.id, url: `http://localhost:7070/signed-url?id=${params.id}` }, { status: 200 });
}

