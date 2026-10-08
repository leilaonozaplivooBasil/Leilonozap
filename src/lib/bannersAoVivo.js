// 🖼️ BANNERS SEMPRE ATUALIZADOS — as regras, sem a tela (08/10/2026).
//
// 🔴 O CASO: o dono trocou o banner da Home pelo Painel de Mídia (ativou o novo,
// desativou o antigo). No banco a troca entrou na hora. No celular do Luiz e no
// de outra usuária o banner antigo continuou lá — e o novo não apareceu.
//
// POR QUÊ: a Home guardava a lista de banners no sessionStorage por 10 minutos
// e só buscava de novo ao MONTAR a página. Num app instalado (PWA) ou numa aba
// que fica aberta, "montar" é raro: a pessoa volta pro app horas depois e a
// tela continua com o que já estava. Os 10 minutos ainda bloqueavam a busca
// mesmo num recarregamento dentro desse prazo.
//
// A REGRA AGORA (stale-while-revalidate):
//   1. o que está guardado aparece NA HORA (a velocidade de antes continua);
//   2. a busca no banco acontece SEMPRE que a página monta, sem prazo de validade;
//   3. ao voltar para a aba/app (visibilitychange/focus) busca de novo, com um
//      intervalo mínimo entre buscas para não martelar o banco;
//   4. de tempos em tempos, com a aba visível, busca de novo;
//   5. só re-renderiza quando a lista MUDOU de verdade (sem piscar).

/** Intervalo mínimo entre duas buscas disparadas por foco/visibilidade. */
export const MINIMO_ENTRE_BUSCAS_MS = 20000;
/** Com a aba visível, revalida de tanto em tanto tempo. */
export const INTERVALO_REVALIDACAO_MS = 5 * 60 * 1000;

/** Lista guardada (qualquer idade) ou null. Nunca lança. */
export function lerBannersGuardados(storage, chave) {
  try {
    const bruto = storage?.getItem?.(chave);
    if (!bruto) return null;
    const lista = JSON.parse(bruto);
    return Array.isArray(lista) ? lista : null;
  } catch {
    return null;
  }
}

/** Guarda a lista para a próxima visita abrir instantânea. Nunca lança. */
export function guardarBanners(storage, chave, lista) {
  try {
    storage?.setItem?.(chave, JSON.stringify(Array.isArray(lista) ? lista : []));
    // a chave de "validade" antiga não manda mais em nada: some para não confundir
    storage?.removeItem?.(`${chave}_time`);
  } catch { /* storage cheio ou modo privado: a tela segue com o que veio da rede */ }
}

const assinaturaDe = (b) => [b?.id, b?.image_url, b?.video_url, b?.link_url, b?.title, b?.device_type, b?.is_active, b?.starts_at, b?.ends_at, Number(b?.order) || 0].join('|');

/** Mesmas artes, na mesma ordem, com os mesmos campos que a tela usa. */
export function bannersIguais(a, b) {
  const la = Array.isArray(a) ? a : [];
  const lb = Array.isArray(b) ? b : [];
  if (la.length !== lb.length) return false;
  return la.every((x, i) => assinaturaDe(x) === assinaturaDe(lb[i]));
}

/** Vale buscar de novo agora? (foco/visibilidade chegam em rajada). */
export function deveRevalidar({ ultimaBuscaMs = 0, agoraMs = Date.now(), minimoMs = MINIMO_ENTRE_BUSCAS_MS } = {}) {
  if (!ultimaBuscaMs) return true;
  return agoraMs - ultimaBuscaMs >= minimoMs;
}
