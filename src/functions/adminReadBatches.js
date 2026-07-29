import { base44 } from '@/api/base44Client';

// Wrapper client-side da Backend Function 'adminReadBatches'.
// Invoca a function (que lê BatchRegistration + LoteRecebido com service_role,
// contornando o RLS que nega leitura à chave do app) e normaliza o retorno
// para { data } — formato esperado pela página RegisterBatches (resp?.data?.batches / lotes).
//
// ⚠️ Este arquivo é OBRIGATÓRIO: sem ele, o import '@/functions/adminReadBatches'
// no RegisterBatches.jsx não resolve e quebra o build do Vite.
export async function adminReadBatches(params = {}) {
  // A rota Vercel (/api/functions/adminReadBatches) valida o ator por actorId no body
  // (este app usa login próprio via AppUser, não Supabase Auth). Injeta o id do usuário logado.
  let actorId = params.actorId;
  if (!actorId) {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || 'null');
      actorId = u?.id;
    } catch { /* ignora */ }
  }
  const data = await base44.functions.invoke('adminReadBatches', { ...params, actorId });
  return { data };
}