// listasDoFinanceiro — as listas de Categoria e Centro de Custo do Financeiro.
//
// 05/09/2026 — PEDIDO DA ALINE
// "Ontem foi criado Centro de custo e o botão para criar novo centro de custo, sendo que
// preciso que os criados apareçam no filtro para eu apenas selecionar. Ex.: Custo Fixo,
// Custo Variável, Dividendos, Distribuição de Lucro, Reembolso, Estorno. Eu já criei
// alguns, sendo que não estão ficando salvos, estou tendo que criar a cada lançamento."
//
// Ela estava certa: o botão "+ Novo" nunca criou nada. Ele só trocava o <Select> por um
// <Input> de texto livre, e o que ela digitava era gravado NAQUELE lançamento e em lugar
// nenhum mais. A lista do dropdown era um array de 3 strings escrito no código
// (costCenters.js) — não existia onde salvar.
//
// O ESTRAGO QUE ISSO JÁ TINHA CAUSADO (medido no banco em 05/09, antes de mexer)
//   centro de custo: "custo fixo" (8) e "Custo Fixo" (1) — o MESMO centro em duas linhas
//                    do relatório "Por Centro de Custo", com o total partido ao meio;
//                    "custo variável " com espaço no fim; "Distribuicao de lucro".
//   categoria:       "Salario" (11) e "salario" (4) — 15 lançamentos de salário partidos
//                    em dois; "alimentação"/"Alimentacao"; "Cartão de Crédito"/"cartao de
//                    credito"; "Aluguel Escritório " com espaço no fim.
// Digitar à mão a cada lançamento não é só incômodo: cada variante nova quebra a soma do
// relatório, que agrupa por string exata (FinancialOverview.jsx).
//
// A SOLUÇÃO ESCOLHIDA (decisão do dono, 05/09)
// A lista deixa de ser fixa e passa a ser "as de fábrica + tudo que já foi usado num
// lançamento". Salvou com "Dividendos" uma vez, "Dividendos" fica no dropdown pra sempre.
// Sem tabela nova, sem tela de cadastro pra manter: o próprio lançamento é o cadastro.
//
// As duas travas abaixo são o que impede o problema de voltar — sem elas a lista só
// acumularia as variantes em vez de três strings fixas:
//   ① normalizar() apara as pontas e junta espaço repetido — mata o "custo variável ".
//   ② resolverGrafia() reaproveita a grafia que JÁ existe quando o que foi digitado bate
//      ignorando maiúscula e acento — digitou "custo fixo" e já existe "Custo Fixo"?
//      grava "Custo Fixo". Sem isso, ela criaria a sétima variante do mesmo centro.

/**
 * Apara as pontas e colapsa espaço repetido no meio. Devolve '' pra qualquer coisa que
 * não seja texto aproveitável — inclusive Symbol, que faz String() ESTOURAR (lição do
 * relogioLeilao.js: `new Date(Symbol())` também lançava).
 * @param {unknown} texto
 * @returns {string}
 */
export function normalizar(texto) {
  if (texto === null || texto === undefined) return '';
  if (typeof texto !== 'string' && typeof texto !== 'number') return '';
  return String(texto).replace(/\s+/g, ' ').trim();
}

/**
 * A chave de comparação: minúscula e SEM acento. É só pra decidir "isto já existe?" —
 * nunca é gravada nem mostrada. "Distribuição" e "Distribuicao" têm a mesma chave.
 * @param {unknown} texto
 * @returns {string}
 */
export function chave(texto) {
  return normalizar(texto)
    .toLowerCase()
    .normalize('NFD')
    // \u0300-\u036f é a faixa dos acentos que o NFD separou da letra. Escrito em
    // escape de propósito: com os caracteres crus a linha fica invisível no editor.
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * A lista do dropdown: as de fábrica primeiro, na ordem em que foram escritas, depois o
 * que já foi usado nos lançamentos, em ordem alfabética de gente (localeCompare pt-BR,
 * senão "Água" cai depois de "Zebra"). Uma entrada por CHAVE: se o banco tem "custo
 * fixo" e "Custo Fixo", só uma das duas aparece — a de fábrica quando houver, senão a
 * primeira encontrada.
 *
 * @param {string[]} fixas - as de fábrica, que sempre aparecem mesmo sem uso nenhum
 * @param {...Array<unknown>} usadas - listas de valores já gravados (gastos, receitas...)
 * @returns {string[]}
 */
export function montarOpcoes(fixas = [], ...usadas) {
  const porChave = new Map();

  for (const f of Array.isArray(fixas) ? fixas : []) {
    const rotulo = normalizar(f);
    if (rotulo && !porChave.has(chave(rotulo))) porChave.set(chave(rotulo), rotulo);
  }
  const deFabrica = [...porChave.values()];

  const extras = [];
  for (const lista of usadas) {
    for (const u of Array.isArray(lista) ? lista : []) {
      const rotulo = normalizar(u);
      if (!rotulo || porChave.has(chave(rotulo))) continue;
      porChave.set(chave(rotulo), rotulo);
      extras.push(rotulo);
    }
  }
  extras.sort((a, b) => a.localeCompare(b, 'pt-BR'));

  return [...deFabrica, ...extras];
}

/**
 * O que vai pro banco quando ela digita um valor novo. Se já existe algo com a mesma
 * chave, devolve a grafia QUE JÁ ESTÁ LÁ — é o que impede o relatório de rachar em duas
 * linhas. Se não existe, devolve o texto dela normalizado, do jeito que ela escreveu.
 *
 * @param {unknown} digitado
 * @param {string[]} opcoes - o resultado de montarOpcoes
 * @returns {string}
 */
export function resolverGrafia(digitado, opcoes = []) {
  const limpo = normalizar(digitado);
  if (!limpo) return '';
  const alvo = chave(limpo);
  for (const o of Array.isArray(opcoes) ? opcoes : []) {
    if (chave(o) === alvo) return normalizar(o);
  }
  return limpo;
}

// As categorias de fábrica. Moradia trocada de ExpenseFormModal.jsx pra cá em 05/09
// porque a TELA também precisa delas pra montar a lista — e duas cópias divergiriam no
// primeiro ajuste, que é o mesmo motivo de STATUS_A_PAGAR morar em contasAPagar.js.
// (COST_CENTERS segue em costCenters.js, com a história do DIR-7 junto.)
export const CATEGORIAS_DE_FABRICA = [
  'Aluguel', 'Energia', 'Internet', 'Telefone', 'Água', 'Gás',
  'Software/Assinatura', 'Servidor/Hospedagem', 'Marketing/Ads',
  'Funcionários/Salários', 'Contabilidade', 'Impostos',
  'Material de Escritório', 'Transporte/Frete', 'Seguros',
  'Manutenção', 'Equipamentos', 'Outros',
];
