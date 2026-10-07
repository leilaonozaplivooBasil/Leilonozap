// 📊 fechamentoDiario — O FECHAMENTO DO DIA NO WHATSAPP (07/10/2026, DIR-204).
//
// Dono: "painel do CFO sem precisar abrir tela". Todo dia às 07h (Brasília) o
// resumo de ONTEM chega no WhatsApp de administrador: o que entrou (depósitos,
// loja, arremates), o que saiu ou travou (devoluções, chargebacks, bloqueios),
// comissões (geradas, em espera, liberadas, pagas), saldos, bônus, movimento
// e a auditoria viva (os alertas do vigia). Quem calcula é o banco
// (fechamento_diario(), só leitura); aqui só se monta o texto e se envia.
//
// Travas: UMA mensagem por dia (marca em system_logs); `?dia=AAAA-MM-DD` pede
// outro dia (admin, para conferir); sem destino configurado não envia nada.
import { avisarAdmin } from '../_lib/avisarAdmin.js';
import { textoDoFechamento } from '../_lib/textosDoVigia.js';

const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enc = encodeURIComponent;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

/** 'AAAA-MM-DD' de ontem em Brasília (o cron roda às 07h, o dia fechado é o anterior). */
export function diaDeOntem(agora = Date.now()) {
  const hoje = new Date(agora).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD
  const d = new Date(`${hoje}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.CRON_SECRET && (req.headers?.authorization || '') !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'nao_autorizado' });
  }
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'config' });
    const pedido = String(req.query?.dia || '').trim();
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(pedido) ? pedido : diaDeOntem();
    const passo = `FECHAMENTO_DIARIO_${dia.replace(/-/g, '')}`;
    const ja = await (await sb(`system_logs?select=id&step=eq.${enc(passo)}&limit=1`)).json().catch(() => []);
    if (Array.isArray(ja) && ja.length && !pedido) return res.status(200).json({ ok: true, enviado: false, motivo: 'ja_enviado', dia });

    const r = await sb('rpc/fechamento_diario', { method: 'POST', body: JSON.stringify({ _dia: dia }) });
    const f = await r.json().catch(() => null);
    if (!r.ok || !f || typeof f !== 'object') return res.status(200).json({ ok: false, error: 'fechamento_indisponivel', details: String(f?.message || '').slice(0, 200) });

    const texto = textoDoFechamento(f);
    const envio = await avisarAdmin(texto);
    if (envio.enviado) {
      await sb('system_logs', {
        method: 'POST',
        body: JSON.stringify({ component_name: 'fechamentoDiario', step: passo, status: 'info', message: `Fechamento de ${dia} entregue no WhatsApp (${envio.destinos} destino(s)).`, payload: f, created_at: new Date().toISOString() }),
      }).catch(() => {});
    }
    console.log(`[FECHAMENTO] ${dia} · enviado ${envio.enviado} ${envio.motivo || ''}`);
    return res.status(200).json({ ok: true, dia, enviado: envio.enviado, motivo: envio.motivo, texto, fechamento: f });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e).slice(0, 200) });
  }
}
