// 🔑 CLIENT ID DO GOOGLE — CACHE LOCAL
//
// CAUSA-RAIZ DA LENTIDÃO (06/08/2026): para DESENHAR o botão do Google o app
// precisava de uma ida ao servidor (getGoogleClientId) e só depois, no clique,
// fazia a segunda ida (googleLogin). Duas funções serverless em série: cada uma
// que estivesse "fria" custava segundos ANTES de executar a primeira linha.
//
// Aqui o valor fica guardado no navegador: da segunda vez em diante o botão é
// desenhado NA HORA com o cache e a confirmação acontece em segundo plano.
// ⚠️ NÃO é segredo: o Client ID é público por natureza (aparece no HTML do
// botão do Google). Nada de secret entra neste cache.

const CHAVE = 'google_client_id';

export function clientIdEmCache() {
  try {
    return localStorage.getItem(CHAVE) || null;
  } catch {
    return null;
  }
}

// Busca no servidor e atualiza o cache. Nunca lança.
export async function buscarClientId(base44) {
  try {
    const res = await base44.functions.invoke('getGoogleClientId', {});
    const id = res?.clientId || null;
    if (id) {
      try { localStorage.setItem(CHAVE, id); } catch { /* storage cheio/bloqueado */ }
    }
    return id;
  } catch {
    return null;
  }
}