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

export default async function handler(req, res) {
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

      total = money(total + orfao);
      achados.push({
        user_id: uid,
        nome: conta.full_name || conta.email || uid,
        travado: reservado,
        reserva_legitima: legitimo,
        orfao,
        leiloes_em_disputa: vivos.length,
      });
    }

    // 📒 Só grava quando ACHA. Vigia que fala todo dia vira ruído e ninguém lê.
    if (achados.length) {
      const resumo = achados
        .slice(0, 10)
        .map((a) => `${a.nome}: R$ ${a.orfao.toFixed(2)}`)
        .join(' | ');
      try {
        await sb('system_logs', {
          method: 'POST',
          body: JSON.stringify({
            component_name: 'alertaReservasOrfas',
            step: 'RESERVA_ORFA',
            status: 'warning',
            message:
              `${achados.length} conta(s) com R$ ${total.toFixed(2)} travados sem leilão em disputa. ` +
              `Para devolver: faxinaReservasOrfas com confirmar='APLICAR'. Contas: ${resumo}`,
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
      ...(achados.length
        ? { o_que_fazer: "Rodar faxinaReservasOrfas com confirmar='APLICAR' para devolver." }
        : {}),
      ...(comDetalhe ? { detalhe: achados } : {}),
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
