// melhorEnvioOAuth — PONTO 81 FASE 1: autorização OAuth do Melhor Envio.
//
// 🔴 Risco alto (integração de logística). Escopo ESTRITAMENTE contido:
// esta função SÓ obtém, guarda e renova o token de usuário do Melhor Envio.
// Ela NÃO cota frete, NÃO cria carrinho, NÃO paga etiqueta, NÃO gera etiqueta.
//
// ⚠️ A cotação de frete atual (api/_lib/frete.js + cotarFrete) NÃO passa por aqui
// e continua usando MELHOR_ENVIO_TOKEN exatamente como antes. Se esta função
// falhar, o cálculo de frete do site segue funcionando normalmente.
//
// ⚠️ Sandbox e produção são contas SEPARADAS no Melhor Envio, sem qualquer
// relação de dados. O token guardado aqui vale só para o ambiente definido em
// MELHOR_ENVIO_AMBIENTE. Trocar de ambiente exige NOVA autorização.
//
// Ações (payload.acao):
//   'autorizar_url' → devolve a URL de autorização + o state a guardar
//   'trocar'        → troca o ?code= recebido no callback por access_token
//   'status'        → informa se existe token válido (sem devolver o token)
//   'renovar'       → renova pelo refresh_token
//
// Somente admin. O token NUNCA é devolvido ao frontend nem escrito em log.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const ESCOPOS = 'cart-read cart-write shipping-calculate shipping-checkout shipping-generate shipping-print orders-read users-read';
const UA = 'Leilao NoZap (contato@leilaonozap.net)';

function baseUrl(ambiente) {
  return ambiente === 'producao'
    ? 'https://melhorenvio.com.br'
    : 'https://sandbox.melhorenvio.com.br';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'Não autenticado.' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ ok: false, error: 'Apenas administradores.' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch (_) { body = {}; }
    const acao = String(body?.acao || 'status');

    const CLIENT_ID = Deno.env.get('MELHOR_ENVIO_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('MELHOR_ENVIO_CLIENT_SECRET');
    const REDIRECT_URI = Deno.env.get('MELHOR_ENVIO_REDIRECT_URI');
    const ambiente = String(Deno.env.get('MELHOR_ENVIO_AMBIENTE') || 'sandbox').toLowerCase() === 'producao'
      ? 'producao'
      : 'sandbox';

    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
      return Response.json({
        ok: false,
        error: 'Integração incompleta: falta CLIENT_ID, CLIENT_SECRET ou REDIRECT_URI nas variáveis de ambiente.',
      });
    }

    const API = baseUrl(ambiente);
    const store = base44.asServiceRole.entities.MelhorEnvioToken;

    // ── monta a URL de autorização (o admin clica e autoriza no Melhor Envio) ──
    if (acao === 'autorizar_url') {
      const state = crypto.randomUUID();
      const url = `${API}/oauth/authorize?client_id=${encodeURIComponent(CLIENT_ID)}`
        + `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`
        + `&response_type=code&state=${encodeURIComponent(state)}`
        + `&scope=${encodeURIComponent(ESCOPOS)}`;
      return Response.json({ ok: true, url, state, ambiente, redirect_uri: REDIRECT_URI });
    }

    // ── status: existe token vigente? (nunca devolve o token) ──
    if (acao === 'status') {
      const encontrados = await store.filter({ ambiente, ativo: true });
      const t = Array.isArray(encontrados) && encontrados.length
        ? encontrados.sort((a, b) => String(b.obtido_em || '').localeCompare(String(a.obtido_em || '')))[0]
        : null;
      if (!t) return Response.json({ ok: true, autorizado: false, ambiente, redirect_uri: REDIRECT_URI });
      const vencido = t.expires_at ? new Date(t.expires_at).getTime() < Date.now() : false;
      return Response.json({
        ok: true,
        autorizado: true,
        vencido,
        ambiente,
        expira_em: t.expires_at || null,
        obtido_em: t.obtido_em || null,
        redirect_uri: REDIRECT_URI,
      });
    }

    // ── troca o code (recebido no callback) por access_token + refresh_token ──
    if (acao === 'trocar') {
      const code = String(body?.code || '').trim();
      if (!code) return Response.json({ ok: false, error: 'Código de autorização ausente.' });

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
      try { dados = JSON.parse(raw); } catch (_) { dados = null; }

      if (!resp.ok || !dados?.access_token) {
        // ⚠️ não logamos o corpo: pode conter credencial. Mensagem em português pro admin.
        const detalhe = /invalid_grant/i.test(String(raw))
          ? 'O código expirou ou já foi usado. Clique em Autorizar novamente (o código vale poucos segundos).'
          : /redirect_uri/i.test(String(raw))
            ? 'A URL de callback não é idêntica à cadastrada no app do Melhor Envio.'
            : 'O Melhor Envio recusou a troca do código.';
        return Response.json({ ok: false, error: detalhe, status: resp.status });
      }

      const agora = new Date();
      const expira = new Date(agora.getTime() + (Number(dados.expires_in) || 2592000) * 1000);

      // desativa autorizações anteriores do MESMO ambiente (mantém histórico)
      const antigos = await store.filter({ ambiente, ativo: true });
      for (const a of (Array.isArray(antigos) ? antigos : [])) {
        await store.update(a.id, { ativo: false });
      }

      await store.create({
        ambiente,
        access_token: dados.access_token,
        refresh_token: dados.refresh_token || '',
        expires_at: expira.toISOString(),
        obtido_em: agora.toISOString(),
        escopos: ESCOPOS,
        ativo: true,
      });

      return Response.json({ ok: true, ambiente, expira_em: expira.toISOString() });
    }

    // ── renova pelo refresh_token (validade 45 dias) ──
    if (acao === 'renovar') {
      const encontrados = await store.filter({ ambiente, ativo: true });
      const t = Array.isArray(encontrados) && encontrados.length ? encontrados[0] : null;
      if (!t?.refresh_token) {
        return Response.json({ ok: false, error: 'Não há token de renovação. É preciso autorizar novamente.' });
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
      try { dados = JSON.parse(raw); } catch (_) { dados = null; }

      if (!resp.ok || !dados?.access_token) {
        return Response.json({
          ok: false,
          error: 'Não foi possível renovar. Autorize novamente no Melhor Envio.',
          status: resp.status,
        });
      }

      const agora = new Date();
      const expira = new Date(agora.getTime() + (Number(dados.expires_in) || 2592000) * 1000);
      await store.update(t.id, {
        access_token: dados.access_token,
        refresh_token: dados.refresh_token || t.refresh_token,
        expires_at: expira.toISOString(),
        obtido_em: agora.toISOString(),
      });

      return Response.json({ ok: true, ambiente, expira_em: expira.toISOString() });
    }

    return Response.json({ ok: false, error: 'Ação não reconhecida.' });
  } catch (error) {
    return Response.json({ ok: false, error: String(error?.message || error) }, { status: 500 });
  }
});