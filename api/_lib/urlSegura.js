// urlSegura — PORTEIRO DAS URLs QUE O SERVIDOR VAI BUSCAR (21/08/2026).
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE ESTE ARQUIVO EXISTE
// ══════════════════════════════════════════════════════════════════════════════
// Algumas rotas recebem uma URL do NAVEGADOR e mandam o SERVIDOR buscar aquele
// endereço (proxyImage, resizeImage, busca por foto). O servidor está DENTRO da
// infraestrutura: ele enxerga coisas que o navegador do visitante nunca enxerga.
//
// Sem porteiro, qualquer pessoa manda:
//     { "imageUrl": "http://169.254.169.254/latest/meta-data/" }
// e o servidor busca o painel de metadados da nuvem — onde moram credenciais.
// Ou varre a rede interna medindo o tempo de resposta pra descobrir o que existe.
// Isso tem nome: SSRF (o servidor vira o carteiro do atacante).
//
// ══════════════════════════════════════════════════════════════════════════════
// A ARMADILHA DO REDIRECIONAMENTO — o motivo de existir buscarComSeguranca()
// ══════════════════════════════════════════════════════════════════════════════
// Conferir a URL uma vez NÃO BASTA. O fetch segue redirecionamento sozinho:
//     https://site-do-atacante.com/foto.jpg   →  302  →  http://169.254.169.254/
// A primeira URL passa em qualquer conferência. Quem busca é a segunda.
// Por isso aqui o redirecionamento é MANUAL: cada salto é conferido de novo.
//
// ══════════════════════════════════════════════════════════════════════════════
// O QUE ESTE PORTEIRO **NÃO** FAZ
// ══════════════════════════════════════════════════════════════════════════════
// Ele barra por NOME e por IP escrito na URL. Um domínio público que aponte para
// 127.0.0.1 no DNS (o truque do "DNS rebinding") passa por aqui: resolver o DNS
// antes e fixar o IP não é possível com o fetch do runtime da Vercel. O que fecha
// esse resto é a rede da hospedagem, não código de aplicação. Está anotado de
// propósito — não é lista de "100% seguro".

import dns from 'node:dns/promises';

/** Quantos saltos de redirecionamento a gente aceita seguir. */
const MAX_SALTOS = 3;

/** Nomes de máquina que NUNCA podem ser buscados. */
const NOMES_PROIBIDOS = new Set([
  'localhost', 'localhost.localdomain', 'ip6-localhost', 'ip6-loopback',
  '0.0.0.0', '[::]', '[::1]', 'metadata', 'metadata.google.internal',
  'instance-data', 'metadata.goog',
]);

/** Sufixos de domínio que só existem dentro de uma rede. */
const SUFIXOS_PROIBIDOS = ['.internal', '.local', '.localdomain', '.home.arpa', '.intranet', '.lan'];

// IPv4 escrito de forma normal (1.2.3.4). Devolve os 4 números, ou null.
function octetos(host) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const n = m.slice(1).map(Number);
  return n.every((x) => x >= 0 && x <= 255) ? n : null;
}

// Faixas de IPv4 que são rede interna, loopback, metadados de nuvem ou reservadas.
function ipv4Proibido([a, b]) {
  if (a === 0) return true;                       // 0.0.0.0/8 — "esta máquina"
  if (a === 10) return true;                      // 10.0.0.0/8 — rede privada
  if (a === 127) return true;                     // 127.0.0.0/8 — loopback
  if (a === 169 && b === 254) return true;        // 169.254.0.0/16 — METADADOS DA NUVEM
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 — rede privada
  if (a === 192 && b === 168) return true;        // 192.168.0.0/16 — rede privada
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 — CGNAT
  if (a === 192 && b === 0) return true;          // 192.0.0.0/24 e 192.0.2.0/24
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 — teste de rede
  if (a >= 224) return true;                      // multicast e reservado
  return false;
}

// IPv6: só liberamos endereço global de verdade. Loopback (::1), link-local (fe80::),
// único-local (fc00::/7) e o IPv4 disfarçado de IPv6 (::ffff:127.0.0.1) ficam de fora.
function ipv6Proibido(hostComColchetes) {
  const ip = hostComColchetes.replace(/^\[|\]$/g, '').toLowerCase();
  if (!ip.includes(':')) return false;
  if (ip === '::' || ip === '::1') return true;
  if (/^f[cd]/.test(ip)) return true;            // fc00::/7 — único-local
  if (/^fe[89ab]/.test(ip)) return true;         // fe80::/10 — link-local
  if (ip.startsWith('::ffff:') || ip.startsWith('::')) {
    // IPv4 embrulhado em IPv6 — confere o IPv4 de dentro
    const dentro = ip.split(':').pop();
    const oct = octetos(dentro);
    if (oct && ipv4Proibido(oct)) return true;
    if (!oct) return true;  // ::algumacoisa que não é IPv4 legítimo — barra
  }
  return false;
}

/**
 * Confere UMA url. Não segue redirecionamento (isso é com buscarComSeguranca).
 * @param {string} bruta
 * @param {{permitirHttp?: boolean}} [opcoes] permitirHttp só para compatibilidade
 *        com fotos antigas de fornecedor que ainda estão em http://.
 * @returns {{ok: boolean, motivo: string, url: URL|null}}
 */
export function conferirUrl(bruta, opcoes = {}) {
  const texto = String(bruta || '').trim();
  if (!texto) return { ok: false, motivo: 'url_vazia', url: null };
  if (texto.length > 2048) return { ok: false, motivo: 'url_longa_demais', url: null };

  let u;
  try { u = new URL(texto); } catch { return { ok: false, motivo: 'url_invalida', url: null }; }

  // Só http(s). Isso barra file://, ftp://, gopher://, data:, blob: e afins —
  // esquemas que já foram usados pra ler arquivo do disco do servidor.
  const permitirHttp = opcoes.permitirHttp === true;
  if (u.protocol !== 'https:' && !(permitirHttp && u.protocol === 'http:')) {
    return { ok: false, motivo: `esquema_${u.protocol.replace(':', '')}`, url: null };
  }

  // Usuário e senha embutidos (http://interno@evil.com) confundem quem lê o log
  // e servem só pra disfarçar o destino real.
  if (u.username || u.password) return { ok: false, motivo: 'credencial_na_url', url: null };

  const host = u.hostname.toLowerCase();
  if (!host) return { ok: false, motivo: 'sem_host', url: null };
  if (NOMES_PROIBIDOS.has(host)) return { ok: false, motivo: 'host_local', url: null };
  if (SUFIXOS_PROIBIDOS.some((s) => host.endsWith(s))) return { ok: false, motivo: 'dominio_interno', url: null };

  // IPv4 normal
  const oct = octetos(host);
  if (oct) {
    if (ipv4Proibido(oct)) return { ok: false, motivo: 'ip_rede_interna', url: null };
    return { ok: true, motivo: 'ok', url: u };
  }

  // IPv6 (o URL guarda entre colchetes)
  if (host.includes(':') || u.hostname.startsWith('[')) {
    if (ipv6Proibido(host)) return { ok: false, motivo: 'ipv6_interno', url: null };
    return { ok: true, motivo: 'ok', url: u };
  }

  // IP escrito em decimal (2130706433), octal (0177.0.0.1) ou hexa (0x7f000001).
  // São formas ALTERNATIVAS e válidas de escrever 127.0.0.1 — não passam nos
  // testes acima, e é exatamente por isso que existem nos ataques.
  if (/^(\d+|0x[0-9a-f]+|0[0-7]+)$/i.test(host)) {
    return { ok: false, motivo: 'ip_numerico_disfarcado', url: null };
  }
  if (/^(0x[0-9a-f]+|\d+)(\.(0x[0-9a-f]+|\d+)){1,2}$/i.test(host)) {
    return { ok: false, motivo: 'ip_numerico_disfarcado', url: null };
  }

  // Nome de domínio comum. Exige pelo menos um ponto: "roteador" sozinho é nome
  // de máquina da rede local, não site da internet.
  if (!host.includes('.')) return { ok: false, motivo: 'host_sem_dominio', url: null };

  return { ok: true, motivo: 'ok', url: u };
}

/**
 * Resolve o nome e confere CADA endereço que o DNS devolveu.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * O QUE ISTO FECHA — e o que NÃO fecha
 * ══════════════════════════════════════════════════════════════════════════════
 * `conferirUrl` barra o que está ESCRITO na URL. Não barra um domínio público
 * cujo DNS aponta para dentro:
 *     https://interno.exemplo.com  →  A  →  10.0.0.5
 * Nomes assim existem de montão e são o caminho fácil (127.0.0.1.nip.io,
 * localtest.me e afins). Aqui o nome é resolvido e TODO endereço devolvido passa
 * pela mesma régua de rede interna.
 *
 * ⚠️ NÃO FECHA DNS REBINDING. Entre esta conferência e a conexão de verdade
 * existe uma janela: quem controla o DNS pode responder um IP público agora e um
 * IP interno um instante depois, com TTL zero. Fechar isso de verdade exige fixar
 * o IP conferido na conexão — o `fetch` do runtime não permite isso sem trocar o
 * dispatcher. Fica registrado como risco residual, não como resolvido.
 * Quem fecha o resto é a rede da hospedagem, não código de aplicação.
 */
async function conferirDNS(hostname, resolver = null) {
  // IP escrito direto na URL já foi conferido por conferirUrl; não há o que resolver.
  if (/^\[?[0-9a-f:.]+\]?$/i.test(hostname) && (octetos(hostname) || hostname.includes(':'))) {
    return { ok: true, motivo: 'ok' };
  }
  // `resolver` existe para o teste poder trocar o DNS por um dublê. Em produção
  // fica nulo e usa o resolvedor do sistema. Sem isso, o teste dependeria de
  // rede de verdade e de nomes que existam — o que o tornaria instável e lento.
  let enderecos;
  try {
    enderecos = resolver
      ? await resolver(hostname)
      : await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    return { ok: false, motivo: 'dns_nao_resolveu' };
  }
  if (!enderecos?.length) return { ok: false, motivo: 'dns_sem_endereco' };

  for (const { address, family } of enderecos) {
    if (family === 4) {
      const oct = octetos(address);
      if (!oct || ipv4Proibido(oct)) return { ok: false, motivo: 'dns_aponta_para_rede_interna' };
    } else if (ipv6Proibido(address)) {
      return { ok: false, motivo: 'dns_aponta_para_rede_interna' };
    }
  }
  return { ok: true, motivo: 'ok' };
}

/**
 * Descarta o corpo de uma resposta que a gente não vai usar.
 * Sem isso, um 3xx ou um 404 com corpo gigante fica pendurado no socket até o
 * runtime resolver limpar. Achado da auditoria independente da OpenAI.
 */
function descartarCorpo(resposta) {
  try { resposta?.body?.cancel?.(); } catch { /* já fechado */ }
}

/** Teto de tempo padrão para a busca inteira, incluindo os redirecionamentos. */
const TIMEOUT_PADRAO_MS = 10_000;

/**
 * Lê o corpo da resposta CONTANDO os bytes conforme eles chegam, e corta na hora
 * em que passa do teto.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUE NÃO DÁ PRA USAR arrayBuffer() E CONFERIR DEPOIS
 * ══════════════════════════════════════════════════════════════════════════════
 * A versão anterior fazia:
 *     const buffer = await resposta.arrayBuffer();   // carrega TUDO na memória
 *     if (buffer.byteLength > maxBytes) ...          // e só então reclama
 * O `content-length` era conferido antes, mas ele é DECLARAÇÃO do outro lado:
 * a origem pode não mandar, pode mentir, ou pode mandar um corpo infinito. Em
 * qualquer um desses casos o corpo inteiro entrava na memória da função antes de
 * alguém dizer "grande demais". Achado da auditoria independente da OpenAI, e
 * estava certo.
 *
 * Aqui o corpo é lido em pedaços. A cada pedaço o total é somado e comparado. No
 * pedaço que estoura o teto, o leitor é cancelado e a conexão abortada — o resto
 * do corpo nunca chega.
 */
async function lerComTeto(resposta, maxBytes, abortador, prazoFinal) {
  // Resposta sem corpo (204, HEAD): nada a ler.
  if (!resposta.body) {
    const buf = await resposta.arrayBuffer();
    if (maxBytes > 0 && buf.byteLength > maxBytes) return { estourou: true };
    return { estourou: false, buffer: buf };
  }

  const leitor = resposta.body.getReader();
  const pedacos = [];
  let total = 0;

  const desistir = () => {
    try { leitor.cancel(); } catch { /* já fechado */ }
    try { abortador.abort(); } catch { /* já abortado */ }
  };

  try {
    for (;;) {
      const restante = prazoFinal - Date.now();
      if (restante <= 0) { desistir(); return { estourou: false, expirou: true }; }

      // ⏱️ O laço confere o prazo POR CONTA PRÓPRIA, não confia só no signal.
      // Motivo: abortar o signal derruba a requisição, mas quem garante que a
      // leitura do corpo também morre é o runtime. Um teste com origem lenta
      // pendurou a função exatamente aqui — o signal disparou e o `read()`
      // continuou entregando um byte por vez. Agora cada leitura corre contra
      // o relógio, então "devagar para sempre" também acaba.
      let passo;
      let alarmeLeitura;
      try {
        passo = await Promise.race([
          leitor.read(),
          new Promise((resolve) => { alarmeLeitura = setTimeout(() => resolve({ __expirou: true }), restante); }),
        ]);
      } finally {
        clearTimeout(alarmeLeitura);
      }

      if (passo?.__expirou) { desistir(); return { estourou: false, expirou: true }; }

      const { done, value } = passo;
      if (done) break;
      if (!value || !value.byteLength) continue;

      total += value.byteLength;
      if (maxBytes > 0 && total > maxBytes) {
        // corta AGORA: cancela o leitor e derruba a conexão
        desistir();
        return { estourou: true };
      }
      pedacos.push(value);
    }
  } finally {
    try { leitor.releaseLock(); } catch { /* já liberado */ }
  }

  // junta os pedaços numa única visão contínua
  const junto = new Uint8Array(total);
  let onde = 0;
  for (const p of pedacos) { junto.set(p, onde); onde += p.byteLength; }
  return { estourou: false, buffer: junto.buffer };
}

/**
 * Busca a URL conferindo CADA salto de redirecionamento.
 *
 * ⏱️ TEMPO: existe um prazo único para a operação inteira — não um prazo por
 * salto. Origem que responde devagar de propósito, ou que fica pingando um byte
 * por segundo para sempre, é abortada. Sem isso, prender a função era só uma
 * questão de paciência do outro lado.
 *
 * @param {string} bruta
 * @param {object} [opcoes]
 *   headers        cabeçalhos extras
 *   permitirHttp   aceitar http:// (fotos antigas de fornecedor)
 *   maxBytes       teto de tamanho do corpo; passou disso, a conexão é cortada
 *   tiposAceitos   prefixos de content-type aceitos (ex.: ['image/'])
 *   timeoutMs      prazo total, incluindo redirecionamentos (padrão 10s)
 *   resolverDNS    só para teste: troca o resolvedor de nomes por um dublê
 * @returns {Promise<{ok:boolean, motivo:string, status?:number, tipo?:string, buffer?:ArrayBuffer, urlFinal?:string}>}
 */
export async function buscarComSeguranca(bruta, opcoes = {}) {
  const {
    headers = {}, permitirHttp = false, maxBytes = 0,
    tiposAceitos = null, timeoutMs = TIMEOUT_PADRAO_MS, resolverDNS = null,
  } = opcoes;

  const prazoFinal = Date.now() + Math.max(1000, Number(timeoutMs) || TIMEOUT_PADRAO_MS);
  let alvo = bruta;

  for (let salto = 0; salto <= MAX_SALTOS; salto++) {
    const conf = conferirUrl(alvo, { permitirHttp });
    if (!conf.ok) {
      return { ok: false, motivo: salto === 0 ? conf.motivo : `redirecionou_para_${conf.motivo}` };
    }

    // 🔒 o nome pode ser público e apontar para dentro — resolve e confere
    const dnsOk = await conferirDNS(conf.url.hostname, resolverDNS);
    if (!dnsOk.ok) {
      return { ok: false, motivo: salto === 0 ? dnsOk.motivo : `redirecionou_para_${dnsOk.motivo}` };
    }

    const restante = prazoFinal - Date.now();
    if (restante <= 0) return { ok: false, motivo: 'tempo_esgotado' };

    const abortador = new AbortController();
    const alarme = setTimeout(() => { try { abortador.abort(); } catch { /* ok */ } }, restante);

    try {
      // redirect: 'manual' é o coração da proteção: o fetch PARA no 3xx e devolve
      // o Location pra gente conferir, em vez de seguir sozinho pra rede interna.
      let resposta;
      try {
        resposta = await fetch(conf.url.toString(), { headers, redirect: 'manual', signal: abortador.signal });
      } catch (e) {
        const abortou = e?.name === 'AbortError' || abortador.signal.aborted;
        return { ok: false, motivo: abortou ? 'tempo_esgotado' : 'falha_de_rede' };
      }

      if (resposta.status >= 300 && resposta.status < 400) {
        descartarCorpo(resposta);   // o corpo do 3xx não serve pra nada
        const destino = resposta.headers.get('location');
        if (!destino) return { ok: false, motivo: 'redirecionamento_sem_destino', status: resposta.status };
        // Location pode ser relativo ("/outra.jpg") — resolve contra a atual.
        try { alvo = new URL(destino, conf.url).toString(); }
        catch { return { ok: false, motivo: 'redirecionamento_invalido', status: resposta.status }; }
        continue;  // o próximo giro do laço confere a URL nova ANTES de buscar
      }

      if (!resposta.ok) {
        descartarCorpo(resposta);
        return { ok: false, motivo: 'origem_respondeu_erro', status: resposta.status };
      }

      const tipo = (resposta.headers.get('content-type') || '').toLowerCase();
      if (tiposAceitos && !tiposAceitos.some((p) => tipo.startsWith(p))) {
        descartarCorpo(resposta);
        try { abortador.abort(); } catch { /* ok */ }   // não baixa o que não serve
        return { ok: false, motivo: 'tipo_nao_aceito', status: resposta.status, tipo };
      }

      // 1ª barreira: o que a origem DECLARA. Barato, evita começar a baixar.
      const declarado = Number(resposta.headers.get('content-length') || 0);
      if (maxBytes > 0 && declarado > maxBytes) {
        descartarCorpo(resposta);
        try { abortador.abort(); } catch { /* ok */ }
        return { ok: false, motivo: 'arquivo_grande_demais', status: resposta.status, tipo };
      }

      // 2ª barreira: o que REALMENTE chega, contado pedaço a pedaço.
      let lido;
      try {
        lido = await lerComTeto(resposta, maxBytes, abortador, prazoFinal);
      } catch (e) {
        const abortou = e?.name === 'AbortError' || abortador.signal.aborted;
        return { ok: false, motivo: abortou ? 'tempo_esgotado' : 'falha_de_leitura', status: resposta.status, tipo };
      }
      if (lido.expirou) return { ok: false, motivo: 'tempo_esgotado', status: resposta.status, tipo };
      if (lido.estourou) {
        return { ok: false, motivo: 'arquivo_grande_demais', status: resposta.status, tipo };
      }

      return { ok: true, motivo: 'ok', status: resposta.status, tipo, buffer: lido.buffer, urlFinal: conf.url.toString() };
    } finally {
      clearTimeout(alarme);
    }
  }

  return { ok: false, motivo: 'redirecionamento_demais' };
}
