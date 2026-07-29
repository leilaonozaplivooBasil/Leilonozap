import { base44 } from '@/api/base44Client';

// Wrapper client-side da Backend Function 'adminReadBatches'.
// Invoca a function (que lê BatchRegistration + LoteRecebido com service_role,
// contornando o RLS que nega leitura à chave do app) e normaliza o retorno
// para { data } — formato esperado pela página RegisterBatches (resp?.data?.batches / lotes).
//
// ⚠️ Este arquivo é OBRIGATÓRIO: sem ele, o import '@/functions/adminReadBatches'
// no RegisterBatches.jsx não resolve e quebra o build do Vite.
export async function adminReadBatches(params = {}) {
  // A rota Vercel valida o ator por actorEmail no body (email é consistente entre
  // localStorage e app_users; o id pode não bater com o UUID do Supabase). Injeta o email logado.
  let actorEmail = params.actorEmail;
  if (!actorEmail) {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || 'null');
      actorEmail = u?.email;
    } catch { /* ignora */ }
  }
  const data = await base44.functions.invoke('adminReadBatches', { ...params, actorEmail });
  return { data };
}