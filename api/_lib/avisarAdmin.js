/**
 * 📣 avisarAdmin — faz um vigia CHEGAR em alguém.
 *
 * 🔴 POR QUE ISTO EXISTE (20/09/2026)
 *
 * A plataforma tem dois vigias que rodam por cron e detectam certo:
 *   • alertaReservasOrfas  (9h30, diário)  — dinheiro de cliente travado
 *   • alertaCreditoGateway (a cada 4h)     — crédito de IA acabando
 *
 * Os dois gravavam em `system_logs` e PARAVAM ALI. Nenhum mandava mensagem pra
 * lugar nenhum. Vigia sem destino não é vigia: é diário.
 *
 * O caso que provou: o Alberto ficou com R$ 573,22 travados de 17 a 20/09. O
 * vigia achou no dia 17 e escreveu no log TRÊS DIAS SEGUIDOS, com nome e valor
 * certos. Ninguém leu. Quem descobriu foi o próprio cliente, reclamando — e
 * antes dele houve pelo menos outros quatro (Karen, Luciano e mais dois), com
 * um pico de R$ 1.268,41 em cinco contas no dia 11/09.
 *
 * O dinheiro travado sempre foi detectável. O que faltava era endereço.
 *
 * 🔒 O QUE ESTE HELPER NÃO FAZ
 *   • Não decide O QUE avisar — quem decide é o vigia. Aqui só se entrega.
 *   • Não derruba quem chama: qualquer falha vira `{ enviado: false, motivo }`.
 *     Um vigia que quebra porque o WhatsApp caiu é pior que um vigia mudo.
 *   • Não manda pra cliente. `ALERTA_WHATSAPP` é número de administrador, e a
 *     mensagem pode conter nome de cliente e valor — por isso, SEM o número
 *     configurado, não envia nada em vez de "tentar em algum lugar".
 */

/** Base da Z-API. A mesma do Zeca. */
const ZAPI_BASE_URL = (process.env.ZAPI_BASE_URL || 'https://api.z-api.io').replace(/\/+$/, '');
/** Para quem o alerta vai. Vários números separados por vírgula. */
const DESTINOS = process.env.ALERTA_WHATSAPP || '';

/** Só dígitos — o Z-API recusa número com máscara. */
export const apenasDigitos = (s) => String(s || '').replace(/\D+/g, '');

/**
 * A lista de destinos, limpa.
 * Número curto demais é descartado: um dígito perdido numa variável de ambiente
 * mandaria nome de cliente e valor para um desconhecido.
 * @param {string} cru conteúdo de ALERTA_WHATSAPP
 */
export function destinosDoAlerta(cru = DESTINOS) {
  return String(cru || '')
    .split(',')
    .map((n) => apenasDigitos(n))
    .filter((n) => n.length >= 12 && n.length <= 15);
}

/** Está tudo configurado pra conseguir enviar? */
export function podeAvisar(env = process.env) {
  return !!(env.ZAPI_INSTANCE_ID && env.ZAPI_TOKEN && destinosDoAlerta(env.ALERTA_WHATSAPP).length);
}

/**
 * Manda o aviso. NUNCA lança.
 *
 * 🔬 `env` e `enviar` entram por parâmetro de propósito. Sem isso a trava mais
 * importante daqui — "sem destino não inventa um" — fica SEM PROVA: no teste
 * falta credencial da Z-API, a função sai antes, e o ramo do destino nunca
 * roda. Foi exatamente o que aconteceu: a mutação que fazia o helper mandar
 * pra um número chumbado passou com a banca inteira verde.
 *
 * @param {string} texto  o que dizer
 * @param {object} [opcoes]
 * @param {object} [opcoes.env]     de onde ler a configuração
 * @param {Function} [opcoes.enviar] quem faz a requisição (o `fetch`)
 * @returns {Promise<{enviado: boolean, destinos?: number, motivo?: string}>}
 */
export async function avisarAdmin(texto, opcoes = {}) {
  const env = opcoes.env || process.env;
  const enviar = opcoes.enviar || fetch;
  const msg = String(texto || '').trim();
  if (!msg) return { enviado: false, motivo: 'texto_vazio' };
  if (!env.ZAPI_INSTANCE_ID || !env.ZAPI_TOKEN) return { enviado: false, motivo: 'zapi_nao_configurado' };

  const destinos = destinosDoAlerta(env.ALERTA_WHATSAPP);
  // 🔒 Sem destino NÃO se inventa um. A mensagem carrega nome de cliente.
  if (!destinos.length) return { enviado: false, motivo: 'sem_ALERTA_WHATSAPP' };

  const base = (env.ZAPI_BASE_URL || ZAPI_BASE_URL).replace(/\/+$/, '');
  const url = `${base}/instances/${env.ZAPI_INSTANCE_ID}/token/${env.ZAPI_TOKEN}/send-text`;
  const headers = { 'Content-Type': 'application/json' };
  if (env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = env.ZAPI_CLIENT_TOKEN;

  let entregues = 0;
  let ultimoErro = '';
  for (const phone of destinos) {
    try {
      const r = await enviar(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone, message: msg }),
        signal: AbortSignal.timeout(12000),
      });
      if (r.ok) entregues += 1;
      else ultimoErro = `zapi_${r.status}`;
    } catch (e) {
      // Um número ruim não pode impedir os outros de receber.
      ultimoErro = String(e?.message || e).slice(0, 80);
    }
  }

  return entregues
    ? { enviado: true, destinos: entregues }
    : { enviado: false, motivo: ultimoErro || 'falha_no_envio' };
}
