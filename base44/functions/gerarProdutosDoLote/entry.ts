import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Gera produtos (entidade Product) a partir de um LoteRecebido.
 *
 * Regras:
 * - Apenas admin pode executar
 * - Lote precisa ter status 'enviado_ao_estoque'
 * - Lote não pode ter produtos_gerados = true (evita duplicação)
 * - Custo unitário usa Custo Médio Ponderado (valor_lote / quantidade_total)
 * - Itens repetidos JÁ devem vir agrupados no itens_json
 * - Criação em bulk com chunks de 50 para não travar o banco
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { lote_id } = await req.json();
    if (!lote_id) {
      return Response.json({ error: 'lote_id é obrigatório' }, { status: 400 });
    }

    // Busca o lote (usa try/catch pra tratar ID inválido como "não encontrado")
    let lote;
    try {
      const lotes = await base44.asServiceRole.entities.LoteRecebido.filter({ id: lote_id });
      if (!lotes || lotes.length === 0) {
        return Response.json({ error: 'Lote não encontrado' }, { status: 404 });
      }
      lote = lotes[0];
    } catch (e) {
      return Response.json({ error: 'Lote não encontrado', detail: e.message }, { status: 404 });
    }

    // Validações de segurança
    if (lote.status !== 'enviado_ao_estoque') {
      return Response.json({
        error: `Lote precisa estar com status 'enviado_ao_estoque'. Status atual: '${lote.status}'`
      }, { status: 400 });
    }
    // NÃO bloqueia se produtos_gerados=true — ao invés disso, detecta o que falta e completa
    // Isso permite retomar uma geração interrompida sem duplicar produtos
    if (!lote.itens_json) {
      return Response.json({
        error: 'Lote não possui itens_json salvos. Reimporte a planilha.'
      }, { status: 400 });
    }

    // Parse dos itens
    let itens = [];
    try {
      itens = JSON.parse(lote.itens_json);
    } catch (e) {
      return Response.json({ error: 'itens_json inválido: ' + e.message }, { status: 400 });
    }

    if (!Array.isArray(itens) || itens.length === 0) {
      return Response.json({ error: 'Nenhum item para gerar' }, { status: 400 });
    }

    // Cálculo do Custo Médio Ponderado (CMV)
    const quantidadeTotal = lote.quantidade_total || itens.reduce((s, i) => s + (i.qtd || 1), 0);
    const custoTotal = lote.custo_total || lote.valor_lote || 0;
    const custoUnitarioMedio = quantidadeTotal > 0 ? custoTotal / quantidadeTotal : 0;

    // Mapeia grade -> campo qty_*
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

    // Busca produtos JÁ criados deste lote para detectar o que falta
    // (evita duplicar em caso de re-execução após falha parcial)
    const produtosExistentes = await base44.asServiceRole.entities.Product.filter({
      lot: lote.nome_lote
    }, '-created_date', 5000);

    // Cria um mapa de "já existe" por chave descricao+grade
    const chavesExistentes = new Map();
    for (const p of (produtosExistentes || [])) {
      // reconstitui a "grade" a partir dos qty_* pra fazer match com o item da planilha
      let grade = 'A';
      if ((p.qty_bom || 0) > 0) grade = 'B';
      else if ((p.qty_ruim || 0) > 0) grade = 'D';
      else if ((p.qty_oficina || 0) > 0) grade = 'U';
      const chave = `${String(p.description || '').trim().toLowerCase()}|${grade}`;
      chavesExistentes.set(chave, (chavesExistentes.get(chave) || 0) + 1);
    }

    // Monta registros Product, pulando os que já existem
    const produtos = [];
    let puladosJaExistentes = 0;
    for (const item of itens) {
      const grade = String(item.grade || 'A').toUpperCase();
      // Normaliza grade pra casar com a reconstituição (B/C -> B, D/E -> D)
      let gradeNormalizada = grade;
      if (grade === 'C') gradeNormalizada = 'B';
      if (grade === 'E') gradeNormalizada = 'D';
      const chave = `${String(item.desc || '').trim().toLowerCase()}|${gradeNormalizada}`;
      if (chavesExistentes.has(chave) && chavesExistentes.get(chave) > 0) {
        chavesExistentes.set(chave, chavesExistentes.get(chave) - 1);
        puladosJaExistentes++;
        continue;
      }
      produtos.push(item);
    }

    // Se nada pra criar, retorna sucesso informando que já está completo
    if (produtos.length === 0) {
      return Response.json({
        status: 'success',
        lote_id: lote.id,
        lote_nome: lote.nome_lote,
        produtos_criados: 0,
        ja_existentes: puladosJaExistentes,
        mensagem: 'Todos os produtos deste lote já estão no estoque. Nada a criar.',
        custo_unitario_medio: Number(custoUnitarioMedio.toFixed(2)),
        deposito: depositoDestino
      });
    }

    // Converte os itens pendentes em registros Product
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
        notes: `Gerado automaticamente do lote: ${lote.nome_lote} (${lote.marketplace})`
      };
      base[campo] = qtd;
      return base;
    });

    // Cria em chunks menores (25) pra reduzir risco de timeout
    const CHUNK_SIZE = 25;
    let criados = 0;
    const erros = [];

    for (let i = 0; i < produtosParaCriar.length; i += CHUNK_SIZE) {
      const chunk = produtosParaCriar.slice(i, i + CHUNK_SIZE);
      try {
        await base44.asServiceRole.entities.Product.bulkCreate(chunk);
        criados += chunk.length;
      } catch (err) {
        erros.push({ chunk_start: i, error: err.message });
        // Fallback: tenta individualmente
        for (const p of chunk) {
          try {
            await base44.asServiceRole.entities.Product.create(p);
            criados += 1;
          } catch (e) {
            erros.push({ item: p.description, error: e.message });
          }
        }
      }
    }

    // Marca o lote como produtos_gerados SOMENTE se criou tudo com sucesso
    const totalCriadoAcumulado = (lote.produtos_gerados_count || 0) + criados;
    const completoAgora = erros.length === 0 && criados === produtosParaCriar.length;

    await base44.asServiceRole.entities.LoteRecebido.update(lote.id, {
      status: completoAgora ? 'convertido' : lote.status,
      produtos_gerados_em: new Date().toISOString(),
      produtos_gerados_count: totalCriadoAcumulado
    });

    return Response.json({
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
        : `Criados ${criados}/${produtosParaCriar.length}. Restam ${produtosParaCriar.length - criados} itens. Clique novamente em "Gerar Produtos no Estoque" para retomar.`
    });
  } catch (error) {
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});