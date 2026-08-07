// 🔐 PORTA DE ENTRADA DA CAPTAÇÃO PRIVADA.
// A apresentação (/Partners) só é liberada quando DUAS coisas são verdade AO
// MESMO TEMPO, no momento do acesso:
//   1) SESSÃO ATIVA (a pessoa está logada agora — não "já esteve logada");
//   2) CIÊNCIA de que a operação é privada/confidencial.
//
// ⚠️ CAUSA-RAIZ CORRIGIDA (07/08/2026 — vazamento reportado em vídeo): antes o
// portão olhava SÓ a marca de ciência gravada no aparelho. Quem entrou uma vez
// entrava para sempre — deslogado, em aba nova, ou com o celular na mão de
// outra pessoa. Conteúdo confidencial (CVM 160/2022) exposto. A marca agora é
// COMPLEMENTAR ao login, nunca substituta, e é APAGADA no logout.
const chave = (userId) => `pc_ciente_${userId || 'anon'}`;
const PREFIXO = 'pc_ciente_';

export function usuarioLocal() {
  try {
    const bruto = localStorage.getItem('currentUser');
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

// ✅ Sessão ativa AGORA. O logout remove 'currentUser' e 'isLoggedIn'; o Layout
// repõe 'isLoggedIn' de forma síncrona quando há usuário válido salvo (aba nova).
// Se o sessionStorage estiver indisponível (modo restrito), aceita o usuário
// válido — não podemos trancar quem está legitimamente logado.
export function sessaoAtiva() {
  const u = usuarioLocal();
  if (!u?.id || !u?.email) return false;
  try {
    if (sessionStorage.getItem('userLoggedOut') === 'true') return false;
    const marcado = sessionStorage.getItem('isLoggedIn');
    return marcado === null ? true : marcado === 'true';
  } catch {
    return true;
  }
}

export function temAceiteParceiro(user) {
  const u = user || usuarioLocal();
  if (!u?.id) return false;
  try {
    return localStorage.getItem(chave(u.id)) === '1';
  } catch {
    return false;
  }
}

// 🚪 Única fonte de verdade do portão: login ativo + ciência.
export function acessoParceiroLiberado() {
  if (!sessaoAtiva()) return false;
  return temAceiteParceiro(usuarioLocal());
}

export function registrarAceiteParceiro(user) {
  const u = user || usuarioLocal();
  if (!u?.id) return;
  try {
    localStorage.setItem(chave(u.id), '1');
    localStorage.setItem(`${chave(u.id)}_em`, new Date().toISOString());
  } catch {
    /* storage indisponível: segue sem travar o acesso na sessão atual */
  }
}

// 🧹 Chamado no logout: o aparelho deixa de ser "aparelho autorizado".
// Remove a ciência de TODOS os usuários que já passaram por este aparelho —
// é o que impede o próximo (ou o mesmo, deslogado) de abrir a apresentação.
export function limparAceiteParceiro() {
  try {
    const alvos = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIXO)) alvos.push(k);
    }
    alvos.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage indisponível: nada a limpar */
  }
}