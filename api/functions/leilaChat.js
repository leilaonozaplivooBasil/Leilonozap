// leilaChat — a Leila, rodando do NOSSO lado.
//
// ══════════════════════════════════════════════════════════════════════════
// 🔴 O QUE ESTA ROTA ERA ATÉ 15/09/2026, E POR QUE MUDOU
// ══════════════════════════════════════════════════════════════════════════
// Era uma ponte de 29 linhas pro runtime Deno do Base44, que guardava a
// AGENT_API_KEY. A conta perdeu o direito de rodar backend functions e a
// Leila parou inteira — respondendo a cliente, numa bolha de chat:
// "Functions are blocked - app owner lacks backend functions capability".
//
// Ela era a única das quatro coisas que usam aquela ponte SEM reserva. Terceira
// vez que uma dependência do Base44 derruba função nossa. Agora ela roda pelo
// mesmo caminho de IA do resto do sistema (api/_lib/ia.js) e usa as ferramentas
// que o Zeca já tem no WhatsApp. Ver api/_lib/leilaAtendente.js.
//
// ══════════════════════════════════════════════════════════════════════════
// 🔐 IDENTIDADE: DO CRACHÁ, NUNCA DO CORPO
// ══════════════════════════════════════════════════════════════════════════
// O `user_id` que a tela manda vem do localStorage — qualquer pessoa edita.
// Usá-lo pra ler saldo e pedidos seria entregar a carteira alheia a quem
// souber um id. Então a identidade sai de `conferirSessao(req)`, que confere a
// assinatura HMAC do crachá, e usamos o id de DENTRO dele.
//
// `conferirSessao` e não `exigirSessao`: a segunda está em ETAPA 1 (só anota
// no log) até publicarem SESSAO_MODO=bloquear — seria uma fechadura desligada.
//
// Sem crachá válido a conversa continua, só sem dado pessoal.
import { conferirSessao } from '../_lib/sessao.js';
import { responderComoLeila } from '../_lib/leilaAtendente.js';
import { respostaDaLeila, FRASE_INDISPONIVEL } from '../_lib/respostaDaLeila.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
    const message = String(body?.message || '').trim();
    if (!message) return res.status(400).json({ error: 'message é obrigatório' });

    // 🧵 A tela guarda a conversa no localStorage por este id e só grava quando
    // ele volta na resposta (LeilaChat.jsx). Devolver o mesmo que veio — ou
    // abrir um novo — é o que mantém o histórico visual entre trocas de página.
    const conversationId = String(body?.conversation_id || '').trim()
      || `leila_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

    const cracha = conferirSessao(req);
    const userId = cracha.ok ? cracha.userId : null;
    if (!userId && String(body?.user_id || '').trim()) {
      // Alguém alegou um id sem crachá que o comprove. Não é recusa — a
      // conversa segue como visitante —, mas fica no log: é o sinal de tela
      // que esqueceu de mandar o crachá ou de alguém testando a porta.
      console.warn(`[leilaChat] user_id no corpo sem crachá válido (${cracha.motivo}) — atendendo como visitante.`);
    }

    const r = await responderComoLeila({ mensagem: message, userId });

    if (!r.ok) {
      console.error('[leilaChat] não respondeu:', r.motivo_tecnico || '(sem motivo)');
      return res.status(200).json({ status: 'indisponivel', response: FRASE_INDISPONIVEL, conversation_id: conversationId });
    }
    // Passa pela mesma trava do remendo: nada que não seja fala da Leila chega
    // na tela, mesmo que um dia esta rota volte a falar com algo de fora.
    return res.status(200).json({ ...respostaDaLeila({ response: r.texto }), conversation_id: conversationId });
  } catch (e) {
    console.error('[leilaChat] falhou:', String(e?.message || e));
    return res.status(200).json(respostaDaLeila(null));
  }
}
