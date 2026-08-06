// 📊 Leitor de planilha de lote — versão de CONSULTA (painel do Parceiro).
//
// ⚠️ Regra do pedido: o analisador do admin (AnalisadorLoteInline) NÃO pode ser
// alterado. Por isso a leitura da planilha foi isolada aqui em funções puras,
// espelhando exatamente a mesma metodologia já validada em produção:
// mesmas colunas, mesmas grades (A/B/C/D/E/U), mesma soma de valor de mercado.
//
// Puro: recebe o workbook do XLSX, devolve o objeto do lote. Não grava nada,
// não conhece banco, não conhece React.

const num = (v) =>
  typeof v === 'number'
    ? v
    : parseFloat(String(v ?? '').replace(/[R$\s]/g, '').replace(',', '.')) || 0;

const extrairGrade = (bruto) => {
  const s = String(bruto).toUpperCase().trim();
  if (['A', 'B', 'C', 'D', 'E', 'U'].includes(s)) return s;
  const m = s.match(/\b([ABCDEU])\b/);
  return m ? m[1] : 'U';
};

const gradesVazias = () => ({
  A: { qtd: 0, valorMarket: 0 },
  B: { qtd: 0, valorMarket: 0 },
  C: { qtd: 0, valorMarket: 0 },
  D: { qtd: 0, valorMarket: 0 },
  E: { qtd: 0, valorMarket: 0 },
  U: { qtd: 0, valorMarket: 0 },
});

// ── Modelo MERCADO LIVRE ──────────────────────────────────────────────────────
export function lerPlanilhaMercadoLivre(XLSX, workbook, nomeArquivo) {
  let localColeta = 'Será informado após Arremate';
  if (workbook.Sheets['Complemento']) {
    const comp = XLSX.utils.sheet_to_json(workbook.Sheets['Complemento'], { header: 1 });
    const linha = comp.find(
      (r) => r && typeof r[0] === 'string' && r[0].includes('Local de Carregamento')
    );
    if (linha && linha[1]) localColeta = String(linha[1]).trim();
  }

  // Resumo por categoria (aba "Resumo", nos dois formatos que a planilha usa)
  const resumoCategorias = [];
  const abaResumo = workbook.SheetNames.find((s) => s.toUpperCase().includes('RESUMO'));
  if (abaResumo) {
    const res = XLSX.utils.sheet_to_json(workbook.Sheets[abaResumo], { header: 1 });
    const inicio = res.findIndex(
      (r) => r && typeof r[0] === 'string' && r[0].includes('Rótulos de Linha')
    ) + 1;
    if (inicio > 0) {
      for (let i = inicio; i < res.length; i++) {
        const r = res[i];
        if (!r || !r[0]) continue;
        if (String(r[0]).includes('Total Geral')) break;
        resumoCategorias.push({ nome: r[0], qtd: r[1] || 0, valor: r[2] || 0 });
      }
    } else {
      for (let i = 0; i < Math.min(30, res.length); i++) {
        const r = res[i];
        if (r && typeof r[3] === 'string' && r[3] !== 'Categoria' && r[4]) {
          resumoCategorias.push({ nome: r[3], qtd: r[4], valor: r[5] || 0 });
        }
      }
    }
  }

  // Aba de itens: a primeira que tiver coluna de grade/condição ou valor total
  let dados = null;
  let linhaCabecalho = -1;
  let cabecalho = [];
  for (const aba of workbook.SheetNames) {
    const d = XLSX.utils.sheet_to_json(workbook.Sheets[aba], { header: 1 });
    for (let i = 0; i < Math.min(20, d.length); i++) {
      const linha = d[i];
      const bate =
        linha &&
        linha.some((c) => {
          if (typeof c !== 'string') return false;
          const h = c.toUpperCase().replace(/\s+/g, ' ');
          return (
            h.includes('CLASSE') ||
            h.includes('GRADE') ||
            h.includes('COND') ||
            h.includes('VALOR TOTAL') ||
            h.includes('VALOR DE MERCADO')
          );
        });
      if (bate) {
        linhaCabecalho = i;
        cabecalho = linha;
        dados = d;
        break;
      }
    }
    if (dados) break;
  }

  if (!dados || linhaCabecalho === -1) {
    throw new Error(
      'Não foi possível identificar os produtos na planilha. É esperada uma tabela com coluna de Grade/Condição ou Valor Total.'
    );
  }

  const cab = cabecalho.map((h) =>
    typeof h === 'string' ? h.toUpperCase().trim().replace(/\s+/g, ' ') : ''
  );
  const col = (chaves) => cab.findIndex((h) => chaves.some((k) => h.includes(k)));
  const colGrade = col(['CLASSE', 'CLASSIFICA', 'CLASS', 'CONDIÇÃO', 'GRADE']);
  const colValor = col(['VALOR TOTAL', 'VALOR DE MERCADO']);
  const colQtd = col(['QUANTIDADE', 'QTD']);
  const colDesc = cab.findIndex(
    (h) => h.includes('DESCRI') || h === 'ITEM' || h === 'PRODUTO' || h.includes('NOME DO PRODUTO')
  );
  const colCategoria = cab.findIndex((h) => h.includes('CATEGOR') && !h.includes('SUB'));

  const classCount = { A: 0, B: 0, C: 0, D: 0, E: 0, U: 0 };
  const gradesData = gradesVazias();
  const itens = [];
  const itensPorCategoria = {};
  let valorMercadoTotal = 0;
  let quantidadeTotal = 0;

  for (let i = linhaCabecalho + 1; i < dados.length; i++) {
    const linha = dados[i];
    if (!linha || linha.length === 0) continue;
    if (typeof linha[0] === 'string' && linha[0].toUpperCase().includes('TOTAL')) continue;
    const gradeBruta = colGrade >= 0 ? linha[colGrade] : null;
    if (!gradeBruta) continue;

    const grade = extrairGrade(gradeBruta);
    const qtd = colQtd >= 0 && linha[colQtd] != null ? parseInt(linha[colQtd], 10) || 1 : 1;
    const valor = colValor >= 0 ? num(linha[colValor]) : 0;
    const desc =
      colDesc >= 0 && linha[colDesc] ? String(linha[colDesc]).trim() : `Item linha ${i + 1}`;

    valorMercadoTotal += valor;
    quantidadeTotal += qtd;
    classCount[grade] += qtd;
    gradesData[grade].qtd += qtd;
    gradesData[grade].valorMarket += valor;
    itens.push({ grade, desc, qtd, valor });

    if (colCategoria >= 0 && linha[colCategoria]) {
      const cat = String(linha[colCategoria]).trim();
      if (!itensPorCategoria[cat]) itensPorCategoria[cat] = [];
      itensPorCategoria[cat].push({ desc, qtd, valor });
    }
  }

  return {
    nomeLote: String(nomeArquivo).replace(/\.xlsx?$|\.csv$/i, ''),
    nomePlanilha: nomeArquivo,
    origem: 'Mercado Livre',
    localColeta,
    resumoCategorias,
    itensPorCategoria,
    quantidadeTotal,
    valorMercadoTotal,
    classCount,
    gradesData,
    itens,
  };
}

// ── Modelo CASA & VÍDEO ───────────────────────────────────────────────────────
export function lerPlanilhaCasaEVideo(XLSX, workbook, nomeArquivo) {
  const linhas = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1,
    defval: '',
  });
  if (!linhas.length) throw new Error('Planilha Casa & Vídeo vazia.');

  const normalizar = (s) =>
    String(s || '').toUpperCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let idxCab = -1;
  let cab = [];
  for (let i = 0; i < Math.min(10, linhas.length); i++) {
    const n = linhas[i].map(normalizar);
    if (n.some((h) => h.includes('DESCRI') || h.includes('QTD') || h.includes('MATERIAL'))) {
      idxCab = i;
      cab = n;
      break;
    }
  }
  if (idxCab === -1) throw new Error('Cabeçalho não encontrado na planilha Casa & Vídeo.');

  const colDesc = cab.findIndex((h) => h.includes('DESCRI'));
  const colQtd = cab.findIndex((h) => h.includes('QTD') || h.includes('QUANTIDADE'));
  const colValor = cab.findIndex((h) => h.includes('VALOR') || h.includes('VENDA'));
  const colCat = cab.findIndex((h) => h.includes('CATEGOR'));
  if (colDesc === -1 || colValor === -1) {
    throw new Error('Coluna de DESCRIÇÃO ou VALOR não encontrada.');
  }

  const resumo = {};
  const itensPorCategoria = {};
  const itens = [];
  let valorMercadoTotal = 0;
  let quantidadeTotal = 0;

  for (let i = idxCab + 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha || linha.every((c) => c === '' || c == null)) continue;
    const desc = String(linha[colDesc] || '').trim();
    if (!desc) continue;
    const qtd = colQtd >= 0 ? parseInt(linha[colQtd], 10) || 1 : 1;
    const valor = num(colValor >= 0 ? linha[colValor] : 0);
    const cat = colCat >= 0 ? String(linha[colCat] || 'SEM CATEGORIA').trim() : 'SEM CATEGORIA';

    valorMercadoTotal += valor;
    quantidadeTotal += qtd;
    itens.push({ grade: 'A', desc, qtd, valor });
    if (!resumo[cat]) resumo[cat] = { nome: cat, qtd: 0, valor: 0 };
    resumo[cat].qtd += qtd;
    resumo[cat].valor += valor;
    if (!itensPorCategoria[cat]) itensPorCategoria[cat] = [];
    itensPorCategoria[cat].push({ desc, qtd, valor });
  }

  const gradesData = gradesVazias();
  gradesData.A = { qtd: quantidadeTotal, valorMarket: valorMercadoTotal };

  return {
    nomeLote: String(nomeArquivo).replace(/\.xlsx?$|\.csv$/i, ''),
    nomePlanilha: nomeArquivo,
    origem: 'Casa & Vídeo',
    localColeta: 'Será informado após Arremate',
    resumoCategorias: Object.values(resumo),
    itensPorCategoria,
    quantidadeTotal,
    valorMercadoTotal,
    classCount: { A: quantidadeTotal, B: 0, C: 0, D: 0, E: 0, U: 0 },
    gradesData,
    itens,
  };
}