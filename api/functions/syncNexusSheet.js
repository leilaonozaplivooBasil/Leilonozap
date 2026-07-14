// syncNexusSheet — re-sincroniza o faturamento da planilha Google (NEXUS, preenchida diariamente)
// pro sistema. Baixa o XLSX, mapeia os executivos, e substitui as vendas source='nexus'.
// Roda por CRON (diário) e também sob demanda (GET/POST). SEGURANÇA: se a planilha vier com
// poucas linhas (erro/indisponível), NÃO apaga nada.
import * as XLSX from 'xlsx';
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SHEET_ID = process.env.NEXUS_SHEET_ID || '1pnMUocchKZZnJeX52dFnJRwEQitSHXzR3YxeKuwWN2w';
const MIN_ROWS = 50; // trava: abaixo disso, assume erro e não toca no banco

// executivo (planilha) → { id no NoZap, linha }
const MAP = {
  Ribeiro: { id: '51a481831dfe95c294dedb41', linha: 'BANGU' },
  Paulo: { id: 'f03838229c9fce302c7619f7', linha: 'BANGU' },
  Elenice: { id: '68dfae2be568172caa98aa19', linha: 'BANGU' },
  Iara: { id: '6979205eb30397ea74dc0d7a', linha: 'BANGU' },
  Eloah: { id: '4c4cacfb6d9eb1d9659be68b', linha: 'ELOAH' },
  Beatriz: { id: '90ed6b991d300be51e1db66e', linha: 'BANGU' },
};
const oid = () => crypto.randomBytes(12).toString('hex');
function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'Config ausente' });

    // baixa a planilha (XLSX)
    const dl = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`);
    if (!dl.ok) return res.status(200).json({ ok: false, reason: 'download_failed', status: dl.status });
    const buf = Buffer.from(await dl.arrayBuffer());
    const wb = XLSX.read(buf, { type: 'buffer' });
    const ws = wb.Sheets['Vendas Confirmadas'] || wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    let dia = null; const out = []; const skip = {};
    for (const r of rows) {
      const c0 = String(r[0] || ''); const m = c0.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (c0.includes('📅') && m) { dia = { d: m[1], mo: m[2], y: m[3] }; continue; }
      if (typeof r[0] === 'number' && r[2] && r[6] !== '' && !isNaN(Number(r[6]))) {
        if (!dia) continue;
        const exec = String(r[2]).trim(); const mp = MAP[exec];
        if (!mp) { skip[exec] = (skip[exec] || 0) + 1; continue; }
        const valor = Number(r[6]); if (!(valor > 0)) continue;
        const frac = Number(r[1]) || 0.5; const mins = Math.round(frac * 1440);
        const HH = String(Math.floor(mins / 60)).padStart(2, '0'); const MM = String(mins % 60).padStart(2, '0');
        const created = `${dia.y}-${dia.mo}-${dia.d}T${HH}:${MM}:00-03:00`;
        const canal = String(r[5] || '').trim();
        // 🔒 ID DETERMINÍSTICO (hash da própria linha da planilha). Antes era aleatório e o sync
        // fazia DELETE+INSERT, então a MESMA venda voltava com id novo a cada sincronização.
        // Isso quebrava qualquer coisa amarrada na venda — e, com comissão paga, geraria
        // PAGAMENTO EM DOBRO a cada sync. Agora a mesma linha gera sempre o mesmo id.
        const id = crypto.createHash('sha256')
          .update(`nexus|${mp.id}|${created}|${valor}|${String(r[3] || '')}`)
          .digest('hex').slice(0, 24);
        out.push({ id, base44_id: id, kind: 'produto', source: 'nexus', linha: mp.linha, seller_id: mp.id, product_title: String(r[3] || '(sem descrição)').slice(0, 300), sale_price: valor, total_amount: valor, quantity: 1, status: 'entregue', payment_method: canal === 'whatsapp' ? 'nexus_whatsapp' : canal === 'showroom' ? 'nexus_showroom' : 'nexus', created_at: created, created_date: created, delivered_at: created });
      }
    }

    if (out.length < MIN_ROWS) return res.status(200).json({ ok: false, reason: 'too_few_rows', got: out.length, skip });

    // UPSERT pelo id determinístico (não apaga mais). O DELETE+INSERT antigo recriava a venda com
    // id novo a cada sync, o que desamarraria a comissão já paga e pagaria tudo de novo.
    // Linha da planilha alterada → id novo → entra como venda nova (correto).
    let inserted = 0;
    for (let i = 0; i < out.length; i += 200) {
      const batch = out.slice(i, i + 200);
      const r = await sb('catalog_sales', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(batch) });
      if (r.ok) inserted += batch.length;
    }
    const total = out.reduce((s, x) => s + x.total_amount, 0);
    return res.status(200).json({ ok: true, vendas: inserted, total_cents: Math.round(total * 100), total, skip, synced_at: new Date().toISOString() });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}
