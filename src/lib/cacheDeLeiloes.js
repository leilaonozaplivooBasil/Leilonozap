// 🗄️ CACHE DA VITRINE DE LEILÕES — uma régua só para os dois depósitos.
//
// 06/09/2026 — 33 leilões foram reativados no banco e a página continuou dizendo
// "6 rolando". O banco estava certo o tempo todo; o navegador é que servia dado velho.
//
// A Home guarda a lista em dois lugares, e só um deles tinha prazo:
//
//   sessionStorage.auctions_cache             → conferido por idade... com DOIS números
//                                               diferentes: 300000 na montagem do state e
//                                               120000 dentro do loadAuctions
//   localStorage.auctions_cache_persistent    → SEM NENHUMA conferência de idade
//
// O persistente é lido na montagem da página, sem perguntar de quando é. Ele é gravado a
// cada busca bem-sucedida e nunca expira — então uma lista de semanas atrás continua sendo
// a primeira coisa que o visitante vê. E o `?fresh=1`, que existe justamente para forçar
// dado novo, limpava só o sessionStorage: o persistente sobrevivia e voltava a pintar a
// tela velha.
//
// Aqui a regra fica num lugar só, com prazo para os dois, e limpar significa limpar tudo.
//
// A exceção deliberada é `lerCacheDeEmergencia`: quando a busca FALHA, dado velho é melhor
// que tela vazia — e a peneira de quem ainda está no cartaz (leilaoEmCartaz.js) já derruba
// o que venceu. Fora desse caso, cache vencido não pinta nada.

export const CHAVE_SESSAO = 'auctions_cache';
export const CHAVE_SESSAO_HORA = 'auctions_cache_time';
export const CHAVE_PERSISTENTE = 'auctions_cache_persistent';
export const CHAVE_PERSISTENTE_HORA = 'auctions_cache_persistent_time';

/** Enquanto vale o cache da aba. Era 300000 num ponto e 120000 no outro — agora é um só. */
export const VALIDADE_SESSAO_MS = 120000;    // 2 minutos

/**
 * Enquanto vale o cache que sobrevive ao fechar o navegador. Meia hora: tempo de segurar a
 * primeira pintura da página sem risco de mostrar uma vitrine de outro dia.
 */
export const VALIDADE_PERSISTENTE_MS = 1800000; // 30 minutos

function depositoDeSessao(dado) {
  if (dado) return dado;
  try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null; } catch { return null; }
}
function depositoLocal(dado) {
  if (dado) return dado;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

/** Sem id, ou id repetido, não entra. */
export function semDuplicados(lista) {
  if (!Array.isArray(lista)) return [];
  const vistos = new Set();
  return lista.filter((a) => {
    if (!a?.id || vistos.has(a.id)) return false;
    vistos.add(a.id);
    return true;
  });
}

function lerJson(deposito, chave) {
  try {
    const cru = deposito?.getItem(chave);
    if (!cru) return null;
    const lista = semDuplicados(JSON.parse(cru));
    return lista.length > 0 ? lista : null;
  } catch { return null; }
}

function estaNoPrazo(deposito, chaveHora, validade, agora) {
  try {
    const marca = parseInt(deposito?.getItem(chaveHora), 10);
    if (!Number.isFinite(marca)) return false;
    const idade = agora - marca;
    return idade >= 0 && idade < validade;
  } catch { return false; }
}

/** O cache da aba ainda vale? Decide se a página mostra algo antes de buscar. */
export function cacheDaSessaoEstaFresco({ agora = Date.now(), sessao } = {}) {
  const s = depositoDeSessao(sessao);
  return Boolean(lerJson(s, CHAVE_SESSAO)) && estaNoPrazo(s, CHAVE_SESSAO_HORA, VALIDADE_SESSAO_MS, agora);
}

/**
 * A lista para pintar a tela ANTES da busca: sessão fresca, senão persistente fresco.
 * Vencido não pinta — devolve [] e a página busca do servidor.
 */
export function lerCache({ agora = Date.now(), sessao, local } = {}) {
  const s = depositoDeSessao(sessao);
  if (estaNoPrazo(s, CHAVE_SESSAO_HORA, VALIDADE_SESSAO_MS, agora)) {
    const daSessao = lerJson(s, CHAVE_SESSAO);
    if (daSessao) return daSessao;
  }
  const l = depositoLocal(local);
  if (estaNoPrazo(l, CHAVE_PERSISTENTE_HORA, VALIDADE_PERSISTENTE_MS, agora)) {
    const persistente = lerJson(l, CHAVE_PERSISTENTE);
    if (persistente) return persistente;
  }
  return [];
}

/**
 * Só para quando a busca FALHOU: aí dado velho vale mais que tela vazia, em qualquer idade.
 * Cache gravado antes desta mudança não tem marca de hora — e é justamente aqui que ele
 * ainda serve.
 */
export function lerCacheDeEmergencia({ sessao, local } = {}) {
  return lerJson(depositoDeSessao(sessao), CHAVE_SESSAO)
      || lerJson(depositoLocal(local), CHAVE_PERSISTENTE)
      || [];
}

/** Grava nos dois depósitos, cada um com a sua marca de hora. */
export function gravarCache(lista, { agora = Date.now(), sessao, local } = {}) {
  const limpa = semDuplicados(lista);
  const texto = JSON.stringify(limpa);
  const marca = String(agora);
  try { depositoDeSessao(sessao)?.setItem(CHAVE_SESSAO, texto); } catch { /* cota cheia */ }
  try { depositoDeSessao(sessao)?.setItem(CHAVE_SESSAO_HORA, marca); } catch { /* idem */ }
  try { depositoLocal(local)?.setItem(CHAVE_PERSISTENTE, texto); } catch { /* idem */ }
  try { depositoLocal(local)?.setItem(CHAVE_PERSISTENTE_HORA, marca); } catch { /* idem */ }
  return limpa;
}

/**
 * Limpar é limpar OS DOIS. O `?fresh=1` apagava só o da sessão, e o persistente voltava a
 * pintar a tela velha — o parâmetro que existe para forçar dado novo não forçava nada.
 */
export function limparCache({ sessao, local } = {}) {
  for (const [dep, chaves] of [
    [depositoDeSessao(sessao), [CHAVE_SESSAO, CHAVE_SESSAO_HORA]],
    [depositoLocal(local), [CHAVE_PERSISTENTE, CHAVE_PERSISTENTE_HORA]],
  ]) {
    for (const chave of chaves) {
      try { dep?.removeItem(chave); } catch { /* ignora */ }
    }
  }
}
