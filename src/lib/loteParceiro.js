// 🔁 Traduz um registro real de LoteRecebido para o formato de leitura usado no
// painel do Parceiro. Somente leitura — nenhuma escrita, nenhum cálculo novo.
//
// Economia do lote = quanto o custo total ficou abaixo do valor de mercado dos
// itens. É a MESMA leitura da metodologia oficial de operacaoNumeros.js
// (compra a ~25% do valor de mercado ⇒ economia de ~75%).

const jsonSeguro = (texto, padrao) => {
  if (!texto) return padrao;
  try {
    const v = typeof texto === 'string' ? JSON.parse(texto) : texto;
    return v ?? padrao;
  } catch {
    return padrao;
  }
};

export function economiaPct(custoTotal, valorMercado) {
  if (!valorMercado || valorMercado <= 0 || !custoTotal || custoTotal <= 0) return null;
  return (1 - custoTotal / valorMercado) * 100;
}

// 📐 Composição padrão da operação no Rio (autorizada por Gabriel em 06/08/2026)
// para os lotes ANTIGOS, cadastrados só com o custo total fechado:
//   frete R$ 2.500 · outros custos R$ 600 · taxa do leiloeiro 7% sobre o arremate
// Logo: custoTotal = arremate × 1,07 + 2.500 + 600  ⇒  arremate = (custoTotal − 3.100) / 1,07
// É apresentação: NADA é gravado no banco, o custo total exibido continua o real.
const PADRAO_RIO = { frete: 2500, outros: 600, taxaPct: 7 };

function comporCustosPadrao(custoTotal) {
  const base = custoTotal - PADRAO_RIO.frete - PADRAO_RIO.outros;
  if (base <= 0) return null;
  const arremate = base / (1 + PADRAO_RIO.taxaPct / 100);
  return {
    arremate,
    taxaPct: PADRAO_RIO.taxaPct,
    taxaValor: arremate * (PADRAO_RIO.taxaPct / 100),
    frete: PADRAO_RIO.frete,
    outros: PADRAO_RIO.outros,
    estimado: true,
  };
}

// 💰 Custos REAIS gravados no campo observacoes do lote no momento da compra, no
// formato "Arremate: R$ X | Taxa: 7% (R$ Y) | Frete: R$ Z | Outros: R$ W".
// É a fonte fiel — só cai na média do Rio quando o lote não tem essa anotação.
// ⚠️ As anotações têm DOIS formatos: brasileiro ("1.885,80") e americano
// ("18666.00", como o Analisador interno gravou). Tratar tudo como brasileiro
// multiplicava o arremate por 100 (era a causa da economia negativa).
const dinheiro = (s) => {
  const t = String(s || '').trim();
  if (!t) return 0;
  if (t.includes(',')) {
    // formato BR: ponto é separador de milhar, vírgula é decimal
    return parseFloat(t.replace(/\./g, '').replace(',', '.')) || 0;
  }
  const partes = t.split('.');
  if (partes.length > 1 && partes[partes.length - 1].length <= 2) {
    // último grupo com 1–2 dígitos ⇒ ponto é decimal (ex: 18666.00)
    return parseFloat(partes.slice(0, -1).join('') + '.' + partes[partes.length - 1]) || 0;
  }
  // sem vírgula e grupos de 3 dígitos ⇒ ponto é milhar (ex: 2.500)
  return parseFloat(t.replace(/\./g, '')) || 0;
};

function custosDasObservacoes(obs) {
  if (!obs) return null;
  const mArr = obs.match(/Arremate:\s*R\$\s*([\d.,]+)/i);
  if (!mArr) return null;
  const arremate = dinheiro(mArr[1]);
  if (arremate <= 0) return null;
  const mTaxa = obs.match(/Taxa:\s*([\d.,]+)\s*%/i);
  const mTaxaVal = obs.match(/Taxa:[^|]*?\(R\$\s*([\d.,]+)\)/i);
  const mFrete = obs.match(/Frete:\s*R\$\s*([\d.,]+)/i);
  const mOutros = obs.match(/Outros:\s*R\$\s*([\d.,]+)/i);
  const taxaPct = mTaxa ? parseFloat(mTaxa[1].replace(',', '.')) || 0 : 0;
  return {
    arremate,
    taxaPct,
    taxaValor: mTaxaVal ? dinheiro(mTaxaVal[1]) : arremate * (taxaPct / 100),
    frete: mFrete ? dinheiro(mFrete[1]) : 0,
    outros: mOutros ? dinheiro(mOutros[1]) : 0,
  };
}

// 📊 Grades e resumo por grade a partir dos itens do lote (A/B/C/D/E/U).
export function derivarGrades(itens) {
  const grades = {
    A: { qtd: 0, valorMarket: 0 },
    B: { qtd: 0, valorMarket: 0 },
    C: { qtd: 0, valorMarket: 0 },
    D: { qtd: 0, valorMarket: 0 },
    E: { qtd: 0, valorMarket: 0 },
    U: { qtd: 0, valorMarket: 0 },
  };
  (itens || []).forEach((item) => {
    const bruta = String(item.grade || 'U').toUpperCase();
    const g = ['A', 'B', 'C', 'D', 'E', 'U'].includes(bruta) ? bruta : 'U';
    grades[g].qtd += Number(item.qtd || item.quantidade || 1);
    grades[g].valorMarket += Number(item.valor || item.valor_mercado || 0);
  });
  return grades;
}

// 📦 Itens individuais do lote, no formato único usado pelo analisador do Parceiro.
function itensDoRegistro(registro) {
  const lista = jsonSeguro(registro.itens_json, []);
  if (!Array.isArray(lista)) return [];
  return lista.map((i) => ({
    grade: String(i.grade || 'U').toUpperCase(),
    desc: i.desc || i.descricao || 'Item',
    qtd: Number(i.qtd || i.quantidade || 1),
    valor: Number(i.valor || i.valor_mercado || 0),
  }));
}

export function normalizarLoteRecebido(registro) {
  let arremate = Number(registro.valor_arremate) || 0;
  let taxaPct = Number(registro.taxa_pct) || 0;
  let frete = Number(registro.frete) || 0;
  let outros = Number(registro.outros) || 0;
  let custoTotal = Number(registro.custo_total) || Number(registro.valor_lote) || 0;
  let estimado = false;

  // 1º) custos reais anotados na compra (fonte fiel)
  const reais = custosDasObservacoes(registro.observacoes);
  if (reais) {
    arremate = reais.arremate;
    taxaPct = reais.taxaPct;
    frete = reais.frete;
    outros = reais.outros;
    custoTotal = arremate + reais.taxaValor + frete + outros;
  }

  // 2º) Sem arremate ou sem taxa em lugar nenhum → composição média do Rio.
  if (custoTotal > 0 && (arremate <= 0 || taxaPct <= 0)) {
    const p = comporCustosPadrao(custoTotal);
    if (p) {
      arremate = p.arremate;
      taxaPct = p.taxaPct;
      frete = p.frete;
      outros = p.outros;
      estimado = true;
    }
  }
  const itens = itensDoRegistro(registro);
  const valorMercado =
    Number(registro.valor_mercado_total) || itens.reduce((s, i) => s + i.valor, 0);
  const quantidade =
    Number(registro.quantidade_total) || itens.reduce((s, i) => s + i.qtd, 0);

  return {
    itens,
    id: registro.id,
    nome: registro.nome_lote || 'Lote sem nome',
    origem: registro.origem || registro.marketplace || '—',
    marketplace: registro.marketplace,
    data: registro.data_recebimento || registro.created_date,
    arremate,
    taxaPct,
    taxaValor: arremate * (taxaPct / 100),
    frete,
    outros,
    custoTotal,
    valorMercado,
    quantidade,
    custoUnitario: quantidade > 0 ? custoTotal / quantidade : 0,
    custosEstimados: estimado,
    localColeta: registro.local_coleta || null,
    economiaPct: economiaPct(custoTotal, valorMercado),
    grades: jsonSeguro(registro.grades_json, null) || derivarGrades(itens),
    categorias: jsonSeguro(registro.categorias_json, []),
    itensPorCategoria: {},
    produtosGerados: Number(registro.produtos_gerados_count) || 0,
  };
}

// 📄 Mesmo formato, agora vindo de uma planilha analisada na hora (consulta).
export function loteDaPlanilha(lidoDaPlanilha, custos) {
  const arremate = Number(custos.arremate) || 0;
  const taxaPct = Number(custos.taxaPct) || 0;
  const frete = Number(custos.frete) || 0;
  const outros = Number(custos.outros) || 0;
  const taxaValor = arremate * (taxaPct / 100);
  const custoTotal = arremate + taxaValor + frete + outros;
  const quantidade = lidoDaPlanilha.quantidadeTotal || 0;

  return {
    id: 'planilha',
    itens: lidoDaPlanilha.itens || [],
    nome: lidoDaPlanilha.nomeLote,
    origem: lidoDaPlanilha.origem,
    data: null,
    arremate,
    taxaPct,
    taxaValor,
    frete,
    outros,
    custoTotal,
    valorMercado: lidoDaPlanilha.valorMercadoTotal || 0,
    quantidade,
    custoUnitario: quantidade > 0 ? custoTotal / quantidade : 0,
    localColeta: lidoDaPlanilha.localColeta,
    economiaPct: economiaPct(custoTotal, lidoDaPlanilha.valorMercadoTotal),
    grades: lidoDaPlanilha.gradesData,
    categorias: lidoDaPlanilha.resumoCategorias,
    itensPorCategoria: lidoDaPlanilha.itensPorCategoria,
  };
}