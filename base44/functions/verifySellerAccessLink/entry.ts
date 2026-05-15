import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ success: false, error: "Token não fornecido" }, { status: 400 });
    }

    // Busca o vendedor pelo token
    const sellers = await base44.asServiceRole.entities.AppUser.filter({ access_token: token });

    if (!sellers || sellers.length === 0) {
      return Response.json({ success: false, error: "Token inválido ou expirado" }, { status: 404 });
    }

    const seller = sellers[0];

    // Verifica se o token expirou
    if (seller.access_token_expires) {
      const expiryDate = new Date(seller.access_token_expires);
      if (expiryDate < new Date()) {
        return Response.json({ success: false, error: "Token expirado" }, { status: 401 });
      }
    }

    return Response.json({
      success: true,
      seller_name: seller.full_name,
      seller_email: seller.email,
      token_valid: true,
      message: "Link válido e funcionando"
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});