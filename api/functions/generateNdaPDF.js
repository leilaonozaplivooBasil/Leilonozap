// 📄 /api/functions/generateNdaPDF — PDF do Termo de Confidencialidade.
//
// Rota NOVA e separada de generateContractPDF: o contrato tem 14 cláusulas e não
// serve como termo autônomo. Aqui sai um documento próprio do sigilo, com multa
// contratual e bloco de autenticidade.
import { gerarTermoSigiloPdfBase64, VERSAO_TERMO } from '../_lib/termoSigiloPdf.js';

export default async function handler(req, res) {
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    const pdfBase64 = gerarTermoSigiloPdfBase64({
      partner_name: body.partner_name,
      partner_cpf: body.partner_cpf,
      partner_email: body.partner_email,
      assinado_em: body.assinado_em,
      ip: body.ip,
      user_agent: body.user_agent,
      hash: body.hash,
      codigo_verificacao: body.codigo_verificacao,
      versao: body.versao || VERSAO_TERMO,
      signature_base64: body.signature_base64,
      doc_identidade_url: body.doc_identidade_url,
      doc_cpf_url: body.doc_cpf_url,
    });

    if (body.format === 'binary') {
      const buffer = Buffer.from(pdfBase64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="Termo_Confidencialidade_LeilaoNoZap.pdf"');
      return res.status(200).send(buffer);
    }

    const result = {
      success: true,
      pdf_base64: 'data:application/pdf;base64,' + pdfBase64,
      filename: 'Termo_Confidencialidade_LeilaoNoZap.pdf',
      versao: body.versao || VERSAO_TERMO,
    };
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ ...result, data: result });
  } catch (e) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ success: false, error: 'Falha ao gerar o termo', details: String(e?.message || e) });
  }
}