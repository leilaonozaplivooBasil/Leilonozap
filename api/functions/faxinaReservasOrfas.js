// faxinaReservasOrfas — SANEAMENTO DE SALDO RESERVADO ÓRFÃO (18/08/2026)
//
// PROBLEMA QUE ESTA FUNÇÃO RESOLVE:
// Antes das correções desta data, três caminhos prendiam dinheiro do cliente:
//   • o arremate cobrava do saldo disponível e deixava a reserva travada (cobrança dupla);
//   • apagar um leilão não devolvia a reserva do líder;
//   • cancelar um leilão também não devolvia.
// Resultado: contas com `saldo_reservado` apontando pra leilão que já acabou, já foi pago
// ou nem existe mais. O cliente vê o dinheiro na conta mas não consegue usar.
//
// As correções fecham a torneira DE HOJE PRA FRENTE. Esta função limpa o que já vazou.
//
// O QUE FAZ:
// Para cada conta com saldo reservado, recalcula quanto DEVERIA estar reservado
// (soma dos lances em que a pessoa é líder de leilão AINDA EM DISPUTA e não pago).
// A diferença é órfã → volta pro saldo disponível, com linha no livro-caixa.
//
// 🔒 TRAVAS DE SEGURANÇA (todas obrigatórias):
//   1. Só admin/super_admin executa.
//   2. MODO PADRÃO É RETRATO (dry-run): NÃO move um centavo, só mostra o que faria.
//      Para aplicar de verdade é preciso mandar confirmar: 'APLICAR'.
//   3. Nunca cria dinheiro: o valor sai da reserva e entra no disponível, soma igual.
//   4. Nunca devolve mais do que está reservado; nunca deixa saldo negativo.
//   5. Trava anticorrida (CAS) nas duas colunas: se entrar lance/depósito no mesmo
//      instante, a conta é recalculada em vez de sobrescrita.
//   6. Toda movimentação vira linha em `reserva_ledger` — auditável pra sempre.
//   7. Reserva legítima de leilão em disputa é PRESERVADA (nunca liberada).
//
// ⚠️ Roda no SERVIDOR (Vercel/Node). Sem imports de 2 níveis (já derrubou função em
// produção): tudo inline de propósito.

import { exigirSessao } from '../_lib/sessao.js';
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '')
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/+$/, '');
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
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido' });

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    const actorId = String(body?.actorId || '').trim();
    // 🔐 CRACHÁ DE SESSÃO — ETAPA 1 (só anota no log). Ver api/_lib/sessao.js.
    // Enquanto SESSAO_MODO não for 'bloquear', isto NUNCA recusa ninguém:
    // serve pra mostrar, com tráfego real, se sobrou tela sem mandar o crachá.
    const _ses = exigirSessao(req, actorId, 'faxinaReservasOrfas');
    if (!_ses.liberado) return res.status(_ses.http).json({ success: false, error: 'nao_autenticado' });
    // 🔒 só move dinheiro se vier a palavra exata — qualquer outra coisa é só retrato
    const aplicar = String(body?.confirmar || '') === 'APLICAR';
    // opcional: sanear UMA conta só (útil pra tratar caso a caso)
    const somenteUserId = body?.userId ? String(body.userId) : null;

    if (!actorId) return res.status(400).json({ success: false, error: 'actorId obrigatório' });
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });

    // 🔒 TRAVA 1 — só admin
    const actorArr = await (await sb(`app_users?select=id,role&id=eq.${enc(actorId)}&limit=1`)).json();
    const actor = Array.isArray(actorArr) ? actorArr[0] : null;
    if (!actor || !['admin', 'super_admin'].includes(actor.role)) {
      return res.status(403).json({ success: false, error: 'Sem permissão' });
    }

    // 1) Contas que têm saldo reservado hoje
    const filtroUser = somenteUserId ? `&id=eq.${enc(somenteUserId)}` : '';
    const contas = await (await sb(
      `app_users?select=id,full_name,email,saldo_disponivel,saldo_reservado&saldo_reservado=gt.0${filtroUser}&order=saldo_reservado.desc`
    )).json();
    if (!Array.isArray(contas)) {
      return res.status(200).json({ success: false, error: 'Falha ao ler contas' });
    }

    const relatorio = [];
    let totalOrfao = 0;
    let totalLiberado = 0;

    for (const conta of contas) {
      const uid = String(conta.id);
      const reservado = money(conta.saldo_reservado);

      // 2) Quanto DEVERIA estar reservado: lances em que ele é líder de leilão VIVO.
      //    Leilão vivo = status ativo/processando E pedido ainda não pago.
      const leiloes = await (await sb(
        `auctions?select=id,title,current_price,frete_reservado_valor,status,order_status&winner_id=eq.${enc(uid)}&status=in.(active,processing)`
      )).json();
      const vivos = (Array.isArray(leiloes) ? leiloes : []).filter((a) => a.order_status !== 'paid');
      const legitimo = money(
        vivos.reduce((s, a) => s + (Number(a.current_price) || 0) + (Number(a.frete_reservado_valor) || 0), 0)
      );

      const orfao = money(reservado - legitimo);
      if (orfao <= 0) continue; // reserva toda legítima — não mexe

      totalOrfao = money(totalOrfao + orfao);

      const linha = {
        user_id: uid,
        nome: conta.full_name || conta.email || uid,
        saldo_reservado_atual: reservado,
        reserva_legitima: legitimo,
        orfao_a_liberar: orfao,
        leiloes_em_disputa: vivos.map((a) => ({ id: a.id, titulo: a.title })),
        aplicado: false,
      };

      // 🔒 TRAVA 2 — sem 'APLICAR', para aqui: só retrato
      if (!aplicar) { relatorio.push(linha); continue; }

      // 3) Move de verdade, com trava anticorrida nas duas colunas
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        const uRows = await (await sb(`app_users?select=saldo_disponivel,saldo_reservado&id=eq.${enc(uid)}&limit=1`)).json();
        const u = Array.isArray(uRows) ? uRows[0] : null;
        if (!u) break;

        const disponivelAgora = money(u.saldo_disponivel);
        const reservadoAgora = money(u.saldo_reservado);
        // nunca libera mais do que existe reservado neste instante
        const liberar = money(Math.min(orfao, reservadoAgora));
        if (liberar <= 0) break;

        // coluna nunca inicializada fica NULL, e "eq.0" nunca casa com NULL
        const fDisp = disponivelAgora === 0
          ? 'or(saldo_disponivel.eq.0,saldo_disponivel.is.null)'
          : `saldo_disponivel.eq.${disponivelAgora}`;
        const fRes = `saldo_reservado.eq.${reservadoAgora}`;

        const patch = await sb(`app_users?id=eq.${enc(uid)}&and=(${fDisp},${fRes})`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            saldo_disponivel: money(disponivelAgora + liberar),
            saldo_reservado: money(reservadoAgora - liberar),
          }),
        });
        const updated = await patch.json().catch(() => []);
        if (!Array.isArray(updated) || !updated.length) continue; // corrida: relê e tenta de novo

        linha.aplicado = true;
        linha.valor_liberado = liberar;
        linha.saldo_disponivel_depois = money(disponivelAgora + liberar);
        linha.saldo_reservado_depois = money(reservadoAgora - liberar);
        totalLiberado = money(totalLiberado + liberar);

        // 🔒 TRAVA 6 — livro-caixa (best-effort: não desfaz a devolução se o log falhar)
        try {
          await sb('reserva_ledger', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({
              user_id: uid,
              auction_id: null,
              tipo: 'faxina_reserva_orfa',
              direcao: 'saida_reserva',
              valor: liberar,
              saldo_antes: reservadoAgora,
              saldo_depois: money(reservadoAgora - liberar),
              origem: 'faxinaReservasOrfas',
              observacao: `Saneamento 18/08/2026 — reserva sem leilão vivo. Legítimo mantido: ${legitimo}`,
            }),
          });
        } catch (e) { console.warn('[FAXINA] livro-caixa:', e?.message); }

        break;
      }

      relatorio.push(linha);
    }

    return res.status(200).json({
      success: true,
      modo: aplicar ? 'APLICADO' : 'RETRATO (nada foi movido)',
      contas_analisadas: contas.length,
      contas_com_orfao: relatorio.length,
      total_orfao_encontrado: totalOrfao,
      total_liberado: aplicar ? totalLiberado : 0,
      detalhe: relatorio,
    });
  } catch (e) {
    return res.status(200).json({ success: false, error: 'Erro', details: String(e?.message || e) });
  }
}