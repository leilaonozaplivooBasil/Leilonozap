// finalizeAuctionCore — lógica ÚNICA de arremate no servidor (service role).
// Usada por dois caminhos:
//   • api/functions/finalizeAuction.js — chamado pelo cliente quando o relógio da sala zera
//   • api/functions/finalizeExpiredAuctions.js — cron da Vercel (1x/min) que arremata
//     TODO leilão vencido mesmo sem ninguém na sala
// O claim atômico (WHERE status in active/processing) garante que os dois caminhos
// nunca dupliquem efeitos: só um executa, o outro recebe o consolidado.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
import { cancelarCuponsBloqueados, liberarCupomPassaporte } from './passaporteCoupon.js';
import { recolherBonusPorArremate } from './passaporteBonus.js';
import { oid } from './oid.js';
// 📒 Livro-caixa da reserva. Import de MESMO diretório (./) — a forma segura já
// usada nas linhas acima. Nunca de api/functions/ pra fora (ver submitAtomicBid.js).
import { registrarMovimentoReserva, TIPOS } from './reservaLedger.js';
import { registrarReceita } from './financialIncome.js';

// tolerância pra deriva de relógio entre cliente e servidor (nunca encerra
// um leilão com mais de 2s restantes)
export const GRACE_MS = 2000;
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400';

export const hasServerEnv = () => Boolean(SUPABASE_URL && SR);

export function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}
export const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
export const enc = encodeURIComponent;

// ══════════════════════════════════════════════════════════════════════════════
// 🏦 PONTO 100 (21/08/2026) — RASTRO DO DINHEIRO DO LEILÃO
// Decisão do dono (Luiz Alberto Sant'Anna Filho) nesta data.
//
// A REGRA DE PAGAMENTO NÃO MUDA. Continua exatamente o que o documento oficial
// manda: 5% do valor do arremate para UMA pessoa — quem indicou o arrematante.
// Sem cadeia, sem telescópio, sem pool de topo, sem executivo.
//
// O QUE MUDA É A CONTABILIDADE. Antes o leilão movia dinheiro sem deixar
// registro: o martelo somava 5% direto no commission_balance do indicador e não
// gravava UMA linha em commission_records. Duas consequências ruins:
//
//   1. A função recalculateCommissionBalances reescreve o saldo somando as
//      linhas de comissão. Como o leilão não tinha linha, rodar ela APAGAVA o
//      ganho do indicador — dinheiro sumindo sem rastro de onde veio.
//   2. Não existia como abrir um relatório e mostrar quanto o leilão gerou.
//
// Agora o bloco de 30% da rede é registrado inteiro em todo arremate:
//
//   • 5%  → indicador do arrematante (role 'leilao_indicador')
//           Continua sendo o ÚNICO pagamento distribuído. Nada mudou aqui.
//   • 25% → conta oficial da empresa (role 'leilao_retido')
//           Fatia da rede que a empresa optou por NÃO distribuir no leilão.
//           É saldo real e sacável, por decisão expressa do dono: a conta é
//           dele, está no CPF dele, e quando o repasse bancário automático
//           entrar no ar esse valor vira pagamento de verdade.
//   • Sem indicador? Os 30% inteiros vão para 'leilao_retido'. A fatia da rede
//     existe sempre; o que não tem dono fica retido, nunca evapora.
//   • Os outros 70% (margem + tributos) NÃO são comissão e não entram aqui.
//
// Base = finalPrice (só o produto). O FRETE NUNCA COMISSIONA — nem nos 5%,
// nem nos 25%.
//
// ⛔ NÃO RODA EM: plano de investimento (is_investment_plan) e leilão de teste
// (is_test_auction). Leilão de teste não pode gerar dinheiro sacável de verdade.
//
// 📕 Fonte de verdade: docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md, seção 6-A.
// ══════════════════════════════════════════════════════════════════════════════
export const CONTA_OFICIAL_NOME = 'Leilão NoZap - Site Oficial';
export const PCT_REDE_LEILAO = 30.0;      // bloco da rede (igual ao da loja)
export const PCT_INDICADOR_LEILAO = 5.0;  // única fatia distribuída no leilão

// Grava UMA linha em commission_records. Best-effort por contrato: o dinheiro já
// foi movido, e falhar no extrato NUNCA pode derrubar o arremate.
async function gravarLinhaComissaoLeilao(linha) {
  try {
    const id = oid();
    const r = await sb('commission_records', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id, base44_id: id, sale_type: 'leilao', status: 'confirmed', created_date: new Date().toISOString(), ...linha }),
    });
    return r.ok;
  } catch (e) {
    console.warn('[FINALIZE] extrato de comissão:', e?.message);
    return false;
  }
}

/**
 * Credita a fatia RETIDA (a parte da rede que o leilão não distribui) na conta
 * oficial da empresa, com linha no extrato. Idempotente pelo par
 * (sale_id, role): se já existe linha 'leilao_retido' deste leilão, não repete.
 */
export async function reterFatiaDaRede({ auction, finalPrice, pctRetido, arrematanteId, arrematanteNome }) {
  try {
    if (pctRetido <= 0) return 0;
    const valor = money((finalPrice * pctRetido) / 100);
    if (valor <= 0) return 0;

    const jaTem = await (await sb(
      `commission_records?select=id&sale_id=eq.${enc(auction.id)}&role=eq.leilao_retido&limit=1`
    )).json();
    if (Array.isArray(jaTem) && jaTem.length) return 0;

    // 🔴 PONTO 123 (21/08/2026) — ACHAR A EMPRESA PELO NOME É FRÁGIL.
    // Esta busca era `full_name=eq.'Leilão NoZap - Site Oficial'`: um acento
    // trocado, um espaço a mais ou uma renomeação na tela de usuários e a conta
    // "some". O dinheiro do leilão então não é gravado em lugar nenhum — só um
    // console.error que ninguém lê.
    // O mesmo defeito já foi corrigido no motor da loja (storeFulfill.js, PONTO
    // 118). Aqui ficou pra trás. Agora resolve pela MESMA chave estável:
    // referral_code = 'leilaonozap', a que o cadastro usa pra achar a raiz da
    // árvore (publicRegister.js:85, googleLogin.js:127). O nome continua como
    // último recurso, pra não quebrar ambiente sem o referral_code preenchido.
    let oficial = null;
    try {
      const porCodigo = await (await sb(
        'app_users?select=id,full_name,commission_balance&referral_code=eq.leilaonozap&limit=1'
      )).json();
      oficial = Array.isArray(porCodigo) ? porCodigo[0] : null;
    } catch (_) { oficial = null; }
    if (!oficial) {
      const contas = await (await sb(
        `app_users?select=id,full_name,commission_balance&full_name=eq.${enc(CONTA_OFICIAL_NOME)}&limit=1`
      )).json();
      oficial = Array.isArray(contas) ? contas[0] : null;
    }
    if (!oficial) {
      // 🔴 Sem a conta oficial cadastrada o dinheiro não tem onde cair. NÃO
      // inventa destino: registra alto e claro pra alguém arrumar o cadastro.
      console.error(`[FINALIZE] Conta oficial NÃO encontrada (referral_code=leilaonozap, nem pelo nome "${CONTA_OFICIAL_NOME}") — R$ ${valor} do leilão ${auction.id} ficaram sem registro.`);
      return 0;
    }

    await gravarLinhaComissaoLeilao({
      sale_id: auction.id,
      user_id: oficial.id,
      user_name: oficial.full_name,
      role: 'leilao_retido',
      percent: pctRetido,
      amount: valor,
      sale_amount: finalPrice,
      product_title: auction.title || null,
      // ⚠️ âncora = o ARREMATANTE. Não usar auction.winner_id aqui: neste ponto
      // ele ainda pode ser o líder ANTERIOR (a foto lida antes do claim atômico).
      anchor_user_id: arrematanteId || null,
      anchor_user_name: arrematanteNome || null,
    });

    // 💰 crédito no saldo — decisão expressa do dono (ver cabeçalho).
    //
    // 🔴 PONTO 123 (21/08/2026) — ERA LER-SOMAR-GRAVAR, E ISSO PERDE DINHEIRO.
    // A versão anterior lia commission_balance junto com a conta, somava em
    // memória e gravava o total. Dois leilões encerrando no mesmo instante — o
    // cron de vencidos fecha vários de uma vez — leem o MESMO saldo e gravam por
    // cima um do outro: a retenção de um dos dois some, e a linha do extrato dele
    // fica lá, dizendo que o dinheiro entrou. Extrato e saldo passam a discordar,
    // sem nada no log.
    //
    // A soma agora é feita PELO BANCO, com a mesma RPC atômica que a comissão
    // usa (rpc/credit_commission, PONTO 114). Duas execuções simultâneas somam
    // as duas. E se o crédito falhar, a linha do extrato é o rastro que sobra —
    // por isso o erro é alto, não aviso baixinho.
    const credito = await sb('rpc/credit_commission', {
      method: 'POST',
      body: JSON.stringify({ _user: oficial.id, _amount: valor }),
    });
    if (!credito.ok) {
      console.error(`[FINALIZE] RETENÇÃO NÃO CREDITADA — leilão ${auction.id}, R$ ${valor} na conta oficial ${oficial.id}. A linha do extrato foi gravada; o saldo NÃO. Resolver na mão.`);
      return 0;
    }
    // 💰 DIR-14 — a fatia retida É receita real da empresa (decisão do dono,
    // PONTO 100 no cabeçalho deste arquivo: "conta é dele, saldo real e
    // sacável"). Até aqui só entrava no extrato de comissão
    // (commission_records), nunca em financial_income — por isso o
    // Financeiro/CRM nunca mostrava a receita real do leilão.
    await registrarReceita({
      description: `Comissão retida — leilão #${auction.id}`,
      category: 'comissao_leilao', costCenter: 'Leilões',
      amount: valor, source: 'venda', saleId: auction.id,
    });
    return valor;
  } catch (e) {
    console.warn('[FINALIZE] retenção da fatia da rede:', e?.message);
    return 0;
  }
}

export async function fetchAuction(auctionId) {
  const rows = await (await sb(`auctions?select=*&id=eq.${enc(auctionId)}&limit=1`)).json();
  return Array.isArray(rows) ? rows[0] : null;
}

export function resultPayload(auction, extra = {}) {
  return {
    success: true,
    result: {
      auction_id: auction.id,
      status: auction.status,
      winner_id: auction.winner_id || null,
      winner_name: auction.winner_name || null,
      final_price: money(auction.current_price || auction.starting_price),
      order_status: auction.order_status || null,
      ...extra,
    },
  };
}

// Devolve `valor` de saldo_reservado → saldo_disponivel de UMA conta, com trava
// otimista (só grava se os dois saldos ainda estiverem como foram lidos). Nunca
// devolve mais do que está reservado e nunca lança erro — falha aqui não pode
// impedir o encerramento do leilão. Retorna quanto foi efetivamente devolvido.
// 🔴 PONTO 122 (21/08/2026) — ESTA DEVOLUÇÃO NÃO DEIXAVA RASTRO (risco #25)
// A tabela reserva_ledger foi criada em 18/08 justamente porque saldo_reservado
// era mexido sem extrato — a auditoria achou R$ 159,60 travados em 8 contas, R$
// 13,20 deles IRRASTREÁVEIS. Todas as outras portas passaram a gravar; esta,
// que roda no MARTELO (o momento de maior movimento de reserva do sistema),
// continuou muda. Quem fosse conferir a conta de um cliente veria o saldo mudar
// sozinho, sem linha nenhuma explicando. Agora grava, e o parâmetro auctionId
// diz de qual leilão veio.
async function devolverReserva(userId, valor, auctionId = null) {
  const uid = String(userId || '').trim();
  const pedido = money(valor);
  if (!uid || pedido <= 0) return 0;
  try {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const rows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${enc(uid)}&limit=1`)).json();
      const u = Array.isArray(rows) ? rows[0] : null;
      if (!u) return 0;
      const disponivel = money(u.saldo_disponivel);
      const reservado = money(u.saldo_reservado);
      const liberar = money(Math.min(pedido, reservado));
      if (liberar <= 0) return 0;
      // coluna nunca inicializada fica NULL, e "eq.0" nunca casa com NULL
      const fDisp = disponivel === 0 ? 'or(saldo_disponivel.eq.0,saldo_disponivel.is.null)' : `saldo_disponivel.eq.${disponivel}`;
      const fRes = reservado === 0 ? 'or(saldo_reservado.eq.0,saldo_reservado.is.null)' : `saldo_reservado.eq.${reservado}`;
      const patch = await sb(`app_users?id=eq.${enc(uid)}&and=(${fDisp},${fRes})`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          saldo_disponivel: money(disponivel + liberar),
          saldo_reservado: money(reservado - liberar),
        }),
      });
      const updated = await patch.json().catch(() => []);
      if (Array.isArray(updated) && updated[0]) {
        // 📒 best-effort por contrato: falhar aqui nunca derruba o encerramento.
        await registrarMovimentoReserva({
          userId: uid,
          auctionId,
          tipo: TIPOS.DEVOLUCAO_FIM_LEILAO,
          direcao: 'saida_reserva',
          valor: liberar,
          saldoAntes: reservado,
          saldoDepois: money(reservado - liberar),
          origem: '_lib/finalizeAuctionCore.devolverReserva',
        });
        return liberar;
      }
      // corrida: o saldo mudou entre a leitura e a escrita — tenta de novo
    }
    return 0;
  } catch (e) {
    console.warn('[FINALIZE] devolverReserva:', e?.message);
    return 0;
  }
}

// Executa o arremate de UM leilão já validado como active/processing e vencido.
// Retorna o payload consolidado (mesmo shape do finalizeAuction original).
export async function finalizeOneAuction(auction) {
  const auctionId = auction.id;

  // 🏆 Apura o vencedor pelo MAIOR lance realmente gravado no banco. Busca TODOS
  // os lances (não só o topo) — o Cupom Passaporte precisa saber, por pessoa, qual
  // foi o MAIOR lance dela neste leilão pra liberar/cancelar só a fatia certa.
  // ══════════════════════════════════════════════════════════════════════════
  // 🚚 BLOQUEADOR 13 (auditoria OpenAI, 21/08/2026) — O FRETE PRECISA SER DECIDIDO
  //    NO MESMO CLAIM QUE DECIDE O VENCEDOR
  // ══════════════════════════════════════════════════════════════════════════
  // ANTES: o Buy Now dava um PATCH separado em `frete_reservado_valor`, SEM trava
  // de status nem de version. Dois problemas reais:
  //
  //   1. Se o arremate falhasse depois (finalização quebrou, ou outro processo
  //      venceu a corrida), o estorno devolvia o dinheiro e apagava o lance —
  //      mas o `frete_reservado_valor` FICAVA com o frete daquela tentativa.
  //      O vencedor de verdade herdava o frete de quem perdeu, cotado para outro
  //      CEP. É o mesmo estrago do AR3BEF1939, agora pela porta do rollback.
  //   2. Sem trava, o PATCH podia alterar o frete de um leilão que outro processo
  //      já tinha encerrado.
  //
  // AGORA: ninguém escreve `frete_reservado_valor` fora daqui como decisão final.
  // A apuração lê o `frete_amount` do lance vencedor e grava o frete DENTRO do
  // claim atômico, junto de winner_id/winner_name/current_price/status. Quem
  // ganha a corrida do claim define vencedor E frete na mesma escrita — não há
  // janela entre uma coisa e outra.
  const COLUNAS_BID = 'sender_id,sender_name,bid_amount,created_date';
  let respBids = await sb(
    `auction_messages?select=${COLUNAS_BID},frete_amount&auction_id=eq.${enc(auctionId)}&message_type=eq.bid&order=bid_amount.desc.nullslast,created_date.asc&limit=500`
  );
  let temColunaFrete = true;
  if (!respBids.ok) {
    // ⚠️ Volta segura SÓ para coluna inexistente (42703). Qualquer outro erro
    // (rede, permissão, PostgREST) NÃO pode virar "encerra sem frete" — aí o
    // certo é deixar estourar e o leilão não encerrar, e não encerrar errado.
    const detalhe = await respBids.text().catch(() => '');
    if (!/42703|does not exist|column .* does not exist/i.test(detalhe)) {
      throw new Error(`[FINALIZE] leitura dos lances falhou (HTTP ${respBids.status}): ${detalhe.slice(0, 200)}`);
    }
    console.warn('[FINALIZE] auction_messages sem coluna frete_amount — relendo sem ela.');
    temColunaFrete = false;
    respBids = await sb(
      `auction_messages?select=${COLUNAS_BID}&auction_id=eq.${enc(auctionId)}&message_type=eq.bid&order=bid_amount.desc.nullslast,created_date.asc&limit=500`
    );
  }
  const allBids = await respBids.json();
  const bidsList = Array.isArray(allBids) ? allBids : [];
  const topBid = bidsList[0] || null;

  const winnerId = topBid?.sender_id || null;
  const winnerName = topBid?.sender_name || null;
  const finalPrice = money(topBid?.bid_amount || auction.current_price || auction.starting_price);

  // 🚚 Frete do lance VENCEDOR. Lance legado tem `frete_amount` NULL — e NULL não
  // é zero: zero significaria "esta pessoa não paga frete", que é justamente o
  // defeito que originou toda esta frente. Sem valor no lance, mantém o que o
  // leilão já tem, que é o frete do líder corrente gravado a cada lance.
  const freteDoTopBid = (temColunaFrete && topBid && topBid.frete_amount != null)
    ? money(topBid.frete_amount)
    : null;
  const freteVencedor = freteDoTopBid != null
    ? freteDoTopBid
    : money(auction.frete_reservado_valor || 0);
  if (winnerId && freteDoTopBid == null) {
    console.warn(`[FINALIZE] leilão ${auctionId}: lance vencedor sem frete_amount — mantendo o frete atual do leilão (R$ ${freteVencedor}). Lance legado.`);
  }

  // maior lance de CADA participante neste leilão (bidsList já vem ordenado
  // desc por valor, então o primeiro encontrado de cada sender_id é o maior dele)
  const maiorLancePorParticipante = new Map();
  for (const b of bidsList) {
    if (b?.sender_id && !maiorLancePorParticipante.has(b.sender_id)) {
      maiorLancePorParticipante.set(b.sender_id, money(b.bid_amount));
    }
  }

  // 🔒 Claim atômico: só UM finalizador vence esta corrida.
  const claim = await sb(
    `auctions?id=eq.${enc(auctionId)}&status=in.(active,processing)`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        status: 'ended',
        winner_id: winnerId,
        winner_name: winnerName,
        current_price: finalPrice,
        order_status: winnerId ? 'awaiting_payment' : null,
        // 🚚 B13 — o frete do vencedor entra AQUI, na mesma escrita atômica.
        ...(winnerId ? { frete_reservado_valor: freteVencedor } : {}),
      }),
    }
  );
  const claimed = await claim.json().catch(() => []);
  if (!Array.isArray(claimed) || claimed.length === 0) {
    // outro chamador encerrou primeiro — devolve o consolidado
    const fresh = await fetchAuction(auctionId);
    return resultPayload(fresh || auction, { already_finalized: true });
  }
  const finalAuction = claimed[0];

  // 👤 Dados completos do vencedor (para a mensagem de vitória)
  let winnerData = null;
  if (winnerId) {
    const users = await (await sb(
      `app_users?select=id,full_name,nickname,email,avatar_url,won_auctions,points,referred_by_id&id=eq.${enc(winnerId)}&limit=1`
    )).json();
    const u = Array.isArray(users) ? users[0] : null;
    winnerData = {
      id: winnerId,
      full_name: u?.full_name || winnerName || 'Vencedor',
      nickname: u?.nickname || winnerName || 'Vencedor',
      email: u?.email || '',
      avatar_url: u?.avatar_url || null,
    };

    // 📈 Stats do vencedor (não-bloqueante)
    if (u) {
      try {
        await sb(`app_users?id=eq.${enc(winnerId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            won_auctions: (Number(u.won_auctions) || 0) + 1,
            points: (Number(u.points) || 0) + 100,
          }),
        });
      } catch (e) { console.warn('[FINALIZE] stats vencedor:', e?.message); }

      // 🎟️ Arrematou = a FATIA do lance vencedor vira compra → cancela só 10% do
      // valor arrematado (não o bônus inteiro). Cupom já LIBERADO (de uma derrota
      // em outro leilão) permanece intacto.
      try { await cancelarCuponsBloqueados(winnerId, finalPrice); } catch (e) { console.warn('[FINALIZE] cupom passaporte:', e?.message); }

      // 🎟️ Modelo A: o bônus de 10% já está na carteira. Quem ARREMATOU tem o bônus
      // recolhido (o valor pago virou compra). Nunca deixa saldo negativo.
      try { await recolherBonusPorArremate(winnerId, auctionId); } catch (e) { console.warn('[FINALIZE] bônus passaporte:', e?.message); }

      // 💰 COMISSÃO DE LEILÃO — REGRA OFICIAL (04/08/2026, confirmada pelo dono):
      //   • 5% do valor do arremate (era 3%)
      //   • SOMENTE VENDA DIRETA/PESSOAL: uma única pessoa — quem indicou o arrematante.
      //     NÃO tem cadeia, NÃO tem telescópio, NÃO tem pool de topo, NÃO tem executivo.
      //     Todo o restante fica integralmente com a empresa.
      //   • Base = finalPrice = auction.current_price → SÓ O PRODUTO.
      //     O frete viaja separado (frete_reservado_valor) e NUNCA comissiona.
      //   • Paga no MARTELO e está correto: o saldo do arrematante já foi depositado
      //     antecipadamente e reservado no lance, então o martelo JÁ É o pagamento.
      //     NÃO mover este gatilho para o fluxo de pagamento.
      // Saldo de teste ou real conforme is_test_auction. Planos de investimento não comissionam.
      // 📕 Fonte de verdade: docs/DOCUMENTO-OFICIAL-PLANO-CARREIRA.md
      // 🏦 PONTO 100: pctDistribuido guarda quanto dos 30% da rede saiu de fato.
      // O que sobrar é retido na conta oficial logo abaixo — ver o cabeçalho de
      // reterFatiaDaRede(). O PAGAMENTO em si não mudou: continua 5% pro
      // indicador do arrematante e mais ninguém.
      let pctDistribuido = 0;
      // 🔴 PONTO 109 — A FLAG `is_investment_plan` NÃO É CONFIÁVEL.
      // Medido no banco em 21/08/2026: 36 leilões "Plano de Investimento: Plano V"
      // de R$ 5.000 cada, e a flag marcada em ZERO deles. O documento oficial é
      // claro que plano de investimento NÃO comissiona, mas a única trava era
      // essa flag — que ninguém preenche.
      //
      // Com o SELECT consertado logo abaixo, esses leilões passariam a pagar 5%
      // de R$ 5.000 = R$ 250 cada. R$ 9.000 de comissão indevida por descuido de
      // cadastro. Por isso o título entra como REDE DE SEGURANÇA — a flag
      // continua sendo a regra, o título é o que evita o prejuízo quando ela
      // vem em branco. O aviso no log serve pra alguém ir marcar a flag.
      const pareceInvestimento = /plano\s+de\s+investimento/i.test(String(auction.title || ''));
      if (pareceInvestimento && !auction.is_investment_plan) {
        console.warn(`[FINALIZE] Leilão ${auctionId} parece Plano de Investimento pelo título mas está SEM a flag is_investment_plan. Não comissionando. Marcar a flag no cadastro.`);
      }
      if (u.referred_by_id && !auction.is_investment_plan && !pareceInvestimento) {
        try {
          // ══════════════════════════════════════════════════════════════════
          // 🔴 PONTO 109 (21/08/2026) — OS 5% DO LEILÃO NUNCA FORAM PAGOS
          // ══════════════════════════════════════════════════════════════════
          // Este SELECT pedia `valora_pay_balance` e `test_valora_balance`.
          // NENHUMA das duas existe no banco — são nomes herdados do Base44 que
          // nunca viraram coluna aqui. O front-end já sabia disso e está escrito
          // em src/pages/NetworkOverview.jsx:1047: "A tabela app_users tem
          // commission_balance; 'valora_pay_balance' não existe". O back-end
          // nunca soube.
          //
          // O que acontecia, silenciosamente:
          //   PostgREST recusa a consulta inteira (42703, column does not exist)
          //   → .json() devolve um OBJETO de erro, não um array
          //   → ?.[0] vira undefined
          //   → `if (lic)` dá falso
          //   → o bloco inteiro é pulado e NINGUÉM recebe
          // Tudo dentro de um try/catch com console.warn: falhava sem barulho.
          //
          // Medido na produção: os 46 arremates de agosto com winner_id têm ZERO
          // linha de comissão, e a conta que receberia a maior parte tinha
          // R$ 68,60 em vez dos milhares esperados. Não é "alguns arremates não
          // distribuíram" — é que NENHUM arremate jamais distribuiu.
          //
          // A coluna de teste que EXISTE é `test_wallet_balance`
          // (supabase/migrations/20260803_test_wallet_balance.sql).
          //
          // ⚠️ E leilão de TESTE não pode mais tocar commission_balance: antes o
          // patch somava lá SEMPRE, e só a coluna fantasma separava teste de
          // real. Consertar o SELECT sem consertar isso transformaria "não paga
          // ninguém" em "paga dinheiro de verdade por leilão de brincadeira".
          const lic = (await (await sb(
            `app_users?select=id,full_name,network_bids_count,commission_balance,test_wallet_balance&id=eq.${enc(u.referred_by_id)}&limit=1`
          )).json())?.[0];
          if (lic) {
            const commission = money(finalPrice * 0.05);
            const ehTeste = auction.is_test_auction === true;

            // ══════════════════════════════════════════════════════════════
            // 🔴 PONTO 114 (21/08/2026) — ESCRITA CEGA APAGAVA COMISSÃO
            // ══════════════════════════════════════════════════════════════
            // O crédito era `commission_balance: (lido) + commission` num PATCH
            // sem filtro nenhum. Isso é ler-e-escrever: se uma comissão de LOJA
            // caísse na mesma pessoa entre a leitura e a escrita, ela era
            // APAGADA — o martelo gravava por cima com um total velho. Some
            // dinheiro de alguém que não tem nada a ver com o leilão, sem rastro.
            //
            // O dinheiro REAL agora usa rpc/credit_commission — incremento
            // atômico no banco, o mesmo que a comissão de loja já usa
            // (api/_lib/storeFulfill.js:109). Não tem leitura no meio: é o banco
            // que soma.
            //
            // ⚠️ E se o crédito FALHAR, `pctDistribuido` fica em zero de
            // propósito: a fatia retida (PONTO 100) é calculada em cima dele, e
            // dar a comissão como paga sem ter pago desequilibraria a conta dos
            // 30% do leilão. Ninguém recebeu → a empresa retém tudo.
            let creditou = false;
            if (ehTeste) {
              // Saldo de teste não é dinheiro: CAS simples resolve, e não existe
              // RPC pra essa coluna.
              const atual = money(lic.test_wallet_balance);
              const filtro = atual === 0
                ? 'or(test_wallet_balance.eq.0,test_wallet_balance.is.null)'
                : `test_wallet_balance.eq.${atual}`;
              const r = await sb(`app_users?id=eq.${enc(lic.id)}&${filtro}`, {
                method: 'PATCH',
                headers: { Prefer: 'return=representation' },
                body: JSON.stringify({ test_wallet_balance: money(atual + commission) }),
              });
              const linhas = await r.json().catch(() => []);
              creditou = Array.isArray(linhas) && linhas.length > 0;
            } else {
              const r = await sb('rpc/credit_commission', {
                method: 'POST',
                body: JSON.stringify({ _user: lic.id, _amount: commission }),
              });
              creditou = r.ok;
            }

            if (!creditou) {
              console.error(`[FINALIZE] Comissão de 5% NÃO creditada no leilão ${auctionId} — indicador ${lic.id}, R$ ${commission}. Fatia fica retida com a empresa.`);
            }

            // contador de rede: não é dinheiro, best-effort, fora do caminho crítico
            try {
              await sb(`app_users?id=eq.${enc(lic.id)}`, {
                method: 'PATCH',
                headers: { Prefer: 'return=minimal' },
                body: JSON.stringify({ network_bids_count: (Number(lic.network_bids_count) || 0) + 1 }),
              });
            } catch (_) { /* contador não pode derrubar o martelo */ }

            // Só considera distribuído — e só escreve o extrato — se o dinheiro
            // REALMENTE entrou. Extrato de comissão que não foi paga é pior que
            // extrato nenhum: some no relatório e ninguém procura.
            if (creditou) {
              pctDistribuido = PCT_INDICADOR_LEILAO;

              // 📒 PONTO 100: a linha do extrato que faltava. Sem ela o
              // recalculateCommissionBalances APAGAVA este ganho — ele soma
              // commission_records, e o leilão nunca gravava nada.
              // Só no leilão real: leilão de teste não entra no extrato de dinheiro.
              if (!ehTeste) {
                await gravarLinhaComissaoLeilao({
                  sale_id: auction.id,
                  user_id: lic.id,
                  user_name: lic.full_name || null,
                  role: 'leilao_indicador',
                  percent: PCT_INDICADOR_LEILAO,
                  amount: commission,
                  sale_amount: finalPrice,
                  product_title: auction.title || null,
                  anchor_user_id: winnerId,
                  anchor_user_name: u.full_name || winnerName || null,
                });
              }
            }
          }
        } catch (e) { console.warn('[FINALIZE] comissão licenciado:', e?.message); }
      }

      // 🏦 PONTO 100: o que dos 30% da rede NÃO foi distribuído fica RETIDO na
      // conta oficial da empresa, com linha no extrato. Sem indicador, retém os
      // 30% inteiros. Plano de investimento e leilão de teste não retêm nada.
      //
      // 🔴 PONTO 123 (21/08/2026) — A REDE DE SEGURANÇA DO TÍTULO PAROU NA METADE
      // do caminho. O PONTO 109 fez o título segurar a COMISSÃO quando a flag
      // `is_investment_plan` vem em branco (e ela vem em branco nos 36 leilões
      // "Plano de Investimento: Plano V" medidos no banco), mas esta linha aqui
      // continuou olhando só a flag. Resultado: o mesmo leilão que não paga
      // comissão RETINHA 30% de R$ 5.000 = R$ 1.500 na conta da empresa, com
      // linha no extrato — crédito de mentira, R$ 54.000 nos 36. Plano de
      // investimento não movimenta nem um lado nem o outro: as duas travas
      // passam a usar exatamente o mesmo critério.
      if (!auction.is_investment_plan && !pareceInvestimento && auction.is_test_auction !== true) {
        await reterFatiaDaRede({
          auction,
          finalPrice,
          pctRetido: money(PCT_REDE_LEILAO - pctDistribuido),
          arrematanteId: winnerId,
          arrematanteNome: u.full_name || winnerName || null,
        });
      }
    }
  }

  // 🎟️ CUPOM PASSAPORTE — libera a FATIA de quem disputou e NÃO ganhou: só 10% do
  // MAIOR lance que essa pessoa deu NESTE leilão (não o bônus inteiro — ver
  // REGRA CORRIGIDA 19/08/2026 no topo de passaporteCoupon.js). Roda só no
  // ENCERRAMENTO do leilão, nunca no meio, quando a pessoa é só coberta por um
  // lance (ela ainda pode relançar e vencer).
  try {
    for (const [participanteId, maiorLance] of maiorLancePorParticipante) {
      if (participanteId === winnerId) continue;
      try { await liberarCupomPassaporte(participanteId, auctionId, maiorLance); } catch (e) { console.warn('[FINALIZE] libera cupom perdedor:', participanteId, e?.message); }
    }
  } catch (e) { console.warn('[FINALIZE] libera cupons perdedores:', e?.message); }

  // 🔓 DEVOLUÇÃO DE RESERVA NO MARTELO — REGRA OFICIAL CORRIGIDA (08/08/2026).
  //
  // Ser coberto DEVOLVE o dinheiro NA HORA: o submitAtomicBid libera a reserva do
  // líder anterior no mesmo instante em que o lance novo vence. Ou seja: quem foi
  // coberto durante o leilão JÁ RECEBEU e não pode receber de novo aqui.
  //
  // ⚠️ POR QUE ISTO MUDOU: a versão anterior devolvia o maior lance de TODOS os
  // perdedores. Como a devolução só é limitada pelo saldo_reservado TOTAL da conta,
  // ela podia sacar a reserva de OUTRO leilão em que a pessoa está liderando AGORA —
  // soltando dinheiro que devia estar travado e deixando um lance vivo sem lastro.
  //
  // Portanto, aqui devolve-se para UMA única conta: o líder que ainda estava com o
  // dinheiro preso NESTE leilão no momento do encerramento (auction.winner_id lido
  // ANTES do claim), e somente quando ele não for o vencedor final.
  // • Valor = lance dele + frete_reservado_valor deste leilão (mesma base do
  //   submitAtomicBid ao cobrir).
  // • O vencedor final NÃO entra: a reserva dele é consumida como pagamento.
  // • Idempotente: roda depois do claim atômico, que garante um único finalizador.
  const reservasDevolvidas = [];
  try {
    const liderPreso = auction.winner_id || null;
    if (liderPreso && liderPreso !== winnerId) {
      const valorPreso = money(
        (Number(auction.current_price) || 0) + (Number(auction.frete_reservado_valor) || 0)
      );
      const devolvido = await devolverReserva(liderPreso, valorPreso, auctionId);
      if (devolvido > 0) reservasDevolvidas.push({ user_id: liderPreso, valor: devolvido });
    }
  } catch (e) { console.warn('[FINALIZE] devolução de reservas:', e?.message); }

  // 💬 Mensagem de encerramento no chat — idempotente (só se ainda não existir).
  // Com vencedor: card de vitória. Sem lances: o mesmo card renderiza o modo
  // "encerrado sem lances" no cliente (winner: null).
  let victoryMessageCreated = false;
  try {
    const existing = await (await sb(
      `auction_messages?select=id&auction_id=eq.${enc(auctionId)}&message_type=eq.winner_announcement&limit=1`
    )).json();
    if (!Array.isArray(existing) || existing.length === 0) {
      const imgs = Array.isArray(auction.image_urls) ? auction.image_urls : [];
      const victoryData = {
        winner: winnerData,
        auction: {
          id: auction.id,
          title: auction.title || 'Produto',
          image_urls: [imgs[0] || FALLBACK_IMAGE],
          current_price: finalPrice,
          starting_price: money(auction.starting_price),
        },
      };
      await sb('auction_messages', {
        method: 'POST',
        body: JSON.stringify({
          auction_id: auctionId,
          message_type: 'winner_announcement',
          content: JSON.stringify(victoryData),
          sender_name: 'LanceIA',
          is_system_message: true,
          created_date: new Date().toISOString(),
        }),
      });
      victoryMessageCreated = true;
    }
  } catch (e) { console.warn('[FINALIZE] mensagem de vitória:', e?.message); }

  // 🧾 Log de sistema (best effort)
  try {
    await sb('system_logs', {
      method: 'POST',
      body: JSON.stringify({
        entity_id: auctionId,
        component_name: 'finalizeAuction',
        step: 'AUCTION_FINALIZED',
        status: 'success',
        message: `Encerrado no servidor. Vencedor: ${winnerName || 'sem lances'} — R$ ${finalPrice.toFixed(2)}`,
        created_date: new Date().toISOString(),
      }),
    });
  } catch (_) { /* log é opcional */ }

  return resultPayload(finalAuction, {
    winner: winnerData,
    victory_message_created: victoryMessageCreated,
    reservas_devolvidas: reservasDevolvidas,
  });
}