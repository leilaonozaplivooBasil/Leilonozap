import { plataforma } from '@/api/plataformaClient';

/**
 * 🔇 GRAVADOR ÚNICO DE SystemLog COM DEDUPLICAÇÃO EM MEMÓRIA
 *
 * Problema que isso resolve: o mesmo erro era gravado várias vezes seguidas —
 * seja por dois caminhos capturando o mesmo evento, seja por um erro em loop
 * (render circular, polling falhando) que repetia o registro idêntico dezenas
 * de vezes por minuto. Isso inflava o volume de eventos (e o custo) sem
 * agregar UMA informação nova de diagnóstico.
 *
 * Regra: erro com a MESMA assinatura (step + component_name + message) dentro
 * da janela grava UMA vez. Assinatura diferente SEMPRE grava — nenhum erro
 * distinto é perdido.
 *
 * Só memória: nada de storage novo, entidade nova ou dependência nova. Ao
 * recarregar a página o cache zera (comportamento desejado — erro que volta
 * depois do reload é informação legítima).
 */

const JANELA_MS = 60000; // 60s
const LIMITE_ASSINATURAS = 200; // trava de segurança contra crescimento indefinido

const vistos = new Map(); // assinatura -> timestamp do último envio

function limparExpirados(agora) {
  for (const [assinatura, quando] of vistos) {
    if (agora - quando > JANELA_MS) vistos.delete(assinatura);
  }
  // Se ainda estiver grande (muitos erros distintos), descarta os mais antigos.
  if (vistos.size > LIMITE_ASSINATURAS) {
    const ordenados = [...vistos.entries()].sort((a, b) => a[1] - b[1]);
    for (let i = 0; i < ordenados.length - LIMITE_ASSINATURAS; i++) {
      vistos.delete(ordenados[i][0]);
    }
  }
}

/**
 * Grava um evento no SystemLog, ignorando repetição idêntica recente.
 * Nunca lança: falha de log jamais pode quebrar a tela do usuário.
 * @returns {boolean} true se gravou, false se foi descartado como repetido.
 */
export function registrarLog(payload) {
  try {
    if (!payload) return false;

    const agora = Date.now();
    limparExpirados(agora);

    const assinatura = [
      payload.step || '',
      payload.component_name || '',
      String(payload.message || '').slice(0, 300),
    ].join('|');

    const ultimoEnvio = vistos.get(assinatura);
    if (ultimoEnvio && agora - ultimoEnvio < JANELA_MS) return false;

    vistos.set(assinatura, agora);
    plataforma.entities.SystemLog.create(payload).catch(() => {});
    return true;
  } catch (_) {
    return false;
  }
}