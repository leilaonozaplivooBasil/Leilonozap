// ✍️ Registro da assinatura eletrônica do Contrato de Parceria.
//
// Grava a trilha de auditoria (quem, quando, de onde, com qual dispositivo, em
// que versão do contrato) e devolve o hash SHA-256 + código de verificação que
// são estampados no PDF.
//
// ⚠️ Não movimenta dinheiro, não ativa plano, não altera o usuário. É só prova
// de assinatura. A ativação do plano continua exclusivamente pelo pagamento.
import crypto from 'crypto';
import { oid } from '../_lib/oid.js';
import { VERSAO_CONTRATO } from '../_lib/contratoPdf.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    const nome = String(body.nome || '').trim();
    const cpf = String(body.cpf || '').replace(/\D/g, '');
    const email = String(body.email || '').trim();
    if (!nome || !cpf || !email) {
      return res.status(200).json({ success: false, error: 'Nome, CPF e e-mail são obrigatórios para assinar' });
    }

    const assinadoEm = new Date().toISOString();
    const ip = String(
      req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || ''
    ).split(',')[0].trim() || 'desconhecido';
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 300);
    const versao = body.versao || VERSAO_CONTRATO;
    // 📜 Mesma trilha atende dois documentos: o Contrato de Parceria (padrão) e o
    // Termo de Confidencialidade. Só nomes conhecidos são aceitos.
    const documento = body.documento === 'termo_confidencialidade'
      ? 'termo_confidencialidade'
      : 'contrato_parceria';

    // Hash do conteúdo assinado (identidade + documento + momento + assinatura)
    const conteudo = [
      documento, versao, nome, cpf, email,
      body.plano || '', String(body.valor_aporte || ''), assinadoEm, ip,
      String(body.assinatura_png || '').slice(0, 5000),
    ].join('|');
    const hash = crypto.createHash('sha256').update(conteudo).digest('hex');
    const codigo = 'LNZ-' + hash.slice(0, 4).toUpperCase() + '-' + hash.slice(4, 8).toUpperCase() + '-' + hash.slice(8, 12).toUpperCase();

    const registro = {
      id: oid(),
      user_id: body.user_id || null,
      nome, cpf, email,
      documento,
      versao_contrato: versao,
      plano: body.plano || null,
      valor_aporte: body.valor_aporte || null,
      assinado_em: assinadoEm,
      ip,
      user_agent: userAgent,
      assinatura_png: body.assinatura_png || null,
      // 🪪 Documentos de identificação enviados no ato (só o termo de sigilo usa)
      doc_identidade_url: body.doc_identidade_url || null,
      doc_cpf_url: body.doc_cpf_url || null,
      hash_documento: hash,
      codigo_verificacao: codigo,
    };

    let persistido = false;
    let detalhePersistencia = null;
    if (SUPABASE_URL && SR) {
      try {
        const resp = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/contrato_assinaturas`, {
          method: 'POST',
          headers: {
            apikey: SR,
            Authorization: `Bearer ${SR}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(registro),
        });
        persistido = resp.ok;
        if (!resp.ok) detalhePersistencia = (await resp.text().catch(() => '')).slice(0, 300);
      } catch (e) {
        detalhePersistencia = String(e?.message || e).slice(0, 300);
      }
    } else {
      detalhePersistencia = 'Config do servidor ausente';
    }

    // A assinatura é válida e vai para o PDF mesmo se a gravação falhar —
    // mas devolvemos `persistido` para o app não afirmar o que não aconteceu.
    const result = {
      success: true,
      persistido,
      detalhe_persistencia: detalhePersistencia,
      assinatura: {
        // 🗄️ id do registro — necessário para arquivar o PDF no cofre privado
        // (arquivarDocumentoAssinado). Campo ADICIONADO: nada que já era usado mudou.
        id: registro.id,
        documento,
        assinado_em: assinadoEm,
        ip,
        user_agent: userAgent,
        versao,
        hash,
        codigo_verificacao: codigo,
      },
    };
    return res.status(200).json({ ...result, data: result });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Falha ao registrar assinatura', details: String(e?.message || e) });
  }
}