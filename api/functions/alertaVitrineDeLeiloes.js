// alertaVitrineDeLeiloes — VIGIA DIÁRIO DA PRAÇA DE LEILÕES.
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE ISTO EXISTE
// ══════════════════════════════════════════════════════════════════════════════
// 16/09/2026, o dono olhando a Home: "só temos 2 leilões ativos".
//
// Estava certo, e não era defeito. O retrato do banco naquele dia:
//
//   14/09 ... ~30 leilões encerrando de 10 em 10 minutos
//   15/09 ... ~15 leilões encerrando de 30 em 30 minutos
//   16/09 ... ZERO encerrando, ZERO criados
//
// Sobraram 2, os dois terminando em 29/09. Ou seja: TREZE DIAS com a praça
// praticamente parada, e o site anunciando "Leilões Ativos: 2".
//
// A fila de agendados (`status='scheduled'`, que o activateScheduledAuctions
// abre de minuto em minuto) estava VAZIA. Nada travado, nada com defeito: o
// estoque de leilões simplesmente acabou e ninguém ficou sabendo.
//
// É o mesmo tipo de cegueira que o alertaReservasOrfas resolveu em 27/08 —
// dinheiro parado havia semanas porque a faxina só rodava quando alguém
// lembrava. A lição foi a mesma: o problema não é o esforço de resolver, é
// NINGUÉM FICAR SABENDO.
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE SÓ AVISA, E NÃO CRIA LEILÃO
// ══════════════════════════════════════════════════════════════════════════════
// Que produto vai a leilão, por quanto e quando é decisão comercial — envolve
// preço, estoque e margem. Este arquivo NÃO TEM NENHUMA ESCRITA na tabela
// `auctions`, e o teste tests/alertaVitrineDeLeiloes.test.mjs quebra se alguém
// acrescentar. Ele lê, conta e fala.
//
// ══════════════════════════════════════════════════════════════════════════════
// A CONTA
// ══════════════════════════════════════════════════════════════════════════════
// Conta o que um cliente encontraria para disputar:
//   • `status='active'` e `end_time` no futuro — leilão de verdade, aberto agora
//   • `status='scheduled'` — já está na fila, abre sozinho
// e NÃO conta plano de investimento (`is_investment_plan`), que mora na mesma
// tabela e não é leilão: em 16/09 eram 36 registros que inflariam a conta.
//
// Dois avisos, por motivos diferentes:
//   VITRINE CURTA ... poucos leilões abertos agora (o cliente chega e não tem o que disputar)
//   VAI ESVAZIAR .... nada encerrando nos próximos dias (a praça morre em silêncio)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Abaixo disto a praça está curta. Três é o mínimo pra existir disputa de verdade. */
export const MINIMO_NA_VITRINE = 3;
/** A janela que interessa: se nada encerra nos próximos dias, a praça vai parar. */
export const DIAS_DE_HORIZONTE = 3;

const sb = (caminho, init = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    ...init,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

export default async function handler(req, res) {
  // mesma trava dos outros crons: só a Vercel chama
  if (process.env.CRON_SECRET && (req.headers?.authorization || '') !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'nao_autorizado' });
  }
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Supabase env ausente' });

    const agora = new Date();
    const horizonte = new Date(agora.getTime() + DIAS_DE_HORIZONTE * 24 * 60 * 60 * 1000);

    const r = await sb(
      'auctions?select=id,title,status,end_time,is_investment_plan' +
        '&status=in.(active,scheduled)&order=end_time.asc'
    );
    if (!r.ok) return res.status(500).json({ success: false, error: `leitura falhou (${r.status})` });
    const linhas = await r.json();

    // plano de investimento mora na mesma tabela e não é leilão
    const leiloes = (linhas || []).filter((a) => !a.is_investment_plan);
    const abertos = leiloes.filter((a) => a.status === 'active' && a.end_time && new Date(a.end_time) > agora);
    const naFila = leiloes.filter((a) => a.status === 'scheduled');
    const encerramNoHorizonte = abertos.filter((a) => new Date(a.end_time) <= horizonte);

    const vitrineCurta = abertos.length < MINIMO_NA_VITRINE;
    const vaiEsvaziar = encerramNoHorizonte.length === 0 && naFila.length === 0;

    // 📒 Só grava quando ACHA. Vigia que fala todo dia vira ruído e ninguém lê.
    if (vitrineCurta || vaiEsvaziar) {
      const proximo = abertos[0]?.end_time
        ? new Date(abertos[0].end_time).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : 'nenhum';
      const partes = [];
      if (vitrineCurta) partes.push(`${abertos.length} leilão(ões) aberto(s) — o mínimo saudável é ${MINIMO_NA_VITRINE}`);
      if (vaiEsvaziar) partes.push(`nada encerra nos próximos ${DIAS_DE_HORIZONTE} dias e a fila de agendados está vazia`);
      try {
        await sb('system_logs', {
          method: 'POST',
          body: JSON.stringify({
            component_name: 'alertaVitrineDeLeiloes',
            step: vaiEsvaziar ? 'VITRINE_VAI_ESVAZIAR' : 'VITRINE_CURTA',
            status: 'warning',
            message:
              `Praça de leilões: ${partes.join('; ')}. ` +
              `Próximo encerramento: ${proximo}. Agendados na fila: ${naFila.length}. ` +
              'Para resolver: cadastrar leilões (podem entrar como `scheduled` — o activateScheduledAuctions abre sozinho).',
            created_at: new Date().toISOString(),
          }),
        });
      } catch (_) { /* o aviso é rede de segurança; nunca derruba a checagem */ }
    }

    return res.status(200).json({
      success: true,
      somente_leitura: 'Este vigia não cria nem altera leilão. Ele conta e avisa.',
      abertos_agora: abertos.length,
      agendados_na_fila: naFila.length,
      encerram_em_ate_3_dias: encerramNoHorizonte.length,
      proximo_encerramento: abertos[0]?.end_time || null,
      vitrine_curta: vitrineCurta,
      vai_esvaziar: vaiEsvaziar,
      ...(vitrineCurta || vaiEsvaziar
        ? { o_que_fazer: 'Cadastrar leilões. Podem entrar como `scheduled` que o activateScheduledAuctions abre na hora marcada.' }
        : {}),
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
