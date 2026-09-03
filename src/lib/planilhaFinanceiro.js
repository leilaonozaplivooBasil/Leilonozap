/**
 * planilhaFinanceiro — a exportação do Financeiro para planilha.
 *
 * 🔴 POR QUE ESTE ARQUIVO EXISTE (03/09/2026)
 * O dono: "a opção de exportar em planilha ainda não está disponível".
 * Estava certo — a tela tinha uma saída só, o "Gerar PDF".
 *
 * E o PDF entrega pouco: mostra 8 colunas das 30 que o banco guarda. Ficavam
 * fora justamente o que o contador pede — centro de custo, parcelamento, juros,
 * conta de pagamento, data em que foi pago e as observações.
 *
 * A planilha segue os FILTROS DA TELA, não um período próprio. Quem clica em
 * "exportar" olhando uma lista filtrada espera baixar aquela lista. (O PDF tem
 * período próprio e ignora os filtros — decisão do dono de 03/09: não mexer
 * nele nesta entrega.)
 *
 * ─────────────── por que CSV com ponto-e-vírgula ───────────────
 *
 * É o padrão que a casa já usa em quatro telas (Extrato de Comissões, CRM de
 * Clientes, Estoque/Imagens, Gestão de Produtos): separador `;` e BOM UTF-8.
 * No Excel em português, `;` é o separador de lista e o BOM é o que faz acento
 * aparecer certo. Não inventei formato novo.
 *
 * ─────────────── duas travas que a casa ainda não tinha ───────────────
 *
 * 1. ESCAPE. As outras quatro exportações fazem `join(';')` direto. Basta uma
 *    descrição com ponto-e-vírgula ("Hotel; diária de setembro") para a linha
 *    inteira escorregar uma coluna — e ninguém percebe, porque planilha errada
 *    ainda abre. Aqui todo campo com `;`, aspas ou quebra de linha vai entre
 *    aspas, com as aspas internas duplicadas (RFC 4180).
 *
 * 2. FÓRMULA DISFARÇADA (CSV injection). Célula que começa com `=`, `+`, `-`
 *    ou `@` é FÓRMULA para o Excel. Como descrição, empresa e observação são
 *    digitadas por gente, um texto começando com `=` viraria conta executável
 *    na máquina de quem abrir. Prefixamos com aspa simples, que o Excel come e
 *    não mostra.
 */

import { STATUS_ROTULO, TIPO_ROTULO, PAGAMENTO_ROTULO, rotuloDe } from './rotulosFinanceiro.js';

/** As colunas da planilha, na ordem. A tela mostra 8; aqui saem todas. */
export const COLUNAS = [
  'Descrição', 'Empresa', 'Categoria', 'Centro de custo', 'Tipo', 'Status',
  'Vencimento', 'Data de pagamento', 'Forma de pagamento', 'Conta de pagamento',
  'Valor', 'Valor pago', 'Juros', 'Total', 'Parcela', 'Dia da recorrência',
  'Observações', 'Lançado em', 'Lançado por',
];

/** Data no formato de quem vai ler: dd/MM/aaaa. Vazio quando não dá para confiar. */
export function dataBR(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  // '2026-09-30' é dia puro: montar como UTC evita o fuso puxar para o dia 29.
  const texto = String(valor);
  const soData = /^\d{4}-\d{2}-\d{2}$/.test(texto);
  let d;
  try {
    d = soData ? new Date(`${texto}T12:00:00Z`) : new Date(valor);
  } catch {
    return '';
  }
  const ms = d.getTime();
  if (!Number.isFinite(ms) || ms < Date.UTC(2000, 0, 1)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return soData
    ? `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
    : `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Dinheiro como o Excel em português entende: 1.010,00 (sem "R$").
 *
 * Ausente sai VAZIO, nunca "0,00" — e a diferença não é cosmética: zero é uma
 * afirmação ("não paguei nada"), vazio é "ninguém informou". Numa conferência
 * com contador, trocar um pelo outro é trocar dado por invenção. (`Number(null)`
 * e `Number('')` dão 0 e passariam por `isFinite`; por isso a recusa é antes.)
 */
export function dinheiroBR(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const n = Number(valor);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "3/12" quando é parcelado; vazio quando não é. */
export function parcela(gasto) {
  const total = Number(gasto?.installment_total) || 0;
  const atual = Number(gasto?.installment_current) || 0;
  if (total <= 1) return '';
  return `${atual || 1}/${total}`;
}

/**
 * Deixa uma célula segura para o Excel.
 *
 * Faz as duas coisas do cabeçalho: neutraliza fórmula e escapa o separador.
 * A ordem importa — a aspa simples entra ANTES de decidir se o campo precisa de
 * aspas, senão um `=1;2` sairia protegido de fórmula e quebrado em coluna.
 */
export function celula(valor) {
  let s = valor === null || valor === undefined ? '' : String(valor);
  // fórmula disfarçada: `=`, `+`, `-`, `@` e também tabulação/CR iniciais
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[;"\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Uma linha da planilha, na ordem de COLUNAS. */
export function linhaDoGasto(gasto) {
  const g = gasto || {};
  return [
    g.description, g.company, g.category, g.cost_center,
    rotuloDe(TIPO_ROTULO, g.expense_type),
    rotuloDe(STATUS_ROTULO, g.payment_status),
    dataBR(g.due_date), dataBR(g.payment_date),
    rotuloDe(PAGAMENTO_ROTULO, g.payment_method), g.payment_account,
    dinheiroBR(g.amount), dinheiroBR(g.amount_paid), dinheiroBR(g.interest_amount),
    dinheiroBR(g.total_amount), parcela(g), g.recurring_day,
    g.notes, dataBR(g.created_date), g.created_by,
  ].map(celula);
}

/**
 * A planilha inteira, pronta para virar arquivo.
 *
 * Recebe a lista JÁ FILTRADA pela tela — não filtra nada por conta própria.
 * Quem decide o que sai é o que a pessoa está vendo.
 */
export function montarCSV(gastos) {
  const lista = Array.isArray(gastos) ? gastos : [];
  const linhas = [COLUNAS.join(';'), ...lista.map((g) => linhaDoGasto(g).join(';'))];
  return linhas.join('\r\n');   // CRLF: o que o Excel espera (RFC 4180)
}

/** Nome do arquivo, com o instante em que foi tirado — para não sobrescrever. */
export function nomeDoArquivo(agora = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const d = agora instanceof Date && Number.isFinite(agora.getTime()) ? agora : new Date();
  return `financeiro-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.csv`;
}

/**
 * O conteúdo do arquivo, com o BOM na frente.
 * Sem o BOM o Excel abre "Hotel Restaurante" como "Hotel Restaurante".
 */
export const conteudoDoArquivo = (gastos) => `﻿${montarCSV(gastos)}`;
