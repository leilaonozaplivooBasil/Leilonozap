// 🗄️ /api/functions/arquivarDocumentoAssinado
//
// Gera o PDF do documento assinado UMA vez, grava no cofre privado do Supabase
// Storage e guarda o caminho na trilha de auditoria. Tenta também uma cópia no
// Google Drive da empresa (best-effort).
//
// ⚠️ PASSO ADITIVO. Não altera a assinatura, não valida CPF de novo, não ativa
// plano, não movimenta dinheiro. Se falhar, o fluxo antigo (gerar PDF na hora)
// continua atendendo o parceiro.
//
// Idempotente: se o registro já tem arquivo_path, devolve o que existe.
import {
  configurado, montarCaminho, buscarRegistro, atualizarRegistro,
  enviarParaCofre, tipoDoDocumento,
} from '../_lib/documentoAssinado.js';
import { copiarParaDrive, driveConfigurado } from '../_lib/driveCopia.js';
import { gerarContratoPdfBase64, VERSAO_CONTRATO } from '../_lib/contratoPdf.js';
import { gerarTermoSigiloPdfBase64, VERSAO_TERMO } from '../_lib/termoSigiloPdf.js';

const gerarPdfBase64 = (registro) => {
  const comum = {
    partner_name: registro.nome,
    partner_cpf: registro.cpf,
    partner_email: registro.email,
    assinado_em: registro.assinado_em,
    ip: registro.ip,
    user_agent: registro.user_agent,
    hash: registro.hash_documento,
    codigo_verificacao: registro.codigo_verificacao,
    signature_base64: registro.assinatura_png,
  };

  if (registro.documento === 'termo_confidencialidade') {
    return gerarTermoSigiloPdfBase64({
      ...comum,
      versao: registro.versao_contrato || VERSAO_TERMO,
      doc_identidade_url: registro.doc_identidade_url,
      doc_cpf_url: registro.doc_cpf_url,
    });
  }

  return gerarContratoPdfBase64({
    ...comum,
    versao: registro.versao_contrato || VERSAO_CONTRATO,
    plan_name: registro.plano,
    plan_amount: registro.valor_aporte,
  });
};

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });

  const responder = (payload) => res.status(200).json({ ...payload, data: payload });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    const assinaturaId = String(body.assinatura_id || '').trim();
    if (!assinaturaId) return responder({ success: false, error: 'assinatura_id é obrigatório' });
    if (!configurado()) return responder({ success: false, error: 'Config do servidor ausente' });

    const registro = await buscarRegistro(assinaturaId);
    if (!registro) return responder({ success: false, error: 'Assinatura não encontrada' });

    // já arquivado — não duplica, não regrava
    if (registro.arquivo_path) {
      return responder({
        success: true,
        ja_arquivado: true,
        arquivo_path: registro.arquivo_path,
        arquivo_drive_url: registro.arquivo_drive_url || null,
        arquivado_em: registro.arquivado_em,
      });
    }

    const pdfBuffer = Buffer.from(gerarPdfBase64(registro), 'base64');
    const caminho = montarCaminho(registro);

    // 1) COFRE OFICIAL — obrigatório
    await enviarParaCofre(caminho, pdfBuffer);

    // 2) CÓPIA NO DRIVE — best-effort, nunca bloqueia
    const nomeDrive = (tipoDoDocumento(registro.documento) === 'sigilo'
      ? 'Termo_Confidencialidade' : 'Contrato_Parceria')
      + `_${(registro.nome || 'parceiro').replace(/[^a-zA-Z0-9]+/g, '_')}_${registro.codigo_verificacao || registro.id}.pdf`;
    const driveUrl = await copiarParaDrive(nomeDrive, pdfBuffer);

    const arquivadoEm = new Date().toISOString();
    await atualizarRegistro(assinaturaId, {
      arquivo_path: caminho,
      arquivo_drive_url: driveUrl,
      arquivado_em: arquivadoEm,
    });

    return responder({
      success: true,
      ja_arquivado: false,
      arquivo_path: caminho,
      arquivo_drive_url: driveUrl,
      arquivado_em: arquivadoEm,
      drive_configurado: driveConfigurado(),
      aviso_drive: driveConfigurado()
        ? (driveUrl ? null : 'Cópia no Drive não concluída — o cofre oficial está OK')
        : 'Drive ainda não configurado — só o cofre oficial foi gravado',
    });
  } catch (e) {
    return responder({ success: false, error: 'Falha ao arquivar o documento', details: String(e?.message || e) });
  }
}