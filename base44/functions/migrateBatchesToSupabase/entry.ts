import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// MIGRAÇÃO ONE-SHOT (🔴 risco — dado de inventário).
// Copia os BatchRegistration do store Base44 (service_role) para o Supabase
// (service_role), PULANDO os que já existem por id. Não sobrescreve nada.
// Motivo: o preview lê do Supabase e só vê 1 lote; a produção lê do store Base44
// e vê 14. Unificar no Supabase pra os dois caminhos mostrarem o mesmo.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const RAW_URL = Deno.env.get('SUPABASE_URL');
    const SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!RAW_URL || !SR) {
      return Response.json({ error: 'Supabase env não configurado' }, { status: 500 });
    }
    // Normaliza: remove barra final e qualquer /rest/v1 (ou /rest) que já venha na secret
    const SUPABASE_URL = RAW_URL.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '').replace(/\/rest\/?$/i, '');

    const sb = (path: string, opts: RequestInit = {}) =>
      fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...opts,
        headers: {
          apikey: SR,
          Authorization: `Bearer ${SR}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
          ...(opts.headers || {}),
        },
      });

    // PROBE: mostra como o "lote relogio estoque" (lotes_recebidos) e batch_registrations
    // estão armazenados no Supabase, pra copiar o padrão (provavelmente raw_base44).
    const probeLotesR = await sb('lotes_recebidos?select=*&limit=1', { method: 'GET' });
    const probeBatchesR = await sb('batch_registrations?select=*&limit=1', { method: 'GET' });
    const probeLotes = probeLotesR.ok ? await probeLotesR.json() : [{ _error: probeLotesR.status, t: await probeLotesR.text().catch(()=> '') }];
    const probeBatches = probeBatchesR.ok ? await probeBatchesR.json() : [{ _error: probeBatchesR.status, t: await probeBatchesR.text().catch(()=> '') }];

    // Modo probe-only: devolve só o formato das tabelas, sem migrar.
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    if (body?.probe_only) {
      return Response.json({ probeLotes, probeBatches });
    }

    // 1) Lê TODOS os BatchRegistration do store Base44
    const allBatches = await base44.asServiceRole.entities.BatchRegistration.list('-created_date', 500);
    const list = Array.isArray(allBatches) ? allBatches : [];

    let inseridos = 0;
    let pulados = 0;
    const erros: string[] = [];
    const ids_inseridos: string[] = [];

    for (const batch of list) {
      try {
        // 2) Verifica se já existe no Supabase pelo id
        const checkR = await sb(`batch_registrations?id=eq.${encodeURIComponent(batch.id)}&select=id&limit=1`);
        const existing = checkR.ok ? await checkR.json() : [];
        if (Array.isArray(existing) && existing.length > 0) {
          pulados++;
          continue;
        }

        // 3) Monta payload (só colunas que existem no schema do Supabase)
        const payload: Record<string, unknown> = {
          id: batch.id,
          numero_leilao: batch.numero_leilao ?? null,
          nome_origem: batch.nome_origem ?? null,
          valor_total: batch.valor_total ?? 0,
          total_produtos: batch.total_produtos ?? 0,
          custo_por_unidade: batch.custo_por_unidade ?? 0,
          lotes: batch.lotes ?? [],
          status: batch.status ?? 'pendente',
          recibo_url: batch.recibo_url ?? null,
          data_lancamento: batch.data_lancamento ?? null,
          created_date: batch.created_date ?? new Date().toISOString(),
          updated_date: batch.updated_date ?? new Date().toISOString(),
        };

        // 4) Insere no Supabase
        const insertR = await sb('batch_registrations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (insertR.ok || insertR.status === 201) {
          inseridos++;
          ids_inseridos.push(batch.id);
        } else {
          const errText = await insertR.text();
          erros.push(`${batch.id}: ${insertR.status} ${errText.substring(0, 200)}`);
        }
      } catch (e: any) {
        erros.push(`${batch.id}: ${e?.message || String(e)}`);
      }
    }

    return Response.json({
      total_base44: list.length,
      inseridos,
      pulados,
      erros,
      ids_inseridos,
      _debug: { raw_url: RAW_URL, normalized_url: SUPABASE_URL, probeLotes, probeBatches },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});