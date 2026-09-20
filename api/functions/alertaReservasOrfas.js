// alertaReservasOrfas — VIGIA DIÁRIO DE DINHEIRO TRAVADO SEM MOTIVO.
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE ISTO EXISTE
// ══════════════════════════════════════════════════════════════════════════════
// Em 27/08/2026 rodamos a faxinaReservasOrfas pela primeira vez desde que ela
// foi escrita (18/08) e encontramos R$ 134,00 travados em 7 contas. Uma delas
// tinha R$ 44,80 presos num lance que NUNCA foi gravado — o cliente abriu
// chamado achando que era outra coisa.
//
// O dinheiro estava lá havia semanas e ninguém sabia, porque a faxina só roda
// quando alguém lembra de rodar. Não estava em cron nenhum.
//
// Este endpoint é o vigia: roda sozinho todo dia e AVISA. Não conserta.
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE SÓ AVISA, E NÃO CONSERTA
// ══════════════════════════════════════════════════════════════════════════════
// Devolver reserva órfã é mover dinheiro de cliente. A faxinaReservasOrfas faz
// isso com todas as travas certas — mas exige um admin digitar 'APLICAR', de
// propósito. Automatizar a decisão tiraria a pessoa do circuito num caminho de
// dinheiro, e o ganho não compensa: o problema não é o esforço de aplicar, é
// ninguém FICAR SABENDO.
//
// Este arquivo NÃO TEM NENHUMA ESCRITA em app_users. Se um dia alguém
// acrescentar, o teste tests/alertaReservasOrfas.test.mjs quebra.
//
// ══════════════════════════════════════════════════════════════════════════════
// A CONTA (a mesma da faxinaReservasOrfas, linha por linha)
// ══════════════════════════════════════════════════════════════════════════════
//   reserva legítima = soma de (current_price + frete_reservado_valor) dos
//                      leilões em que a pessoa é winner_id, status active ou
//                      processing, e order_status ainda não 'paid'
//   órfão            = saldo_reservado − reserva legítima
//
// Se a regra mudar lá, tem que mudar aqui. Há teste comparando as duas.
//
// ══════════════════════════════════════════════════════════════════════════════
// PRIVACIDADE
// ══════════════════════════════════════════════════════════════════════════════
// A resposta pública traz só CONTAGEM e TOTAL — nome e valor por pessoa exigem
// a DIAG_KEY. O cron da Vercel chama sem chave nenhuma, então nome de cliente
// nunca sai por uma URL que qualquer um pode abrir.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

const enc = encodeURIComponent;
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// 🩹 20/09/2026 — DEVOLUÇÃO AUTOMÁTICA DA RESERVA 100% ÓRFÃ.
// O vigia avisou 4 dias seguidos "Alberto: R$ 573,22 travados" num system_logs que
// ninguém lê, enquanto o cliente via o dinheiro sumido. Regra do dono: "se ele for
// superado, o dinheiro tem que voltar". Então, quando a pessoa NÃO lidera leilão
// nenhum (em disputa ou por liquidar) e a última reserva dela tem mais de 2 horas
// (nenhum lance em andamento), a reserva inteira volta pro disponível, com trava
// CAS e linha no livro-caixa. Reserva parcial (lidera algo) continua só avisando.
async function devolverReservaOrfa(uid, reservadoLido) {
  for (let t = 0; t < 3; t++) {
    const rows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${enc(uid)}&limit=1`)).json().catch(() => []);
    const u = Array.isArray(rows) ? rows[0] : null;
    if (!u) return 0;
    const disponivel = money(u.saldo_disponivel);
    const reservado = money(u.saldo_reservado);
    if (reservado <= 0 || reservado !== money(reservadoLido)) return 0; // mudou desde a leitura: não mexe
    const fDisp = disponivel === 0 ? 'or(saldo_disponivel.eq.0,saldo_disponivel.is.null)' : `saldo_disponivel.eq.${disponivel}`;
    const r = await sb(`app_users?id=eq.${enc(uid)}&and=(${fDisp},saldo_reservado.eq.${reservado})`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ saldo_disponivel: money(disponivel + reservado), saldo_reservado: 0 }),
    });
    const upd = await r.json().catch(() => []);
    if (!Array.isArray(upd) || !upd.length) continue; // corrida: relê
    try {
      await sb('reserva_ledger', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: uid, auction_id: null, tipo: 'devolucao_reserva_orfa', direcao: 'saida_reserva',
          valor: reservado, saldo_antes: reservado, saldo_depois: 0, origem: 'alertaReservasOrfas(auto)',
          observacao: 'Reserva sem nenhum leilão em disputa ou por liquidar, quieta há mais de 2h: devolvida automaticamente pelo vigia diário.',
        }),
      });
    } catch (_) { /* extrato secundário */ }
    return reservado;
  }
  return 0;
}

export default async function handler(req, res) {
  // 🔐 AUDITORIA 15/09/2026 — cron: com CRON_SECRET configurado na Vercel, só aceita a chamada
  // que a própria Vercel manda (Authorization: Bearer). Sem a variável, segue aberto como era.
  if (process.env.CRON_SECRET && (req.headers?.authorization || '') !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'nao_autorizado' });
  }
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    // Detalhe por pessoa só com a chave de diagnóstico. O cron não manda chave.
    let corpo = req.body;
    if (typeof corpo === 'string') { try { corpo = JSON.parse(corpo); } catch { corpo = {}; } }
    const comDetalhe = Boolean(process.env.DIAG_KEY) && corpo?.key === process.env.DIAG_KEY;

    const contas = await (await sb(
      'app_users?select=id,full_name,email,saldo_reservado&saldo_reservado=gt.0&order=saldo_reservado.desc'
    )).json().catch(() => []);
    if (!Array.isArray(contas)) return res.status(200).json({ success: false, error: 'Falha ao ler contas' });

    const achados = [];
    let total = 0;
    let totalDevolvido = 0;

    for (const conta of contas) {
      const uid = String(conta.id);
      const reservado = money(conta.saldo_reservado);

      const leiloes = await (await sb(
        `auctions?select=id,title,current_price,frete_reservado_valor,status,order_status&winner_id=eq.${enc(uid)}&status=in.(active,processing)`
      )).json().catch(() => []);
      const vivos = (Array.isArray(leiloes) ? leiloes : []).filter((a) => a.order_status !== 'paid');
      const legitimo = money(
        vivos.reduce((s, a) => s + (Number(a.current_price) || 0) + (Number(a.frete_reservado_valor) || 0), 0)
      );

      const orfao = money(reservado - legitimo);
      if (orfao <= 0) continue;   // reserva toda legítima

      // 🩹 devolução automática: só quando a reserva INTEIRA é órfã, a pessoa não é
      // vencedora de nada por liquidar (leilão encerrado e ainda não pago) e a
      // última reserva dela tem mais de 2h (nenhum lance no meio do caminho).
      let devolvido = 0;
      if (vivos.length === 0 && orfao === reservado) {
        const porLiquidar = await (await sb(
          `auctions?select=id&winner_id=eq.${enc(uid)}&order_status=not.eq.paid&updated_at=gte.${enc(new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())}&limit=1`
        )).json().catch(() => [null]);
        const ult = await (await sb(`reserva_ledger?select=created_at&user_id=eq.${enc(uid)}&direcao=eq.entrada_reserva&order=created_at.desc&limit=1`)).json().catch(() => []);
        const ultimaEntrada = Array.isArray(ult) && ult[0]?.created_at ? new Date(ult[0].created_at).getTime() : 0;
        const quieta = Date.now() - ultimaEntrada > 2 * 60 * 60 * 1000;
        if (Array.isArray(porLiquidar) && porLiquidar.length === 0 && quieta) devolvido = await devolverReservaOrfa(uid, reservado);
      }

      total = money(total + orfao);
      totalDevolvido = money(totalDevolvido + devolvido);
      achados.push({
        user_id: uid,
        nome: conta.full_name || conta.email || uid,
        travado: reservado,
        reserva_legitima: legitimo,
        orfao,
        devolvido,
        leiloes_em_disputa: vivos.length,
      });
    }

    // 📒 Só grava quando ACHA. Vigia que fala todo dia vira ruído e ninguém lê.
    if (achados.length) {
      const resumo = achados
        .slice(0, 10)
        .map((a) => `${a.nome}: R$ ${a.orfao.toFixed(2)}${a.devolvido > 0 ? ' (DEVOLVIDO automaticamente)' : ''}`)
        .join(' | ');
      try {
        await sb('system_logs', {
          method: 'POST',
          body: JSON.stringify({
            component_name: 'alertaReservasOrfas',
            step: 'RESERVA_ORFA',
            status: 'warning',
            message:
              `${achados.length} conta(s) com R$ ${total.toFixed(2)} travados sem leilão em disputa` +
              (totalDevolvido > 0 ? ` — R$ ${totalDevolvido.toFixed(2)} devolvidos automaticamente` : '') +
              `. Restante: faxinaReservasOrfas com confirmar='APLICAR'. Contas: ${resumo}`,
            created_at: new Date().toISOString(),
          }),
        });
      } catch (_) { /* o aviso é rede de segurança; nunca derruba a checagem */ }
    }

    return res.status(200).json({
      success: true,
      somente_leitura: 'Este vigia não move dinheiro. Quem devolve é a faxinaReservasOrfas, com APLICAR.',
      contas_analisadas: contas.length,
      contas_com_orfao: achados.length,
      total_travado_sem_motivo: total,
      total_devolvido_automaticamente: totalDevolvido,
      ...(achados.length
        ? { o_que_fazer: "Rodar faxinaReservasOrfas com confirmar='APLICAR' para devolver." }
        : {}),
      ...(comDetalhe ? { detalhe: achados } : {}),
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
