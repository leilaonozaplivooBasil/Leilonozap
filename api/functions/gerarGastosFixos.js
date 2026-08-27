// gerarGastosFixos — CRON DIÁRIO (DIR-8, 27/08/2026).
//
// POR QUE ISTO EXISTE
// expense_type: 'fixo' e recurring_day sempre foram só campos salvos no formulário de
// gasto — nenhum código no repositório inteiro lia esses dois campos pra criar o
// lançamento do mês seguinte. Um "Fixo Mensal" nunca se repetia sozinho: ficava parado
// na mesma linha, achando "vencido há N dias" — sem mostrar quantos MESES estavam
// realmente em aberto. Caso real que motivou a correção: Consórcio Nacional Volkswagen
// (Aline), vencimento 21/07/2026, ainda numa linha só quando já eram 37 dias de atraso.
//
// O QUE ESTE JOB FAZ
// Pra cada grupo de recorrência (recurring_group_id — ver migration
// 20260827c_recurring_group_id.sql), acha o lançamento mais recente do grupo e usa
// src/../api/_lib/gastosFixosRecorrentes.js pra decidir quais meses ainda faltam, do mês
// seguinte até o mês atual (inclusive). Cria um lançamento novo "pendente" por mês que
// faltar — cada mês esquecido vira sua própria linha, não um contador numa linha só.
//
// SEGURANÇA
// Best-effort por grupo: se um grupo falhar (erro de rede, dado incompleto), os outros
// grupos continuam sendo processados — isto é geração de lançamento, não movimento de
// dinheiro de cliente, então um erro aqui não é do tipo que exige trava manual como a
// faxinaReservasOrfas. `mesesFaltandoParaGastoFixo` já tem teto de 24 meses por grupo.
import { mesesFaltandoParaGastoFixo } from '../_lib/gastosFixosRecorrentes.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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

    const rows = await (await sb(
      'financial_expenses?select=id,description,company,category,amount,payment_method,cost_center,due_date,recurring_day,recurring_group_id,notes&expense_type=eq.fixo'
    )).json().catch(() => []);
    if (!Array.isArray(rows)) return res.status(200).json({ success: false, error: 'Falha ao ler gastos fixos' });

    // agrupa (defensivo: linha sem recurring_group_id vira dona do próprio grupo)
    const grupos = new Map();
    for (const r of rows) {
      const grupoId = r.recurring_group_id || r.id;
      if (!grupos.has(grupoId)) grupos.set(grupoId, []);
      grupos.get(grupoId).push(r);
    }

    let gerados = 0;
    const detalhes = [];
    for (const [grupoId, linhas] of grupos) {
      try {
        const maisRecente = linhas.reduce((a, b) => (new Date(b.due_date) > new Date(a.due_date) ? b : a));
        const faltando = mesesFaltandoParaGastoFixo(
          { ultimoVencimento: maisRecente.due_date, recurringDay: maisRecente.recurring_day },
          new Date()
        );
        if (!faltando.length) continue;

        const novasLinhas = faltando.map((data) => ({
          description: maisRecente.description,
          company: maisRecente.company || '',
          category: maisRecente.category || '',
          expense_type: 'fixo',
          amount: money(maisRecente.amount),
          interest_amount: 0, // juros é de cada mês — o novo lançamento ainda não venceu
          total_amount: money(maisRecente.amount),
          due_date: fmtDate(data),
          payment_method: maisRecente.payment_method || 'pix',
          payment_status: 'pendente',
          amount_paid: 0,
          cost_center: maisRecente.cost_center || null,
          recurring_day: maisRecente.recurring_day || null,
          recurring_group_id: grupoId,
          notes: maisRecente.notes || null,
        }));

        const r = await sb('financial_expenses', {
          method: 'POST', headers: { Prefer: 'return=representation' },
          body: JSON.stringify(novasLinhas),
        });
        const criadas = await r.json().catch(() => []);
        if (!r.ok || !Array.isArray(criadas)) {
          console.error(`[gerarGastosFixos] grupo ${grupoId}: falha ao criar ${novasLinhas.length} lançamento(s) — HTTP ${r.status}`);
          continue;
        }
        gerados += criadas.length;
        detalhes.push({ grupo: grupoId, descricao: maisRecente.description, meses_gerados: criadas.length });
      } catch (e) {
        console.error(`[gerarGastosFixos] grupo ${grupoId} falhou:`, e?.message);
      }
    }

    return res.status(200).json({ success: true, grupos_analisados: grupos.size, lancamentos_gerados: gerados, detalhes });
  } catch (e) {
    console.error('[gerarGastosFixos] erro geral:', e?.message);
    return res.status(500).json({ success: false, error: e?.message || 'Erro desconhecido' });
  }
}
