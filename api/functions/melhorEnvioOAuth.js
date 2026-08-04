// melhorEnvioOAuth — PONTO 81 FASE 1B: autorização OAuth do Melhor Envio.
//
// 🔴 Risco alto (credencial de logística). Escopo ESTRITAMENTE contido: esta
// função SÓ obtém, guarda e renova o token de usuário do Melhor Envio.
// NÃO cota frete, NÃO cria carrinho, NÃO paga etiqueta, NÃO gera etiqueta.
//
// ⚠️ A cotação de frete atual (api/_lib/frete.js + cotarFrete) NÃO passa por
// aqui e continua usando MELHOR_ENVIO_TOKEN exatamente como antes. Se esta
// função falhar, o cálculo de frete do site segue funcionando normalmente.
//
// ⚠️ POR QUE ESTA VERSÃO VERCEL EXISTE: o adapter do app
// (src/api/base44Adapter.js) manda base44.functions.invoke para
// /api/functions/<nome>. A versão Deno em base44/functions/melhorEnvioOAuth
// NÃO é alcançável pelo navegador deste app — ela fica lá só como referência.
// Mexeu aqui, considere espelhar lá.
//
// ⚠️ Sandbox e produção são contas SEPARADAS no Melhor Envio. O token vale só
// para MELHOR_ENVIO_AMBIENTE. Trocar de ambiente exige NOVA autorização.
//
// Ações (body.acao): 'autorizar_url' | 'status' | 'trocar' | 'renovar'
// Autenticação: body.actorId precisa ser admin/super_admin em app_users.
// O token NUNCA vai na resposta e NUNCA é escrito em log.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ESCOPOS = 'cart-read cart-write shipping-calculate shipping-checkout shipping-generate shipping-print orders-read users-read';
const UA = 'Leilao NoZap (contato@leilaonozap.net)';

function baseUrl(ambiente) {
  return ambiente === 'producao'
    ? 'https://melhorenvio.com.br'
    : 'https://sandbox.melhorenvio.com.br';
}

// Normaliza a URL do Supabase (o secret já veio com /rest/v1 no passado)
function sb(path, opts = {}) {
  const root = String(SUPABASE_URL || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  return fetch(`${root}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SR,
      Authorization: `Bearer ${SR}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

async function tokenVigente(ambiente) {
  const r = await sb(`melhor_envio_tokens?select=*&ambiente=eq.${ambiente}&ativo=is.true&order=obtido_em.desc&limit=1`);
  const j = await r.json().catch(() => null);
  return Array.isArray(j) && j.length ? j[0] : null;
}

async function salvarNovoToken(ambiente, dados) {
  const agora = new Date();
  const expira = new Date(agora.getTime() + (Number(dados.expires_in) || 2592000) * 1000);
  // desativa autorizações anteriores do MESMO ambiente (mantém histórico)
  await sb(`melhor_envio_tokens?ambiente=eq.${ambiente}&ativo=is.true`, {
    method: 'PATCH',
    body: JSON.stringify({ ativo: false }),
  });
  const resp = await sb('melhor_envio_tokens', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      ambiente,
      access_token: dados.access_token,
      refresh_token: dados.refresh_token || null,
      expires_at: expira.toISOString(),
      obtido_em: agora.toISOString(),
      escopos: ESCOPOS,
      ativo: true,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    // pista útil sem expor credencial
    const falta = /melhor_envio_tokens/i.test(txt) && /does not exist|schema cache/i.test(txt);
    return {
      ok: false,
      error: falta
        ? 'A tabela melhor_envio_tokens ainda não existe no banco. Rode a migração 20260804_melhor_envio_tokens.sql no Supabase.'
        : 'Autorização obtida, mas não foi possível salvar o token no banco.',
    };
  }
  return { ok: true, expira_em: expira.toISOString() };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método não permitido' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};

    if (!SUPABASE_URL || !SR) {
      return res.status(200).json({ ok: false, error: 'Config do servidor ausente (Supabase).' });
    }

    // ── autorização: só admin/super_admin ──
    const actorId = String(body.actorId || '').trim();
    if (!actorId) {
      return res.status(200).json({ ok: false, error: 'Sessão não identificada. Entre novamente como administrador.' });
    }
    const atorResp = await sb(`app_users?select=id,role&id=eq.${encodeURIComponent(actorId)}&limit=1`);
    const atorJson = await atorResp.json().catch(() => null);
    const ator = Array.isArray(atorJson) ? atorJson[0] : null;
    if (!ator) {
      return res.status(200).json({ ok: false, error: 'Usuário não encontrado.' });
    }
    if (ator.role !== 'admin' && ator.role !== 'super_admin') {
      return res.status(200).json({ ok: false, error: 'Apenas administradores.' });
    }

    const ambiente = String(process.env.MELHOR_ENVIO_AMBIENTE || 'sandbox').toLowerCase() === 'producao'
      ? 'producao'
      : 'sandbox';

    // Aceita nomes por ambiente (SANDBOX_/PRODUCAO_) e cai no nome genérico.
    // Sandbox e produção são apps SEPARADOS no Melhor Envio, com credenciais próprias.
    const CLIENT_ID = ambiente === 'producao'
      ? (process.env.MELHOR_ENVIO_PRODUCAO_CLIENT_ID || process.env.MELHOR_ENVIO_CLIENT_ID)
      : (process.env.MELHOR_ENVIO_SANDBOX_CLIENT_ID || process.env.MELHOR_ENVIO_CLIENT_ID);
    const CLIENT_SECRET = ambiente === 'producao'
      ? (process.env.MELHOR_ENVIO_PRODUCAO_CLIENT_SECRET || process.env.MELHOR_ENVIO_CLIENT_SECRET)
      : (process.env.MELHOR_ENVIO_SANDBOX_CLIENT_SECRET || process.env.MELHOR_ENVIO_CLIENT_SECRET);
    const REDIRECT_URI = process.env.MELHOR_ENVIO_REDIRECT_URI;

    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
      // Diz exatamente O QUE falta, sem nunca revelar valor de credencial.
      const faltando = [
        !CLIENT_ID && 'CLIENT_ID',
        !CLIENT_SECRET && 'CLIENT_SECRET',
        !REDIRECT_URI && 'MELHOR_ENVIO_REDIRECT_URI',
      ].filter(Boolean).join(', ');
      return res.status(200).json({
        ok: false,
        ambiente,
        error: `Faltando na Vercel (ambiente ${ambiente}): ${faltando}. `
          + 'Atenção: variáveis salvas no painel do Base44 NÃO chegam às rotas /api da Vercel — '
          + 'elas precisam ser cadastradas em Settings › Environment Variables do projeto na Vercel e o projeto redeployado.',
      });
    }

    const API = baseUrl(ambiente);
    const acao = String(body.acao || 'status');

    // ── monta a URL de autorização ──
    if (acao === 'autorizar_url') {
      const state = crypto.randomUUID();
      const url = `${API}/oauth/authorize?client_id=${encodeURIComponent(CLIENT_ID)}`
        + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
        + `&response_type=code&state=${encodeURIComponent(state)}`
        + `&scope=${encodeURIComponent(ESCOPOS)}`;
      return res.status(200).json({ ok: true, url, state, ambiente, redirect_uri: REDIRECT_URI });
    }

    // ── status: existe token vigente? (nunca devolve o token) ──
    if (acao === 'status') {
      const t = await tokenVigente(ambiente);
      if (!t) return res.status(200).json({ ok: true, autorizado: false, ambiente, redirect_uri: REDIRECT_URI });
      const vencido = t.expires_at ? new Date(t.expires_at).getTime() < Date.now() : false;
      return res.status(200).json({
        ok: true,
        autorizado: true,
        vencido,
        ambiente,
        expira_em: t.expires_at || null,
        obtido_em: t.obtido_em || null,
        redirect_uri: REDIRECT_URI,
      });
    }

    // ── troca o code do callback por access_token + refresh_token ──
    if (acao === 'trocar') {
      const code = String(body.code || '').trim();
      if (!code) return res.status(200).json({ ok: false, error: 'Código de autorização ausente.' });

      const resp = await fetch(`${API}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          code,
        }),
      });

      const raw = await resp.text();
      let dados = null;
      try { dados = JSON.parse(raw); } catch { dados = null; }

      if (!resp.ok || !dados?.access_token) {
        // ⚠️ não devolvemos o corpo: pode conter credencial.
        const detalhe = /invalid_grant/i.test(String(raw))
          ? 'O código expirou ou já foi usado. Clique em Autorizar novamente (o código vale poucos segundos).'
          : /redirect_uri/i.test(String(raw))
            ? 'A URL de callback não é idêntica à cadastrada no app do Melhor Envio.'
            : 'O Melhor Envio recusou a troca do código.';
        return res.status(200).json({ ok: false, error: detalhe, status: resp.status });
      }

      const salvo = await salvarNovoToken(ambiente, dados);
      if (!salvo.ok) return res.status(200).json(salvo);
      return res.status(200).json({ ok: true, ambiente, expira_em: salvo.expira_em });
    }

    // ── renova pelo refresh_token (validade 45 dias) ──
    if (acao === 'renovar') {
      const t = await tokenVigente(ambiente);
      if (!t?.refresh_token) {
        return res.status(200).json({ ok: false, error: 'Não há token de renovação. É preciso autorizar novamente.' });
      }

      const resp = await fetch(`${API}/oauth/token`, {
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
        return res.status(200).json({
          ok: false,
          error: 'Não foi possível renovar. Autorize novamente no Melhor Envio.',
          status: resp.status,
        });
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
        return res.status(200).json({ ok: false, error: 'Token renovado, mas não foi possível gravar no banco.' });
      }
      return res.status(200).json({ ok: true, ambiente, expira_em: expira.toISOString() });
    }

    return res.status(200).json({ ok: false, error: 'Ação não reconhecida.' });
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'Erro na integração do Melhor Envio.', details: String(e?.message || e) });
  }
}