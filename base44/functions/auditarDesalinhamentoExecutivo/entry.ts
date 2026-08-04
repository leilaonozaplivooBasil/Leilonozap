// 🔎 auditarDesalinhamentoExecutivo — SOMENTE LEITURA (nunca grava).
//
// ETAPA 1 do acerto do Sócio Executivo (04/08/2026).
// Percorre app_users e aponta cada conta cujo executive_owner_id CADASTRADO
// é diferente do executivo REAL da linha dela na árvore (subindo referred_by_id).
//
// Regra do "executivo correto pela árvore" (mesma ordem que a cadeia de rebate usa):
//   1) sobe a partir do UPLINE da pessoa;
//   2) o primeiro ancestral que TEM cargo de executivo é o executivo da linha;
//   3) se nenhum ancestral tem o cargo, vale o executive_owner_id do primeiro
//      ancestral que tiver esse campo definido;
//   4) se a linha não tem nada disso, não há executivo pela árvore (não é desalinho).
//
// Payload: { incluir_ok?: boolean }  → incluir_ok=true também lista quem está certo.

const RAW = Deno.env.get('SUPABASE_URL') || '';
const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BASE = RAW.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

const sb = (path: string) =>
  fetch(`${BASE}/rest/v1/${path}`, {
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' },
  });

const ALIAS_EXEC = ['executivo', 'executivo_conta', 'socio_executivo'];
const cargosDe = (u: any) => (Array.isArray(u?.career_levels) ? u.career_levels : (u?.career_levels ? [u.career_levels] : []));
const ehExecutivo = (u: any) => cargosDe(u).some((c: string) => ALIAS_EXEC.includes(c));

const carteiraExec = (u: any) => {
  if (!u) return null;
  if (u.executive_owner_id) return u.executive_owner_id;
  try {
    const p = typeof u.licenciado_context === 'string' ? JSON.parse(u.licenciado_context) : u.licenciado_context;
    return p?.executive_owner_id || null;
  } catch { return null; }
};

Deno.serve(async (req) => {
  try {
    if (!BASE || !SR) return Response.json({ error: 'Supabase não configurado' }, { status: 500 });
    const body = await req.json().catch(() => ({}));

    // ⚠️ app_users NÃO tem coluna executive_owner_id — o vínculo vive dentro de licenciado_context.
    const res = await sb('app_users?select=id,full_name,career_levels,primary_career_level,referred_by_id,licenciado_context,active&limit=5000');
    if (!res.ok) return Response.json({ error: 'falha ao ler app_users', details: await res.text() }, { status: 500 });
    const users = await res.json();
    if (!Array.isArray(users)) return Response.json({ error: 'resposta inesperada de app_users' }, { status: 500 });

    const byId = new Map(users.map((u: any) => [u.id, u]));

    const executivoPelaArvore = (u: any) => {
      const vistos = new Set([u.id]);
      let cur = u.referred_by_id ? byId.get(u.referred_by_id) : null;
      let fallbackCampo: any = null;
      while (cur && !vistos.has(cur.id)) {
        vistos.add(cur.id);
        if (ehExecutivo(cur)) return { dono: cur, origem: `cargo de executivo em ${cur.full_name}` };
        if (!fallbackCampo) {
          const d = byId.get(carteiraExec(cur));
          if (d && ehExecutivo(d)) fallbackCampo = { dono: d, origem: `carteira cadastrada do upline ${cur.full_name}` };
        }
        cur = cur.referred_by_id ? byId.get(cur.referred_by_id) : null;
      }
      return fallbackCampo || { dono: null, origem: 'linha sem executivo' };
    };

    const desalinhados: any[] = [];
    const alinhados: any[] = [];
    const sem_executivo_na_linha: any[] = [];

    for (const u of users) {
      if (u.active === false) continue;
      if (ehExecutivo(u)) continue; // o próprio executivo é a raiz da estrutura dele

      const cadastradoId = carteiraExec(u);
      const cadastrado = cadastradoId ? byId.get(cadastradoId) : null;
      const correto = executivoPelaArvore(u);
      const upline = u.referred_by_id ? byId.get(u.referred_by_id) : null;

      const linha = {
        user_id: u.id,
        nome: u.full_name,
        cargo: u.primary_career_level || cargosDe(u).join(', ') || '(sem cargo)',
        upline: upline?.full_name || '(sem upline)',
        executivo_cadastrado: cadastrado?.full_name || (cadastradoId ? '(id inválido)' : '(não definido)'),
        executivo_correto_arvore: correto.dono?.full_name || '(nenhum)',
        origem_do_correto: correto.origem,
      };

      if (!correto.dono) { sem_executivo_na_linha.push(linha); continue; }
      if (cadastradoId === correto.dono.id) alinhados.push(linha);
      else desalinhados.push({ ...linha, acao_sugerida: `${linha.executivo_cadastrado} → ${correto.dono.full_name}` });
    }

    return Response.json({
      success: true,
      somente_leitura: true,
      gravou_algo: false,
      totais: {
        contas_analisadas: users.filter((u: any) => u.active !== false && !ehExecutivo(u)).length,
        desalinhados: desalinhados.length,
        alinhados: alinhados.length,
        linha_sem_executivo: sem_executivo_na_linha.length,
      },
      desalinhados: body.compacto
        ? desalinhados.map((d: any) => `${d.nome} (${d.cargo}) sob ${d.upline}: ${d.acao_sugerida}`)
        : desalinhados,
      sem_executivo_na_linha: body.incluir_sem_exec ? sem_executivo_na_linha : sem_executivo_na_linha.map((l: any) => l.nome),
      alinhados: body.incluir_ok ? alinhados : undefined,
    });
  } catch (e) {
    return Response.json({ error: String((e as any)?.message || e) }, { status: 500 });
  }
});