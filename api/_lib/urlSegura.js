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
 * Busca a URL conferindo CADA salto de redirecionamento.
 * @param {string} bruta
 * @param {object} [opcoes]
 *   headers        cabeçalhos extras
 *   permitirHttp   aceitar http:// (fotos antigas de fornecedor)
 *   maxBytes       teto de tamanho do corpo; acima disso a resposta é descartada
 *   tiposAceitos   prefixos de content-type aceitos (ex.: ['image/'])
 * @returns {Promise<{ok:boolean, motivo:string, status?:number, tipo?:string, buffer?:ArrayBuffer, urlFinal?:string}>}
 */
export async function buscarComSeguranca(bruta, opcoes = {}) {
  const { headers = {}, permitirHttp = false, maxBytes = 0, tiposAceitos = null } = opcoes;

  let alvo = bruta;
  let resposta = null;

  for (let salto = 0; salto <= MAX_SALTOS; salto++) {
    const conf = conferirUrl(alvo, { permitirHttp });
    if (!conf.ok) return { ok: false, motivo: salto === 0 ? conf.motivo : `redirecionou_para_${conf.motivo}` };

    // redirect: 'manual' é o coração da proteção: o fetch PARA no 3xx e devolve
    // o Location pra gente conferir, em vez de seguir sozinho pra rede interna.
    resposta = await fetch(conf.url.toString(), { headers, redirect: 'manual' });

    if (resposta.status >= 300 && resposta.status < 400) {
      const destino = resposta.headers.get('location');
      if (!destino) return { ok: false, motivo: 'redirecionamento_sem_destino', status: resposta.status };
      // Location pode ser relativo ("/outra.jpg") — resolve contra a atual.
      try { alvo = new URL(destino, conf.url).toString(); }
      catch { return { ok: false, motivo: 'redirecionamento_invalido', status: resposta.status }; }
      continue;
    }

    if (!resposta.ok) return { ok: false, motivo: 'origem_respondeu_erro', status: resposta.status };

    const tipo = (resposta.headers.get('content-type') || '').toLowerCase();
    if (tiposAceitos && !tiposAceitos.some((p) => tipo.startsWith(p))) {
      return { ok: false, motivo: 'tipo_nao_aceito', status: resposta.status, tipo };
    }

    // Teto de tamanho: confere o que o servidor DECLARA e, depois, o que
    // realmente veio (servidor pode mentir no content-length).
    const declarado = Number(resposta.headers.get('content-length') || 0);
    if (maxBytes > 0 && declarado > maxBytes) {
      return { ok: false, motivo: 'arquivo_grande_demais', status: resposta.status, tipo };
    }
    const buffer = await resposta.arrayBuffer();
    if (maxBytes > 0 && buffer.byteLength > maxBytes) {
      return { ok: false, motivo: 'arquivo_grande_demais', status: resposta.status, tipo };
    }

    return { ok: true, motivo: 'ok', status: resposta.status, tipo, buffer, urlFinal: conf.url.toString() };
  }

  return { ok: false, motivo: 'redirecionamento_demais' };
}
