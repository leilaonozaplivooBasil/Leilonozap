import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ─── PONTO 77 — FAXINA DE TÍTULO NA ENTRADA ────────────────────────────────
// ⚠️ ESPELHO de api/_lib/limparTitulo.js. Esta função roda no runtime Deno e
// NÃO consegue importar de api/_lib — por isso a cópia inline. Mudou lá? Muda aqui.
// Regra de ouro: se a limpeza piorar (< 3 caracteres), devolve o ORIGINAL intacto.
const RUIDO_TITULO = [
  /\bfrete\s*gr[aá]tis\b/gi,
  /\bfrete\s*gratis\b/gi,
  /\bpromo[cç][aã]o\b/gi,
  /\boferta\s*(do\s*dia|imperd[ií]vel)?\b/gi,
  // ⚠️ Parcelamento só com contexto EXPLÍCITO — "\d+x" solto destruía
  // quantidade e medida reais ("Kit 4x Parafusos", "15 X 15 Cm").
  /\b\d{1,2}\s*x\s*sem\s*juros\b/gi,
  /\bem\s+\d{1,2}\s*x\b/gi,
  /\bsem\s*juros\b/gi,
  /\bR\$\s*[\d.,]+/gi,
  /\bcompre\s*j[aá]\b/gi,
  /\b[uú]ltimas?\s*unidades?\b/gi,
  /\benvio\s*imediato\b/gi,
  /\bpronta\s*entrega\b/gi,
  /\bnovo\s*lacrado\b/gi,
  /\b(super\s*)?desconto\b/gi,
  /\bmenor\s*pre[cç]o\b/gi,
];
const EMOJI_TITULO = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu;
const CONECTORES_TITULO = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'para', 'em', 'no', 'na', 'a', 'o', 'ou', 'por']);
// Lista fechada de siglas — sem ela "KIT TAÇAS" virava "KIT Taças".
const SIGLAS_TITULO = new Set(['LED', 'USB', 'TV', 'HD', 'PC', 'GB', 'MB', 'TB', 'ML', 'KG', 'CM', 'MM', 'V', 'W', 'A', 'AC', 'DC', 'SSD', 'RGB', 'GPS', 'USD', 'PVC', 'ABS', 'CPU', 'RAM', 'HDMI', 'INOX', 'SMD', 'IP', 'NF']);

function ehSiglaOuCodigo(palavra) {
  const limpa = palavra.replace(/[^\p{L}\p{N}]/gu, '');
  if (!limpa) return true;
  if (/\d/.test(limpa)) return true; // código/medida: M4, 137, 2L, 4K
  if (limpa === limpa.toUpperCase() && SIGLAS_TITULO.has(limpa)) return true;
  if (limpa.length <= 3 && limpa === limpa.toUpperCase() && !/[AEIOUÁÉÍÓÚÃÕÂÊÔ]/i.test(limpa)) return true;
  return false;
}

function capitalizarPalavra(palavra, indice) {
  if (ehSiglaOuCodigo(palavra)) return palavra;
  const min = palavra.toLowerCase();
  if (indice > 0 && CONECTORES_TITULO.has(min)) return min;
  return min.charAt(0).toUpperCase() + min.slice(1);
}

function estaTodoEmCaixaAlta(texto) {
  const letras = texto.match(/\p{L}/gu) || [];
  if (letras.length === 0) return false;
  const maiusculas = letras.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase());
  const palavras = texto.trim().split(/\s+/).length;
  return maiusculas.length / letras.length >= 0.7 && palavras > 3;
}

function limparTitulo(titulo) {
  const original = String(titulo == null ? '' : titulo);
  if (!original.trim()) return original;
  let texto = original.replace(EMOJI_TITULO, ' ');
  for (const padrao of RUIDO_TITULO) texto = texto.replace(padrao, ' ');
  texto = texto.replace(/\s*[|/•·]\s*/g, ' ').replace(/\s+-\s+-\s+/g, ' - ');
  texto = texto.replace(/\s{2,}/g, ' ').trim();
  if (estaTodoEmCaixaAlta(texto)) {
    texto = texto.split(/\s+/).map((p, i) => capitalizarPalavra(p, i)).join(' ');
  }
  texto = texto.replace(/^[\s\-–—:|,.;*+]+/, '').replace(/[\s\-–—:|,;*+]+$/, '').trim();
  texto = texto.replace(/\s{2,}/g, ' ');
  if (texto.length < 3) return original;
  return texto;
}

function cortarNaPalavra(texto, limite) {
  const t = String(texto == null ? '' : texto);
  if (!limite || limite <= 0) return t;
  if (t.length <= limite) return t;
  const fatia = t.slice(0, limite);
  const ultimoEspaco = fatia.lastIndexOf(' ');
  if (ultimoEspaco < 3) return fatia.trim();
  return fatia.slice(0, ultimoEspaco).trim();
}
// ─── fim PONTO 77 ──────────────────────────────────────────────────────────

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
    if (user.role !== 'admin' && user.role !== 'super_admin') {
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

    // Cria um mapa de "já existe" por chave descricao+grade.
    // A grade ORIGINAL (A/B/C/D/E/U) é lida do marcador [grade:X] gravado em notes.
    // Antes reconstituíamos a grade dos qty_* — mas B/C caem ambos em qty_bom e D/E
    // ambos em qty_ruim, então C virava B e E virava D, quebrando o match na retomada.
    const chavesExistentes = new Map();
    for (const p of (produtosExistentes || [])) {
      const m = String(p.notes || '').match(/\[grade:([ABCDEU])\]/);
      let grade;
      if (m) {
        grade = m[1]; // grade original preservada
      } else {
        // Fallback para produtos antigos (sem marcador): reconstitui aproximado
        grade = 'A';
        if ((p.qty_bom || 0) > 0) grade = 'B';
        else if ((p.qty_ruim || 0) > 0) grade = 'D';
        else if ((p.qty_oficina || 0) > 0) grade = 'U';
      }
      const chave = `${String(p.description || '').trim().toLowerCase()}|${grade}`;
      chavesExistentes.set(chave, (chavesExistentes.get(chave) || 0) + 1);
    }

    // Monta registros Product, pulando os que já existem
    const produtos = [];
    let puladosJaExistentes = 0;
    for (const item of itens) {
      const grade = String(item.grade || 'A').toUpperCase();
      // Grade original preservada — o match agora usa o marcador [grade:X] em notes,
      // então NÃO colapsamos mais C->B nem E->D (evita pular/duplicar item errado).
      // PONTO 77: o nome agora é gravado limpo, então a retomada precisa casar
      // pelas DUAS formas — limpa (produtos novos) e original (produtos criados
      // antes desta mudança). Sem isso, retomar um lote antigo duplicaria itens.
      const chaveOriginal = `${String(item.desc || '').trim().toLowerCase()}|${grade}`;
      const chaveLimpa = `${limparTitulo(String(item.desc || '')).trim().toLowerCase()}|${grade}`;
      const chave = (chavesExistentes.get(chaveLimpa) || 0) > 0 ? chaveLimpa : chaveOriginal;
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
        // PONTO 77: nome limpo na gravação (lixo de marketplace fora, CAIXA ALTA
        // arrumada) e corte na palavra inteira — nunca no meio da palavra.
        description: cortarNaPalavra(limparTitulo(String(item.desc || 'Item sem descrição')), 500),
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
        notes: `[grade:${String(item.grade || 'A').toUpperCase()}] Gerado automaticamente do lote: ${lote.nome_lote} (${lote.marketplace})`
      };
      base[campo] = qtd;
      return base;
    });

    // Cria em chunks menores (25) pra reduzir risco de timeout
    const CHUNK_SIZE = 25;
    let criados = 0;
    const erros = [];
    const createdIds = [];
    const notesByCreatedId = new Map();

    for (let i = 0; i < produtosParaCriar.length; i += CHUNK_SIZE) {
      const chunk = produtosParaCriar.slice(i, i + CHUNK_SIZE);
      try {
        const inserted = await base44.asServiceRole.entities.Product.bulkCreate(chunk);
        criados += chunk.length;
        if (Array.isArray(inserted)) for (const p of inserted) if (p?.id) { createdIds.push(p.id); notesByCreatedId.set(p.id, p.notes || ''); }
      } catch (err) {
        erros.push({ chunk_start: i, error: err.message });
        // Fallback: tenta individualmente
        for (const p of chunk) {
          try {
            const one = await base44.asServiceRole.entities.Product.create(p);
            criados += 1;
            if (one?.id) { createdIds.push(one.id); notesByCreatedId.set(one.id, one.notes || p.notes || ''); }
          } catch (e) {
            erros.push({ item: p.description, error: e.message });
          }
        }
      }
    }

    // ── PRECIFICAÇÃO AUTOMÁTICA ──────────────────────────────────
    // Após criar os produtos, chama calculateProductPricing em batches de 5
    // (limite do motor Deno) e grava selling_price_retail + market_value.
    // Se a busca não achar mercado real, marca [needs_review] em notes —
    // NÃO inventa preço (pilar do negócio).
    const MAX_PRICING = 50; // teto de produtos por execução p/ não estourar timeout
    const idsParaPrecificar = createdIds.slice(0, MAX_PRICING);
    const idsRestantes = createdIds.slice(MAX_PRICING);
    let precificados = 0;
    let marcadosReview = 0;

    for (let i = 0; i < idsParaPrecificar.length; i += 5) {
      const batch = idsParaPrecificar.slice(i, i + 5);
      try {
        const res = await base44.asServiceRole.functions.invoke('calculateProductPricing', { product_ids: batch });
        const prods = Array.isArray(res?.products) ? res.products : [];
        for (const p of prods) {
          try {
            if (p.status === 'success' && p.calculated_price > 0) {
              await base44.asServiceRole.entities.Product.update(p.id, {
                selling_price_retail: Number(p.calculated_price),
                market_value: Number(p.market_price || 0),
              });
              precificados++;
            } else {
              // Sem mercado real — marca p/ revisão manual. Não inventa preço.
              const origNotes = notesByCreatedId.get(p.id) || '';
              await base44.asServiceRole.entities.Product.update(p.id, {
                notes: `[needs_review] ${origNotes}`.substring(0, 500),
              });
              marcadosReview++;
            }
          } catch (e) {
            erros.push({ item: p.id, error: `pricing update: ${e.message}` });
          }
        }
      } catch (e) {
        erros.push({ pricing_batch: i, error: e.message });
      }
      // Rate-limit entre batches (motor de busca)
      await new Promise((r) => setTimeout(r, 400));
    }

    // Produtos além do teto — marcar p/ retomar depois (não ficam sem sinal)
    for (const id of idsRestantes) {
      try {
        await base44.asServiceRole.entities.Product.update(id, {
          notes: `[needs_review:auto] ${lote.nome_lote}`.substring(0, 500),
        });
        marcadosReview++;
      } catch { /* não-fatal */ }
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
      precificados,
      marcados_review: marcadosReview,
      erros: erros.length > 0 ? erros : undefined,
      mensagem: completoAgora
        ? `Produtos criados e precificados: ${precificados}. Revisão: ${marcadosReview}.`
        : `Criados ${criados}/${produtosParaCriar.length}. Restam ${produtosParaCriar.length - criados} itens. Clique novamente em "Gerar Produtos no Estoque" para retomar.`
    });
  } catch (error) {
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});