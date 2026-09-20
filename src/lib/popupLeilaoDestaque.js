/**
 * popupLeilaoDestaque — TODA a regra de "esse pop-up deve aparecer agora?".
 *
 * Fica separado da tela de propósito. A regra é onde mora o risco (aparecer na
 * hora errada, apontar para leilão encerrado, brigar com outro aviso), e regra
 * em arquivo .js roda no teste do Node sem navegador. O componente só desenha.
 *
 * 🔴 O PRINCÍPIO: O PADRÃO É NÃO APARECER.
 * Toda dúvida resolve em `false`. Sem configuração, sem leilão, leilão vencido,
 * página proibida, resposta estranha do banco — nada aparece. Assim o pop-up
 * não tem como derrubar página nenhuma: o estado normal dele é ausente.
 *
 * ── O MAPA DE SOBREPOSIÇÕES DO SITE (medido em 02/09/2026) ──
 * O Layout monta doze camadas globais. A escada de z-index é:
 *      120   toasts de transação e de indicação
 *      200   carrinho
 *      2000  boas-vindas / termos      2001-2002  login / cadastro
 *      2990  véu do consentimento      3000  banner LGPD
 *      9998  aviso de atualização
 *      9999  confirmação de pagamento  10000  véu do pagamento
 *
 * O pop-up entra em Z_INDEX (1500): acima dos modais comuns, ABAIXO do banner
 * de LGPD e de tudo que envolve pagamento. Nunca cobre quem está pagando.
 *
 * E o banner de LGPD não é só questão de camada: ele abre sozinho para TODA
 * primeira visita — exatamente o mesmo público do pop-up. Os dois na mesma tela
 * é o único conflito real que existe aqui, e por isso `podeMostrar` espera.
 */

/** Camada do pop-up. Abaixo do consentimento (2990) e do pagamento (9999). */
export const Z_INDEX = 1500;

/**
 * Marca de onde o pop-up foi fechado pela última vez. sessionStorage: some ao
 * fechar o navegador.
 *
 * 🔴 20/09/2026 — MUDOU DE SIGNIFICADO, E É A MUDANÇA DESTA DEMANDA.
 * Antes guardava "já vi" (um booleano) e o pop-up aparecia UMA vez por sessão.
 * O dono pediu: "cada vez que o usuário entrar em uma página é necessário que
 * estoure o pop-up". Então agora guarda o NOME DA PÁGINA onde foi fechado.
 *
 * Fechou na Home → guarda 'Home'. Foi para a Loja → 'Loja' ≠ 'Home', aparece de
 * novo. Voltou para a Home → aparece de novo.
 *
 * Por que guardar a página e não simplesmente esquecer: se não guardasse nada,
 * fechar o pop-up e a página se redesenhar (uma troca de estado qualquer) faria
 * ele voltar na cara de quem acabou de fechar — pop-up que não fecha é
 * armadilha, não propaganda. Guardando a página, fechar vale enquanto a pessoa
 * estiver ali; entrar em outra página é o que traz de volta, que é o pedido.
 */
export const CHAVE_SESSAO = 'popupLeilaoVisto';

/** Chave que o ConsentBanner grava ao ser aceito (ConsentBanner.jsx:6). */
export const CHAVE_CONSENTIMENTO = 'lnz_consent_accepted';

/** Onde o pop-up NUNCA aparece — decidido com o dono em 02/09/2026. */
export const PAGINAS_PROIBIDAS = [
  // Leilão ao vivo: cronômetro correndo e dinheiro reservado no lance. Cobrir
  // essa tela com propaganda de OUTRO leilão custa o lance e irrita quem está
  // comprando agora.
  'AuctionRoom',
  // Pagamento: a pior hora possível para interromper alguém.
  'Cart', 'CatalogCheckout', 'Checkout', 'Payment', 'PagamentoPix',
];

/**
 * A configuração é utilizável?
 * @param {object|null} cfg linha de `banner_images` com context='popup_leilao'
 */
export function configValida(cfg) {
  if (!cfg || typeof cfg !== 'object') return false;
  if (cfg.is_active === false) return false;
  return !!String(cfg.link_url || '').trim();
}

/** Tira o id do leilão de um link `/AuctionRoom?id=xxx`. '' se não houver. */
export function idDoLeilao(linkUrl) {
  const s = String(linkUrl || '');
  const m = s.match(/[?&]id=([^&#\s]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

/**
 * O leilão ainda vale a pena anunciar?
 *
 * 🔴 Esta é a trava que evita o erro que já aconteceu neste site: em 31/08 um
 * produto arrematado continuou aparecendo na página do leilão. Um pop-up
 * apontando para leilão encerrado é pior que pop-up nenhum — some sozinho,
 * mesmo que ninguém lembre de desligar.
 *
 * @param {object|null} leilao linha de `auctions`
 * @param {number} agora timestamp (injetado para o teste não depender do relógio)
 */
export function leilaoAindaAberto(leilao, agora = Date.now()) {
  if (!leilao || typeof leilao !== 'object') return false;
  const status = String(leilao.status || '').toLowerCase();
  if (status && status !== 'active') return false;      // vendido, encerrado, cancelado
  if (leilao.is_test_auction) return false;             // leilão de teste não vira propaganda
  const fim = leilao.end_time ? new Date(leilao.end_time).getTime() : NaN;
  if (Number.isNaN(fim)) return false;                  // sem prazo legível: não arrisca
  return fim > agora;
}

/**
 * Em que página o pop-up foi fechado por último? '' quando nunca foi fechado.
 * Storage bloqueado (modo privativo) devolve '' — quem cuida de não insistir
 * nesse caso é a memória em RAM do componente, não o storage.
 */
export function paginaOndeFechou(storage) {
  try { return String(storage?.getItem(CHAVE_SESSAO) || ''); } catch { return ''; }
}

/** Marca a página onde foi fechado. Falha de storage nunca quebra o fechamento. */
export function marcarVisto(storage, pagina) {
  try { storage?.setItem(CHAVE_SESSAO, String(pagina || '')); } catch { /* modo privativo: segue */ }
}

/**
 * A decisão. Devolve o motivo junto para o teste (e o log) dizerem POR QUE não
 * apareceu — sem isso, "não apareceu" vira caça ao fantasma.
 *
 * @returns {{mostrar: boolean, motivo: string}}
 */
export function podeMostrar({
  config,
  leilao,
  paginaAtual,
  consentimentoPendente = false,
  /**
   * Nome da página onde o pop-up foi fechado por último ('' se nunca).
   * Vem de fora de propósito: assim esta regra não conhece storage nenhum e o
   * teste roda no Node sem navegador. Quem lê o sessionStorage (e quem segura a
   * memória em RAM quando o storage está bloqueado) é o componente.
   */
  paginaJaVista = '',
  agora = Date.now(),
} = {}) {
  if (!configValida(config)) return { mostrar: false, motivo: 'sem_config' };
  if (PAGINAS_PROIBIDAS.includes(String(paginaAtual || ''))) {
    return { mostrar: false, motivo: 'pagina_proibida' };
  }
  // Já está no leilão anunciado: mandar a pessoa para onde ela já está é ruído.
  const alvo = idDoLeilao(config.link_url);
  if (alvo && typeof window !== 'undefined') {
    try {
      const aqui = new URLSearchParams(window.location.search).get('id');
      if (aqui && String(aqui) === String(alvo)) {
        return { mostrar: false, motivo: 'ja_esta_no_leilao' };
      }
    } catch { /* URL estranha: segue */ }
  }
  // Espera o banner de LGPD sair de cena — os dois disputam a primeira visita.
  if (consentimentoPendente) return { mostrar: false, motivo: 'consentimento_pendente' };
  // Fechado NESTA página continua fechado. Entrar em outra página traz de volta
  // — é exatamente o pedido de 20/09 ("toda vez que entrar em uma página").
  if (paginaJaVista && String(paginaJaVista) === String(paginaAtual || '')) {
    return { mostrar: false, motivo: 'ja_viu_nesta_pagina' };
  }
  if (!leilaoAindaAberto(leilao, agora)) return { mostrar: false, motivo: 'leilao_encerrado' };
  return { mostrar: true, motivo: 'ok' };
}

/** Primeira foto do leilão. `auctions` guarda LISTA (`image_urls`), não campo único. */
export function fotoDoLeilao(leilao) {
  const lista = leilao?.image_urls;
  if (Array.isArray(lista)) return String(lista.find((u) => String(u || '').trim()) || '').trim() || null;
  return String(lista || '').trim() || null;
}

/** O que a tela desenha. Nunca inventa: sem título do banner, usa o do leilão. */
export function dadosDoPopup(config, leilao) {
  return {
    titulo: String(config?.title || leilao?.title || 'Leilão em destaque').trim(),
    imagem: String(config?.image_url || '').trim() || fotoDoLeilao(leilao),
    destino: String(config?.link_url || '').trim(),
    encerraEm: leilao?.end_time || null,
    // O preço é o dado que convence — o pedido era "conduzir o cliente direto
    // ao lance", e card só com título não faz isso. Já vem na mesma consulta.
    // Zero não é preço válido aqui: mostra "lance livre" em vez de "R$ 0,00".
    preco: Number(leilao?.current_price) > 0 ? Number(leilao.current_price) : null,
  };
}
