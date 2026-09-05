// postagemDemanda — o formato do post de demanda no Slack.
//
// 05/09/2026, pedido do dono com foto do formato alvo. O caso base abaixo é a RECONSTRUÇÃO
// EXATA do post da foto ("ALTERAÇÃO DE LINK DE REFERÊNCIA — Top Tech Digital", 18/08/2026),
// incluindo os tamanhos dos anexos (82 kB e 172 kB) — se o formato mudar, este teste conta.
//
// ⚠️ Estes testes EXECUTAM a função. Os outros testes do router leem o index.ts como texto e
// conferem se a frase existe no arquivo — o que nesta casa já deixou passar regressão (o
// teste passava porque a palavra estava num comentário, não no código).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  montarPostagem, montarRascunho, tituloDoTopico, dataBR,
  listaDePontos, legendasDeAnexos, escolherCapa, RISCO,
} from '../supabase/functions/whatsapp-router/postagemDemanda.js';

const CASO_DA_FOTO = {
  titulo: 'Alteração de link de referência — Top Tech Digital',
  pedido: 'Ávilla Business',
  data: '2026-08-18',
  solicitacao: 'Alterar o link de referência de indicação da Top Tech Digital de `/Home?ref=jonathanglvp` para `/Home?ref=toptech`.',
  risco: 'alto',
  motivo: 'O parâmetro ref alimenta o campo referred_by_id no banco, base de toda hierarquia de indicação.',
  pontos: [
    'Verificar se o código top já existe vinculado a outra conta (colisão)',
    'Links já publicados com jonathanglvp deixarão de funcionar',
    'Cadastros existentes não são afetados (vínculo é por ID, não por texto)',
  ],
  anexos: [
    { legenda: 'Loja Virtual navegando, mas outros produtos não aparecem', bytes: 83968 },
    { legenda: "Busca por 'pote' revela produtos que NÃO aparecem na navegação normal da loja", bytes: 176128 },
  ],
};

describe('montarPostagem — o formato da foto', () => {
  test('reconstrói o post da foto, linha a linha', () => {
    assert.equal(montarPostagem(CASO_DA_FOTO), [
      '*ALTERAÇÃO DE LINK DE REFERÊNCIA — Top Tech Digital*',
      '',
      '*Pedido:* Ávilla Business',
      '*Data:* 18/08/2026',
      '',
      '*Solicitação:*',
      'Alterar o link de referência de indicação da Top Tech Digital de `/Home?ref=jonathanglvp` para `/Home?ref=toptech`.',
      '',
      '*Classificação de Risco:* 🔴 ALTO',
      '*Motivo:* O parâmetro ref alimenta o campo referred_by_id no banco, base de toda hierarquia de indicação.',
      '',
      '1. Verificar se o código top já existe vinculado a outra conta (colisão)',
      '2. Links já publicados com jonathanglvp deixarão de funcionar',
      '3. Cadastros existentes não são afetados (vínculo é por ID, não por texto)',
      '',
      '*Status:* Aguardando autorização para execução',
      '',
      'Imagem 1 — Loja Virtual navegando, mas outros produtos não aparecem (82 kB)',
      "Imagem 2 — Busca por 'pote' revela produtos que NÃO aparecem na navegação normal da loja (172 kB)",
    ].join('\n'));
  });

  test('a ordem dos blocos é a da foto e não muda', () => {
    const p = montarPostagem(CASO_DA_FOTO);
    const ordem = ['*Pedido:', '*Data:', '*Solicitação:', '*Classificação de Risco:', '*Motivo:', '*Status:', 'Imagem 1'];
    let anterior = -1;
    for (const marca of ordem) {
      const i = p.indexOf(marca);
      assert.ok(i > anterior, `"${marca}" saiu fora de ordem`);
      anterior = i;
    }
  });

  test('os três riscos têm emoji e rótulo próprios', () => {
    assert.match(montarPostagem({ ...CASO_DA_FOTO, risco: 'alto' }), /🔴 ALTO/);
    assert.match(montarPostagem({ ...CASO_DA_FOTO, risco: 'medio' }), /🟡 MÉDIO/);
    assert.match(montarPostagem({ ...CASO_DA_FOTO, risco: 'baixo' }), /🟢 BAIXO/);
    assert.deepEqual(Object.keys(RISCO).sort(), ['alto', 'baixo', 'medio']);
  });

  test('risco inválido não estoura nem inventa: cai em médio', () => {
    for (const ruim of [undefined, null, '', 'gravíssimo', 42, {}]) {
      assert.match(montarPostagem({ ...CASO_DA_FOTO, risco: ruim }), /🟡 MÉDIO/, `risco ${String(ruim)}`);
    }
  });

  test('status padrão é o da foto quando ninguém passa outro', () => {
    assert.match(montarPostagem({ ...CASO_DA_FOTO, status: undefined }),
      /\*Status:\* Aguardando autorização para execução/);
  });

  test('demanda mínima (só descrição e risco) sai íntegra, sem "undefined"', () => {
    const p = montarPostagem({ titulo: 'Teste', solicitacao: 'Mudar o texto do rodapé', risco: 'baixo' });
    assert.ok(!/undefined|null|NaN/.test(p), `vazou valor cru: ${p}`);
    assert.match(p, /\*TESTE\*/);
    assert.match(p, /🟢 BAIXO/);
    assert.match(p, /\*Status:\*/);
  });

  test('sem pontos de atenção, não sobra lista vazia nem linha solta', () => {
    const p = montarPostagem({ ...CASO_DA_FOTO, pontos: [] });
    assert.ok(!/^\d+\.\s*$/m.test(p), 'sobrou item numerado vazio');
    assert.ok(!/\n{3,}/.test(p), 'sobraram linhas em branco empilhadas');
  });
});

describe('tituloDoTopico', () => {
  test('caixa alta só até o travessão — o nome próprio é preservado', () => {
    assert.equal(tituloDoTopico('Alteração de link de referência — Top Tech Digital'),
      'ALTERAÇÃO DE LINK DE REFERÊNCIA — Top Tech Digital');
  });
  test('sem travessão, sobe o título inteiro', () => {
    assert.equal(tituloDoTopico('Produto sem estoque na vitrine'), 'PRODUTO SEM ESTOQUE NA VITRINE');
  });
  test('hífen e meia-risca também separam', () => {
    assert.equal(tituloDoTopico('Falha no PIX – Mercado Pago'), 'FALHA NO PIX – Mercado Pago');
    assert.equal(tituloDoTopico('Erro no frete - Melhor Envio'), 'ERRO NO FRETE - Melhor Envio');
  });
  test('lixo devolve vazio em vez de estourar', () => {
    for (const ruim of [null, undefined, {}, [], Symbol('x')]) assert.equal(tituloDoTopico(ruim), '');
  });
});

describe('dataBR', () => {
  test('dia puro não escorrega para o dia anterior por causa do fuso', () => {
    assert.equal(dataBR('2026-08-18'), '18/08/2026');
    assert.equal(dataBR('2026-01-01'), '01/01/2026');
  });
  test('sem data, usa hoje — nunca a Época do Unix', () => {
    const hoje = dataBR();
    assert.match(hoje, /^\d{2}\/\d{2}\/\d{4}$/);
    assert.ok(!hoje.endsWith('/1969') && !hoje.endsWith('/1970'), `voltou a Época: ${hoje}`);
  });
  test('valor impossível devolve vazio, não 31/12/1969 (o bug do lance "há 57 anos")', () => {
    for (const ruim of [null, 0, 'ontem', {}, NaN, Symbol('x'), true]) {
      assert.equal(dataBR(ruim), '', `${String(ruim)} imprimiu data`);
    }
  });
});

describe('listaDePontos', () => {
  test('aceita array', () => {
    assert.deepEqual(listaDePontos(['um', 'dois']), ['um', 'dois']);
  });
  test('aceita texto com quebra de linha ou ponto-e-vírgula', () => {
    assert.deepEqual(listaDePontos('um\ndois'), ['um', 'dois']);
    assert.deepEqual(listaDePontos('um; dois'), ['um', 'dois']);
  });
  test('não numera duas vezes quando o texto já vem numerado', () => {
    assert.deepEqual(listaDePontos(['1. um', '2) dois']), ['um', 'dois']);
  });
  test('não quebra número no meio: "1;5" continua inteiro', () => {
    assert.deepEqual(listaDePontos('estoque 1;5 unidades'), ['estoque 1;5 unidades']);
  });
  test('vazio e lixo devolvem lista vazia', () => {
    for (const ruim of [null, undefined, '', '   ', {}, 42]) assert.deepEqual(listaDePontos(ruim), []);
  });
});

describe('legendasDeAnexos', () => {
  test('numera e mostra o tamanho em kB, como na foto', () => {
    assert.deepEqual(legendasDeAnexos([{ legenda: 'painel', bytes: 83968 }]), ['Imagem 1 — painel (82 kB)']);
  });
  test('sem legenda e sem tamanho, sai só "Imagem N"', () => {
    assert.deepEqual(legendasDeAnexos([{}, {}]), ['Imagem 1', 'Imagem 2']);
  });
  test('não estoura sem anexo nenhum', () => {
    for (const ruim of [null, undefined, 'foto', {}]) assert.deepEqual(legendasDeAnexos(ruim), []);
  });
});

describe('escolherCapa — a regra literal do dono', () => {
  test('imagem do usuário ganha da logo', () => {
    assert.deepEqual(escolherCapa({ imagemDoUsuario: 'https://x/print.png', logoUrl: 'https://x/logo.png' }),
      { capa: 'https://x/print.png', origem: 'usuario' });
  });
  test('sem imagem do usuário, entra a logo da Top Tech', () => {
    assert.deepEqual(escolherCapa({ logoUrl: 'https://x/logo.png' }),
      { capa: 'https://x/logo.png', origem: 'logo' });
  });
  test('sem logo configurada, avisa em vez de falhar — o post sai sem capa', () => {
    const r = escolherCapa({});
    assert.equal(r.capa, null);
    assert.equal(r.motivo, 'sem_logo');
  });
});

describe('montarRascunho — as duas travas antes de publicar', () => {
  test('passo 1 pergunta se a demanda está certa', () => {
    const r = montarRascunho(CASO_DA_FOTO, 'conteudo');
    assert.match(r, /Está certa\?/i);
    assert.ok(!/Posso postar/i.test(r), 'pulou direto para a permissão de postar');
  });
  test('passo 2 pergunta se pode postar', () => {
    const r = montarRascunho(CASO_DA_FOTO, 'postar');
    assert.match(r, /Posso postar no Slack\?/i);
  });
  test('o rascunho mostra o post inteiro, não um resumo dele', () => {
    const r = montarRascunho(CASO_DA_FOTO, 'conteudo');
    assert.ok(r.startsWith(montarPostagem(CASO_DA_FOTO)), 'o rascunho não é o post de verdade');
  });
});

describe('citação — "exatamente como foi dito no grupo" (dono, 05/09/2026)', () => {
  const COM_FALA = { ...CASO_DA_FOTO, citacao: 'preciso que melhore seu retorno aqui' };

  test('a fala crua sai em bloco de citação do Slack', () => {
    assert.match(montarPostagem(COM_FALA), /^> preciso que melhore seu retorno aqui$/m);
  });

  test('a citação vem DEPOIS da leitura técnica, não no lugar dela', () => {
    const p = montarPostagem(COM_FALA);
    assert.ok(p.indexOf('*Solicitação:*') < p.indexOf('> preciso'), 'a citação engoliu a solicitação');
    assert.match(p, /Alterar o link de referência/, 'a leitura técnica sumiu');
  });

  test('fala de várias linhas vira várias linhas citadas', () => {
    const p = montarPostagem({ ...CASO_DA_FOTO, citacao: 'primeira\nsegunda' });
    assert.match(p, /^> primeira$/m);
    assert.match(p, /^> segunda$/m);
  });

  test('sem citação, o post continua idêntico ao da foto', () => {
    assert.equal(montarPostagem({ ...CASO_DA_FOTO, citacao: undefined }), montarPostagem(CASO_DA_FOTO));
  });

  test('citação vazia ou lixo não deixa "> " solto no post', () => {
    for (const ruim of ['', '   ', null, {}, 42]) {
      assert.ok(!/^>\s*$/m.test(montarPostagem({ ...CASO_DA_FOTO, citacao: ruim })), `citacao ${String(ruim)}`);
    }
  });
});
