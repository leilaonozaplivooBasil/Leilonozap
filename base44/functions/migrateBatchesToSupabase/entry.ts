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

    // Probe de colunas do Supabase (devolve as chaves reais das tabelas).
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    if (body?.probe_columns) {
      const lR = await sb('lotes_recebidos?select=*&limit=1', { method: 'GET' });
      const lRow = lR.ok ? await lR.json() : { _error: lR.status };
      const bR = await sb('batch_registrations?select=*&limit=1', { method: 'GET' });
      const bRow = bR.ok ? await bR.json() : { _error: bR.status };
      return Response.json({
        lotes_columns: Array.isArray(lRow) && lRow[0] ? Object.keys(lRow[0]) : lRow,
        batch_columns: Array.isArray(bRow) && bRow[0] ? Object.keys(bRow[0]) : bRow,
      });
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

    // ── LoteRecebido ──────────────────────────────────────────────
    // Mesma lógica: copia do store Base44 pra lotes_recebidos (Supabase), pulando existentes.
    const allLotes = await base44.asServiceRole.entities.LoteRecebido.list('-created_date', 500);
    const lList = Array.isArray(allLotes) ? allLotes : [];

    let l_inseridos = 0;
    let l_pulados = 0;
    const l_erros: string[] = [];
    const l_ids_inseridos: string[] = [];

    for (const lote of lList) {
      try {
        const checkR = await sb(`lotes_recebidos?id=eq.${encodeURIComponent(lote.id)}&select=id&limit=1`);
        const existing = checkR.ok ? await checkR.json() : [];
        if (Array.isArray(existing) && existing.length > 0) {
          l_pulados++;
          continue;
        }

        const l_payload: Record<string, unknown> = {
          id: lote.id,
          nome_lote: lote.nome_lote ?? null,
          marketplace: lote.marketplace ?? null,
          arquivo_url: lote.arquivo_url ?? null,
          arquivo_nome: lote.arquivo_nome ?? null,
          arquivo_tipo: lote.arquivo_tipo ?? null,
          status: lote.status ?? 'recebido',
          valor_lote: lote.valor_lote ?? 0,
          observacoes: lote.observacoes ?? null,
          data_recebimento: lote.data_recebimento ?? null,
          itens_json: lote.itens_json ?? null,
          quantidade_total: lote.quantidade_total ?? 0,
          valor_mercado_total: lote.valor_mercado_total ?? 0,
          valor_arremate: lote.valor_arremate ?? 0,
          custo_total: lote.custo_total ?? 0,
          taxa_pct: lote.taxa_pct ?? 0,
          frete: lote.frete ?? 0,
          outros: lote.outros ?? 0,
          local_coleta: lote.local_coleta ?? null,
          origem: lote.origem ?? null,
          categorias_json: lote.categorias_json ?? null,
          grades_json: lote.grades_json ?? null,
          produtos_gerados: lote.produtos_gerados ?? false,
          produtos_gerados_em: lote.produtos_gerados_em ?? null,
          produtos_gerados_count: lote.produtos_gerados_count ?? 0,
          deposito_destino: lote.deposito_destino ?? 'Bangu',
          created_date: lote.created_date ?? new Date().toISOString(),
          updated_date: lote.updated_date ?? new Date().toISOString(),
        };

        const insertR = await sb('lotes_recebidos', {
          method: 'POST',
          body: JSON.stringify(l_payload),
        });

        if (insertR.ok || insertR.status === 201) {
          l_inseridos++;
          l_ids_inseridos.push(lote.id);
        } else {
          const errText = await insertR.text();
          l_erros.push(`${lote.id}: ${insertR.status} ${errText.substring(0, 200)}`);
        }
      } catch (e: any) {
        l_erros.push(`${lote.id}: ${e?.message || String(e)}`);
      }
    }

    return Response.json({
      total_base44: list.length,
      inseridos,
      pulados,
      erros,
      ids_inseridos,
      lotes_total_base44: lList.length,
      lotes_inseridos: l_inseridos,
      lotes_pulados: l_pulados,
      lotes_erros: l_erros,
      lotes_ids_inseridos: l_ids_inseridos,
      _debug: { raw_url: RAW_URL, normalized_url: SUPABASE_URL },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});