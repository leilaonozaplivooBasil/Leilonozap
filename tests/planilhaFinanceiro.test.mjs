// "A opção de exportar em planilha ainda não está disponível."
//
// 03/09/2026. Estava certo: o Financeiro tinha uma saída só, o "Gerar PDF" —
// que mostra 8 colunas das 30 do banco e ainda IGNORA os filtros da tela (tem
// período próprio). Ficavam de fora centro de custo, parcelamento, juros,
// conta de pagamento, data do pagamento e observações.
//
// A planilha segue os filtros da tela: recebe a lista JÁ filtrada e não decide
// nada por conta própria.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COLUNAS, montarCSV, linhaDoGasto, celula, dataBR, dinheiroBR, parcela,
  nomeDoArquivo, conteudoDoArquivo,
} from '../src/lib/planilhaFinanceiro.js';
import { STATUS_ROTULO, TIPO_ROTULO, rotuloDe } from '../src/lib/rotulosFinanceiro.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// Duas linhas reais do print do dono.
const HOTEL = {
  description: 'Hotel Restaurante', company: 'Hotel Restaurante', category: 'alimentação',
  expense_type: 'fixo', payment_status: 'pendente', payment_method: 'pix',
  due_date: '2026-09-30', amount: 23629, total_amount: 23629,
};
const CONSORCIO = {
  description: 'Concorcio Bradesco', company: 'Concorcio Bradesco',
  category: 'carta consorcio custo fixo', expense_type: 'fixo',
  payment_status: 'pendente', payment_method: 'pix',
  due_date: '2026-09-27', amount: 1010, total_amount: 1010,
};

// ─────────────── a trava que a casa ainda não tinha: escape ───────────────

test('ponto-e-vírgula na descrição NÃO escorrega a linha de coluna', () => {
  // As outras quatro exportações da casa fazem join(';') direto. Basta um
  // "Hotel; diária de setembro" para a linha inteira sair deslocada — e ninguém
  // percebe, porque planilha errada ainda abre.
  const linha = linhaDoGasto({ ...HOTEL, description: 'Hotel; diária de setembro' });
  assert.equal(linha[0], '"Hotel; diária de setembro"');
  // a linha continua com exatamente uma célula por coluna
  assert.equal(linha.length, COLUNAS.length);
});

test('aspas e quebra de linha nas observações não quebram o arquivo', () => {
  assert.equal(celula('ele disse "ok"'), '"ele disse ""ok"""');
  assert.equal(celula('linha 1\nlinha 2'), '"linha 1\nlinha 2"');
  assert.equal(celula('sem nada de especial'), 'sem nada de especial');
});

// ─────────────── a outra trava: fórmula disfarçada ───────────────

test('texto começando com = não vira FÓRMULA na máquina de quem abrir', () => {
  // Descrição, empresa e observação são digitadas por gente. Uma célula que
  // começa com `=`, `+`, `-` ou `@` é fórmula para o Excel — isso é um caminho
  // de execução na máquina do contador, não um detalhe de formatação.
  for (const perigo of ['=1+1', '+SOMA(A1)', '-2', '@REF', '=cmd|calc']) {
    const saida = celula(perigo);
    assert.ok(saida.startsWith("'"), `"${perigo}" saiu como fórmula: ${saida}`);
  }
  // e o escape continua valendo por cima
  assert.equal(celula('=a;b'), '"\'=a;b"');
});

test('texto normal não ganha aspa simples à toa', () => {
  for (const ok of ['Hotel Restaurante', '1010', 'alimentação', '']) {
    assert.ok(!celula(ok).startsWith("'"), `"${ok}" foi tratado como fórmula`);
  }
});

// ─────────────── o que o PDF não entrega ───────────────

test('a planilha tem as colunas que o PDF esconde', () => {
  for (const coluna of [
    'Centro de custo', 'Parcela', 'Juros', 'Conta de pagamento',
    'Data de pagamento', 'Observações', 'Lançado em', 'Lançado por',
  ]) {
    assert.ok(COLUNAS.includes(coluna), `faltou a coluna "${coluna}"`);
  }
  assert.equal(COLUNAS.length, 19);
});

test('a linha do print sai igual ao que está na tela', () => {
  const l = linhaDoGasto(HOTEL);
  assert.equal(l[COLUNAS.indexOf('Descrição')], 'Hotel Restaurante');
  assert.equal(l[COLUNAS.indexOf('Categoria')], 'alimentação');
  assert.equal(l[COLUNAS.indexOf('Tipo')], 'Fixo');
  assert.equal(l[COLUNAS.indexOf('Status')], 'Pendente');
  assert.equal(l[COLUNAS.indexOf('Vencimento')], '30/09/2026');
  assert.equal(l[COLUNAS.indexOf('Forma de pagamento')], 'PIX');
  assert.equal(l[COLUNAS.indexOf('Valor')], '23.629,00');
});

// ─────────────── datas e dinheiro ───────────────

test('o vencimento não anda um dia para trás por causa do fuso', () => {
  // '2026-09-30' é dia puro. Montado como hora local em fuso negativo, viraria 29.
  const original = process.env.TZ;
  try {
    for (const tz of ['UTC', 'America/Sao_Paulo', 'Pacific/Kiritimati', 'Pacific/Midway']) {
      process.env.TZ = tz;
      assert.equal(dataBR('2026-09-30'), '30/09/2026', `virou outro dia no fuso ${tz}`);
    }
  } finally {
    if (original === undefined) delete process.env.TZ; else process.env.TZ = original;
  }
});

test('data ausente ou lixo sai VAZIA, nunca 1970', () => {
  // Mesma lição do lance "há 57 anos": nulo virando a Época do Unix.
  for (const v of [null, undefined, '', 0, 'amanhã', {}, NaN]) {
    assert.equal(dataBR(v), '', `${String(v)} produziu "${dataBR(v)}"`);
  }
  assert.ok(!dataBR(null).includes('1970'));
});

test('dinheiro no formato que o Excel em português soma', () => {
  assert.equal(dinheiroBR(23629), '23.629,00');
  assert.equal(dinheiroBR(1010), '1.010,00');
  assert.equal(dinheiroBR(59.9), '59,90');
  assert.equal(dinheiroBR(0), '0,00');
  // sem valor não vira zero: zero é uma afirmação, vazio é "não informado"
  for (const v of [null, undefined, '', 'abc']) assert.equal(dinheiroBR(v), '');
});

test('parcela só aparece quando é parcelado', () => {
  assert.equal(parcela({ installment_current: 3, installment_total: 12 }), '3/12');
  assert.equal(parcela({ installment_total: 1 }), '');
  assert.equal(parcela({}), '');
  assert.equal(parcela(null), '');
});

// ─────────────── o arquivo inteiro ───────────────

test('a planilha exporta exatamente a lista que recebeu', () => {
  // Não filtra nada por conta própria: quem decide é a tela.
  const csv = montarCSV([HOTEL, CONSORCIO]);
  const linhas = csv.split('\r\n');
  assert.equal(linhas.length, 3, 'cabeçalho + 2 linhas');
  assert.equal(linhas[0], COLUNAS.join(';'));
  assert.match(linhas[1], /^Hotel Restaurante;/);
  assert.match(linhas[2], /^Concorcio Bradesco;/);
});

test('lista vazia gera planilha só com o cabeçalho, sem explodir', () => {
  assert.equal(montarCSV([]), COLUNAS.join(';'));
  assert.equal(montarCSV(null), COLUNAS.join(';'));
  assert.doesNotThrow(() => montarCSV([null, undefined, {}]));
});

test('o BOM vai na frente — sem ele o Excel come o acento', () => {
  const conteudo = conteudoDoArquivo([HOTEL]);
  assert.equal(conteudo.charCodeAt(0), 0xFEFF);
  assert.match(conteudo, /alimentação/);
});

test('o nome do arquivo carrega o instante, para não sobrescrever', () => {
  assert.equal(nomeDoArquivo(new Date(2026, 8, 3, 10, 5)), 'financeiro-20260903-1005.csv');
  assert.match(nomeDoArquivo(), /^financeiro-\d{8}-\d{4}\.csv$/);
  assert.doesNotThrow(() => nomeDoArquivo('lixo'));
});

// ─────────────── um vocabulário só, para não divergir da tela ───────────────

test('a planilha e a tabela falam a mesma língua', () => {
  const tabela = ler('../src/components/financial/ExpenseTable.jsx');
  assert.match(tabela, /from ['"]@\/lib\/rotulosFinanceiro['"]/,
    'a tabela voltou a ter os rótulos por conta própria — vão divergir');
  assert.equal(rotuloDe(STATUS_ROTULO, 'pago_integral'), 'Pago');
  assert.equal(rotuloDe(TIPO_ROTULO, 'unico'), 'Único');
  // status que ninguém previu aparece como veio, em vez de sumir da planilha
  assert.equal(rotuloDe(STATUS_ROTULO, 'status_novo'), 'status_novo');
  assert.equal(rotuloDe(STATUS_ROTULO, null), '');
});

// ─────────────── a tela usa a lista filtrada, e o PDF não foi tocado ───────────────

test('o botão exporta o que está NA TELA, não a base inteira', () => {
  const tela = ler('../src/pages/Financial.jsx');
  assert.match(tela, /from ['"]@\/lib\/planilhaFinanceiro['"]/);
  // `filtered` é a lista já filtrada pelos seis filtros da tela
  assert.match(tela, /conteudoDoArquivo\(filtered\)/,
    'a planilha voltou a exportar `expenses` (a base toda) em vez de `filtered`');
});

test('o PDF continua exatamente como estava', () => {
  // Decisão do dono em 03/09: "não mexa no pdf".
  const tela = ler('../src/pages/Financial.jsx');
  assert.match(tela, /<FinancialPDFGenerator open=\{showPDF\} onClose=\{\(\) => setShowPDF\(false\)\} expenses=\{expenses\} \/>/,
    'a chamada do PDF foi alterada — era para ficar intocada');
});
