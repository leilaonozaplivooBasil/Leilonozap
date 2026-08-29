// 📋 A ABA "A PAGAR" — a regra de o que aparece nela e como.
//
// Pedido da Aline (29/08/2026), sobre a opção A que ela escolheu:
//   • "substituir o campo Conta pelo centro de custo"
//   • "vir sem filtros, seria sim o ideal"
//   • "e contendo o botão para eu extrair tudo para excel"
//
// A conta mora aqui, fora do componente, pelo mesmo motivo de financeiroResumo.js:
// é regra de dinheiro e precisa de teste. O componente só pinta.

// Os três status que significam "ainda devo isso".
// pago_integral está fora porque já foi quitado; cancelado, porque deixou de ser
// dívida. Esta é a MESMA régua do filtro "A Pagar" da aba Gastos — por isso vive
// num lugar só: duas cópias divergiriam no primeiro ajuste, e aí a aba e o filtro
// passariam a responder coisas diferentes para a mesma pergunta.
export const STATUS_A_PAGAR = ['vencido', 'pago_parcial', 'pendente'];

const soData = (d) => {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const DIA_MS = 86400000;

/**
 * Tudo que está em aberto, do vencimento mais antigo para o mais novo — o mais
 * atrasado no topo, que é a ordem em que se paga conta.
 *
 * @param {Array} gastos lista COMPLETA de gastos (a aba não filtra nada, por pedido)
 * @param {Date}  hoje   injetável para o teste não depender do relógio
 */
export function listarContasAPagar(gastos = [], hoje = new Date()) {
  const dia = soData(hoje);

  return gastos
    .filter((e) => STATUS_A_PAGAR.includes(e?.payment_status))
    .map((e) => {
      const valorOriginal = e.amount || 0;
      const juros = e.interest_amount || 0;
      const jaPago = e.amount_paid || 0;
      const emAberto = valorOriginal + juros - jaPago;
      const dias = Math.round((soData(e.due_date) - dia) / DIA_MS);

      return {
        ...e,
        valorOriginal,
        juros,
        jaPago,
        emAberto,
        // negativo = atrasado; 0 = vence hoje
        diasParaVencer: dias,
        situacao: descreverSituacao(dias),
        parcial: jaPago > 0,
      };
    })
    .sort((a, b) => soData(a.due_date) - soData(b.due_date));
}

// O texto da coluna "Situação". Sai igual na tela e na planilha — se fossem dois
// textos diferentes, a Aline teria que traduzir um para o outro na conferência.
export function descreverSituacao(dias) {
  if (dias < 0) return { texto: `Vencido há ${Math.abs(dias)} dia(s)`, tom: 'vencido' };
  if (dias === 0) return { texto: 'Vence HOJE', tom: 'urgente' };
  if (dias <= 3) return { texto: `Vence em ${dias} dia(s)`, tom: 'urgente' };
  return { texto: `Vence em ${dias} dia(s)`, tom: 'normal' };
}

export function totalEmAberto(contas = []) {
  return contas.reduce((s, c) => s + (c.emAberto || 0), 0);
}

const dataBR = (d) => {
  const dt = soData(d);
  if (Number.isNaN(dt.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
};

const STATUS_LEGIVEL = {
  vencido: 'Vencido',
  pago_parcial: 'Pago parcial',
  pendente: 'Pendente',
};

/**
 * As linhas da planilha: cabeçalho + uma linha por conta + a linha de total.
 *
 * "Extrair TUDO" (palavra dela) inclui as parcelas do valor — original, juros e
 * o que já foi pago — e não só o saldo. No Excel ela precisa reconstruir a conta,
 * e um número fechado não se abre depois. Valores vão como NÚMERO, não texto,
 * senão a planilha não soma coluna.
 */
export function montarLinhasExcel(contas = []) {
  const cabecalho = [
    'Vencimento', 'Descrição', 'Empresa', 'Categoria', 'Centro de custo',
    'Valor original', 'Juros', 'Já pago', 'Em aberto', 'Situação', 'Status',
  ];

  const linhas = contas.map((c) => [
    dataBR(c.due_date),
    c.description || '',
    c.company || '',
    c.category || '',
    c.cost_center || '',
    c.valorOriginal,
    c.juros,
    c.jaPago,
    c.emAberto,
    c.situacao.texto,
    STATUS_LEGIVEL[c.payment_status] || c.payment_status || '',
  ]);

  // Linha de total, na mesma coluna do "Em aberto" — é o número que ela procura.
  const total = ['TOTAL', '', '', '', '', '', '', '', totalEmAberto(contas), '', ''];

  return [cabecalho, ...linhas, total];
}

export function nomeDoArquivo(hoje = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `contas-a-pagar-${hoje.getFullYear()}-${p(hoje.getMonth() + 1)}-${p(hoje.getDate())}.xlsx`;
}
