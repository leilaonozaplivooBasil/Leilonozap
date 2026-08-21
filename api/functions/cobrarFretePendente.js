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

// 📦 O pedido depois da cobrança do frete. Uma função só, usada pelos DOIS
// caminhos (a RPC transacional e a compensação legada) — se as duas montassem o
// pedido cada uma do seu jeito, a invariante da RPC
// (`_raw.frete.valor` = `_valor`) passaria num caminho e falharia no outro.
// 🚚 SÓ O BLOCO DO FRETE. É isto que vai para a RPC (B19): ela monta o documento
// novo em cima do `raw_base44` lido dentro do próprio `FOR UPDATE`, e não recebe
// mais uma cópia inteira do pedido que pode ter envelhecido no caminho.
function blocoFreteCobrado({ cep, valorCobrar, escolhida, actorId, ehOverride, overrideMotivo, marcaId }) {
  return {
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
  };
}

// 📦 O pedido inteiro depois da cobrança. Usado SÓ pelo caminho legado de
// compensação, que grava por HTTP e por isso precisa montar o documento aqui.
function montarRawCobrado({ raw, endereco, cep, valorCobrar, escolhida, actorId, ehOverride, overrideMotivo, marcaId, venda }) {
  const c = (n) => Math.round((Number(n) || 0) * 100);
  return {
    ...raw,
    delivery_type: 'delivery',
    address: endereco,
    frete: blocoFreteCobrado({ cep, valorCobrar, escolhida, actorId, ehOverride, overrideMotivo, marcaId }),
    amount_charged: (c(Number(raw.amount_charged) || Number(venda.total_amount) || 0) + c(valorCobrar)) / 100,
  };
}

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
    const auctionIdInformado = String(body?.auction_id || '').trim();
    // ⚠️ F12 — valor manual deixou de ser caminho normal. O preço vem da opção
    // que o SERVIDOR cotou. Override existe, mas precisa ser pedido com nome e
    // justificativa, e o pedido guarda que foi override — nunca fica parecendo
    // que a transportadora validou aquele número.
    const overrideValor = body?.override_valor != null ? Number(body.override_valor) : null;
    const overrideMotivo = String(body?.override_motivo || '').trim();
    const freteIdEscolhido = String(body?.frete_id || '').trim() || null;

    // ══════════════════════════════════════════════════════════════════════
    // 🔴 BLOQUEADOR 9 (auditoria OpenAI, 21/08/2026) — ROTA QUE DEBITA NÃO PODE
    //    ANDAR EM MODO OBSERVAÇÃO
    // ══════════════════════════════════════════════════════════════════════
    // `exigirSessao` respeita SESSAO_MODO: enquanto ele não for 'bloquear', ela
    // LIBERA quem chegou sem crachá e só anota no log. Isso é certo para o
    // rollout em duas etapas de rotas que já existiam com tráfego real — não é
    // certo aqui. Esta rota é NOVA (ninguém tem aba antiga chamando ela) e TIRA
    // DINHEIRO da carteira de um cliente. Em modo observação, bastava mandar
    // `actorId` de um admin no corpo para debitar. Identidade vinda do corpo
    // nunca é identidade (REGRA 2).
    //
    // Então aqui o crachá é obrigatório DESDE O PRIMEIRO DEPLOY, independente de
    // SESSAO_MODO. Não há etapa 1 para uma rota que nasce com o cofre aberto.
    const _ses = exigirSessao(req, actorId, 'cobrarFretePendente');
    if (!_ses.liberado || _ses.motivo !== 'ok') {
      console.error(`[FRETE-PENDENTE] RECUSADA sem crachá válido (${_ses.motivo}) para o actorId ${actorId || '?'}.`);
      return res.status(401).json({
        success: false, error: 'nao_autenticado', motivo: _ses.motivo,
        detalhe: 'Esta rota debita saldo de cliente e exige crachá de sessão válido, mesmo com SESSAO_MODO em observação.',
      });
    }
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

    // ══════════════════════════════════════════════════════════════════════
    // 🔴 BLOQUEADOR 7 (auditoria OpenAI, 21/08/2026) — O MESMO ID ERRADO, DE NOVO
    // ══════════════════════════════════════════════════════════════════════
    // COMO ESTAVA:  cotarOpcoes({ cep, items: [{ id: saleId, quantidade: 1 }] })
    // `saleId` é o id da VENDA. `cotarOpcoes` procura o id em `public.products`.
    // Não acha nada, não reclama, e monta a caixa mínima dos Correios
    // (11×2×16 cm, 0,3 kg). Ou seja: esta rota — que EXISTE para consertar um
    // frete errado — cobrava um frete calculado para um pacote fictício. É
    // literalmente o defeito F8 repetido um andar acima, e eu repeti.
    //
    // COMO FICOU: acha o LEILÃO que gerou este arremate e cota por ele, pelo
    // motor único (freteLeilao), que usa `auction.product_id`. Pedidos novos já
    // nascem com `auction_id` no raw (ver settleAuctionWithBalance). Para os dois
    // pedidos antigos, que nasceram sem, procura pelo vencedor + título.
    let leilao = null;
    const auctionIdDoRaw = auctionIdInformado || String(raw?.auction_id || '').trim();
    if (auctionIdDoRaw) {
      const aRows = await (await sb(`auctions?select=id,product_id,title,current_price,starting_price,winner_id&id=eq.${enc(auctionIdDoRaw)}&limit=1`)).json();
      leilao = Array.isArray(aRows) ? aRows[0] : null;
      // 🔒 B20 — `auction_id` informado no corpo é entrada de fora. Tem que bater
      // com o comprador do pedido, senão daria pra cotar o frete de um leilão
      // qualquer e cobrar no pedido de outra pessoa.
      if (leilao && auctionIdInformado && leilao.winner_id && String(leilao.winner_id) !== String(venda.buyer_id)) {
        return res.status(200).json({
          success: false, debitado: false,
          error: 'O leilão informado não foi arrematado pelo comprador deste pedido. Nada foi cobrado.',
        });
      }
    }
    // ══════════════════════════════════════════════════════════════════════
    // 🔴 BLOQUEADOR 20 (auditoria OpenAI, 21/08/2026) — HEURÍSTICA NÃO COBRA
    // ══════════════════════════════════════════════════════════════════════
    // Para pedido sem `auction_id`, eu pegava até 50 leilões do vencedor e usava
    // o PRIMEIRO com título igual. Duas pessoas não confundem, mas a MESMA
    // pessoa pode ter arrematado dois leilões com o mesmo título — produto
    // repetido é o caso normal de um leilão, não a exceção. Aí a cotação sairia
    // do produto errado e o cliente pagaria o frete de outra caixa.
    // Palpite serve para SUGERIR na conferência. Não serve para tirar dinheiro.
    let leilaoAmbiguo = false;
    let candidatos = [];
    if (!leilao) {
      // pedido antigo: o título da venda é `Arremate — <título do leilão>`
      const tituloLeilao = String(venda.product_title || '').replace(/^Arremate\s*[—-]\s*/, '').trim();
      const aRows = await (await sb(`auctions?select=id,product_id,title,current_price,starting_price&winner_id=eq.${enc(venda.buyer_id)}&order=updated_date.desc&limit=50`)).json();
      const lista = Array.isArray(aRows) ? aRows : [];
      candidatos = lista.filter((a) => String(a.title || '').trim() === tituloLeilao);
      if (candidatos.length === 1) {
        leilao = candidatos[0];
        console.warn(`[FRETE-PENDENTE] pedido ${saleId} sem auction_id no raw; leilão ${leilao.id} identificado pelo título (candidato único).`);
      } else if (candidatos.length > 1) {
        leilaoAmbiguo = true;
        console.error(`[FRETE-PENDENTE] pedido ${saleId}: ${candidatos.length} leilões do mesmo comprador com o título "${tituloLeilao}".`);
      }
    }
    if (leilaoAmbiguo) {
      return res.status(200).json({
        success: false, debitado: false, ambiguo: true,
        error: `Existem ${candidatos.length} leilões deste comprador com o mesmo título. Não dá pra saber qual gerou este pedido, e cobrar por palpite sairia do produto errado.`,
        dica: 'Repita a chamada com auction_id: "<id do leilão certo>".',
        candidatos: candidatos.map((a) => ({ id: a.id, titulo: a.title, valor_final: a.current_price })),
      });
    }
    // 🔒 Identificação por palpite pode SUGERIR, mas nunca cobrar. Se o vínculo
    // não está gravado no pedido nem foi informado explicitamente, o modo
    // `executar` para aqui.
    const vinculoProvado = Boolean(auctionIdInformado || String(raw?.auction_id || '').trim());
    if (executar && !apenasCompletar && leilao && !vinculoProvado) {
      return res.status(200).json({
        success: false, debitado: false,
        error: 'Este pedido não tem o leilão gravado. O leilão abaixo foi identificado por semelhança de título — isso serve para conferir, não para cobrar.',
        dica: 'Confira e repita com auction_id: "<id>" para autorizar a cobrança.',
        leilao_provavel: { id: leilao.id, titulo: leilao.title, valor_final: leilao.current_price },
      });
    }
    if (!leilao) {
      return res.status(200).json({
        success: false,
        error: 'Não foi possível identificar o leilão que gerou este arremate, então não dá pra cotar o frete do produto certo. Informe o auction_id.',
        dica: 'Repita a chamada com auction_id: "<id do leilão>".',
      });
    }
    if (!leilao.product_id) {
      return res.status(200).json({
        success: false,
        error: `O leilão ${leilao.id} está sem produto vinculado. Sem produto não há peso nem medida, e qualquer cotação sairia de um pacote inventado.`,
      });
    }

    let escolhida = null;
    let opcoes = [];
    try {
      const { cotarFreteDoLeilao } = await import('../_lib/freteLeilao.js');
      const r = await cotarFreteDoLeilao({
        auctionId: leilao.id, userId: venda.buyer_id, auction: leilao, cep,
        freteId: freteIdEscolhido || null,
      });
      if (r?.ok) {
        opcoes = r.opcoes;
        escolhida = r.frete ? { id: r.frete.id, preco: r.frete.valor, empresa: r.frete.empresa, nome: r.frete.servico, prazo: r.frete.prazo } : null;
      } else if (r?.motivo === 'opcao_invalida') {
        return res.status(200).json({ success: false, error: 'A opção de frete escolhida não existe na cotação.', opcoes: r.opcoes || [] });
      } else {
        console.warn('[FRETE-PENDENTE] cotação falhou:', r?.motivo);
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
      // ══════════════════════════════════════════════════════════════════════
      // 🔴 BLOQUEADOR 21 (auditoria OpenAI, 21/08/2026) — SERVIÇO INCOMPATÍVEL
      //    COM O FRETE QUE JÁ FOI PAGO
      // ══════════════════════════════════════════════════════════════════════
      // Aqui o valor NÃO muda: o cliente já pagou `freteAtual` no lance. Mas eu
      // gravava o ID e o nome do serviço da opção MAIS BARATA da cotação de
      // hoje, porque era o padrão de `cotarFreteDoLeilao` quando ninguém escolhe.
      // Resultado possível: o pedido diz "pagou R$ 11,60" e carrega o ID de um
      // serviço que custa R$ 25 — a etiqueta sai por esse serviço e a diferença
      // aparece na fatura da transportadora, sem ninguém entender de onde veio.
      //
      // Agora, quando o operador não escolhe explicitamente, a opção é a de
      // preço MAIS PRÓXIMO do que foi pago, e o pedido registra os dois números
      // lado a lado. Nunca fingir que o serviço gravado é exatamente o que foi
      // cotado lá atrás — porque não é, e a diferença precisa ser visível.
      let servicoCompletar = escolhida;
      let diferenca = null;
      if (!freteIdEscolhido && Array.isArray(opcoes) && opcoes.length && freteAtual > 0) {
        servicoCompletar = opcoes.reduce((melhor, o) =>
          Math.abs(Number(o.preco) - freteAtual) < Math.abs(Number(melhor.preco) - freteAtual) ? o : melhor, opcoes[0]);
      }
      if (servicoCompletar && freteAtual > 0) {
        diferenca = Math.round((Number(servicoCompletar.preco) - freteAtual) * 100) / 100;
      }
      const rawCompleto = {
        ...raw,
        delivery_type: 'delivery',
        address: endereco,
        frete: {
          ...(raw.frete || {}),
          valor: freteAtual,                          // ⚠️ o valor NÃO muda
          id: servicoCompletar?.id || raw?.frete?.id || null,
          empresa: servicoCompletar?.empresa || raw?.frete?.empresa || null,
          servico: servicoCompletar?.nome || raw?.frete?.servico || null,
          prazo: servicoCompletar?.prazo ?? raw?.frete?.prazo ?? null,
          cep,
          // 🔍 trilha honesta: o que foi PAGO e o que a cotação de HOJE custa.
          valor_recotado: servicoCompletar?.preco ?? null,
          diferenca_para_o_pago: diferenca,
          servico_escolhido_por: freteIdEscolhido ? 'operador' : (servicoCompletar ? 'preco_mais_proximo_do_pago' : 'nenhum'),
          // 🔴 o serviço NÃO é comprovadamente o que foi cotado no lance:
          // o pedido nasceu sem serviço nenhum, por isso esta rota existe.
          servico_confirmado_da_cotacao_original: false,
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
          cotacao_de_hoje: servicoCompletar?.preco ?? null,
          diferenca_para_o_pago: diferenca,
          opcoes,
          vai_gravar: { delivery_type: 'delivery', endereco, servico: rawCompleto.frete },
          aviso: (diferenca != null && Math.abs(diferenca) >= 0.01)
            ? `ATENÇÃO: o cliente pagou R$ ${freteAtual.toFixed(2)} e o serviço mais próximo hoje custa R$ ${Number(servicoCompletar.preco).toFixed(2)} (diferença de R$ ${diferenca.toFixed(2)}). O valor cobrado NÃO muda — a diferença sai da empresa. Escolha outra opção com frete_id se preferir. Para gravar, repita com executar: true.`
            : 'Nada foi cobrado e nada foi alterado. Para gravar, repita com executar: true.',
        });
      }
      // 🔴 BLOQUEADOR 10 — este PATCH não era conferido. `fetch` NÃO lança em
      // HTTP 400/500, então a rota respondia "Pedido completo, já pode gerar a
      // etiqueta" com o banco intacto. O operador clicaria em Etiqueta, daria
      // erro de novo, e ninguém saberia por quê.
      const gravouCompleto = await sb(`catalog_sales?id=eq.${enc(saleId)}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ raw_base44: rawCompleto, buyer_phone: comprador.phone || null, buyer_cpf: comprador.cpf || null }),
      });
      const linhasCompleto = await gravouCompleto.json().catch(() => []);
      if (!gravouCompleto.ok || !Array.isArray(linhasCompleto) || linhasCompleto.length === 0) {
        console.error(`[FRETE-PENDENTE] apenas_completar: PATCH falhou (HTTP ${gravouCompleto.status}) no pedido ${saleId}.`);
        return res.status(200).json({
          success: false, debitado: false, alterado: false,
          error: 'Não foi possível gravar os dados de entrega no pedido. Nada foi alterado e nada foi cobrado.',
          http: gravouCompleto.status,
        });
      }
      return res.status(200).json({
        success: true, debitado: false, alterado: true,
        pedido: { id: venda.id, titulo: venda.product_title, comprador: venda.buyer_name },
        frete_ja_pago: freteAtual,
        cotacao_de_hoje: servicoCompletar?.preco ?? null,
        diferenca_para_o_pago: diferenca,
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

    // 🚧 Cobrança anterior que não terminou trava TUDO, inclusive a RPC — a
    // conferência vale para os dois caminhos. Antes esta guarda estava só na
    // frente do caminho de compensação; a RPC passaria por cima dela e debitaria
    // um pedido que já pode ter sido debitado.
    if (raw?.frete?.cobranca_em_andamento) {
      return res.status(200).json({
        success: false, debitado: false,
        error: 'Existe uma cobrança anterior que não terminou neste pedido. Confira o saldo do comprador e o wallet_ledger antes de tentar de novo — pode ter havido débito sem gravação.',
        cobranca_em_andamento: raw.frete.cobranca_em_andamento,
      });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 🔴 BLOQUEADOR 8 (auditoria OpenAI, 21/08/2026) — COMPENSAÇÃO NÃO É TRANSAÇÃO
    // ══════════════════════════════════════════════════════════════════════════
    // O caminho abaixo (marca → debita → grava → estorna se a gravação falhar) é
    // o melhor que dá pra fazer por HTTP contra o PostgREST, e ainda assim tem
    // buraco: ler-e-depois-marcar não é atômico, dois chamadores podem marcar, e
    // um perdedor chamando limparMarca() sobrescreve com o raw ANTIGO uma
    // gravação que já deu certo. Compensação é "quase certo"; para dinheiro de
    // cliente, "quase" não serve.
    //
    // A forma certa é uma transação no banco — a RPC do arquivo
    // docs/remediacao_NAO_APLICADA/06_rpc_cobrar_frete.sql, que ainda NÃO foi
    // aplicada e ainda precisa de revisão e autorização do dono.
    //
    // Então esta rota tenta a RPC primeiro. Se ela não existir no banco, RECUSA
    // em vez de cair na compensação. Quem quiser mesmo assim o caminho antigo
    // precisa ligar FRETE_COBRANCA_COMPENSACAO=liberar na Vercel — decisão
    // explícita, registrada, nunca padrão.
    // ⚠️ A assinatura é (_sale_id text, _valor numeric, _raw jsonb, _actor text).
    // O `_raw` é o pedido JÁ MONTADO: a RPC grava exatamente o que vier aqui, e
    // se recusa a gravar se `_raw.frete.valor` não for igual a `_valor`.
    // ⚠️ A1 É INVARIANTE DE REGRESSÃO. A assinatura é
    // (_sale_id text, _valor numeric, _frete jsonb, _actor text). NUNCA voltar a
    // mandar `_user_id` ou `_actor_id`: argumento inexistente faz o PostgREST
    // responder 404, o código lê 404 como "RPC não aplicada", e a rota diria
    // PARA SEMPRE que falta aplicar uma RPC já aplicada. Falha silenciosa.
    //
    // 🔴 BLOQUEADOR 19 (auditoria OpenAI, 21/08/2026) — O `_raw` INTEIRO SAIU.
    // Antes o chamador lia `raw_base44`, montava o documento completo e mandava
    // para a RPC gravar. O `FOR UPDATE` da RPC impede duas RPCs concorrentes,
    // mas NÃO impede que outro fluxo (o `apenas_completar`, a tela de pedidos,
    // um webhook) tenha atualizado o pedido entre a minha leitura e a minha
    // trava. A RPC pegaria a trava depois e sobrescreveria a atualização recente
    // com o documento que eu li antes. Overwrite silencioso.
    //
    // Agora o chamador manda SÓ o bloco do frete. Quem monta o documento novo é
    // a RPC, em cima do `raw_base44` lido DENTRO do `FOR UPDATE` — o único que
    // é garantidamente atual.
    const freteRpc = blocoFreteCobrado({ cep, valorCobrar, escolhida, actorId, ehOverride, overrideMotivo, marcaId: `rpc_${saleId.slice(0, 8)}` });
    const rpc = await sb('rpc/cobrar_frete_pendente', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        _sale_id: saleId, _valor: valorCobrar, _frete: freteRpc, _actor: actorId,
        _endereco: endereco,
      }),
    });
    if (rpc.ok) {
      const saida = await rpc.json().catch(() => null);
      // ══════════════════════════════════════════════════════════════════════
      // 🔴 BLOQUEADOR 18 — HTTP 200 NÃO É "COBROU".
      // ══════════════════════════════════════════════════════════════════════
      // A função devolve `{ok:false, motivo:'saldo_insuficiente'}`,
      // `{ok:false, motivo:'ja_tem_frete'}`, `{ok:false,
      // motivo:'raw_nao_bate_com_valor'}` — e o PostgREST entrega tudo isso como
      // HTTP 200, porque do ponto de vista dele a chamada funcionou. Eu tratava
      // `rpc.ok` como sucesso e respondia "cobrança concluída, debitado: true"
      // para uma transação que RECUSOU e não moveu um centavo. O operador
      // marcaria o pedido como resolvido e o frete continuaria a descoberto.
      // Agora o que decide é o resultado LÓGICO.
      const lista = Array.isArray(saida) ? saida[0] : saida;
      const resultado = (lista && typeof lista === 'object' && 'ok' in lista) ? lista : (lista?.cobrar_frete_pendente ?? lista);
      if (resultado?.ok !== true) {
        console.error(`[FRETE-PENDENTE] RPC recusou (${resultado?.motivo || 'sem motivo'}) — pedido ${saleId}. NADA foi cobrado.`);
        return res.status(200).json({
          success: false, debitado: false, via: 'rpc',
          motivo: resultado?.motivo || 'rpc_recusou',
          error: {
            saldo_insuficiente: 'O comprador não tem saldo suficiente. Nada foi cobrado.',
            ja_tem_frete: 'Este pedido já tem frete cobrado. Nada foi cobrado.',
            raw_nao_bate_com_valor: 'O valor a debitar não bate com o frete que seria gravado no pedido. A transação foi recusada e nada foi cobrado — isto é defeito de código, avise o suporte.',
            raw_nao_e_delivery: 'A transação recusou porque o pedido não sairia como entrega. Nada foi cobrado.',
            valor_invalido: 'Valor de frete inválido. Nada foi cobrado.',
            pedido_nao_encontrado: 'Pedido não encontrado. Nada foi cobrado.',
            nao_e_arremate: 'Este pedido não é um arremate. Nada foi cobrado.',
            comprador_nao_encontrado: 'Comprador não encontrado. Nada foi cobrado.',
            pedido_mudou: 'O pedido foi alterado por outro processo durante a cobrança. Nada foi cobrado — confira e tente de novo.',
          }[resultado?.motivo] || 'A cobrança transacional foi recusada. Nada foi cobrado.',
          resultado,
        });
      }
      console.warn(`[FRETE-PENDENTE] cobrança transacional OK — pedido ${saleId}, R$ ${valorCobrar}, por ${actorId}.`);
      return res.status(200).json({
        success: true, debitado: true, via: 'rpc',
        pedido: { id: venda.id, titulo: venda.product_title, comprador: venda.buyer_name },
        frete_cobrado: valorCobrar,
        servico: escolhida ? { id: escolhida.id, empresa: escolhida.empresa, nome: escolhida.nome, prazo: escolhida.prazo } : null,
        resultado,
      });
    }
    const erroRpc = await rpc.text().catch(() => '');
    const rpcNaoExiste = rpc.status === 404 || /42883|PGRST202|does not exist|Could not find the function/i.test(erroRpc);
    const compensacaoLiberada = String(process.env.FRETE_COBRANCA_COMPENSACAO || '').toLowerCase() === 'liberar';
    if (!compensacaoLiberada) {
      console.error(`[FRETE-PENDENTE] RPC indisponível (HTTP ${rpc.status}) e compensação não liberada — pedido ${saleId}. NADA foi cobrado.`);
      return res.status(200).json({
        success: false, debitado: false,
        error: rpcNaoExiste
          ? 'A cobrança transacional (RPC cobrar_frete_pendente) ainda não está aplicada no banco. NADA foi cobrado.'
          : `A cobrança transacional falhou (HTTP ${rpc.status}). NADA foi cobrado.`,
        detalhe: 'O caminho antigo, por compensação, não é atômico e está desligado de propósito. Aplique a RPC (docs/remediacao_NAO_APLICADA/06_rpc_cobrar_frete.sql) ou ligue FRETE_COBRANCA_COMPENSACAO=liberar assumindo o risco.',
        http_rpc: rpc.status,
        // conferência continua servindo: mostra tudo sem cobrar nada
        frete_a_cobrar: valorCobrar,
        servico: escolhida ? { id: escolhida.id, empresa: escolhida.empresa, nome: escolhida.nome, prazo: escolhida.prazo } : null,
      });
    }
    console.warn(`[FRETE-PENDENTE] RPC indisponível (HTTP ${rpc.status}); seguindo por COMPENSAÇÃO porque FRETE_COBRANCA_COMPENSACAO=liberar — pedido ${saleId}.`);

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

    // ── PASSO 1 — marca a intenção ────────────────────────────────────────────
    // 🔒 Marca SÓ se ninguém marcou antes. O filtro pelo JSON é a trava: se outro
    // chamador já marcou, o PATCH não pega linha nenhuma e este aqui desiste.
    // Sem isso, os dois liam "sem marca" e os dois marcavam.
    const marcar = await sb(`catalog_sales?id=eq.${enc(saleId)}&raw_base44->frete->cobranca_em_andamento=is.null`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        raw_base44: { ...raw, frete: { ...(raw.frete || {}), valor: 0, cobranca_em_andamento: { id: marcaId, iniciada_em: new Date().toISOString(), por: actorId } } },
      }),
    });
    const linhasMarca = await marcar.json().catch(() => []);
    if (!marcar.ok || !Array.isArray(linhasMarca) || linhasMarca.length === 0) {
      return res.status(200).json({
        success: false, debitado: false,
        error: marcar.ok
          ? 'Já existe uma cobrança de frete em andamento neste pedido. Nada foi cobrado. Confira o pedido antes de tentar de novo.'
          : 'Não foi possível marcar a cobrança no pedido. Nada foi cobrado.',
      });
    }

    // 🔴 A OUTRA METADE DO BLOQUEADOR 8: limparMarca() dava PATCH cego com o
    // `raw` ANTIGO. Se, entre marcar e limpar, a gravação boa tivesse entrado
    // (ou outro processo tivesse escrito), esse PATCH APAGAVA o frete cobrado e
    // o pedido voltava a parecer sem frete — com o dinheiro já debitado.
    // Agora só limpa se a marca ainda for A MINHA: o filtro compara o id da
    // marca dentro do JSON. Marca de outro, ou já substituída pela gravação
    // final, não é tocada.
    const limparMarca = async () => {
      try {
        const r = await sb(
          `catalog_sales?id=eq.${enc(saleId)}&raw_base44->frete->cobranca_em_andamento->>id=eq.${enc(marcaId)}`,
          { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ raw_base44: raw }) }
        );
        const linhas = await r.json().catch(() => []);
        if (!r.ok) console.error('[FRETE-PENDENTE] falhou limpar a marca, HTTP', r.status);
        else if (!Array.isArray(linhas) || linhas.length === 0) {
          console.warn(`[FRETE-PENDENTE] marca ${marcaId} já não estava no pedido ${saleId} — não sobrescrevi nada, que é o certo.`);
        }
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
    const rawNovo = montarRawCobrado({
      raw, endereco, cep, valorCobrar, escolhida, actorId, ehOverride, overrideMotivo, marcaId, venda,
    });
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
