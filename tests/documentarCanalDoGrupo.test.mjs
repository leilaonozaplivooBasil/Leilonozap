// 06/09/2026, 01h47 — o conserto do canal privado subiu (v35), o dono testou no grupo DIGITAL,
// o Zeca respondeu que tinha postado. O log da função dizia outra coisa:
//
//   01:47:58  [Slack] não encontrei o canal "top-tech-digital" na listagem — usando o nome como veio.
//   01:47:59  [Slack] erro em chat.postMessage: channel_not_found
//
// O canal "#top-tech-digital" NÃO EXISTE neste workspace. É uma fusão de #top-tech-leilão-nozap
// com #digital-leilão-nozap — e estava escrito como EXEMPLO dentro da descrição da própria
// ferramenta e do system prompt. O modelo copiou o exemplo. A linha 90 do index.ts já avisava
// desde 01/09 que esse canal não existe; o aviso foi escrito e o exemplo ficou.
//
// Segundo achado da mesma noite: não houve nenhuma chamada de files.* no log. A tool foi direto
// para o texto porque procurava a imagem no histórico de QUEM PEDIU, não no do GRUPO — o mesmo
// erro que a PR #178 corrigiu no postar_demanda e que não tinha sido aplicado aqui.
//
// Estes testes rodam o corpo real da ferramenta, extraído do index.ts.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fonte = readFileSync(new URL('../supabase/functions/whatsapp-router/index.ts', import.meta.url), 'utf8');

function corpoDoExecutar(nomeDaTool) {
  const i = fonte.indexOf(`name: '${nomeDaTool}'`);
  assert.notEqual(i, -1, `a ferramenta ${nomeDaTool} sumiu do index.ts`);
  const j = fonte.indexOf('executar: async (input, ctx) => {', i);
  assert.notEqual(j, -1, `não achei o executar de ${nomeDaTool}`);
  let chaves = 0, comecou = false, fim = -1;
  for (let k = fonte.indexOf('{', j); k < fonte.length; k++) {
    if (fonte[k] === '{') { chaves++; comecou = true; }
    else if (fonte[k] === '}') { chaves--; if (comecou && chaves === 0) { fim = k + 1; break; } }
  }
  assert.notEqual(fim, -1);
  return fonte.slice(fonte.indexOf('{', j), fim)
    .replace(/let (\w+):[^=]+=/g, 'let $1 =')
    .replace(/\((\w+) as Error\)/g, '$1');
}

const CANAL_PADRAO = 'C0BHCMYJJGJ';          // #top-tech-leilão-nozap
const CANAL_DO_GRUPO_DIGITAL = 'C0BJBUDVAMD'; // #digital-leilão-nozap
const GRUPO_DIGITAL = '120363429554511849-group';

// Mapa igual ao MAPA_GRUPO_CANAL de produção, na mesma forma (dígitos → canal).
const MAPA = new Map([['120363429554511849', CANAL_DO_GRUPO_DIGITAL]]);

function montarDocumentar({ postagens, imagemDoGrupo = null, imagemDaPessoa = null, upload }) {
  const fn = new Function(
    'ehAdmin', 'SLACK_BOT_TOKEN', 'obterClienteSlack', 'carregarHistorico',
    'extrairUltimaImagemDoHistorico', 'chaveDeMemoriaDoGrupo', 'canalDoGrupo',
    'MAPA_GRUPO_CANAL', 'SLACK_CANAL_PADRAO', 'fetch', 'console',
    `return async (input, ctx) => ${corpoDoExecutar('documentar_no_slack')};`,
  )(
    () => true,
    'xoxb-token',
    () => ({
      postMessage: async (canal, texto) => { postagens.push({ canal, texto }); return { ok: true, data: { ts: '1.1' } }; },
      uploadFile: upload || (async (canal) => { postagens.push({ canal, arquivo: true }); return { ok: true, data: {} }; }),
    }),
    // carregarHistorico devolve a chave que recebeu, pra sabermos ONDE ela procurou
    async (chave) => ({ chave }),
    ({ chave }) => (String(chave).startsWith('grupo:') ? imagemDoGrupo : imagemDaPessoa),
    (grupoId) => `grupo:${String(grupoId).replace(/\D+/g, '')}`,
    (grupoId, mapa, padrao) => {
      const achado = mapa.get(String(grupoId).replace(/\D+/g, ''));
      return achado ? { canal: achado, origem: 'mapa' } : { canal: padrao, origem: 'padrao' };
    },
    MAPA,
    CANAL_PADRAO,
    async () => ({ ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }),
    { error: () => {}, warn: () => {}, log: () => {} },
  );
  return fn;
}

describe('canal — sem canal dito, vai para o canal do grupo, não para um nome inventado', () => {
  test('🔴 o bug: pedido no grupo DIGITAL tem que cair em #digital-leilão-nozap', async () => {
    const postagens = [];
    const fn = montarDocumentar({ postagens });
    const r = await fn(
      { resumo: 'o que foi decidido' },
      { remetente: '5511...', grupoId: GRUPO_DIGITAL, grupoNome: 'DIGITAL • LEILÃO NOZAP' },
    );
    assert.equal(r.ok, true);
    assert.equal(postagens[0].canal, CANAL_DO_GRUPO_DIGITAL, 'foi para o canal errado');
    assert.equal(r.canal_veio_de, 'mapa');
  });

  test('grupo fora do mapa cai no canal padrão — nunca engole o post', async () => {
    const postagens = [];
    const fn = montarDocumentar({ postagens });
    const r = await fn(
      { resumo: 'x' },
      { remetente: '5511...', grupoId: '120363999999999999-group' },
    );
    assert.equal(postagens[0].canal, CANAL_PADRAO);
    assert.equal(r.canal_veio_de, 'padrao');
  });

  test('canal dito pela pessoa continua vencendo, com ou sem #', async () => {
    const postagens = [];
    const fn = montarDocumentar({ postagens });
    const r = await fn(
      { canal: '#logistica-leilão-no-zap-', resumo: 'x' },
      { remetente: '5511...', grupoId: GRUPO_DIGITAL },
    );
    assert.equal(postagens[0].canal, 'logistica-leilão-no-zap-');
    assert.equal(r.canal_veio_de, 'pedido');
  });

  test('canal não é mais obrigatório no schema da tool', () => {
    const i = fonte.indexOf("name: 'documentar_no_slack'");
    const trecho = fonte.slice(i, i + 3000);
    const required = trecho.match(/required: \[([^\]]*)\]/);
    assert.ok(required, 'não achei o required do schema');
    assert.doesNotMatch(
      required[1], /'canal'/,
      'com canal obrigatório o modelo volta a ter que adivinhar um nome',
    );
    assert.match(required[1], /'resumo'/);
  });
});

describe('imagem — a foto está na memória do GRUPO, não na de quem pediu', () => {
  test('🔴 o bug: quem confirma não é quem mandou o print', async () => {
    const postagens = [];
    const fn = montarDocumentar({
      postagens,
      imagemDoGrupo: 'https://z-api/print-do-joao.jpg',
      imagemDaPessoa: null, // o Luiz, que disse "documenta isso", não mandou imagem nenhuma
    });
    const r = await fn(
      { resumo: 'x' },
      { remetente: '55-luiz', grupoId: GRUPO_DIGITAL },
    );
    assert.equal(r.tinha_imagem, true, 'não procurou a foto no histórico do grupo');
    assert.equal(postagens[0].arquivo, true, 'postou texto puro em vez de subir a capa');
  });

  test('no 1:1 (sem grupo) continua usando o histórico da pessoa', async () => {
    const postagens = [];
    const fn = montarDocumentar({
      postagens,
      imagemDoGrupo: null,
      imagemDaPessoa: 'https://z-api/foto-do-1a1.jpg',
    });
    const r = await fn({ resumo: 'x' }, { remetente: '55-avilla', grupoId: null });
    assert.equal(r.tinha_imagem, true);
    assert.equal(postagens[0].canal, CANAL_PADRAO);
  });

  test('incluir_imagem: false continua respeitado', async () => {
    const postagens = [];
    const fn = montarDocumentar({ postagens, imagemDoGrupo: 'https://z-api/print.jpg' });
    const r = await fn(
      { resumo: 'x', incluir_imagem: false },
      { remetente: '55...', grupoId: GRUPO_DIGITAL },
    );
    assert.equal(r.tinha_imagem, false);
    assert.equal(postagens[0].arquivo, undefined);
  });
});

describe('nenhum canal inventado sobrou no que o modelo lê', () => {
  // O modelo lê a descrição das tools e o system prompt. Canal que não existe escrito ali
  // é instrução para errar — foi literalmente a causa do post perdido de 06/09.
  const INVENTADOS = ['#top-tech-digital', '#pedidos'];

  test('nem nas descrições das tools, nem no system prompt', () => {
    for (const fantasma of INVENTADOS) {
      for (const linha of fonte.split('\n')) {
        const limpa = linha.trim();
        if (!limpa.includes(fantasma)) continue;
        // comentário (// …) é memória do bug, o modelo não lê. Qualquer outro lugar, lê.
        const ehComentario = limpa.startsWith('//') || limpa.startsWith('*');
        const ehAvisoNoPrompt = limpa.includes('Não existe') || limpa.includes('neste workspace');
        assert.ok(
          ehComentario || ehAvisoNoPrompt,
          `"${fantasma}" aparece como exemplo em: ${limpa.slice(0, 100)}`,
        );
      }
    }
  });
});
