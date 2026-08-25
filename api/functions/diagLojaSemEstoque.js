// diagLojaSemEstoque — O QUE ESTÁ À VENDA NA LOJA SEM TER PEÇA PARA ENTREGAR.
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE ISTO EXISTE
// ══════════════════════════════════════════════════════════════════════════════
// O sistema guarda a quantidade de um produto em DOIS lugares que não conversam:
//
//   1. `products.quantity`  → é o que a loja usa. É o que aparece como
//      "Estoque: 3" na vitrine, é o que libera o botão COMPRAR, e é o único
//      que a venda desconta (RPC baixar_estoque_central, PONTO 125).
//
//   2. `qty_perfeito` + `qty_bom` + `qty_oficina` + `qty_ruim` → é a contagem
//      física, por classificação de estado da peça. É o que a Gestão de
//      Produtos mostra. NENHUMA venda mexe nesses campos — eles só mudam
//      quando alguém digita na tela.
//
// Resultado: os dois se afastam sozinhos, para sempre. Cada venda derruba o
// primeiro e não encosta no segundo.
//
// Quando `quantity` está maior que a contagem física, a loja está oferecendo
// peça que pode não existir no depósito. Quando está menor, a loja esconde
// peça que existe — venda perdida.
//
// ══════════════════════════════════════════════════════════════════════════════
// O QUE ESTE RELATÓRIO NÃO FAZ — E POR QUÊ
// ══════════════════════════════════════════════════════════════════════════════
// Ele NÃO decide sozinho quem está certo, porque não dá para decidir por código:
//
//   • Produto cadastrado pela tela "Adicionar Produto ao Catálogo" grava
//     `quantity` e NUNCA grava `qty_*`. Para esse, contagem física zerada é o
//     normal — não é divergência.
//   • Produto gerado a partir de LOTE (gerarProdutosDoLote) grava os dois.
//     Para esse, contagem física zerada com `quantity` positivo é divergência
//     de verdade.
//
// Por isso a resposta separa os dois casos em vez de misturar tudo numa lista
// só. Uma regra automática do tipo "sem classificação = sem estoque" esconderia
// produto bom da loja.
//
// ══════════════════════════════════════════════════════════════════════════════
// SEGURANÇA
// ══════════════════════════════════════════════════════════════════════════════
// • Protegido pela mesma DIAG_KEY das outras ferramentas de diagnóstico.
// • SOMENTE LEITURA. Não faz UPDATE, não faz INSERT, não tira nada da loja.
//   Nenhum produto muda de estado por causa desta chamada.
//
// ══════════════════════════════════════════════════════════════════════════════
// COMO USAR
// ══════════════════════════════════════════════════════════════════════════════
//   { "key": "<DIAG_KEY>" }                      → resumo + as listas
//   { "key": "<DIAG_KEY>", "detalhe": true }     → com o nome de cada produto
//   { "key": "<DIAG_KEY>", "limite": 50 }        → quantos itens por lista

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
  });
}

// Lê tudo, de mil em mil. A base tem mais produto do que cabe numa página.
//
// 🔴 CORRIGIDO 25/08/2026 — A PRIMEIRA VERSÃO PAGINAVA ERRADO.
// Ela ordenava por `updated_date`. Milhares de produtos foram gravados no mesmo
// segundo (importação de lote grava tudo de uma vez), e quando o valor da
// ordenação empata o banco não garante ordem estável entre uma página e outra:
// o mesmo produto vinha duas vezes e outro nunca vinha.
//
// Deu para ver na resposta real: "Cinta Modeladora", "TOALHA UNID." e "Jogo De
// Lençol" apareceram duplicados, com o MESMO id. Se duplicou, também faltou.
//
// A ordenação passa a ser por `id`, que é único — não empata, não embaralha. E
// a lista ainda passa por uma limpeza de id repetido, como segunda rede.
async function lerTudo(caminhoBase) {
  const porId = new Map();
  const PAGINA = 1000;
  for (let inicio = 0; inicio < 50000; inicio += PAGINA) {
    const r = await sb(`${caminhoBase}&order=id.asc&limit=${PAGINA}&offset=${inicio}`);
    if (!r.ok) break;
    const lote = await r.json().catch(() => []);
    if (!Array.isArray(lote) || !lote.length) break;
    for (const linha of lote) porId.set(linha.id ?? `${porId.size}`, linha);
    if (lote.length < PAGINA) break;
  }
  return [...porId.values()];
}

const num = (v) => Number(v) || 0;
const fisico = (p) => num(p.qty_perfeito) + num(p.qty_bom) + num(p.qty_oficina) + num(p.qty_ruim);

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const body = typeof req.body === 'object' && req.body ? req.body : {};
    if (!process.env.DIAG_KEY || body.key !== process.env.DIAG_KEY) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (!SUPABASE_URL || !SR) return res.status(500).json({ error: 'Config do servidor ausente' });

    const limite = Math.min(500, Math.max(5, parseInt(body.limite) || 40));
    const detalhe = body.detalhe === true;

    const colunas = 'id,description,lot,quantity,qty_perfeito,qty_bom,qty_oficina,qty_ruim,catalog_active,status,price_catalog,selling_price_retail,updated_date';
    const produtos = await lerTudo(`products?select=${colunas}`);

    // Reserva ativa = peça já prometida a quem está pagando agora (PONTO 126).
    // A vitrine mostra `quantity` cru, sem descontar isso.
    const agora = new Date().toISOString();
    // `id` entra no select porque a leitura pagina e desduplica por ele.
    const reservas = await lerTudo(
      `estoque_reservas?select=id,product_id,qty&status=eq.ativa&owner_id=is.null&expira_em=gt.${encodeURIComponent(agora)}`
    );
    const reservadoPorProduto = {};
    for (const r of reservas) {
      reservadoPorProduto[r.product_id] = (reservadoPorProduto[r.product_id] || 0) + num(r.qty);
    }

    const naVitrine = produtos.filter((p) => p.catalog_active === true);

    const cartao = (p) => ({
      id: p.id,
      ...(detalhe ? { produto: String(p.description || '').slice(0, 90) } : {}),
      lote: p.lot || null,
      loja_mostra: p.quantity === null ? 'sem quantidade' : num(p.quantity),
      contagem_fisica: fisico(p),
      reservado_agora: reservadoPorProduto[p.id] || 0,
      preco: num(p.price_catalog) || num(p.selling_price_retail) || 0,
      status: p.status || null,
    });

    // ── 1. O caso grave: veio de lote (logo TEM classificação preenchida no
    //      cadastro), está à venda, mas a contagem física está zerada.
    const vendendoSemPeca = naVitrine
      .filter((p) => num(p.quantity) > 0 && fisico(p) === 0 && p.lot)
      .sort((a, b) => num(b.quantity) - num(a.quantity));

    // ── 2. Mesma coisa, mas SEM lote: cadastro manual, que nunca preenche
    //      classificação. Aqui zerado é o esperado — não conclua nada sozinho.
    const semClassificacaoPorCadastro = naVitrine
      .filter((p) => num(p.quantity) > 0 && fisico(p) === 0 && !p.lot);

    // ── 3. A loja mostra MENOS do que existe fisicamente: venda perdida.
    const escondendoPeca = produtos
      .filter((p) => fisico(p) > num(p.quantity))
      .sort((a, b) => (fisico(b) - num(b.quantity)) - (fisico(a) - num(a.quantity)));

    // ── 4. Está comprável, mas a última peça já está reservada por quem está
    //      pagando agora. O próximo cliente coloca no carrinho e leva não no
    //      fechamento. Não perde dinheiro, mas frustra.
    const jaPrometido = naVitrine
      .filter((p) => num(p.quantity) > 0 && num(p.quantity) - (reservadoPorProduto[p.id] || 0) <= 0);

    // ── 4b. O cadastro diz VENDIDO e o produto continua comprável na loja.
    //      Apareceu de verdade na primeira rodada: "Bike Scooter Elétrica
    //      Harley 137" (VENDIDO, R$ 4.075) e "MOEDOR DE CARNE" (VENDIDO PIX)
    //      seguiam à venda. Aqui o próprio sistema se contradiz — não é
    //      divergência entre duas contagens, é status contra quantidade.
    const vendidoMasAindaNaLoja = naVitrine.filter(
      (p) => /VENDID/i.test(String(p.status || '')) && num(p.quantity) > 0
    );

    // ── 5. Está na vitrine com quantidade zerada/nula: aparece como ESGOTADO.
    //      Visível de propósito (decisão registrada em Catalog.jsx), mas se for
    //      muito, é sujeira na loja.
    const esgotadoNaVitrine = naVitrine.filter((p) => p.quantity === null || num(p.quantity) <= 0);

    // ── 6. Fora da loja mesmo tendo peça: pode ser esquecimento de publicar.
    const foraDaLojaComPeca = produtos
      .filter((p) => p.catalog_active !== true && (num(p.quantity) > 0 || fisico(p) > 0));

    return res.status(200).json({
      quando: agora,
      somente_leitura: 'Nada foi alterado. Nenhum produto saiu ou entrou na loja por causa desta consulta.',

      panorama: {
        produtos_no_total: produtos.length,
        na_vitrine: naVitrine.length,
        reservas_ativas_agora: reservas.length,
      },

      // 🔴 É AQUI QUE ESTÁ O PROBLEMA QUE VOCÊ PERGUNTOU
      vendendo_sem_peca_fisica: {
        quantos: vendendoSemPeca.length,
        o_que_e: 'Produto que veio de LOTE, está à venda na loja, mas a contagem física por classificação está zerada. Como o lote preenche essa contagem no cadastro, zerada aqui é divergência de verdade — a loja pode estar vendendo o que não existe no depósito.',
        o_que_fazer: 'Conferir estas peças no depósito. Se não existirem, zerar a quantidade na Gestão de Produtos — não pela loja.',
        itens: vendendoSemPeca.slice(0, limite).map(cartao),
      },

      sem_classificacao_por_cadastro: {
        quantos: semClassificacaoPorCadastro.length,
        o_que_e: 'Produto cadastrado direto no catálogo. Essa tela grava a quantidade e NUNCA grava a classificação — então contagem física zerada aqui é o normal, não é erro.',
        o_que_fazer: 'Nada automático. Só entra na conferência se você desconfiar de algum item específico.',
        itens: detalhe ? semClassificacaoPorCadastro.slice(0, limite).map(cartao) : '(mande "detalhe": true para ver a lista)',
      },

      loja_escondendo_peca_que_existe: {
        quantos: escondendoPeca.length,
        o_que_e: 'A contagem física é MAIOR que o que a loja mostra. Isso é venda perdida: a peça está no depósito e o cliente não consegue comprar.',
        itens: escondendoPeca.slice(0, limite).map(cartao),
      },

      ultima_peca_ja_prometida: {
        quantos: jaPrometido.length,
        o_que_e: 'Aparece comprável, mas a peça já está reservada por alguém que está pagando neste momento. O próximo cliente só descobre no fechamento.',
        itens: jaPrometido.slice(0, limite).map(cartao),
      },

      marcado_vendido_e_ainda_a_venda: {
        quantos: vendidoMasAindaNaLoja.length,
        o_que_e: 'O cadastro do produto está marcado como VENDIDO, mas a quantidade continua positiva e ele segue comprável na loja. Aqui não são duas contagens divergindo — é o próprio cadastro se contradizendo.',
        o_que_fazer: 'Conferir um a um. Se foi vendido mesmo, zerar a quantidade na Gestão de Produtos.',
        itens: vendidoMasAindaNaLoja.slice(0, limite).map(cartao),
      },

      esgotado_aparecendo_na_vitrine: {
        quantos: esgotadoNaVitrine.length,
        o_que_e: 'Está na loja com quantidade zerada — aparece com o selo ESGOTADO e sem botão de comprar. É de propósito (decisão registrada no código), mas em volume vira sujeira na vitrine.',
        itens: detalhe ? esgotadoNaVitrine.slice(0, limite).map(cartao) : '(mande "detalhe": true para ver a lista)',
      },

      fora_da_loja_mesmo_tendo_peca: {
        quantos: foraDaLojaComPeca.length,
        o_que_e: 'Tem peça mas não está publicado. Pode ser esquecimento de publicar, ou peça que saiu da loja de propósito.',
        itens: detalhe ? foraDaLojaComPeca.slice(0, limite).map(cartao) : '(mande "detalhe": true para ver a lista)',
      },
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
