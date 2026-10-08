// 🗂️ AS TRÊS FILEIRAS DE BANNERS — as regras, sem a tela (08/10/2026).
//
// O dono: "uma fileira de banners pro leilão, uma pra loja e uma unificada. As do
// leilão e da loja podem estar ativas ao mesmo tempo; ligar a unificada desliga
// as outras duas."
//
//   home       → fileira do Leilão   (Home / Tigrinho)
//   catalog    → fileira da Loja     (Loja Virtual / aba do Licenciado)
//   unificado  → o MESMO conjunto nas duas páginas
//
// Onde fica guardado: uma linha por fileira em `banner_images`, com
// `context = 'banner_fileira'`, `title = <chave>` e `is_active` = fileira ligada
// (o mesmo molde do popup do leilão, sem tabela nova). Sem linha = o padrão:
// Leilão e Loja ligadas, Unificada desligada — exatamente como o site está hoje.
//
// Desligar uma fileira NÃO apaga os banners dela: ficam guardados para quando
// o dono voltar.

export const CONTEXTO_CONFIG = 'banner_fileira';
export const CHAVES = ['home', 'catalog', 'unificado'];
export const PADRAO = Object.freeze({ home: true, catalog: true, unificado: false });

/** Lê as linhas de configuração e devolve { home, catalog, unificado } coerente. */
export function lerFileiras(linhas) {
  const f = { ...PADRAO };
  for (const l of Array.isArray(linhas) ? linhas : []) {
    if (l && l.context === CONTEXTO_CONFIG && CHAVES.includes(l.title)) f[l.title] = l.is_active === true;
  }
  // coerência: se a unificada está ligada ela manda (uma gravação pela metade
  // não pode deixar as duas no ar ao mesmo tempo)
  if (f.unificado) return { home: false, catalog: false, unificado: true };
  return f;
}

/** Qual fileira a página lê: 'unificado', a própria, ou null (fileira desligada). */
export function fileiraDaPagina(pagina, fileiras) {
  const f = fileiras || PADRAO;
  if (f.unificado) return 'unificado';
  return f[pagina] ? pagina : null;
}

/** O novo estado quando o dono liga/desliga uma chave, respeitando a exclusão. */
export function ligarFileira(fileiras, chave, ligado) {
  const f = { ...PADRAO, ...(fileiras || {}) };
  if (chave === 'unificado') {
    // ligar a unificada desliga as duas; desligá-la devolve as duas ao ar
    return ligado ? { home: false, catalog: false, unificado: true } : { home: true, catalog: true, unificado: false };
  }
  if (!['home', 'catalog'].includes(chave)) return f;
  // sair da unificada por uma das outras: as duas voltam ao ar (sem deixar a
  // Loja ou o Leilão sem banner por um efeito colateral)
  if (f.unificado) return ligado ? { home: true, catalog: true, unificado: false } : f;
  return { ...f, [chave]: !!ligado };
}

/** As chaves cujo valor mudou — o painel só grava o que mudou. */
export function chavesAlteradas(antes, depois) {
  const a = { ...PADRAO, ...(antes || {}) };
  const d = { ...PADRAO, ...(depois || {}) };
  return CHAVES.filter((c) => a[c] !== d[c]);
}
