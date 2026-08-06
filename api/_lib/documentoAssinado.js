// 🗄️ Utilidades do cofre de documentos assinados (Supabase Storage privado).
//
// Fonte única de: nome do bucket, montagem do caminho, leitura/escrita do
// registro de assinatura. Usado por arquivarDocumentoAssinado e
// getDocumentoAssinadoUrl — nenhuma das duas duplica regra.
export const BUCKET = 'documentos-assinados';

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const configurado = () => Boolean(SUPABASE_URL && SR);

const cabecalhos = () => ({ apikey: SR, Authorization: `Bearer ${SR}` });

// tipo curto usado na pasta: contrato | sigilo
export const tipoDoDocumento = (documento) =>
  documento === 'termo_confidencialidade' ? 'sigilo' : 'contrato';

// documentos-assinados/{ano}/{mes}/{tipo}/{user_id}-{assinatura_id}.pdf
export function montarCaminho(registro) {
  const base = registro?.assinado_em ? new Date(registro.assinado_em) : new Date();
  const ano = String(base.getUTCFullYear());
  const mes = String(base.getUTCMonth() + 1).padStart(2, '0');
  const tipo = tipoDoDocumento(registro?.documento);
  const dono = String(registro?.user_id || 'sem-usuario').replace(/[^a-zA-Z0-9_-]/g, '');
  return `${ano}/${mes}/${tipo}/${dono}-${registro.id}.pdf`;
}

export async function buscarRegistro(assinaturaId) {
  const url = `${SUPABASE_URL}/rest/v1/contrato_assinaturas?id=eq.${encodeURIComponent(assinaturaId)}&limit=1`;
  const resp = await fetch(url, { headers: cabecalhos() });
  if (!resp.ok) throw new Error('Falha ao ler o registro da assinatura');
  const rows = await resp.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

export async function atualizarRegistro(assinaturaId, campos) {
  const url = `${SUPABASE_URL}/rest/v1/contrato_assinaturas?id=eq.${encodeURIComponent(assinaturaId)}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { ...cabecalhos(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(campos),
  });
  if (!resp.ok) throw new Error((await resp.text().catch(() => '')).slice(0, 300) || 'Falha ao atualizar registro');
}

export async function enviarParaCofre(caminho, pdfBuffer) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${caminho}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { ...cabecalhos(), 'Content-Type': 'application/pdf', 'x-upsert': 'true' },
    body: pdfBuffer,
  });
  if (!resp.ok) throw new Error((await resp.text().catch(() => '')).slice(0, 300) || 'Falha ao gravar no cofre');
  return caminho;
}

// Link de leitura de curta validade. Sem isso o arquivo é inacessível.
export async function gerarLinkAssinado(caminho, segundos = 300) {
  const url = `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${caminho}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { ...cabecalhos(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: segundos }),
  });
  if (!resp.ok) throw new Error((await resp.text().catch(() => '')).slice(0, 300) || 'Falha ao assinar o link');
  const json = await resp.json();
  const parcial = json?.signedURL || json?.signedUrl;
  if (!parcial) throw new Error('Link assinado não retornado');
  return `${SUPABASE_URL}/storage/v1${parcial.startsWith('/') ? '' : '/'}${parcial}`;
}

// Confere se quem pede é o dono do documento ou um administrador.
// Não confia em nada vindo do navegador além do id — o cargo é lido no banco.
export async function podeVer(registro, solicitanteId) {
  if (!registro || !solicitanteId) return false;
  if (registro.user_id && String(registro.user_id) === String(solicitanteId)) return true;

  const url = `${SUPABASE_URL}/rest/v1/app_users?id=eq.${encodeURIComponent(solicitanteId)}&select=role&limit=1`;
  const resp = await fetch(url, { headers: cabecalhos() });
  if (!resp.ok) return false;
  const rows = await resp.json();
  const papel = Array.isArray(rows) && rows[0] ? rows[0].role : null;
  return papel === 'admin' || papel === 'super_admin';
}