// 📄 /api/functions/generateContractPDF — rota que faltava na Vercel.
//
// Correção de causa-raiz (06/08/2026): o front chama base44.functions.invoke(
// 'generateContractPDF'), o adapter traduz para /api/functions/generateContractPDF
// e essa rota não existia — daí o "PDF não gerado" em Baixar e em Compartilhar.
//
// Aceita os mesmos parâmetros de antes (format, partner_name, partner_cpf) e,
// opcionalmente, os dados do aceite/assinatura para estampar o bloco de
// autenticidade no documento.
import { gerarContratoPdfBase64, VERSAO_CONTRATO } from '../_lib/contratoPdf.js';

export default async function handler(req, res) {
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    const pdfBase64 = gerarContratoPdfBase64({
      partner_name: body.partner_name,
      partner_cpf: body.partner_cpf,
      partner_email: body.partner_email,
      plan_name: body.plan_name,
      plan_amount: body.plan_amount,
      assinado_em: body.assinado_em,
      ip: body.ip,
      user_agent: body.user_agent,
      hash: body.hash,
      codigo_verificacao: body.codigo_verificacao,
      versao: body.versao || VERSAO_CONTRATO,
      signature_base64: body.signature_base64,
    });

    const querFormatoBinario = body.format === 'binary';
    if (querFormatoBinario) {
      const buffer = Buffer.from(pdfBase64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="Contrato_Parceria_LeilaoNoZap.pdf"');
      return res.status(200).send(buffer);
    }

    const result = {
      success: true,
      pdf_base64: 'data:application/pdf;base64,' + pdfBase64,
      filename: 'Contrato_Parceria_LeilaoNoZap.pdf',
      versao: body.versao || VERSAO_CONTRATO,
    };
    res.setHeader('Content-Type', 'application/json');
    // duplica em `data` — o front foi escrito para o formato antigo do SDK
    return res.status(200).json({ ...result, data: result });
  } catch (e) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ success: false, error: 'Falha ao gerar o contrato', details: String(e?.message || e) });
  }
}