// renovarTokenMelhorEnvio — renovação AUTOMÁTICA do token OAuth do Melhor Envio.
//
// 🔴 POR QUE ESTA ROTA EXISTE (22/08/2026)
// O token de acesso do Melhor Envio vence em 30 dias e o refresh em 45. Até aqui a
// renovação era um BOTÃO MANUAL na tela /integracoes/melhor-envio — alguém precisava
// lembrar de clicar, todo mês, para sempre. Está registrado como pendência aberta
// desde 04/08/2026 (MUDANCAS.md, PONTO 81: "Pendência: agendar a renovação
// automática (hoje é botão manual)").
//
// A consequência de esquecer não é um aviso: é a etiqueta parar de ser gerada em
// silêncio. E, passados os 45 dias do refresh, não dá mais para renovar — só
// refazendo a autorização OAuth inteira à mão.
//
// Por que uma rota separada, e não o `melhorEnvioOAuth`: aquela exige um admin
// logado (confere `app_users.role`), e cron da Vercel não tem sessão de usuário
// nenhuma. A lógica de renovação é a mesma da ação 'renovar' de lá.
//
// Roda 1x/dia pelo cron (vercel.json). Renova só quando falta pouco para vencer —
// rodar todo dia não gera token novo todo dia.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UA = 'Leilao NoZap (contato@leilaonozap.net)';
const ESCOPOS = 'cart-read cart-write shipping-calculate shipping-checkout shipping-generate shipping-print orders-read users-read';

// Renova quando faltam 7 dias ou menos para o access_token vencer. Com o refresh
// valendo 45 e o access 30, essa folga dá 7 dias de tentativas diárias antes de
// qualquer risco real — um dia de falha (API fora do ar) não perde a janela.
const DIAS_ANTES = 7;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

function baseUrl(ambiente) {
  return ambiente === 'producao' ? 'https://melhorenvio.com.br' : 'https://sandbox.melhorenvio.com.br';
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'Config do servidor ausente' });

    const ambiente = String(process.env.MELHOR_ENVIO_AMBIENTE || 'producao').toLowerCase() === 'sandbox'
      ? 'sandbox'
      : 'producao';

    const CLIENT_ID = ambiente === 'producao'
      ? (process.env.MELHOR_ENVIO_PRODUCAO_CLIENT_ID || process.env.MELHOR_ENVIO_CLIENT_ID)
      : (process.env.MELHOR_ENVIO_SANDBOX_CLIENT_ID || process.env.MELHOR_ENVIO_CLIENT_ID);
    const CLIENT_SECRET = ambiente === 'producao'
      ? (process.env.MELHOR_ENVIO_PRODUCAO_CLIENT_SECRET || process.env.MELHOR_ENVIO_CLIENT_SECRET)
      : (process.env.MELHOR_ENVIO_SANDBOX_CLIENT_SECRET || process.env.MELHOR_ENVIO_CLIENT_SECRET);

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return res.status(200).json({ ok: false, ambiente, error: 'CLIENT_ID/CLIENT_SECRET do Melhor Envio ausentes na Vercel.' });
    }

    const r = await sb(`melhor_envio_tokens?select=*&ambiente=eq.${ambiente}&ativo=is.true&order=obtido_em.desc&limit=1`);
    const j = await r.json().catch(() => null);
    const t = Array.isArray(j) && j.length ? j[0] : null;

    if (!t) return res.status(200).json({ ok: true, ambiente, acao: 'nada', motivo: 'sem_token_ativo' });
    if (!t.refresh_token) {
      // Sem refresh não há renovação possível — só reautorizar à mão. Alto o
      // suficiente para aparecer no log, porque a etiqueta vai parar quando vencer.
      console.error(`[MelhorEnvio] token ${ambiente} sem refresh_token — reautorize em /integracoes/melhor-envio`);
      return res.status(200).json({ ok: false, ambiente, error: 'sem_refresh_token' });
    }

    const expiraEm = t.expires_at ? new Date(t.expires_at).getTime() : 0;
    const limite = Date.now() + DIAS_ANTES * 24 * 60 * 60 * 1000;
    if (expiraEm && expiraEm > limite) {
      return res.status(200).json({ ok: true, ambiente, acao: 'nada', motivo: 'ainda_valido', expira_em: t.expires_at });
    }

    const resp = await fetch(`${baseUrl(ambiente)}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: t.refresh_token,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: ESCOPOS,
      }),
    });

    const raw = await resp.text();
    let dados = null;
    try { dados = JSON.parse(raw); } catch { dados = null; }

    if (!resp.ok || !dados?.access_token) {
      // Falhar aqui é grave e silencioso por natureza — sem log, ninguém descobre
      // até a etiqueta parar. Nunca loga o token, só status e corpo do erro.
      console.error(`[MelhorEnvio] renovação automática falhou (${ambiente}): ${resp.status} ${raw.slice(0, 300)}`);
      return res.status(200).json({ ok: false, ambiente, error: 'renovacao_falhou', status: resp.status });
    }

    const agora = new Date();
    const expira = new Date(agora.getTime() + (Number(dados.expires_in) || 2592000) * 1000);
    const upd = await sb(`melhor_envio_tokens?id=eq.${t.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        access_token: dados.access_token,
        refresh_token: dados.refresh_token || t.refresh_token,
        expires_at: expira.toISOString(),
        obtido_em: agora.toISOString(),
      }),
    });
    if (!upd.ok) {
      console.error(`[MelhorEnvio] token ${ambiente} renovado mas NÃO gravado no banco — a próxima chamada ainda usa o antigo.`);
      return res.status(200).json({ ok: false, ambiente, error: 'gravacao_falhou' });
    }

    console.log(`[MelhorEnvio] token ${ambiente} renovado automaticamente — vence em ${expira.toISOString()}`);
    return res.status(200).json({ ok: true, ambiente, acao: 'renovado', expira_em: expira.toISOString() });
  } catch (e) {
    console.error('[MelhorEnvio] renovação automática — erro inesperado:', e?.message);
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}
