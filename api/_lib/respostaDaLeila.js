/**
 * respostaDaLeila — o que o cliente pode ver quando a Leila não responde.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * 🔴 O INCIDENTE (15/09/2026) — O ERRO EM INGLÊS NA CARA DO CLIENTE
 * ══════════════════════════════════════════════════════════════════════════
 * O dono mandou o print: a Leila respondeu, numa bolha de chat de atendimento,
 *
 *     "Functions are blocked - app owner lacks backend functions capability"
 *
 * Isso não é texto nosso. É mensagem da PLATAFORMA Base44 avisando que a conta
 * perdeu o direito de rodar backend functions. A rota `leilaChat` repassava o
 * JSON do runtime sem olhar (`res.json(resultado)`), e a tela, procurando
 * `response || reply || message`, acabava achando a frase de erro e exibindo.
 *
 * Um chat de atendimento nunca pode falar a língua da infraestrutura. Quem
 * está do outro lado é cliente, não plantonista.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * A REGRA: RESPOSTA É O QUE A LEILA DISSE, NÃO "O QUE SOBROU NO JSON"
 * ══════════════════════════════════════════════════════════════════════════
 * A function Deno (base44/functions/leilaChat/entry.ts, linha 98) devolve
 * SEMPRE a mesma forma quando deu certo:
 *
 *     { status: 'success', conversation_id, response: '<a fala da Leila>' }
 *
 * Então o reconhecimento é POSITIVO: só `response` (ou `reply`) é resposta.
 * Qualquer outra forma — `error`, `message`, corpo vazio, HTML de erro — é
 * indisponibilidade, e vira a mesma frase em português.
 *
 * Reconhecer pelo negativo (procurar palavras de erro conhecidas) seria a
 * escolha frágil: bastaria a plataforma mudar o texto pra voltar a vazar.
 */

/** A frase que o cliente lê quando a Leila não está disponível. */
export const FRASE_INDISPONIVEL =
  'Estou passando por uma manutenção rapidinha e não consigo responder agora 🙏 ' +
  'Tenta de novo daqui a pouco? Se for urgente, o time já está avisado.';

/**
 * Traduz a resposta crua do runtime na resposta que a tela pode mostrar.
 *
 * @param {any} bruta o JSON que voltou do runtime (ou null, se nem voltou)
 * @returns {{ status:'success'|'indisponivel', response:string,
 *             conversation_id?:string, motivo_tecnico?:string }}
 *   `motivo_tecnico` existe pro LOG e pro diagnóstico — a tela não o mostra,
 *   e por isso ele é um campo separado, nunca misturado em `response`.
 */
export function respostaDaLeila(bruta) {
  const obj = bruta && typeof bruta === 'object' ? bruta : {};

  // Só estes dois campos são fala da Leila. Note o `.trim()`: string vazia
  // ou só espaço não é resposta — é ausência de resposta com outro disfarce.
  const fala = [obj.response, obj.reply]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .find((v) => v.length > 0);

  if (fala) {
    return {
      status: 'success',
      response: fala,
      ...(obj.conversation_id ? { conversation_id: String(obj.conversation_id) } : {}),
    };
  }

  // Tudo que não é fala vira indisponibilidade. O texto técnico é guardado
  // pro log, cortado, e NUNCA entra em `response`.
  const tecnico = [obj.error, obj.message, obj.detail, obj.motivo]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .find((v) => v.length > 0);

  return {
    status: 'indisponivel',
    response: FRASE_INDISPONIVEL,
    ...(tecnico ? { motivo_tecnico: tecnico.slice(0, 300) } : {}),
  };
}
