import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
    if (!ASAAS_API_KEY) {
      return Response.json({ error: "ASAAS_API_KEY não configurada" }, { status: 500 });
    }

    // Busca pagamentos Asaas com status pendente
    const pendingPayments = await base44.asServiceRole.entities.AsaasPayment.filter({
      status: "PENDING"
    });

    if (!pendingPayments || pendingPayments.length === 0) {
      return Response.json({ message: "Nenhum pagamento pendente para reconciliar.", updated: 0 });
    }

    let updated = 0;
    let errors = 0;
    const results = [];

    for (const payment of pendingPayments) {
      if (!payment.payment_id) continue;

      try {
        // Consulta status atual no Asaas
        const asaasRes = await fetch(
          `https://api.asaas.com/v3/payments/${payment.payment_id}`,
          {
            headers: {
              "access_token": ASAAS_API_KEY,
              "Content-Type": "application/json"
            }
          }
        );

        if (!asaasRes.ok) {
          errors++;
          results.push({ id: payment.id, error: `Asaas retornou ${asaasRes.status}` });
          continue;
        }

        const asaasData = await asaasRes.json();
        const newStatus = asaasData.status;

        // Só atualiza se o status mudou
        if (newStatus && newStatus !== payment.status) {
          const updateData = { status: newStatus };

          if (newStatus === "RECEIVED" || newStatus === "CONFIRMED") {
            updateData.payment_date = asaasData.paymentDate || new Date().toISOString();
          }

          await base44.asServiceRole.entities.AsaasPayment.update(payment.id, updateData);
          updated++;
          results.push({ id: payment.id, payment_id: payment.payment_id, old: payment.status, new: newStatus });

          // Se pagamento confirmado, loga no SystemLog
          if (newStatus === "RECEIVED" || newStatus === "CONFIRMED") {
            await base44.asServiceRole.entities.SystemLog.create({
              step: "AsaasReconciliation_PaymentConfirmed",
              status: "success",
              message: `Pagamento ${payment.payment_id} confirmado via reconciliação diária`,
              component_name: "asaasReconcilePayments",
              entity_id: payment.id,
              payload: { payment_id: payment.payment_id, amount: asaasData.value }
            });
          }
        }
      } catch (paymentError) {
        errors++;
        results.push({ id: payment.id, error: paymentError.message });
      }
    }

    return Response.json({
      message: `Reconciliação concluída`,
      total_checked: pendingPayments.length,
      updated,
      errors,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});