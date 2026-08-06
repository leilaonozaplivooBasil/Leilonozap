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

export function normalizarLoteRecebido(registro) {
  const arremate = Number(registro.valor_arremate) || 0;
  const taxaPct = Number(registro.taxa_pct) || 0;
  const frete = Number(registro.frete) || 0;
  const outros = Number(registro.outros) || 0;
  const custoTotal = Number(registro.custo_total) || Number(registro.valor_lote) || 0;
  const valorMercado = Number(registro.valor_mercado_total) || 0;
  const quantidade = Number(registro.quantidade_total) || 0;

  return {
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
    localColeta: registro.local_coleta || null,
    economiaPct: economiaPct(custoTotal, valorMercado),
    grades: jsonSeguro(registro.grades_json, null),
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