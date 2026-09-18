/**
 * progressoDaEtapa — o aviso da etapa vira PROGRESSO, não cobrança.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 🔴 POR QUE ISTO EXISTE (18/09/2026)
 * ══════════════════════════════════════════════════════════════════════════
 * Dono, com print do Ritual do Amanhecer, circulando o "fale mais 9s — ou
 * escreva": "os textos de avisos nas etapas precisam ser mais interativos e
 * animados, para aumentar a gamificação e visibilidade. Estamos pecando em
 * atenção do usuário nesses textos especificamente".
 *
 * ── as palavras já estavam certas; o problema é outro ──
 * Aquele texto foi escrito com cuidado: ele diz a falta na UNIDADE certa
 * (segundos pra quem falou, letras pra quem escreveu), depois do chamado do
 * Paim em 07/09 — que leu "18/400 caracteres" como "18 de um limite de 400",
 * achou que tinha escrito bastante, e ligou pro suporte.
 *
 * O que falha agora são duas coisas, e nenhuma é a redação:
 *
 *   1. TAMANHO. 11px a 45% de branco, sobre um degradê que ainda por cima
 *      muda de cor. Some.
 *   2. SENTIDO. "fale mais 9s" conta o que FALTA. Quem gravou 61 de 70
 *      segundos já andou 87% do caminho — e a tela escolhe contar os 13% que
 *      sobraram. Gamificação é mostrar o quanto já se andou; o que puxa
 *      alguém a falar mais nove segundos é ver a barra quase cheia, não ler
 *      uma cobrança.
 *
 * ── esta metade é pura de propósito ──
 * Só a conta e as palavras. A animação e o desenho moram no componente, e é
 * assim que dá pra provar a régua sem abrir navegador.
 */

/**
 * Onde a pessoa está entre 0 e a meta.
 *
 * @param {{feito:number, meta:number}} entrada
 * @returns {{pct:number, falta:number, pronto:boolean, fase:'longe'|'perto'|'pronto'}}
 *   `pct` de 0 a 100, já arredondado e preso nas bordas — barra não passa de
 *   100% nem volta pra negativo quando a pessoa passa da meta.
 */
export function progressoDaEtapa({ feito, meta } = {}) {
  const alvo = Number(meta);
  const andado = Number(feito);
  // meta inválida: não dá pra falar em progresso. Devolve "pronto" em vez de
  // travar a pessoa numa barra que nunca enche por culpa de um dado ruim.
  if (!Number.isFinite(alvo) || alvo <= 0) return { pct: 100, falta: 0, pronto: true, fase: 'pronto' };
  const seguro = Number.isFinite(andado) && andado > 0 ? andado : 0;
  const pct = Math.max(0, Math.min(100, Math.round((seguro / alvo) * 100)));
  const falta = Math.max(0, Math.ceil(alvo - seguro));
  const pronto = falta === 0;
  return { pct, falta, pronto, fase: pronto ? 'pronto' : pct >= 70 ? 'perto' : 'longe' };
}

/**
 * A cor da fase. Sobe de âmbar pra lima conforme a barra enche — a pessoa vê
 * que está esquentando antes de ler qualquer palavra.
 *
 * Devolve nomes de classe INTEIROS, nunca montados por interpolação: o
 * Tailwind varre o código como texto e uma classe montada em pedaços
 * (`text-${cor}-300`) simplesmente não é gerada, e o elemento sai sem cor.
 *
 * 🔴 E A OPACIDADE TEM DE SER UM DEGRAU QUE EXISTE. A primeira versão usava
 * `bg-lime-400/12`: `/12` não está na escala do Tailwind, a classe não foi
 * gerada, e a fase PERTO — justamente a do print do dono — saiu SEM FUNDO
 * NENHUM. Passou pelo meu olho na foto da banca (o aro segurava a aparência) e
 * só caiu quando a prova de navegador foi ler a cor computada. Use 10, 20, 25.
 */
export const CORES_DA_FASE = {
  longe: { texto: 'text-amber-200', barra: 'bg-amber-300', aro: 'ring-amber-300/40', fundo: 'bg-amber-400/10' },
  perto: { texto: 'text-lime-200', barra: 'bg-lime-300', aro: 'ring-lime-300/50', fundo: 'bg-lime-400/20' },
  pronto: { texto: 'text-emerald-100', barra: 'bg-emerald-300', aro: 'ring-emerald-300/70', fundo: 'bg-emerald-400/25' },
};

export function coresDaFase(fase) {
  return CORES_DA_FASE[fase] || CORES_DA_FASE.longe;
}

/**
 * A frase, agora começando pelo que JÁ FOI FEITO.
 *
 * "61s de 70s · fale mais 9" em vez de "fale mais 9s". O mesmo número, na
 * mesma unidade — mas a conta que a pessoa lê primeiro é a que ela já ganhou.
 *
 * @param {{feito:number, meta:number, unidade:'s'|'letras'}} entrada
 */
export function fraseDoProgresso({ feito, meta, unidade = 's' } = {}) {
  const { falta, pronto } = progressoDaEtapa({ feito, meta });
  const andado = Math.max(0, Math.floor(Number(feito) || 0));
  const alvo = Math.max(0, Math.floor(Number(meta) || 0));
  // sem ✔ no texto: quem desenha já põe o ícone de check, e os dois juntos
  // saíram duplicados na primeira foto da banca ("✓ ✔ liberado")
  if (pronto) return unidade === 's' ? 'liberado' : 'no tamanho';
  if (unidade === 's') return `${andado}s de ${alvo}s · fale mais ${falta}`;
  return `${andado} de ${alvo} letras · faltam ${falta}`;
}
