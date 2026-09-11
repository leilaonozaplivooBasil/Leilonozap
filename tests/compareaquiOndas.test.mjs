// 🌊 AS ONDAS DO COMPAREAQUI, RODANDO DE VERDADE — 10/09/2026
//
// Os outros testes leem o arquivo. Este EXECUTA o motor com a rede simulada e
// cronometrada, porque as duas coisas que quebraram em produção — o tempo e a
// ordem — não aparecem em varredura de texto:
//
//   • em FILA, 3 fontes de 5s davam 15s e estouravam o teto;
//   • em PARALELO, as mesmas 3 dão 5s.
//
// A régua aqui é o RELÓGIO, medido no processo.

import test from 'node:test';
import assert from 'node:assert/strict';

process.env.SERPAPI_KEY = 'teste-serpapi';
process.env.SEARCHAPI_KEY = 'teste-searchapi';

const { searchMarket } = await import('../api/_lib/marketSearch.js');

const ATRASO_POR_HOST = { serpapi: 500, searchapi: 60, zoom: 40 };
let chamadas = [];

function instalarRede({ serpapiShoppingAchaPreco = true } = {}) {
  chamadas = [];
  globalThis.fetch = async (url) => {
    const u = String(url);
    const host = u.includes('serpapi.com') ? 'serpapi' : u.includes('searchapi.io') ? 'searchapi' : 'zoom';
    const engine = /engine=([a-z_]+)/.exec(u)?.[1] || (host === 'zoom' ? 'zoom' : '?');
    const tipo = /type=([a-z_]+)/.exec(u)?.[1] || '';
    chamadas.push({ host, engine, tipo, em: Date.now() });
    await new Promise((r) => setTimeout(r, ATRASO_POR_HOST[host]));

    if (host === 'searchapi') {
      // a frase real da SearchApi esgotada, copiada do diagnóstico de 10/09
      return { ok: true, json: async () => ({ error: 'You have used all of the searches for the month. Please upgrade your plan on SearchApi.io.' }) };
    }
    if (host === 'zoom') return { ok: true, text: async () => '<html></html>' };
    if (engine === 'google_shopping') {
      return {
        ok: true,
        json: async () => (serpapiShoppingAchaPreco
          ? { shopping_results: [
            { source: 'Loja A', title: 'Caixa de Som Mondial 550W Bluetooth', extracted_price: 300, link: 'https://a' },
            { source: 'Loja B', title: 'Caixa de Som Mondial 550W', extracted_price: 340, link: 'https://b' },
            { source: 'Loja C', title: 'Caixa Som Mondial 550W amplificada', extracted_price: 320, link: 'https://c' },
          ] }
          : { shopping_results: [] }),
      };
    }
    // google_lens
    return { ok: true, json: async () => ({ exact_matches: [], visual_matches: [] }) };
  };
}

const TITULO = 'Caixa de Som Mondial 550W';
const FOTO = 'https://exemplo.com/caixa.jpg';

// ───────────────────────────────────────────────────────────────────────────
test('CAO-1 · a onda 1 sai JUNTA — o custo é a fonte mais lenta, não a soma', async () => {
  instalarRede();
  const t0 = Date.now();
  const r = await searchMarket(TITULO, FOTO);
  const gasto = Date.now() - t0;

  assert.equal(r.found, true, `não achou: ${JSON.stringify(r.attempts)}`);
  // em fila seriam 500 (shopping) + 40 (zoom) + 500 (lens exato) = 1040ms.
  // em paralelo, ~500ms. A folga cobre o overhead do processo.
  assert.ok(gasto < 900, `a onda 1 levou ${gasto}ms — voltou a rodar em fila (a soma seria ~1040ms)`);

  // e a prova direta: as fontes da onda 1 começaram quase no mesmo instante
  const inicios = chamadas.map((c) => c.em);
  const espalhamento = Math.max(...inicios) - Math.min(...inicios);
  assert.ok(espalhamento < 120, `as fontes começaram espalhadas em ${espalhamento}ms — não saíram juntas`);
});

test('CAO-2 · com a SerpApi Shopping respondendo, a onda 2 NUNCA é chamada', async () => {
  // 💸 é o que segura o gasto: cada chamada extra é uma busca cobrada, e a
  // conta chegou em 995 restantes com o cartão recusado.
  instalarRede();
  const r = await searchMarket(TITULO, FOTO);

  assert.equal(r.source, 'serpapi', `quem venceu foi "${r.source}" — a principal deixou de ser a SerpApi Shopping`);
  assert.equal(chamadas.filter((c) => c.tipo === 'visual_matches').length, 0, 'a lens visual (onda 2) foi chamada à toa');
  assert.equal(chamadas.filter((c) => c.host === 'searchapi').length, 0, 'a SearchApi esgotada (onda 2) foi chamada à toa');
  // o gasto na SerpApi: shopping + lens exato = 2 buscas, nunca 4
  assert.equal(chamadas.filter((c) => c.host === 'serpapi').length, 2, `gastou ${chamadas.filter((c) => c.host === 'serpapi').length} buscas na SerpApi`);
});

test('CAO-3 · a onda 2 existe — e só entra quando a 1 não precifica', async () => {
  instalarRede({ serpapiShoppingAchaPreco: false });
  const r = await searchMarket(TITULO, FOTO);

  assert.equal(r.found, false, 'premissa: com a onda 1 vazia, nada é precificado');
  assert.ok(chamadas.some((c) => c.tipo === 'visual_matches'), 'a onda 2 não foi acionada quando a 1 falhou');
  assert.ok(chamadas.some((c) => c.host === 'searchapi'), 'a reserva não foi acionada quando a 1 falhou');
  // e a trilha conta a história inteira, fonte por fonte
  const trilha = (r.attempts || []).join(' | ');
  for (const fonte of ['serpapi', 'zoom', 'serpapi_lens_exato', 'serpapi_lens_visual']) {
    assert.ok(trilha.includes(fonte), `sumiu "${fonte}" do diagnóstico: ${trilha}`);
  }
});

test('CAO-4 · fonte que responde "cota esgotada" sai da roda na busca seguinte', async () => {
  // 🔴 INSTÂNCIA NOVA DE PROPÓSITO. O disjuntor é memória do módulo, e os
  // testes acima já o acionaram — reaproveitar o módulo faria a "1ª busca"
  // deste teste nascer com a fonte já desligada, e a assertiva mediria o
  // estado deixado por outro teste em vez do comportamento daqui.
  const { searchMarket: buscarNovo } = await import('../api/_lib/marketSearch.js?disjuntor-limpo');

  instalarRede({ serpapiShoppingAchaPreco: false });
  await buscarNovo(TITULO, FOTO); // 1ª: bate na SearchApi e toma a frase
  const depois = chamadas.filter((c) => c.host === 'searchapi').length;
  assert.ok(depois > 0, 'premissa: a 1ª busca chegou a chamar a SearchApi');

  instalarRede({ serpapiShoppingAchaPreco: false });
  const r = await buscarNovo(TITULO, FOTO); // 2ª: já devia estar desligada
  assert.equal(chamadas.filter((c) => c.host === 'searchapi').length, 0, 'a SearchApi esgotada foi chamada de novo');
  assert.ok((r.attempts || []).some((l) => /disjuntor/.test(l)), 'o diagnóstico não explica por que a fonte foi pulada');
  // 🔒 e o disjuntor NÃO pode ter desligado a SerpApi junto (ela só deu "sem resultado")
  assert.ok(chamadas.some((c) => c.host === 'serpapi'), 'o disjuntor derrubou a fonte principal junto');
});

test('CAO-5 · 🔒 timeout NÃO desliga a fonte principal — só "cota esgotada" desliga', async () => {
  // 🔴 A diferença entre as duas falhas é o dia inteiro do CompareAQUI.
  // No diagnóstico de 10/09 a SerpApi apareceu com "aborted due to timeout" —
  // que é passageiro, e era culpa do NOSSO relógio curto demais. Se o
  // disjuntor tratasse isso como cota esgotada, a fonte PRINCIPAL ficaria
  // desligada por uma hora por causa de uma lentidão de dez segundos.
  const { searchMarket: buscar } = await import('../api/_lib/marketSearch.js?so-cota-desliga');

  let primeira = true;
  instalarRede({ serpapiShoppingAchaPreco: true });
  const redeBoa = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (primeira && String(url).includes('engine=google_shopping')) {
      chamadas.push({ host: 'serpapi', engine: 'google_shopping', tipo: '', em: Date.now() });
      throw new Error('The operation was aborted due to timeout');
    }
    return redeBoa(url);
  };
  await buscar(TITULO, FOTO);
  assert.ok(chamadas.some((c) => c.engine === 'google_shopping'), 'premissa: a 1ª busca chamou o Shopping');
  primeira = false;

  // 2ª busca: o Shopping TEM que ser chamado de novo e vencer
  instalarRede({ serpapiShoppingAchaPreco: true });
  const r = await buscar(TITULO, FOTO);
  assert.ok(chamadas.some((c) => c.engine === 'google_shopping'), 'o timeout desligou a fonte principal — só cota esgotada pode desligar');
  assert.equal(r.source, 'serpapi', `venceu "${r.source}" — a principal foi derrubada por um timeout passageiro`);
});
