// ─────────────────────────────────────────────
// FUNÇÃO: auditarFase1Marco
// O QUE FAZ: BLOCO MARCO-AGOSTO FASE 1 — responde 4 perguntas antes de
//            qualquer exclusão:
//            1) de onde vem a diferença entre comissões de agosto e saldos
//            2) por que total_commissions_generated está zerado
//            3) as comissões "fora da loja" são de leilão ou de venda apagada
//            4) qual é exatamente o conjunto A PRESERVAR
// USADO POR: auditoria interna autorizada pelo dono (04/08/2026)
// ÚLTIMA MUDANÇA: 04/08/2026 (redeploy)
// ─────────────────────────────────────────────
//
// 🛡️ 100% LEITURA. Só GET. Nenhum POST/PATCH/DELETE/RPC neste arquivo.
// 📕 Documento soberano: docs/VERDADE.md
//
// PARÂMETRO: { secao: 'DIVERGENCIA' | 'GERADO' | 'ORFAS' | 'PRESERVAR' | 'RESUMO' }
// (o retorno completo estoura o limite de exibição — sempre pedir por seção)

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const soma = (rows: any[], c: string) => r2(rows.reduce((s: number, x: any) => s + (Number(x[c]) || 0), 0));

async function get(path: string) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, {
    method: 'GET',
    headers: { apikey: SR, Authorization: `Bearer ${SR}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
  return await res.json();
}

// Paginação obrigatória: commission_records tem ~10 mil linhas.
async function tudo(tabela: string, select: string) {
  const out: any[] = [];
  const passo = 1000;
  for (let off = 0; off < 60000; off += passo) {
    const pag = await get(`${tabela}?select=${select}&order=id.asc&limit=${passo}&offset=${off}`);
    out.push(...pag);
    if (!Array.isArray(pag) || pag.length < passo) break;
  }
  return out;
}

Deno.serve(async (req) => {
  try {
    if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    const body = await req.json().catch(() => ({}));
    const secao = String(body.secao || 'RESUMO').toUpperCase();

    const comissoes = await tudo(
      'commission_records',
      'id,sale_id,user_id,user_name,role,amount,status,created_date,sale_type,is_sample'
    );
    const vendas = await tudo(
      'catalog_sales',
      'id,kind,status,total_amount,created_date,mp_payment_id,stripe_payment_intent,stripe_session_id'
    );
    const users = await tudo(
      'app_users',
      'id,full_name,email,commission_balance,catalog_commission_balance,total_commissions_generated'
    );

    const dinheiroReal = (v: any) => Boolean(v.mp_payment_id || v.stripe_payment_intent || v.stripe_session_id);
    const paga = (v: any) => ['paid', 'shipped', 'delivered'].includes(String(v.status || '').toLowerCase());
    const vendasReais = vendas.filter((v: any) => dinheiroReal(v) && paga(v));
    const idsReais = new Set(vendasReais.map((v: any) => v.id));
    const idsVendas = new Set(vendas.map((v: any) => v.id));

    // Conjunto A PRESERVAR: comissões cuja venda-mãe tem dinheiro real confirmado.
    const preservar = comissoes.filter((c: any) => idsReais.has(c.sale_id));
    const orfas = comissoes.filter((c: any) => !idsVendas.has(c.sale_id));

    const nome = (id: string) => users.find((u: any) => u.id === id)?.full_name || '(conta não encontrada)';
    const saldoAtual = (u: any) => r2((Number(u.commission_balance) || 0) + (Number(u.catalog_commission_balance) || 0));

    // ─── 1) DIVERGÊNCIA CONTA POR CONTA ───
    if (secao === 'DIVERGENCIA' || secao === 'RESUMO') {
      const porUser: Record<string, number> = {};
      for (const c of preservar) {
        porUser[c.user_id] = r2((porUser[c.user_id] || 0) + (Number(c.amount) || 0));
      }
      const todosIds = new Set([...Object.keys(porUser), ...users.filter((u: any) => saldoAtual(u) > 0).map((u: any) => u.id)]);
      const linhas = [...todosIds]
        .map((id) => {
          const u = users.find((x: any) => x.id === id);
          const gerado = r2(porUser[id] || 0);
          const saldo = u ? saldoAtual(u) : 0;
          return { conta: nome(id), user_id: id, gerado_agosto_real: gerado, saldo_hoje: saldo, diferenca: r2(saldo - gerado) };
        })
        .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));

      const res = {
        pergunta: 'De onde vem a diferença entre comissões de agosto (venda real) e os saldos de hoje?',
        total_gerado_agosto_real: soma(preservar, 'amount'),
        total_saldo_hoje: r2(users.reduce((s: number, u: any) => s + saldoAtual(u), 0)),
        diferenca_global: r2(users.reduce((s: number, u: any) => s + saldoAtual(u), 0) - soma(preservar, 'amount')),
        contas_com_saldo_MAIOR_que_gerado: linhas.filter((l) => l.diferenca > 0.009).length,
        contas_com_saldo_MENOR_que_gerado: linhas.filter((l) => l.diferenca < -0.009).length,
        contas_batendo_exato: linhas.filter((l) => Math.abs(l.diferenca) <= 0.009).length,
        conta_por_conta: linhas.slice(0, 40),
        leitura:
          'diferenca > 0 = conta tem saldo que NÃO vem de venda real de agosto (resíduo de teste). ' +
          'diferenca < 0 = comissão foi gerada mas NÃO está no saldo (foi zerada, sacada ou nunca creditada).',
      };
      if (secao === 'DIVERGENCIA') return Response.json({ success: true, item_1_divergencia: res });
    }

    // ─── 2) total_commissions_generated ───
    if (secao === 'GERADO') {
      const nulos = users.filter((u: any) => u.total_commissions_generated === null).length;
      const zeros = users.filter((u: any) => Number(u.total_commissions_generated) === 0 && u.total_commissions_generated !== null).length;
      const positivos = users.filter((u: any) => Number(u.total_commissions_generated) > 0);
      return Response.json({
        success: true,
        item_2_total_commissions_generated: {
          pergunta: 'Por que total_commissions_generated está R$ 0,00 em todas as contas?',
          contas: users.length,
          valor_NULO_no_banco: nulos,
          valor_ZERO_no_banco: zeros,
          valor_POSITIVO: positivos.length,
          amostra_positivos: positivos.slice(0, 10).map((u: any) => ({ conta: u.full_name, valor: r2(u.total_commissions_generated) })),
          diagnostico:
            nulos === users.length
              ? 'COLUNA NUNCA FOI ALIMENTADA: valor NULO em 100% das contas. O campo existe no schema mas nenhuma função de comissão escreve nele. Não houve zeramento — houve ausência de escrita desde o início.'
              : zeros === users.length
              ? 'COLUNA FOI ZERADA: valor é 0 (não nulo) em 100% das contas, indicando que um reset gravou zero explicitamente.'
              : 'MISTO — ver contagens acima.',
          consequencia:
            'Este campo é histórico acumulado ("nunca diminui"). Estando vazio, NÃO existe trilha independente para conferir os saldos. A conferência depende só de commission_records.',
        },
      });
    }

    // ─── 3) COMISSÕES FORA DA LOJA: leilão ou venda apagada? ───
    if (secao === 'ORFAS') {
      const saleIds = [...new Set(orfas.map((c: any) => c.sale_id))].filter(Boolean);
      // Confere cada sale_id órfão contra a tabela de leilões (em blocos de 40).
      const idsLeilao = new Set<string>();
      for (let i = 0; i < saleIds.length; i += 40) {
        const bloco = saleIds.slice(i, i + 40).map((s) => `"${s}"`).join(',');
        const rows = await get(`auctions?select=id,title,status,current_price,winner_name,created_date&id=in.(${bloco})`);
        for (const a of rows) idsLeilao.add(a.id);
      }
      const deLeilao = orfas.filter((c: any) => idsLeilao.has(c.sale_id));
      const apagadas = orfas.filter((c: any) => !idsLeilao.has(c.sale_id));
      return Response.json({
        success: true,
        item_3_comissoes_fora_da_loja: {
          pergunta: 'As 275 comissões "fora da loja" são de LEILÃO legítimo ou de venda apagada?',
          total_registros: orfas.length,
          valor_total: soma(orfas, 'amount'),
          sale_ids_distintos: saleIds.length,
          DE_LEILAO_LEGITIMO: {
            registros: deLeilao.length,
            valor: soma(deLeilao, 'amount'),
            leiloes_distintos: idsLeilao.size,
            veredicto: 'LEGÍTIMO — a venda existe, só mora na tabela de leilões. NÃO É LIXO.',
          },
          DE_VENDA_APAGADA: {
            registros: apagadas.length,
            valor: soma(apagadas, 'amount'),
            sale_ids: [...new Set(apagadas.map((c: any) => c.sale_id))].slice(0, 30),
            veredicto: 'ÓRFÃ DE VERDADE — o sale_id não existe nem na loja nem em leilões. Candidata a exclusão.',
            amostra: apagadas.slice(0, 10).map((c: any) => ({
              id: c.id, conta: c.user_name || nome(c.user_id), valor: r2(c.amount), criada_em: c.created_date,
            })),
          },
        },
      });
    }

    // ─── 4) CONJUNTO A PRESERVAR ───
    if (secao === 'PRESERVAR') {
      const porVenda: Record<string, { qtd: number; valor: number }> = {};
      for (const c of preservar) {
        porVenda[c.sale_id] = porVenda[c.sale_id] || { qtd: 0, valor: 0 };
        porVenda[c.sale_id].qtd++;
        porVenda[c.sale_id].valor = r2(porVenda[c.sale_id].valor + (Number(c.amount) || 0));
      }
      return Response.json({
        success: true,
        item_4_conjunto_a_preservar: {
          pergunta: 'Qual é exatamente o conjunto A PRESERVAR?',
          criterio: 'commission_records cuja venda-mãe existe em catalog_sales, está paga e tem mp_payment_id/Stripe',
          registros_de_comissao: preservar.length,
          valor_total: soma(preservar, 'amount'),
          vendas_mae: Object.keys(porVenda).length,
          detalhe_por_venda: Object.entries(porVenda)
            .sort((a, b) => b[1].valor - a[1].valor)
            .map(([sale_id, v]) => {
              const venda: any = vendasReais.find((x: any) => x.id === sale_id) || {};
              return {
                sale_id,
                kind: venda.kind,
                venda_valor: r2(venda.total_amount),
                venda_criada_em: venda.created_date,
                comissoes_qtd: v.qtd,
                comissoes_valor: v.valor,
              };
            }),
          observacao:
            'Preservar por sale_id é mais seguro que por id de comissão: são poucas vendas-mãe e o filtro fica auditável.',
          ids_comissao_amostra: preservar.slice(0, 25).map((c: any) => c.id),
        },
      });
    }

    // ─── RESUMO ───
    return Response.json({
      success: true,
      natureza: '100% LEITURA — nada foi apagado nem alterado',
      seccoes_disponiveis: ['DIVERGENCIA', 'GERADO', 'ORFAS', 'PRESERVAR'],
      panorama: {
        comissoes_no_banco: comissoes.length,
        valor_total_comissoes: soma(comissoes, 'amount'),
        A_PRESERVAR_registros: preservar.length,
        A_PRESERVAR_valor: soma(preservar, 'amount'),
        fora_da_loja_registros: orfas.length,
        fora_da_loja_valor: soma(orfas, 'amount'),
        saldo_hoje_total: r2(users.reduce((s: number, u: any) => s + saldoAtual(u), 0)),
      },
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e) }, { status: 500 });
  }
});