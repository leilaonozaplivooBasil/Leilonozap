// 🖐️ PEDIDO DE TOUR — sinal leve entre o botão global "Como Funciona" (fora
// da tela de cada Hábito, no topo da Top College) e o tour LOCAL de cada
// tela (a mãozinha — TourGuiado.jsx — mora perto dos elementos reais que ela
// aponta, e sempre morou assim: ver CrmEsteiraCaptacao.jsx).
//
// Dono, 09/09/2026: "Como Funciona é um tour... a pessoa vai clicando e a
// plataforma vai ensinando." O botão global não sabe (nem precisa saber) COMO
// cada tela ensina a si mesma — só pede. Quem sabe atender, atende. Mesmo
// padrão de src/lib/camadaModal.js: um pub/sub de módulo, sem contexto nem
// prop drilling atravessando componentes que não têm nada a ver um com o
// outro.
const ouvintes = new Set();

/** Pede pra iniciar o tour `id` (ex.: 'compromisso'). */
export function pedirTour(id) {
  ouvintes.forEach((f) => { try { f(id); } catch { /* ouvinte já desmontou */ } });
}

export function ouvirPedidoDeTour(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

// os tours que já existem hoje, pra "Como Funciona" saber se tem o que
// oferecer nesta tela — só oferece o botão quando existe alguém do outro
// lado pronto pra atender o pedido.
export const TOURS_DISPONIVEIS = {
  'catalogo-crm': 'compromisso',
};
