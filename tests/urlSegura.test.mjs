// Testes do porteiro de URL — SSRF, tamanho, tipo e tempo.
// Runner: `node --test` (embutido no Node 22, sem dependência nova).
// Nenhum teste faz rede de verdade: o fetch global é substituído por um dublê.
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { conferirUrl, buscarComSeguranca } from '../api/_lib/urlSegura.js';

const fetchReal = globalThis.fetch;

// DNS de mentira: todo nome ficticio dos testes resolve para um IP publico.
// Sem isto os testes dependeriam de rede real e de nomes que existam.
const dnsPublico = async () => [{ address: '93.184.216.34', family: 4 }];
const dnsInterno = async () => [{ address: '10.0.0.5', family: 4 }];
afterEach(() => { globalThis.fetch = fetchReal; });

// ── dublê de resposta ────────────────────────────────────────────────────────
function corpoStream(pedacos, { atrasoMs = 0 } = {}) {
  return new ReadableStream({
    async pull(controller) {
      const p = pedacos.shift();
      if (!p) { controller.close(); return; }
      if (atrasoMs) await new Promise((r) => setTimeout(r, atrasoMs));
      controller.enqueue(p);
    },
  });
}
function resposta(status, headers, corpo = null) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (k) => h.get(String(k).toLowerCase()) ?? null },
    body: corpo,
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}
const bytes = (n) => new Uint8Array(n).fill(65);

// ═══════════════════════════════════════════════════════════════════════════
describe('conferirUrl — bloqueio de destino', () => {
  const proibidos = [
    ['metadados da nuvem',        'http://169.254.169.254/latest/meta-data/'],
    ['metadados por nome',        'http://metadata.google.internal/'],
    ['loopback',                  'http://127.0.0.1:8080/admin'],
    ['localhost',                 'http://localhost:3000/'],
    ['0.0.0.0',                   'http://0.0.0.0/'],
    ['rede privada 10.x',         'http://10.0.0.5/'],
    ['rede privada 192.168',      'http://192.168.1.1/'],
    ['rede privada 172.16',       'http://172.20.0.3/'],
    ['CGNAT 100.64',              'http://100.64.1.1/'],
    ['IPv6 loopback',             'http://[::1]/'],
    ['IPv6 link-local',           'http://[fe80::1]/'],
    ['IPv6 unico-local',          'http://[fd00::1]/'],
    ['IPv4 dentro de IPv6',       'http://[::ffff:127.0.0.1]/'],
    ['IP decimal disfarcado',     'http://2130706433/'],
    ['IP hexa disfarcado',        'http://0x7f000001/'],
    ['IP octal disfarcado',       'http://0177.0.0.1/'],
    ['dominio .internal',         'https://banco.internal/dump'],
    ['dominio .local',            'https://impressora.local/'],
    ['file://',                   'file:///etc/passwd'],
    ['gopher://',                 'gopher://127.0.0.1:6379/_FLUSHALL'],
    ['data:',                     'data:text/html,<script>x</script>'],
    ['credencial embutida',       'https://interno@169.254.169.254/'],
    ['host sem dominio',          'http://roteador/'],
    ['vazio',                     ''],
    ['lixo',                      'nao-e-url'],
  ];
  // ⚠️ cada um roda nos DOIS modos de esquema. Só no modo https a maioria seria
  // barrada por 'esquema_http' e a lista de redes nunca seria exercitada.
  for (const [nome, url] of proibidos) {
    test(`barra ${nome} nos dois modos`, () => {
      assert.equal(conferirUrl(url).ok, false, `${nome} passou no modo estrito`);
      assert.equal(conferirUrl(url, { permitirHttp: true }).ok, false, `${nome} passou no modo permissivo`);
    });
  }

  for (const [nome, url] of [
    ['supabase publico', 'https://exemplo.supabase.co/storage/v1/object/public/public-assets/x.jpg'],
    ['cdn de fornecedor', 'https://cdn.fornecedor.com.br/fotos/produto-123.jpg'],
    ['com querystring',   'https://images.exemplo.com/p.jpg?w=800&fm=webp'],
    ['IP publico',        'https://8.8.8.8/foto.png'],
  ]) {
    test(`libera ${nome}`, () => assert.equal(conferirUrl(url).ok, true));
  }

  test('http de fornecedor so passa com permitirHttp', () => {
    assert.equal(conferirUrl('http://cdn.antigo.com.br/f.jpg').ok, false);
    assert.equal(conferirUrl('http://cdn.antigo.com.br/f.jpg', { permitirHttp: true }).ok, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('buscarComSeguranca — redirecionamento', () => {
  test('nunca busca URL interna alcancada por redirecionamento', async () => {
    const visitadas = [];
    globalThis.fetch = async (u, o) => {
      visitadas.push(String(u));
      assert.equal(o.redirect, 'manual', 'fetch chamado sem redirect manual');
      if (String(u).endsWith('/foto.jpg')) return resposta(302, { location: 'http://169.254.169.254/latest/' });
      return resposta(200, { 'content-type': 'image/jpeg' }, corpoStream([bytes(10)]));
    };
    const r = await buscarComSeguranca('https://atacante.com/foto.jpg', { resolverDNS: dnsPublico, maxBytes: 1e6, tiposAceitos: ['image/'] });
    assert.equal(r.ok, false);
    assert.match(r.motivo, /^redirecionou_para_/);
    assert.equal(visitadas.some((v) => v.includes('169.254')), false, 'o servidor CHEGOU a buscar a URL interna');
  });

  test('redirecionamento relativo tambem e reconferido', async () => {
    const visitadas = [];
    globalThis.fetch = async (u) => {
      visitadas.push(String(u));
      if (String(u).endsWith('/a.jpg')) return resposta(302, { location: '/b.jpg' });
      if (String(u).endsWith('/b.jpg')) return resposta(302, { location: 'http://127.0.0.1:6379/' });
      return resposta(200, { 'content-type': 'image/jpeg' }, corpoStream([bytes(10)]));
    };
    const r = await buscarComSeguranca('https://atacante.com/a.jpg', { resolverDNS: dnsPublico, maxBytes: 1e6, tiposAceitos: ['image/'] });
    assert.equal(r.ok, false);
    assert.equal(visitadas.some((v) => v.includes('127.0.0.1')), false);
  });

  test('cadeia de redirecionamentos segura chega ao destino', async () => {
    globalThis.fetch = async (u) => {
      if (String(u).endsWith('/1.jpg')) return resposta(302, { location: 'https://cdn.bom.com/2.jpg' });
      if (String(u).endsWith('/2.jpg')) return resposta(302, { location: 'https://cdn.bom.com/3.jpg' });
      return resposta(200, { 'content-type': 'image/png' }, corpoStream([bytes(64)]));
    };
    const r = await buscarComSeguranca('https://cdn.bom.com/1.jpg', { resolverDNS: dnsPublico, maxBytes: 1e6, tiposAceitos: ['image/'] });
    assert.equal(r.ok, true);
    assert.equal(r.buffer.byteLength, 64);
  });

  test('laco de redirecionamento e cortado', async () => {
    globalThis.fetch = async () => resposta(302, { location: 'https://cdn.bom.com/loop.jpg' });
    const r = await buscarComSeguranca('https://cdn.bom.com/loop.jpg', { resolverDNS: dnsPublico, maxBytes: 1e6 });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'redirecionamento_demais');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('buscarComSeguranca — teto de tamanho', () => {
  test('resposta pequena e normal passa', async () => {
    globalThis.fetch = async () => resposta(200, { 'content-type': 'image/jpeg', 'content-length': '1024' }, corpoStream([bytes(1024)]));
    const r = await buscarComSeguranca('https://cdn.bom.com/ok.jpg', { resolverDNS: dnsPublico, maxBytes: 8192, tiposAceitos: ['image/'] });
    assert.equal(r.ok, true);
    assert.equal(r.buffer.byteLength, 1024);
  });

  test('content-length declarado acima do teto e barrado sem baixar', async () => {
    // ⚠️ Nao dá pra espionar isto pelo `pull`: o ReadableStream chama `pull`
    // sozinho na construcao, antes de qualquer leitura. O sinal honesto de que
    // o corpo comecou a ser lido e o `getReader()`.
    const corpo = new ReadableStream({ pull(c) { c.close(); } });
    let pegouLeitor = false;
    const getReaderOriginal = corpo.getReader.bind(corpo);
    corpo.getReader = (...a) => { pegouLeitor = true; return getReaderOriginal(...a); };

    globalThis.fetch = async () => resposta(200, { 'content-type': 'image/jpeg', 'content-length': '99000000' }, corpo);
    const r = await buscarComSeguranca('https://cdn.bom.com/g.jpg', { resolverDNS: dnsPublico, maxBytes: 8192, tiposAceitos: ['image/'] });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'arquivo_grande_demais');
    assert.equal(pegouLeitor, false, 'comecou a ler o corpo mesmo com o tamanho declarado acima do teto');
  });

  test('SEM content-length e corpo grande: corta no meio do stream', async () => {
    // 20 pedaços de 1 KB, teto de 4 KB. Tem que parar por volta do 5º.
    const pedacos = Array.from({ length: 20 }, () => bytes(1024));
    let entregues = 0;
    const corpo = new ReadableStream({
      pull(c) { const p = pedacos.shift(); if (!p) { c.close(); return; } entregues++; c.enqueue(p); },
    });
    globalThis.fetch = async () => resposta(200, { 'content-type': 'image/jpeg' }, corpo);
    const r = await buscarComSeguranca('https://cdn.bom.com/sem-len.jpg', { resolverDNS: dnsPublico, maxBytes: 4096, tiposAceitos: ['image/'] });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'arquivo_grande_demais');
    assert.ok(entregues <= 6, `leu ${entregues} pedacos de 20 — deveria ter cortado por volta do 5º`);
  });

  test('content-length MENTIROSO nao engana: o corte real e por bytes contados', async () => {
    const pedacos = Array.from({ length: 30 }, () => bytes(1024));
    let entregues = 0;
    const corpo = new ReadableStream({
      pull(c) { const p = pedacos.shift(); if (!p) { c.close(); return; } entregues++; c.enqueue(p); },
    });
    globalThis.fetch = async () => resposta(200, { 'content-type': 'image/jpeg', 'content-length': '10' }, corpo);
    const r = await buscarComSeguranca('https://cdn.bom.com/mente.jpg', { resolverDNS: dnsPublico, maxBytes: 4096, tiposAceitos: ['image/'] });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'arquivo_grande_demais');
    assert.ok(entregues <= 6, `leu ${entregues} pedacos — o corte por contagem nao funcionou`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('buscarComSeguranca — tipo e tempo', () => {
  test('html se passando por imagem e recusado', async () => {
    globalThis.fetch = async () => resposta(200, { 'content-type': 'text/html' }, corpoStream([bytes(10)]));
    const r = await buscarComSeguranca('https://cdn.bom.com/pagina.html', { resolverDNS: dnsPublico, maxBytes: 1e6, tiposAceitos: ['image/'] });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'tipo_nao_aceito');
  });

  test('servidor lento e abortado pelo prazo', async () => {
    // corpo que entrega 1 byte a cada 60ms, para sempre; prazo de 300ms
    const corpo = new ReadableStream({
      async pull(c) { await new Promise((r) => setTimeout(r, 60)); c.enqueue(bytes(1)); },
    });
    // ⚠️ De propósito o dublê NÃO derruba o corpo quando o signal aborta.
    // É justamente o cenário perigoso: um runtime (ou uma origem) em que abortar
    // a requisição não mata a leitura do corpo. Se o código dependesse só do
    // signal, ele penduraria aqui — foi o que aconteceu na primeira execução.
    globalThis.fetch = async () => resposta(200, { 'content-type': 'image/jpeg' }, corpo);
    const inicio = Date.now();
    const r = await buscarComSeguranca('https://lento.com/f.jpg', { resolverDNS: dnsPublico, maxBytes: 1e9, tiposAceitos: ['image/'], timeoutMs: 300 });
    const gasto = Date.now() - inicio;
    assert.equal(r.ok, false, 'o servidor lento nao foi cortado');
    assert.ok(gasto < 4000, `demorou ${gasto}ms — o prazo nao funcionou`);
  });

  test('origem que nunca responde e abortada', async () => {
    globalThis.fetch = async (u, o) => new Promise((_, rej) => {
      o?.signal?.addEventListener?.('abort', () => {
        const e = new Error('abortado'); e.name = 'AbortError'; rej(e);
      });
    });
    const r = await buscarComSeguranca('https://travado.com/f.jpg', { resolverDNS: dnsPublico, maxBytes: 1e6, timeoutMs: 1000 });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'tempo_esgotado');
  });

  test('origem que responde erro devolve motivo proprio', async () => {
    globalThis.fetch = async () => resposta(404, {});
    const r = await buscarComSeguranca('https://cdn.bom.com/sumiu.jpg', { resolverDNS: dnsPublico, maxBytes: 1e6 });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'origem_respondeu_erro');
    assert.equal(r.status, 404);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe('buscarComSeguranca — nome publico que aponta pra dentro', () => {
  test('dominio publico resolvendo para 10.0.0.5 e barrado', async () => {
    let buscou = false;
    globalThis.fetch = async () => { buscou = true; return resposta(200, { 'content-type': 'image/jpeg' }, corpoStream([bytes(10)])); };
    const r = await buscarComSeguranca('https://interno.exemplo.com/f.jpg', {
      resolverDNS: dnsInterno, maxBytes: 1e6, tiposAceitos: ['image/'],
    });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'dns_aponta_para_rede_interna');
    assert.equal(buscou, false, 'chegou a buscar um nome que resolve pra rede interna');
  });

  test('redirecionamento para nome que resolve pra dentro tambem e barrado', async () => {
    const visitadas = [];
    let chamadas = 0;
    globalThis.fetch = async (u) => { visitadas.push(String(u)); return resposta(302, { location: 'https://interno.exemplo.com/x.jpg' }); };
    const r = await buscarComSeguranca('https://cdn.bom.com/1.jpg', {
      resolverDNS: async (h) => (h === 'cdn.bom.com' ? [{ address: '93.184.216.34', family: 4 }] : [{ address: '127.0.0.1', family: 4 }]),
      maxBytes: 1e6,
    });
    assert.equal(r.ok, false);
    assert.match(r.motivo, /^redirecionou_para_dns/);
    assert.equal(visitadas.some((v) => v.includes('interno.exemplo.com')), false);
  });

  test('DNS que nao resolve e recusado', async () => {
    globalThis.fetch = async () => resposta(200, { 'content-type': 'image/jpeg' }, corpoStream([bytes(10)]));
    const r = await buscarComSeguranca('https://nao-existe.exemplo/f.jpg', {
      resolverDNS: async () => { throw new Error('ENOTFOUND'); }, maxBytes: 1e6,
    });
    assert.equal(r.ok, false);
    assert.equal(r.motivo, 'dns_nao_resolveu');
  });

  test('IPv6 devolvido pelo DNS tambem e conferido', async () => {
    globalThis.fetch = async () => resposta(200, { 'content-type': 'image/jpeg' }, corpoStream([bytes(10)]));
    const r = await buscarComSeguranca('https://duplo.exemplo.com/f.jpg', {
      resolverDNS: async () => [{ address: '93.184.216.34', family: 4 }, { address: 'fd00::1', family: 6 }],
      maxBytes: 1e6,
    });
    assert.equal(r.ok, false, 'passou mesmo com um IPv6 interno na resposta do DNS');
    assert.equal(r.motivo, 'dns_aponta_para_rede_interna');
  });
});
