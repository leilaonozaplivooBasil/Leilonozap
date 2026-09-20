// alertaCreditoGateway — VIGIA DO SALDO DO VERCEL AI GATEWAY.
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE ISTO EXISTE
// ══════════════════════════════════════════════════════════════════════════════
// DIR-146 (14/09/2026): o Vercel AI Gateway ficou em $0,00 de crédito sem
// NINGUÉM saber, até a validação por IA (rituais e tarefas com foto) começar
// a falhar de verdade numa manhã inteira. Ninguém tinha como prever — a
// única forma de descobrir era abrir o dashboard da Vercel, e ninguém abre
// isso às 5h da manhã.
//
// Dono, ao vivo, depois do incidente: "o crédito quando estiver acabando
// precisa ter um aviso, pra não ocorrer mais isso."
//
// Este endpoint é o vigia: roda sozinho, várias vezes ao dia, e AVISA antes
// de chegar em zero. Não recarrega — só a Vercel sabe cobrar o cartão; quem
// decide comprar mais crédito é o dono (vercel.com → AI Gateway → Add
// credits). Mesmo padrão do vigia de reservas órfãs
// (alertaReservasOrfas.js): só avisa quando acha algo, nunca grita à toa.
//
// 📣 20/09/2026 — O AVISO PASSOU A TER ONDE TOCAR.
// Até hoje este vigia terminava em `system_logs` e parava ali. Era o mesmo
// defeito do vigia de reservas órfãs: detectava certo e não falava com
// ninguém. O incidente da DIR-146 se repetiria igual, porque o dono continuava
// sem saber — só que agora COM um registro provando que a plataforma sabia.
//
// Ele roda a cada 4 HORAS, então o aviso passa por `avisarAdminUmaVezPorDia`:
// seis mensagens por dia sobre o mesmo saldo fariam a pessoa silenciar o
// contato, e aí o alarme morre de cansaço em vez de morrer de mudez.
//
// Este arquivo NÃO TEM NENHUMA ESCRITA além do aviso em `system_logs`.

import { resolverIA, saldoGateway, SALDO_BAIXO_USD } from '../_lib/ia.js';
import { avisarAdminUmaVezPorDia } from '../_lib/avisarAdmin.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// os mesmos modelos que xgameValidarPrint.js usa — pra checar o saldo da
// MESMA credencial que valida comprovação de verdade, não uma genérica.
const MODEL_GATEWAY = process.env.AI_MODEL_VISION || 'anthropic/claude-opus-5';
const MODEL_DIRETO = process.env.AI_MODEL_VISION_ANTHROPIC || 'claude-opus-5';

export default async function handler(req, res) {
  // 🔐 AUDITORIA 15/09/2026 — cron: com CRON_SECRET configurado na Vercel, só aceita a chamada
  // que a própria Vercel manda (Authorization: Bearer). Sem a variável, segue aberto como era.
  if (process.env.CRON_SECRET && (req.headers?.authorization || '') !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ ok: false, error: 'nao_autorizado' });
  }
  res.setHeader('Content-Type', 'application/json');
  try {
    const ia = await resolverIA({ modelDireto: MODEL_DIRETO, modelGateway: MODEL_GATEWAY });
    if (!ia) return res.status(200).json({ success: true, checado: false, motivo: 'sem chave de IA configurada' });
    if (ia.via !== 'gateway') {
      // ANTHROPIC_API_KEY direto não tem "saldo do gateway" — a cobrança é
      // outra (fatura da Anthropic), fora do que este vigia consegue ver.
      return res.status(200).json({ success: true, checado: false, motivo: 'IA está indo direto pela Anthropic (sem gateway), este vigia não enxerga saldo por aqui' });
    }

    const saldo = await saldoGateway(ia);
    if (saldo === null) {
      // a própria checagem de saldo falhou — não é "está tudo bem", é "não
      // sei". Diferente do vigia de reservas: aqui o silêncio SEM contexto é
      // perigoso (foi exatamente o que já aconteceu uma vez), então este
      // caso também vira aviso, não passa em branco.
      if (SUPABASE_URL && SR) {
        await sb('system_logs', {
          method: 'POST',
          body: JSON.stringify({
            component_name: 'alertaCreditoGateway', step: 'SALDO_DESCONHECIDO', status: 'warning',
            message: 'Não consegui checar o saldo do Vercel AI Gateway (GET /v1/credits falhou ou não respondeu). Confira manualmente: vercel.com → AI Gateway.',
            created_at: new Date().toISOString(),
          }),
        }).catch(() => {});
      }
      return res.status(200).json({ success: true, checado: false, motivo: 'checagem de saldo falhou' });
    }

    let avisoWhatsapp = { enviado: false, motivo: 'saldo_ok' };
    const baixo = saldo < SALDO_BAIXO_USD;
    // 📒 Só grava aviso quando o saldo está baixo. Vigia que fala toda hora
    // vira ruído e ninguém lê — mesma regra do vigia de reservas órfãs.
    if (baixo && SUPABASE_URL && SR) {
      await sb('system_logs', {
        method: 'POST',
        body: JSON.stringify({
          component_name: 'alertaCreditoGateway', step: 'SALDO_BAIXO', status: 'warning',
          message: `Crédito do Vercel AI Gateway em $${saldo.toFixed(2)} (abaixo de $${SALDO_BAIXO_USD}) — a validação por IA de rituais e tarefas vai parar de funcionar quando chegar em $0. Recarregue em vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dtop-up antes que aconteça de novo.`,
          created_at: new Date().toISOString(),
        }),
      }).catch(() => {});

      avisoWhatsapp = await avisarAdminUmaVezPorDia(
        'credito_gateway',
        `🟡 *Crédito de IA acabando*\n\n` +
        `Saldo do Vercel AI Gateway: *$${saldo.toFixed(2)}* (o aviso dispara abaixo de $${SALDO_BAIXO_USD}).\n\n` +
        `Quando chegar em zero, a validação por IA de ritual e de tarefa com foto ` +
        `PARA de funcionar — foi o que aconteceu em 14/09, numa manhã inteira.\n\n` +
        `Recarregar: vercel.com → AI Gateway → Add credits`,
        { sb },
      );
    }

    return res.status(200).json({ success: true, checado: true, saldo_usd: saldo, saldo_baixo: baixo, teto_usd: SALDO_BAIXO_USD, aviso_whatsapp: avisoWhatsapp });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
