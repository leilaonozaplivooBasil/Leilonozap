// 🔐 /api/functions/getDocumentoAssinadoUrl
//
// Devolve um link de leitura de 5 minutos para o documento assinado que está no
// cofre privado. O arquivo NÃO tem URL pública: sem passar por aqui, ninguém
// alcança o PDF — nem por link solto, nem por buscador.
//
// Autorização feita NO SERVIDOR: só o próprio signatário ou um administrador.
// O cargo é lido no banco; nada vindo do navegador é aceito como prova.
//
// ⚠️ SOMENTE LEITURA. Não altera nada.
import { configurado, buscarRegistro, gerarLinkAssinado, podeVer } from '../_lib/documentoAssinado.js';

const VALIDADE_SEGUNDOS = 300;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const responder = (payload) => res.status(200).json({ ...payload, data: payload });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    const assinaturaId = String(body.assinatura_id || '').trim();
    const solicitanteId = String(body.solicitante_id || '').trim();
    if (!assinaturaId) return responder({ success: false, error: 'assinatura_id é obrigatório' });
    if (!solicitanteId) return responder({ success: false, error: 'solicitante_id é obrigatório' });
    if (!configurado()) return responder({ success: false, error: 'Config do servidor ausente' });

    const registro = await buscarRegistro(assinaturaId);
    if (!registro) return responder({ success: false, error: 'Documento não encontrado' });

    const liberado = await podeVer(registro, solicitanteId);
    if (!liberado) return responder({ success: false, error: 'Sem permissão para ver este documento' });

    if (!registro.arquivo_path) {
      // ainda não arquivado — quem chamou usa o caminho atual (gerar na hora)
      return responder({ success: false, nao_arquivado: true, error: 'Documento ainda não arquivado' });
    }

    const url = await gerarLinkAssinado(registro.arquivo_path, VALIDADE_SEGUNDOS);
    return responder({
      success: true,
      url,
      expira_em_segundos: VALIDADE_SEGUNDOS,
      arquivado_em: registro.arquivado_em,
    });
  } catch (e) {
    return responder({ success: false, error: 'Falha ao liberar o documento', details: String(e?.message || e) });
  }
}