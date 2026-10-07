// 🛡️ vigiaFinanceiro — O SISTEMA QUE VIGIA O SISTEMA (07/10/2026, DIR-204).
//
// Dono: "quais automações seriam de fato importantes… tipo equipe sênior";
// "cirúrgicas, não quebre nada que esteja funcionando".
//
// Roda de hora em hora (cron da Vercel). Pede ao banco vigia_financeiro() —
// que SÓ LÊ — e, para cada alerta, manda UMA mensagem no WhatsApp de
// administrador, sem repetir o mesmo assunto antes de 6 horas (a trava de
// avisarAdminUmaVezPorDia, com memória em system_logs). O que ele confere:
// saldo × extrato, liberação dos 7 dias atrasada, venda paga sem comissão,
// leilão encerrado sem comissão, indicação a conferir, crédito que falhou,
// cupom de bônus sem depósito, conciliação pendente, webhook mudo, robô do
// banco parado.
//
// 🔒 NÃO ESCREVE em tabela de dinheiro nenhuma. Só lê e avisa.
import { avisarAdminUmaVezPorDia } from '../_lib/avisarAdmin.js';
import { alertasParaAvisar, textoDoAlerta } from '../_lib/textosDoVigia.js';
// 🔭 DIR-206: o que entrou no gateway e não existe aqui (PIX direto na conta, QR de fora).
import { varrerGateway, alertaDoPagamentoSemVenda } from '../_lib/varreduraGateway.js';

const SUPABASE_URL = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HORAS_SEM_REPETIR = 6;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (process.env.CRON_SECRET && (req.headers?.authorization || '') !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'nao_autorizado' });
  }
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ ok: false, error: 'config' });
    const r = await sb('rpc/vigia_financeiro', { method: 'POST', body: '{}' });
    const vigia = await r.json().catch(() => null);
    if (!r.ok || !vigia || typeof vigia !== 'object') return res.status(200).json({ ok: false, error: 'vigia_indisponivel', details: String(vigia?.message || '').slice(0, 200) });

    const alertas = alertasParaAvisar(vigia.alertas);
    const avisos = [];
    for (const a of alertas) {
      // uma mensagem por assunto, sem repetir antes de 6h — detecção continua toda hora
      const envio = await avisarAdminUmaVezPorDia(`vigia_${a.codigo}`, textoDoAlerta(a), { sb, horas: HORAS_SEM_REPETIR });
      avisos.push({ codigo: a.codigo, gravidade: a.gravidade, ...envio });
    }
    // 🔭 DIR-206 — o gateway recebeu algo que não tem venda aqui? Um aviso por
    // pagamento, sem repetir por 7 dias. Falha na consulta ao gateway vira
    // número no log, nunca derruba a rodada.
    const varredura = await varrerGateway({ sb, token: process.env.MP_ACCESS_TOKEN }).catch((e) => ({ ok: false, erro: String(e?.message || e), sem_venda: [] }));
    for (const p of varredura.sem_venda || []) {
      const a = alertaDoPagamentoSemVenda(p);
      if (!a) continue;
      const envio = await avisarAdminUmaVezPorDia(`vigia_${a.codigo}`, textoDoAlerta(a), { sb, horas: 24 * 7 });
      avisos.push({ codigo: a.codigo, gravidade: a.gravidade, valor: p.valor, ...envio });
      alertas.push(a);
    }

    // memória do que o vigia viu, mesmo quando não avisou (a tela e o fechamento leem daqui)
    await sb('system_logs', {
      method: 'POST',
      body: JSON.stringify({
        component_name: 'vigiaFinanceiro', step: 'RODADA', status: alertas.length ? 'warning' : 'info',
        message: alertas.length ? `${alertas.length} alerta(s): ${alertas.map((a) => a.codigo).join(', ')}` : 'Tudo bate.',
        payload: { numeros: vigia.numeros, alertas: alertas.map((a) => ({ codigo: a.codigo, gravidade: a.gravidade, titulo: a.titulo })), avisos, varredura: { ...varredura, sem_venda: (varredura.sem_venda || []).map((p) => p.id) } },
        created_at: new Date().toISOString(),
      }),
    }).catch(() => {});
    console.log(`[VIGIA] ${alertas.length} alerta(s) · ${avisos.filter((x) => x.enviado).length} aviso(s) enviado(s)`);
    return res.status(200).json({ ok: true, alertas: alertas.length, avisos, numeros: vigia.numeros, varredura });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e).slice(0, 200) });
  }
}
