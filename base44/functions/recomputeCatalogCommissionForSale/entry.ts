import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const saleId = body.sale_id || body.saleId;
    const licenseeId = body.licensee_id || body.licenseeId;
    const referralCode = body.referral_code || body.referralCode;
    const licenseeEmail = body.licensee_email || body.licenseeEmail;

    if (!saleId) return Response.json({ error: 'sale_id is required' }, { status: 400 });

    // 1) Optionally update the sale anchor using existing helper function
    if (licenseeId || referralCode || licenseeEmail) {
      try {
        await base44.functions.invoke('updateSaleAnchor', {
          sale_id: saleId,
          licensee_id: licenseeId,
          referral_code: referralCode,
          licensee_email: licenseeEmail,
        });
      } catch (_) {
        // proceed even if update helper fails; we'll still try to recompute
      }
    }

    // 2) ⛔ PASSO REMOVIDO — 04/08/2026 (TRAVA 4, autorizada pelo dono).
    //
    // ANTES: este passo apagava TODOS os CommissionRecord da venda antes do recálculo.
    //
    // POR QUE FOI REMOVIDO (risco de CRÉDITO EM DOBRO):
    //   O motor oficial acertarComissaoVenda trabalha por DELTA: ele lê os
    //   commission_records existentes (o que JÁ foi pago), calcula o devido e credita
    //   apenas a diferença (devido − pago). Ele mesmo já apaga e regrava os lançamentos
    //   da venda (acertarComissaoVenda/entry.ts, linha 194 — DELETE por sale_id).
    //
    //   Apagar os registros AQUI, antes de chamá-lo, fazia ele ler pago = 0 e creditar
    //   o valor CHEIO em cima de um saldo que a pessoa já tinha recebido — inflando o
    //   commission_balance a cada execução deste endpoint.
    //
    // Portanto: NÃO apagar nada aqui. A limpeza é responsabilidade do motor oficial,
    // que faz DELETE + INSERT + ajuste de saldo de forma consistente.
    //
    // deletedCount fica 0 fixo só para não quebrar quem consome a resposta.
    const deletedCount = 0;

    // 3) Re-run commission processing
    // ⚠️ TROCA DE MOTOR — 04/08/2026 (BLOCO QUARENTENA-MOTOR-LEGADO, autorizado pelo dono).
    // ANTES: invoke('processCatalogCommission') → motor LEGADO, totalPercent = 26.0,
    //        com o plano de carreira antigo (kit_start/plano_lider/plano_lojista, sem
    //        Influenciador/Vendedor/Parceiro, sem cadeia telescópica, sem teto de 20%).
    // PROBLEMA: na época, o passo 2 acima APAGAVA as comissões da venda antes desta
    //        chamada (removido pela TRAVA 4) — então este ponto era a última porta capaz
    //        de rebaixar uma venda real de 30% para 26%, inclusive furando a guarda de
    //        idempotência de api/_lib/storeFulfill.js.
    // AGORA: acertarComissaoVenda → motor OFICIAL, 30% = 20% cadeia telescópica +
    //        10% topo institucional (docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md, seção 6).
    // dry_run: false porque este endpoint é explicitamente de aplicação (admin manual).
    const recomputeRes = await base44.functions.invoke('acertarComissaoVenda', { sale_id: saleId, dry_run: false });

    // 4) Fetch final distribution for proof
    let distribution = null;
    try {
      const proof = await base44.functions.invoke('getSaleCommissions', { sale_id: saleId });
      distribution = proof?.data || proof;
    } catch (_) {
      // ignore
    }

    return Response.json({ success: true, deletedCount, recompute: recomputeRes?.data || recomputeRes, distribution });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});