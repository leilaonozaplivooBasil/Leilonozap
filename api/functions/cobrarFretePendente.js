// cobrarFretePendente — cobra do SALDO do comprador o frete que não foi cobrado
// no momento do arremate, e completa o pedido para a etiqueta poder ser gerada.
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE ESTA ROTA EXISTE
// ══════════════════════════════════════════════════════════════════════════════
// Até 21/08/2026 o lance saía mesmo quando a cotação de frete falhava — o
// `freteStatus` da sala só servia para exibir aviso, não travava nada. Quando
// isso acontecia, o arremate era liquidado só com o valor do produto e o pedido
// nascia sem frete: a empresa pagava a transportadora do próprio bolso.
//
// O caso que originou isto: mesmo comprador, dois arremates com 3 minutos de
// diferença — um com R$ 11,60 de frete, outro com nenhum.
//
// A trava já entrou na sala (AuctionRoom.jsx) e o buraco não gera pedido novo.
// Esta rota é para os pedidos que JÁ existem.
//
// ⚠️ O QUE ELA NÃO FAZ, DE PROPÓSITO
//   • não inventa valor: o frete cobrado é o que o admin informar, ou o que a
//     recotação devolver — e nos dois casos ele aparece na resposta antes de
//     qualquer débito, no modo conferência;
//   • não cobra duas vezes: se o pedido já tem frete com valor, recusa;
//   • não deixa saldo negativo: se faltar, devolve quanto falta e não debita;
//   • não altera `total_amount` — a base de comissão continua só o produto,
//     frete NUNCA comissiona (mesma regra de settleAuctionWithBalance.js:171).
//
// ⚠️ SÓ ADMIN. E em modo `conferir` por padrão: quem quiser debitar de verdade
// precisa mandar `executar: true` explicitamente. Cobrar do saldo de um cliente
// é ação de dinheiro — não pode acontecer por clique errado.
import { exigirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
const cents = (n) => Math.round((Number(n) || 0) * 100);
const fromCents = (c) => c / 100;
const enc = encodeURIComponent;

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });

  try {
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const actorId = String(body?.actorId || body?.actor_id || '').trim();
    const saleId  = String(body?.sale_id || '').trim();
    const executar = body?.executar === true;              // padrão: só confere
    // 🔧 MODO COMPLETAR — para o pedido que JÁ pagou o frete e só está sem os
    // dados de entrega (delivery_type, endereço, id do serviço). É o caso do
    // AR3BEF1939: R$ 11,60 cobrados no lance, mas o pedido nasceu sem
    // delivery_type, então o servidor responde "é retirada no balcão".
    // Aqui NÃO SE DEBITA NADA. Só completa o que faltou gravar.
    const apenasCompletar = body?.apenas_completar === true;
    // ⚠️ F12 — valor manual deixou de ser caminho normal. O preço vem da opção
    // que o SERVIDOR cotou. Override existe, mas precisa ser pedido com nome e
    // justificativa, e o pedido guarda que foi override — nunca fica parecendo
    // que a transportadora validou aquele número.
    const overrideValor = body?.override_valor != null ? Number(body.override_valor) : null;
    const overrideMotivo = String(body?.override_motivo || '').trim();
    const freteIdEscolhido = String(body?.frete_id || '').trim() || null;

    const _ses = exigirSessao(req, actorId, 'cobrarFretePendente');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });
    if (!actorId || !saleId) return res.status(400).json({ success: false, error: 'actorId e sale_id são obrigatórios' });

    // 🔒 só admin de verdade, conferido no banco
    const atorRows = await (await sb(`app_users?select=role,primary_career_level&id=eq.${enc(actorId)}&limit=1`)).json();
    const ator = Array.isArray(atorRows) ? atorRows[0] : null;
    const ehAdmin = ator && (['admin', 'super_admin'].includes(ator.role) || ['admin', 'super_admin'].includes(ator.primary_career_level));
    if (!ehAdmin) return res.status(403).json({ success: false, error: 'Acesso restrito a administradores' });

    // ── o pedido ──────────────────────────────────────────────────────────────
    const vRows = await (await sb(`catalog_sales?select=id,kind,buyer_id,buyer_name,product_title,total_amount,status,raw_base44&id=eq.${enc(saleId)}&limit=1`)).json();
    const venda = Array.isArray(vRows) ? vRows[0] : null;
    if (!venda) return res.status(200).json({ success: false, error: 'Pedido não encontrado' });
    // ⚠️ F11 — escopo restrito. Esta rota foi feita para o legado de ARREMATE
    // liquidado sem frete. Pedido da Loja tem outro fluxo de cobrança e outro
    // dono do problema; deixar a rota atuar sobre qualquer catalog_sale sem
    // frete era conceder poder que ninguém pediu.
    if (venda.kind !== 'arremate') {
      return res.status(200).json({
        success: false,
        error: `Esta rota só atua sobre pedidos de arremate. Este é kind='${venda.kind || '(vazio)'}'.`,
      });
    }

    let raw = venda.raw_base44;
    if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = null; } }
    raw = raw || {};

    const freteAtual = Number(raw?.frete?.valor) || 0;
    if (freteAtual > 0 && !apenasCompletar) {
      return res.status(200).json({
        success: false, error: 'Este pedido já tem frete cobrado. Se o que falta são só os dados de entrega, use apenas_completar: true.',
        frete_atual: freteAtual,
      });
    }
    if (apenasCompletar && freteAtual <= 0) {
      return res.status(200).json({
        success: false,
        error: 'Este pedido não tem frete cobrado — apenas_completar não serve aqui. Use a cobrança normal.',
      });
    }
    if (apenasCompletar && (raw?.delivery_type === 'delivery') && raw?.frete?.id) {
      return res.status(200).json({ success: false, error: 'Este pedido já está completo. Nada a fazer.' });
    }
    if (!venda.buyer_id) return res.status(200).json({ success: false, error: 'Pedido sem comprador identificado' });

    // ── endereço do comprador ────────────────────────────────────────────────
    const cRows = await (await sb(`app_users?select=id,full_name,saldo_disponivel,phone,cpf,address_street,address_number,address_complement,address_neighborhood,address_city,address_state,address_zip_code&id=eq.${enc(venda.buyer_id)}&limit=1`)).json();
    const comprador = Array.isArray(cRows) ? cRows[0] : null;
    if (!comprador) return res.status(200).json({ success: false, error: 'Comprador não encontrado' });

    const cep = String(comprador.address_zip_code || '').replace(/\D/g, '');
    const endereco = {
      street: comprador.address_street || null, number: comprador.address_number || null,
      complement: comprador.address_complement || null, neighborhood: comprador.address_neighborhood || null,
      city: comprador.address_city || null, state: comprador.address_state || null, zip: cep || null,
    };
    if (!endereco.street || cep.length !== 8) {
      return res.status(200).json({
        success: false,
        error: 'O comprador não tem endereço completo no cadastro. Sem CEP e rua não dá pra cotar nem despachar.',
        endereco_atual: endereco,
      });
    }

    // ── quanto cobrar: o valor informado pelo admin, ou a cotação real ───────
    let escolhida = null;
    let opcoes = [];
    try {
      const { cotarOpcoes } = await import('../_lib/frete.js');
      const r = await cotarOpcoes({ cep, items: [{ id: saleId, quantidade: 1 }] });
      if (r?.ok && Array.isArray(r.opcoes)) {
        opcoes = r.opcoes;
        escolhida = freteIdEscolhido
          ? r.opcoes.find((o) => String(o.id) === freteIdEscolhido)
          : r.opcoes[0];   // mais barata
        if (freteIdEscolhido && !escolhida) {
          return res.status(200).json({ success: false, error: 'A opção de frete escolhida não existe na cotação.', opcoes });
        }
      }
    } catch (e) {
      console.warn('[FRETE-PENDENTE] cotação falhou:', e?.message);
    }

    // preço vem da cotação do servidor; override só com justificativa
    let valorCobrar = escolhida ? escolhida.preco : 0;
    let ehOverride = false;
    if (overrideValor != null) {
      if (!(overrideValor > 0)) {
        return res.status(200).json({ success: false, error: 'override_valor precisa ser maior que zero.' });
      }
      if (overrideMotivo.length < 10) {
        return res.status(200).json({ success: false, error: 'override_valor exige override_motivo com pelo menos 10 caracteres — fica registrado no pedido.' });
      }
      if (escolhida && overrideValor > escolhida.preco * 3) {
        return res.status(200).json({
          success: false,
          error: `override_valor de R$ ${overrideValor.toFixed(2)} é mais de 3x a cotação real (R$ ${escolhida.preco.toFixed(2)}). Recusado.`,
        });
      }
      valorCobrar = overrideValor;
      ehOverride = true;
    }
    if (!apenasCompletar && !(valorCobrar > 0)) {
      return res.status(200).json({
        success: false,
        error: 'Não foi possível determinar o valor do frete. Informe `frete_valor` manualmente.',
        opcoes,
      });
    }

    // ── MODO COMPLETAR: sem débito, sem saldo, só grava o que faltou ────────
    if (apenasCompletar) {
      const rawCompleto = {
        ...raw,
        delivery_type: 'delivery',
        address: endereco,
        frete: {
          ...(raw.frete || {}),
          valor: freteAtual,                          // ⚠️ o valor NÃO muda
          id: escolhida?.id || raw?.frete?.id || null,
          empresa: escolhida?.empresa || raw?.frete?.empresa || null,
          servico: escolhida?.nome || raw?.frete?.servico || null,
          prazo: escolhida?.prazo ?? raw?.frete?.prazo ?? null,
          cep,
          completado_em: new Date().toISOString(),
          completado_por: actorId,
          motivo: 'frete ja pago no lance; pedido nasceu sem delivery_type/endereco/servico',
        },
      };
      if (!executar) {
        return res.status(200).json({
          success: true, modo: 'conferencia', debitado: false, alterado: false,
          pedido: { id: venda.id, titulo: venda.product_title, comprador: venda.buyer_name },
          frete_ja_pago: freteAtual,
          vai_gravar: { delivery_type: 'delivery', endereco, servico: rawCompleto.frete },
          aviso: 'Nada foi cobrado e nada foi alterado. Para gravar, repita com executar: true.',
        });
      }
      await sb(`catalog_sales?id=eq.${enc(saleId)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ raw_base44: rawCompleto, buyer_phone: comprador.phone || null, buyer_cpf: comprador.cpf || null }),
      });
      return res.status(200).json({
        success: true, debitado: false, alterado: true,
        pedido: { id: venda.id, titulo: venda.product_title, comprador: venda.buyer_name },
        frete_ja_pago: freteAtual,
        servico: rawCompleto.frete,
        proximo_passo: 'Pedido completo. A etiqueta já pode ser gerada pelo botão Etiqueta.',
      });
    }

    const saldo = Number(comprador.saldo_disponivel) || 0;
    const falta = fromCents(Math.max(0, cents(valorCobrar) - cents(saldo)));

    // ── MODO CONFERÊNCIA (padrão): mostra tudo e NÃO debita ──────────────────
    if (!executar) {
      return res.status(200).json({
        success: true, modo: 'conferencia', debitado: false,
        pedido: { id: venda.id, titulo: venda.product_title, comprador: venda.buyer_name },
        frete_a_cobrar: valorCobrar,
        servico: escolhida ? { id: escolhida.id, empresa: escolhida.empresa, nome: escolhida.nome, prazo: escolhida.prazo } : null,
        saldo_do_comprador: saldo,
        saldo_suficiente: falta === 0,
        falta,
        opcoes,
        override: ehOverride,
        cotacao_do_servidor: escolhida ? escolhida.preco : null,
        aviso: falta > 0
          ? `O comprador tem R$ ${saldo.toFixed(2)} e o frete é R$ ${valorCobrar.toFixed(2)}. Faltam R$ ${falta.toFixed(2)} — cobre a diferença por fora antes de executar.`
          : 'Para debitar de verdade, repita a chamada com executar: true.',
      });
    }

    if (falta > 0) {
      return res.status(200).json({
        success: false, debitado: false,
        error: `Saldo insuficiente. Faltam R$ ${falta.toFixed(2)}.`,
        saldo_do_comprador: saldo, frete_a_cobrar: valorCobrar, falta,
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // ⚠️ F10 — DÉBITO E GRAVAÇÃO PRECISAM ANDAR JUNTOS
    // ══════════════════════════════════════════════════════════════════════════
    // COMO ESTAVA: debitava o saldo, montava o pedido, dava PATCH em
    // catalog_sales e NÃO conferia se esse PATCH funcionou — `fetch` não lança
    // exceção em HTTP 400/500, então o try/catch não pegava nada. Existia o
    // caminho: SALDO DEBITADO + PEDIDO INTACTO + resposta de sucesso. E pior: na
    // segunda tentativa o pedido ainda parecia sem frete, e o cliente era
    // cobrado de novo.
    //
    // O CAS do saldo não resolve isso. Ele protege duas chamadas simultâneas que
    // leem o mesmo saldo; não protege "debitou e a segunda escrita falhou".
    //
    // COMO FICOU — três passos, cada um verificado, com compensação no fim:
    //   1. MARCA a intenção no pedido (PATCH verificado). Se já houver marca, é
    //      retry: recusa e manda conferir, em vez de cobrar de novo.
    //   2. DEBITA por CAS. Se falhar, limpa a marca e sai — nada foi cobrado.
    //   3. GRAVA o frete (PATCH verificado). Se falhar, ESTORNA o débito.
    //      Se o estorno também falhar, devolve erro gritando os números para
    //      intervenção manual — nunca responde sucesso.
    //
    // ⚠️ Isto é compensação, não transação. O jeito certo de verdade é uma RPC
    // que faça as duas escritas num BEGIN/COMMIT só. Está preparada e NÃO
    // APLICADA em docs/remediacao_NAO_APLICADA/06_rpc_cobrar_frete.sql.
    const marcaId = `cf_${Date.now().toString(36)}_${saleId.slice(0, 6)}`;

    if (raw?.frete?.cobranca_em_andamento) {
      return res.status(200).json({
        success: false, debitado: false,
        error: 'Existe uma cobrança anterior que não terminou neste pedido. Confira o saldo do comprador e o wallet_ledger antes de tentar de novo — pode ter havido débito sem gravação.',
        cobranca_em_andamento: raw.frete.cobranca_em_andamento,
      });
    }

    // ── PASSO 1 — marca a intenção ────────────────────────────────────────────
    const marcar = await sb(`catalog_sales?id=eq.${enc(saleId)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        raw_base44: { ...raw, frete: { ...(raw.frete || {}), valor: 0, cobranca_em_andamento: { id: marcaId, iniciada_em: new Date().toISOString(), por: actorId } } },
      }),
    });
    if (!marcar.ok) {
      return res.status(200).json({ success: false, debitado: false, error: 'Não foi possível marcar a cobrança no pedido. Nada foi cobrado.' });
    }

    const limparMarca = async () => {
      try {
        await sb(`catalog_sales?id=eq.${enc(saleId)}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ raw_base44: raw }),
        });
      } catch (e) { console.error('[FRETE-PENDENTE] falhou limpar a marca:', e?.message); }
    };

    // ── PASSO 2 — débito por compare-and-swap ─────────────────────────────────
    const novoSaldo = fromCents(cents(saldo) - cents(valorCobrar));
    const filtroSaldo = saldo === 0
      ? 'or(saldo_disponivel.eq.0,saldo_disponivel.is.null)'
      : `saldo_disponivel.eq.${saldo}`;
    const patch = await sb(`app_users?id=eq.${enc(venda.buyer_id)}&and=(${filtroSaldo})`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ saldo_disponivel: novoSaldo }),
    });
    const linhas = await patch.json().catch(() => []);
    if (!patch.ok || !Array.isArray(linhas) || linhas.length === 0) {
      await limparMarca();
      return res.status(200).json({
        success: false, debitado: false,
        error: 'O saldo do comprador mudou durante a operação. Nada foi cobrado. Confira e tente de novo.',
      });
    }

    // ── PASSO 3 — grava o frete, e SE FALHAR devolve o dinheiro ──────────────
    const rawNovo = {
      ...raw,
      delivery_type: 'delivery',
      address: endereco,
      frete: {
        id: escolhida?.id || null,
        valor: valorCobrar,
        empresa: escolhida?.empresa || null,
        servico: escolhida?.nome || null,
        prazo: escolhida?.prazo ?? null,
        cep,
        cobrado_depois: true,
        cobrado_em: new Date().toISOString(),
        cobrado_por: actorId,
        cobranca_id: marcaId,
        motivo: 'arremate liquidado sem frete — cobranca posterior autorizada pelo admin',
        // ⚠️ nunca apresentar override como se a transportadora tivesse validado
        validado_pela_transportadora: !ehOverride,
        ...(ehOverride ? { override: true, override_motivo: overrideMotivo, cotacao_real: escolhida?.preco ?? null } : {}),
      },
      amount_charged: fromCents(cents(Number(raw.amount_charged) || Number(venda.total_amount) || 0) + cents(valorCobrar)),
    };
    const gravar = await sb(`catalog_sales?id=eq.${enc(saleId)}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ raw_base44: rawNovo, buyer_phone: comprador.phone || null, buyer_cpf: comprador.cpf || null }),
    });
    const gravou = await gravar.json().catch(() => []);
    if (!gravar.ok || !Array.isArray(gravou) || gravou.length === 0) {
      // COMPENSAÇÃO: devolve o que acabou de sair da carteira.
      const devolver = await sb(`app_users?id=eq.${enc(venda.buyer_id)}&and=(saldo_disponivel.eq.${novoSaldo})`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ saldo_disponivel: saldo }),
      });
      const devolveu = await devolver.json().catch(() => []);
      const estornoOk = devolver.ok && Array.isArray(devolveu) && devolveu.length > 0;
      if (estornoOk) await limparMarca();
      console.error(`[FRETE-PENDENTE] gravacao falhou. estorno ${estornoOk ? 'OK' : 'FALHOU'} — pedido ${saleId}, R$ ${valorCobrar}`);
      return res.status(200).json({
        success: false,
        debitado: !estornoOk,
        error: estornoOk
          ? 'Não foi possível gravar o frete no pedido. O valor foi devolvido ao comprador e nada ficou cobrado.'
          : `ATENÇÃO — INTERVENÇÃO MANUAL: o saldo foi debitado em R$ ${valorCobrar.toFixed(2)} e NEM a gravação NEM o estorno funcionaram. Comprador ${venda.buyer_id}, saldo esperado R$ ${saldo.toFixed(2)}, saldo atual R$ ${novoSaldo.toFixed(2)}, pedido ${saleId}.`,
        precisa_intervencao: !estornoOk,
      });
    }

    // ── trilha no livro-caixa — agora COM verificação de resposta ───────────
    // `fetch` não lança em HTTP 400/500, então o try/catch sozinho não garantia
    // nada: a trilha podia sumir em silêncio. (A OpenAI confirmou no banco que
    // wallet_ledger.tipo é TEXT sem CHECK — a hipótese de constraint caiu.)
    try {
      const trilha = await sb('wallet_ledger', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: venda.buyer_id, sale_id: saleId, tipo: 'cobranca_frete_pendente',
          valor: -valorCobrar,
          motivo: `Frete do pedido ${venda.product_title || saleId} — não cobrado no arremate`,
          created_at: new Date().toISOString(),
        }),
      });
      if (!trilha.ok) {
        const detalhe = await trilha.text().catch(() => '');
        console.error(`[FRETE-PENDENTE] wallet_ledger respondeu ${trilha.status}: ${detalhe.slice(0, 200)}`);
      }
    } catch (e) { console.error('[FRETE-PENDENTE] wallet_ledger:', e?.message); }

    return res.status(200).json({
      success: true, debitado: true,
      pedido: { id: venda.id, titulo: venda.product_title, comprador: venda.buyer_name },
      frete_cobrado: valorCobrar,
      servico: escolhida ? { id: escolhida.id, empresa: escolhida.empresa, nome: escolhida.nome } : null,
      saldo_antes: saldo, saldo_depois: novoSaldo,
      proximo_passo: 'O pedido agora está como delivery com frete. Gere a etiqueta pelo botão Etiqueta.',
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
