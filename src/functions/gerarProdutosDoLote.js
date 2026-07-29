import { base44 } from '@/api/base44Client';

/**
 * Gera produtos (entidade Product) a partir de um LoteRecebido.
 *
 * Reimplementação NO CLIENTE da antiga Backend Function homônima.
 * Motivo: em produção (Vercel) não existe rota /api/functions/gerarProdutosDoLote,
 * então a chamada voltava { error: 'not_implemented' }. Aqui usamos o adapter de
 * entidade (base44.entities.*), que já roteia as escritas de admin/super_admin
 * pela rota service_role (entityWrite) — mesmo caminho que faz a exclusão de lote
 * funcionar em produção.
 *
 * Regras preservadas da versão original:
 * - Lote precisa ter status 'enviado_ao_estoque'
 * - Custo unitário = Custo Médio Ponderado (custo_total / quantidade_total)
 * - Anti-duplicação por chave descricao+grade, lendo a grade original do marcador [grade:X] em notes
 * - Criação em chunks (25) com fallback individual
 * - Marca o lote como 'convertido' só quando criou tudo (permite retomar geração parcial)
 *
 * Retorno normalizado em { data } — a página EstoqueLotes.jsx lê res?.data || res.
 */
export async function gerarProdutosDoLote({ lote_id } = {}) {
  if (!lote_id) return { data: { status: 'error', error: 'lote_id é obrigatório' } };

  // Busca o lote
  let lote;
  try {
    const lotes = await base44.entities.LoteRecebido.filter({ id: lote_id });
    if (!lotes || lotes.length === 0) return { data: { status: 'error', error: 'Lote não encontrado' } };
    lote = lotes[0];
  } catch (e) {
    return { data: { status: 'error', error: 'Lote não encontrado: ' + (e?.message || e) } };
  }

  // Validações
  if (lote.status !== 'enviado_ao_estoque') {
    return { data: { status: 'error', error: `Lote precisa estar com status 'enviado_ao_estoque'. Status atual: '${lote.status}'` } };
  }
  if (!lote.itens_json) {
    return { data: { status: 'error', error: 'Lote não possui itens salvos. Reimporte a planilha.' } };
  }

  // Parse dos itens
  let itens = [];
  try {
    itens = JSON.parse(lote.itens_json);
  } catch (e) {
    return { data: { status: 'error', error: 'itens_json inválido: ' + (e?.message || e) } };
  }
  if (!Array.isArray(itens) || itens.length === 0) {
    return { data: { status: 'error', error: 'Nenhum item para gerar' } };
  }

  // Custo Médio Ponderado
  const quantidadeTotal = lote.quantidade_total || itens.reduce((s, i) => s + (i.qtd || 1), 0);
  const custoTotal = lote.custo_total || lote.valor_lote || 0;
  const custoUnitarioMedio = quantidadeTotal > 0 ? custoTotal / quantidadeTotal : 0;

  const mapGradeToField = (grade) => {
    const g = String(grade || 'A').toUpperCase();
    if (g === 'A') return 'qty_perfeito';
    if (g === 'B' || g === 'C') return 'qty_bom';
    if (g === 'D' || g === 'E') return 'qty_ruim';
    if (g === 'U') return 'qty_oficina';
    return 'qty_perfeito';
  };

  const hoje = new Date().toISOString().split('T')[0];
  const depositoDestino = lote.deposito_destino || 'Bangu';

  // Produtos já criados deste lote (anti-duplicação / retomada)
  const produtosExistentes = await base44.entities.Product.filter({ lot: lote.nome_lote }, '-created_date', 5000);

  const chavesExistentes = new Map();
  for (const p of (produtosExistentes || [])) {
    const m = String(p.notes || '').match(/\[grade:([ABCDEU])\]/);
    let grade;
    if (m) {
      grade = m[1];
    } else {
      grade = 'A';
      if ((p.qty_bom || 0) > 0) grade = 'B';
      else if ((p.qty_ruim || 0) > 0) grade = 'D';
      else if ((p.qty_oficina || 0) > 0) grade = 'U';
    }
    const chave = `${String(p.description || '').trim().toLowerCase()}|${grade}`;
    chavesExistentes.set(chave, (chavesExistentes.get(chave) || 0) + 1);
  }

  // Filtra itens pendentes (pula os já existentes)
  const produtos = [];
  let puladosJaExistentes = 0;
  for (const item of itens) {
    const grade = String(item.grade || 'A').toUpperCase();
    const chave = `${String(item.desc || '').trim().toLowerCase()}|${grade}`;
    if (chavesExistentes.has(chave) && chavesExistentes.get(chave) > 0) {
      chavesExistentes.set(chave, chavesExistentes.get(chave) - 1);
      puladosJaExistentes++;
      continue;
    }
    produtos.push(item);
  }

  if (produtos.length === 0) {
    return {
      data: {
        status: 'success',
        lote_id: lote.id,
        lote_nome: lote.nome_lote,
        produtos_criados: 0,
        ja_existentes: puladosJaExistentes,
        total_acumulado: lote.produtos_gerados_count || 0,
        mensagem: 'Todos os produtos deste lote já estão no estoque. Nada a criar.',
        custo_unitario_medio: Number(custoUnitarioMedio.toFixed(2)),
        deposito: depositoDestino,
      },
    };
  }

  // Monta registros Product
  const produtosParaCriar = produtos.map((item) => {
    const qtd = item.qtd || 1;
    const campo = mapGradeToField(item.grade);
    const base = {
      date: hoje,
      lot: lote.nome_lote,
      description: String(item.desc || 'Item sem descrição').substring(0, 500),
      quantity: qtd,
      qty_perfeito: 0,
      qty_bom: 0,
      qty_ruim: 0,
      qty_oficina: 0,
      quantity_sold: 0,
      cost_price: Number(custoUnitarioMedio.toFixed(2)),
      market_value: Number((item.valor_mercado || 0).toFixed(2)),
      status: 'ESTOQUE',
      catalog_active: false,
      deposit_name: depositoDestino,
      notes: `[grade:${String(item.grade || 'A').toUpperCase()}] Gerado automaticamente do lote: ${lote.nome_lote} (${lote.marketplace})`,
    };
    base[campo] = qtd;
    return base;
  });

  // Cria em chunks de 25 (fallback individual em caso de erro)
  const CHUNK_SIZE = 25;
  let criados = 0;
  const erros = [];

  for (let i = 0; i < produtosParaCriar.length; i += CHUNK_SIZE) {
    const chunk = produtosParaCriar.slice(i, i + CHUNK_SIZE);
    try {
      await base44.entities.Product.bulkCreate(chunk);
      criados += chunk.length;
    } catch (err) {
      erros.push({ chunk_start: i, error: err?.message || String(err) });
      for (const p of chunk) {
        try {
          await base44.entities.Product.create(p);
          criados += 1;
        } catch (e) {
          erros.push({ item: p.description, error: e?.message || String(e) });
        }
      }
    }
  }

  // Atualiza o lote
  const totalCriadoAcumulado = (lote.produtos_gerados_count || 0) + criados;
  const completoAgora = erros.length === 0 && criados === produtosParaCriar.length;

  await base44.entities.LoteRecebido.update(lote.id, {
    status: completoAgora ? 'convertido' : lote.status,
    produtos_gerados: completoAgora ? true : (lote.produtos_gerados || false),
    produtos_gerados_em: new Date().toISOString(),
    produtos_gerados_count: totalCriadoAcumulado,
  });

  return {
    data: {
      status: completoAgora ? 'success' : 'partial',
      lote_id: lote.id,
      lote_nome: lote.nome_lote,
      produtos_criados: criados,
      ja_existentes: puladosJaExistentes,
      total_acumulado: totalCriadoAcumulado,
      custo_unitario_medio: Number(custoUnitarioMedio.toFixed(2)),
      custo_total: custoTotal,
      quantidade_total: quantidadeTotal,
      deposito: depositoDestino,
      erros: erros.length > 0 ? erros : undefined,
      mensagem: completoAgora
        ? 'Todos os produtos foram criados com sucesso.'
        : `Criados ${criados}/${produtosParaCriar.length}. Restam ${produtosParaCriar.length - criados} itens. Clique novamente em "Gerar Produtos no Estoque" para retomar.`,
    },
  };
}