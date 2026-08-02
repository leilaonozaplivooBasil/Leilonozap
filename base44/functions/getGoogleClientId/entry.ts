Deno.serve(async (req) => {
  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID') || '';
    return Response.json({ clientId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});