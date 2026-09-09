/**
 * 🏷️ CATEGORIA DO PRODUTO — a regra e o classificador (08/09/2026).
 *
 * POR QUE ISTO EXISTE
 * Em 08/09 havia 948 produtos sem categoria de 2.853. Foram classificados um a
 * um, mas isso não resolve nada sozinho: o ritmo de cadastro SEM categoria não
 * estava caindo — 27% em abril, 23% em maio, 56% em agosto. Limpar sem fechar a
 * torneira é refazer o mesmo trabalho em dois meses.
 *
 * São duas peças que se sustentam juntas:
 *   1. `faltaCategoria` — a Gestão de Estoque não salva mais produto sem categoria.
 *   2. `sistemaDoClassificador` + `escolhaValida` — a IA sugere a categoria a
 *      partir da descrição, e a pessoa só confirma. Exigir sem sugerir só
 *      transferiria o trabalho pro operador.
 *
 * ⚠️ A SUGESTÃO NUNCA SALVA SOZINHA. Ela preenche o campo; quem confirma é a
 * pessoa. Categoria errada é pior que categoria vazia — a vazia a própria
 * Gestão de Estoque filtra e mostra, a errada ninguém vê.
 *
 * NOTA SOBRE O CAMPO OBRIGATÓRIO
 * Até 01/09 este campo era opcional DE PROPÓSITO: com milhares de produtos sem
 * categoria, exigir travaria quem só quisesse corrigir uma descrição. Esse
 * motivo acabou — hoje 2.834 dos 2.853 têm categoria. Sobraram 19, e para esses
 * classificar antes de salvar é justamente o que se quer.
 */

/** Descrição maior que isso não ajuda o classificador e só custa token. */
export const LIMITE_DESCRICAO = 400;

const texto = (v) => String(v ?? '').trim();

/**
 * Falta categoria nesta operação?
 *
 * - `create`: sempre exige. Produto novo nasce classificado.
 * - `update`: exige SÓ quando o pedido traz o campo. O formulário completo
 *   sempre traz; então editar pelo formulário exige. Um `setField` (as ações
 *   rápidas: tirar da vitrine, desvincular leilão) não traz, e segue passando.
 * - qualquer outra ação: não é assunto dela.
 */
export function faltaCategoria({ action, fields }) {
  const f = fields || {};
  if (action === 'create') return !texto(f.category_id);
  if (action === 'update') return Object.prototype.hasOwnProperty.call(f, 'category_id') && !texto(f.category_id);
  return false;
}

/** A frase que a tela e a rota mostram. Uma só, pra não divergirem. */
export const AVISO_CATEGORIA = 'Escolha a categoria do produto — sem ela o cliente não acha o item quando filtra na Loja Virtual.';

/**
 * O sistema do classificador. Recebe as categorias REAIS do banco: prompt com
 * lista escrita à mão envelhece calado no dia em que alguém cria uma categoria.
 * @param {Array<{id:string,name:string}>} categorias
 */
export function sistemaDoClassificador(categorias) {
  const lista = (categorias || [])
    .filter((c) => c && texto(c.id) && texto(c.name))
    .map((c) => `- ${c.name}`)
    .join('\n');
  return [
    'Você classifica produtos de leilão e desencalhe em UMA categoria de loja.',
    '',
    'As categorias existentes são exatamente estas:',
    lista,
    '',
    'Regras:',
    '- Responda com o NOME EXATO de uma categoria da lista, copiado letra por letra.',
    '- Classifique pelo QUE O PRODUTO É, não por palavra solta da descrição.',
    '  "Cueca sem costura" é roupa, não material de costura.',
    '  "Coturno com zíper" é calçado, não aviamento.',
    '  "Taça de cristal Titanio" é utensílio de mesa — "Titanio" aqui é o vidro, não a moto Titan.',
    '- EPI de trabalho (botina, máscara de solda, respirador) vai em Ferramentas.',
    '- Peça de instalação elétrica predial vai em Casa & Construção; equipamento eletrônico vai em Eletrônicos.',
    '- Se a descrição não disser o que a coisa é ("KIT VARIEDADES", "CAIXA SURPRESA"),',
    '  responda com categoria vazia e confianca 0. Chutar é pior que admitir.',
    '- confianca é 0 a 100. Abaixo de 70 a pessoa vai conferir antes de salvar.',
  ].join('\n');
}

/**
 * A resposta da IA vira uma categoria de verdade — ou nada.
 *
 * Casa pelo nome, sem diferenciar acento nem caixa: o modelo às vezes devolve
 * "eletronicos" para "Eletrônicos". O que ele NÃO pode é inventar categoria, e
 * é isso que esta função impede: nome fora da lista devolve null.
 */
export function escolhaValida(nomeEscolhido, categorias) {
  const alvo = normalizar(nomeEscolhido);
  if (!alvo) return null;
  const achou = (categorias || []).find((c) => c && normalizar(c.name) === alvo);
  return achou ? { category_id: achou.id, name: achou.name } : null;
}

/** minúsculas, sem acento, sem espaço sobrando — só pra comparar nomes. */
export function normalizar(v) {
  return texto(v)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/** Confiança daqui pra baixo, a tela avisa pra pessoa conferir antes de salvar. */
export const CONFIANCA_MINIMA = 70;
