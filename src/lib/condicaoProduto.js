// 🏷️ 02/09/2026 — ESTADO DO PRODUTO, no vocabulário da operação.
//
// Antes deste arquivo, o estado de um produto vivia em três lugares e o cliente
// não via nenhum deles:
//   1. os contadores qty_perfeito / qty_bom / qty_ruim / qty_oficina (tela interna);
//   2. o marcador [grade:X] enterrado dentro de `notes`;
//   3. um seletor "Condição do produto" no cadastro que NUNCA chegava ao banco.
//
// O resultado é que a página de venda mostrava, sob o título "Descrição", o texto
// interno do lote — "Gerado automaticamente do lote: LOTE 46-48 ... (Mercado Livre)".
// Em 3.170 dos 3.543 produtos do retrato de estoque era exatamente esse texto. É a
// origem das mensagens negativas: o cliente compra sem saber que o item é devolução.
//
// Agora existem duas colunas de verdade em `products`:
//   `condicao`            — um dos valores desta lista (estruturado, filtrável)
//   `estado_conservacao`  — texto livre de quem cadastra ("amassado na lateral
//                           esquerda, funciona normalmente")

// Ordem = do melhor para o pior. É a ordem que aparece no seletor do cadastro.
export const CONDICOES = [
  { valor: 'novo',           rotulo: 'Novo — lacrado',                     resumo: 'Novo' },
  { valor: 'perfeito',       rotulo: 'Perfeito — sem marcas de uso',       resumo: 'Perfeito' },
  { valor: 'bom',            rotulo: 'Bom — pequenas marcas de uso',       resumo: 'Bom' },
  { valor: 'com_avarias',    rotulo: 'Com avarias — amassado ou riscado',  resumo: 'Com avarias' },
  { valor: 'para_reparo',    rotulo: 'Para reparo — precisa de conserto',  resumo: 'Para reparo' },
  { valor: 'recondicionado', rotulo: 'Recondicionado',                     resumo: 'Recondicionado' },
];

const PORVALOR = new Map(CONDICOES.map((c) => [c.valor, c]));

export function ehCondicaoValida(valor) {
  return PORVALOR.has(String(valor || ''));
}

/** Rótulo longo para a página de venda. Devolve '' quando não há condição. */
export function rotuloCondicao(valor) {
  return PORVALOR.get(String(valor || ''))?.rotulo || '';
}

/** Rótulo curto para selo/etiqueta em card. Devolve '' quando não há condição. */
export function resumoCondicao(valor) {
  return PORVALOR.get(String(valor || ''))?.resumo || '';
}

// A planilha de lote classifica por grade. É o mesmo mapa que gerarProdutosDoLote
// já usa para decidir qty_perfeito/qty_bom/qty_ruim/qty_oficina — só que agora a
// classificação também vira uma palavra que o cliente entende.
const PORGRADE = { A: 'perfeito', B: 'bom', C: 'bom', D: 'com_avarias', E: 'com_avarias', U: 'para_reparo' };

/** Grade da planilha (A..E, U) → condição. Grade desconhecida cai em 'perfeito',
 *  mesmo padrão do mapGradeToField do gerador de lote. */
export function condicaoDaGrade(grade) {
  return PORGRADE[String(grade || '').trim().toUpperCase()] || 'perfeito';
}

// 🧹 O `notes` é o campo que a página de venda mostra como "Descrição". O gerador
// de lote escreveu texto interno nele por meses. Parar de escrever (feito em
// gerarProdutosDoLote.js) só resolve dali pra frente — os produtos que já existem
// continuariam exibindo o jargão. Este reconhecedor deixa a vitrine ignorar esse
// texto SEM apagar dado nenhum do banco: a informação continua lá para auditoria,
// só não é mais empurrada pro cliente.
//
// Casa apenas com o formato exato que o gerador produzia. Qualquer observação
// escrita por gente (mesmo que mencione o lote) passa e continua sendo exibida.
// Uma linha só, começando exatamente pela frase que o gerador usava. O nome do
// lote pode conter parênteses — "LOTE 51 - RIO DE JANEIRO - COMPLETO (1)
// (Mercado Livre)" — então não dá para exigir um único grupo entre parênteses:
// a primeira versão desta regra deixou 245 produtos reais de fora por isso.
const TEXTO_INTERNO_DE_LOTE = /^(\[grade:[ABCDEU]\]\s*)?Gerado automaticamente do lote:[^\n]*$/;

export function ehTextoInternoDeLote(texto) {
  return TEXTO_INTERNO_DE_LOTE.test(String(texto || '').trim());
}

/** O que a página de venda deve mostrar como Descrição — '' quando o único texto
 *  disponível é o interno do lote. */
export function descricaoPublica(notes) {
  const t = String(notes || '').trim();
  return ehTextoInternoDeLote(t) ? '' : t;
}

// A IA de descrição devolve `condicao` como texto solto ("Novo", "usado",
// "seminovo"…). Sem normalizar, esse texto iria para uma coluna de valor fechado e
// nenhum filtro da vitrine reconheceria. Devolve '' quando não dá pra ter certeza —
// preferimos campo vazio a um estado errado na página de venda.
const APELIDOS = {
  novo: 'novo', lacrado: 'novo', 'novo lacrado': 'novo', 'na caixa': 'novo',
  perfeito: 'perfeito', impecavel: 'perfeito', seminovo: 'perfeito', 'semi novo': 'perfeito', 'como novo': 'perfeito',
  bom: 'bom', usado: 'bom', 'bom estado': 'bom', 'pouco uso': 'bom',
  avariado: 'com_avarias', amassado: 'com_avarias', riscado: 'com_avarias', 'com avarias': 'com_avarias', 'com defeito': 'com_avarias',
  quebrado: 'para_reparo', 'para reparo': 'para_reparo', 'para conserto': 'para_reparo', sucata: 'para_reparo', oficina: 'para_reparo',
  recondicionado: 'recondicionado', remanufaturado: 'recondicionado', refurbished: 'recondicionado', reformado: 'recondicionado',
};

export function normalizarCondicao(texto) {
  const t = String(texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (!t) return '';
  if (PORVALOR.has(t)) return t;
  return APELIDOS[t] || '';
}
