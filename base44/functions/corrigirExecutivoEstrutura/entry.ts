// 🔴 ETAPA 2 — corrige o executivo dono da estrutura em app_users.
//
// O vínculo NÃO vive numa coluna própria: mora dentro de licenciado_context.executive_owner_id.
// Esta função grava apenas esse campo, preservando todo o resto do licenciado_context.
//
// Padrão de segurança: dry_run = true por default. Só grava com { dry_run: false }.
Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run !== false;

  const raw = Deno.env.get('SUPABASE_URL') || '';
  const base = raw.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  const get = async (path: string) => {
    const r = await fetch(`${base}/rest/v1/${path}`, { headers: H });
    if (!r.ok) throw new Error(`GET ${path} → ${r.status} ${await r.text()}`);
    return await r.json();
  };
  const patch = async (path: string, payload: unknown) => {
    const r = await fetch(`${base}/rest/v1/${path}`, {
      method: 'PATCH',
      headers: { ...H, Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`PATCH ${path} → ${r.status} ${await r.text()}`);
    return await r.json();
  };

  // Modo consulta: confere identidade antes de gravar (evita corrigir a pessoa errada).
  if (body.buscar_nome) {
    const achados = await get(
      `app_users?full_name=ilike.*${encodeURIComponent(body.buscar_nome)}*&select=id,full_name,career_levels,referred_by_id,licenciado_context`
    );
    return Response.json({ success: true, modo: 'CONSULTA', achados });
  }

  // Alvos autorizados pelo Gabriel: quem está na linha do Distribuidor Bangu
  // tem como executivo o Ribeiro.
  const alvos: Array<{ nome: string; id: string }> = body.alvos || [
    { nome: 'Beatriz', id: '90ed6b991d300be51e1db66e' },
    { nome: 'Parceiro Bangu', id: '2aace289f9b2973b3fc87691' },
  ];
  const RIBEIRO_ID = body.executivo_id || '51a481831dfe95c294dedb41';

  const ribeiro = (await get(`app_users?id=eq.${RIBEIRO_ID}&select=id,full_name,career_levels`))[0];
  if (!ribeiro) return Response.json({ success: false, erro: 'Executivo destino não encontrado' }, { status: 400 });
  const lv = Array.isArray(ribeiro.career_levels) ? ribeiro.career_levels : [];
  if (!lv.includes('executivo_conta')) {
    return Response.json({ success: false, erro: `${ribeiro.full_name} não tem cargo executivo_conta` }, { status: 400 });
  }

  const resultado: any[] = [];

  for (const alvo of alvos) {
    const u = (await get(`app_users?id=eq.${alvo.id}&select=id,full_name,licenciado_context`))[0];
    if (!u) { resultado.push({ ...alvo, status: 'não encontrado' }); continue; }

    let ctx: any = u.licenciado_context;
    if (typeof ctx === 'string') { try { ctx = JSON.parse(ctx); } catch { ctx = {}; } }
    if (!ctx || typeof ctx !== 'object') ctx = {};

    const antes = ctx.executive_owner_id || null;
    if (antes === RIBEIRO_ID) {
      resultado.push({ nome: u.full_name, status: 'já estava correto', executivo: ribeiro.full_name });
      continue;
    }

    // 🛡️ TRAVA DE DESIGNAÇÃO MANUAL (05/08/2026)
    // A designação do executivo é MANUAL e é a fonte da verdade — vence a árvore
    // (DOCUMENTO-OFICIAL-PLANO-CARREIRA, seção 5.2). Quem já tem executivo gravado
    // foi designado por decisão administrativa e NÃO pode ser sobrescrito por
    // engano (foi assim que o Ribeiro virou executivo da cadeia Bangu).
    //
    // ⚠️ Mover executivo entre linhas É recurso oficial e continua permitido —
    // só exige intenção explícita: { forcar_troca: true }. Sem isso, protege.
    if (antes && body.forcar_troca !== true) {
      resultado.push({
        nome: u.full_name,
        status: 'designacao_manual_protegida',
        executivo_atual_mantido: antes,
        nao_gravado_para: RIBEIRO_ID,
        como_trocar_de_verdade: 'enviar { forcar_troca: true, dry_run: false }',
      });
      continue;
    }

    const novoCtx = { ...ctx, executive_owner_id: RIBEIRO_ID };

    if (dryRun) {
      resultado.push({ nome: u.full_name, status: 'SIMULADO', de: antes, para: RIBEIRO_ID, executivo: ribeiro.full_name });
    } else {
      await patch(`app_users?id=eq.${u.id}`, { licenciado_context: novoCtx });
      resultado.push({ nome: u.full_name, status: 'GRAVADO', de: antes, para: RIBEIRO_ID, executivo: ribeiro.full_name });
    }
  }

  return Response.json({
    success: true,
    modo: dryRun ? 'SIMULACAO (nada gravado)' : 'GRAVADO EM PRODUCAO',
    executivo_destino: ribeiro.full_name,
    resultado,
  });
});