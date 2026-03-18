import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function norm(s) { return (s ?? '').trim().toLowerCase(); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch(() => null);
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const buyerEmail = body.buyer_email || body.buyerEmail;
    const buyerId = body.buyer_id || body.buyerId;
    const anchorEmail = body.anchor_email || body.anchorEmail;
    const anchorReferralCode = body.anchor_referral_code || body.anchorReferralCode;
    const note = body.note || 'Venda manual criada via função createManualCatalogSale';

    if (!amount || amount <= 0) {
      return Response.json({ error: 'amount inválido' }, { status: 400 });
    }
    if (!buyerEmail && !buyerId) {
      return Response.json({ error: 'Informe buyer_email ou buyer_id' }, { status: 400 });
    }
    if (!anchorEmail && !anchorReferralCode) {
      return Response.json({ error: 'Informe anchor_email ou anchor_referral_code' }, { status: 400 });
    }

    // Carrega usuários necessários
    const allUsers = await base44.asServiceRole.entities.AppUser.list();

    const findUserByEmail = (email) => (allUsers || []).find(u => norm(u.email) === norm(email));
    const findUserById = (id) => (allUsers || []).find(u => u.id === id);
    const findUserByReferral = (code) => (allUsers || []).find(u => (u.referral_code || '').trim() === String(code).trim());

    // Buyer
    let buyer = null;
    if (buyerId) buyer = findUserById(buyerId);
    if (!buyer && buyerEmail) buyer = findUserByEmail(buyerEmail);
    if (!buyer) {
      return Response.json({ error: 'Comprador não encontrado' }, { status: 404 });
    }

    // Ancora (licenciado) ou Site Oficial fallback
    let anchor = null;
    if (anchorEmail) anchor = findUserByEmail(anchorEmail);
    if (!anchor && anchorReferralCode) anchor = findUserByReferral(anchorReferralCode);

    // Garante conta Site Oficial
    let site = (allUsers || []).find(u => u.email === 'site@leilaonozap.com' || norm(u.full_name) === norm('Leilão NoZap - Site Oficial'));
    if (!site) {
      site = await base44.asServiceRole.entities.AppUser.create({
        full_name: 'Leilão NoZap - Site Oficial',
        email: 'site@leilaonozap.com',
        role: 'admin',
        referral_code: 'site_official',
        nickname: 'Site Oficial',
        terms_accepted: true,
      });
    }

    if (!anchor) {
      anchor = site;
    }

    // Cria CatalogSale mínima (marcada como paga)
    const productId = `manual_${Date.now()}`;
    const salePayload = {
      product_id: productId,
      product_title: 'Venda Manual (Catálogo)',
      sale_price: round2(amount),
      total_amount: round2(amount),
      buyer_id: buyer.id,
      buyer_name: buyer.full_name || buyer.email || 'Comprador',
      buyer_email: buyer.email,
      licensee_id: anchor.id,
      licensee_name: anchor.full_name || anchor.email || 'Licenciado',
      referral_code: anchor.referral_code || 'site_official',
      status: 'paid',
      payment_method: 'manual',
      notes: note,
    };

    const sale = await base44.asServiceRole.entities.CatalogSale.create(salePayload);

    // Processa comissões através da função central
    let commissionResult = null;
    try {
      commissionResult = await base44.functions.invoke('processCatalogCommission', { sale_id: sale.id });
    } catch (e) {
      // retorna mesmo assim com aviso
      return Response.json({
        success: true,
        warning: 'Venda criada, mas houve erro ao processar comissões. Rode processCatalogCommission manualmente.',
        sale,
        anchor: { id: anchor.id, full_name: anchor.full_name, email: anchor.email },
        buyer: { id: buyer.id, full_name: buyer.full_name, email: buyer.email },
        error_details: e?.message || String(e),
      }, { status: 200 });
    }

    return Response.json({
      success: true,
      sale,
      anchor: { id: anchor.id, full_name: anchor.full_name, email: anchor.email },
      buyer: { id: buyer.id, full_name: buyer.full_name, email: buyer.email },
      commission_result: commissionResult,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});