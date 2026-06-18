// exportBaixas — relatório (CSV, abre no Excel) de todas as baixas de estoque (zerar estoque),
// com produto, operador, motivo e quantidade baixada. Pedido pela Diana pra rastrear baixas.
// GET (download direto) ou POST {format:'json'} pra preview. Lê via service_role.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function handler(req, res) {
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config ausente' });
    const url = new URL(req.url, 'http://x');
    let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const wantJson = url.searchParams.get('format') === 'json' || body?.format === 'json';
    const from = url.searchParams.get('from') || body?.from; // opcional: filtro de data ISO

    let q = 'stock_operations?select=*&order=operation_date.desc&limit=5000';
    if (from) q += `&operation_date=gte.${encodeURIComponent(from)}`;
    const rows = await (await sb(q)).json();
    const list = Array.isArray(rows) ? rows : [];

    if (wantJson) return res.status(200).json({ success: true, total: list.length, baixas: list });

    const header = ['Data', 'Produto', 'Quantidade Baixada', 'Operador', 'Motivo', 'Tipo'];
    const lines = [header.join(';')];
    for (const r of list) {
      lines.push([
        csvCell(fmtDate(r.operation_date || r.created_at)),
        csvCell(r.product_title || r.product_id),
        csvCell(r.quantity_before ?? ''),
        csvCell(r.operator_name || ''),
        csvCell(r.reason || ''),
        csvCell(r.operation_type || ''),
      ].join(';'));
    }
    const csv = '﻿' + lines.join('\r\n'); // BOM p/ acento no Excel
    const fname = `baixas-estoque-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    return res.status(200).send(csv);
  } catch (e) {
    return res.status(200).json({ success: false, error: String(e?.message || e) });
  }
}
