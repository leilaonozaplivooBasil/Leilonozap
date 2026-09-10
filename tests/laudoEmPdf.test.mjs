// 📄 O PDF QUE SAI DA TELA E NÃO VOLTA (10/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ESTES TESTES GERAM O PDF DE VERDADE
// ═══════════════════════════════════════════════════════════════════════════
// Um laudo em PDF é diferente de uma tela: ele é baixado, vira print no
// WhatsApp, é encaminhado sem a primeira página e sobrevive à conversa que o
// gerou. Não dá pra corrigir depois de mandado.
//
// Enquanto o desenho morava dentro do `.jsx` do botão, nenhum teste
// conseguia importá-lo (React, ícones e o `toast` não sobem em node puro), e
// a única conferência possível era ler o arquivo como TEXTO — o tipo de
// teste que passa verde enquanto o PDF sai errado. Por isso o motor é um
// `.js` sem React: aqui embaixo o documento é MONTADO e os bytes são lidos.
//
// jsPDF grava o texto sem compressão, em WinAnsi — que bate com latin1 nos
// acentos do português. É isso que permite procurar as frases no arquivo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { montarLaudoPdf } from '../src/lib/laudoEmPdf.js';
import { rastroDa, comFalha } from '../src/lib/rastroDaComprovacao.js';

const AGORA = new Date('2026-09-10T17:22:00Z');
// ⚠️ O PDF escapa `(`, `)` e `\` dentro das strings — é a sintaxe do formato.
// Sem desfazer isso, procurar por "1 aceita(s)" no arquivo NUNCA acha, e a
// assertiva vira um teste que só sabe falhar. Aqui o texto volta ao que a
// pessoa lê na tela.
const texto = (doc) => Buffer.from(doc.output('arraybuffer')).toString('latin1').replace(/\\([()\\])/g, '$1');

const DIA_DA_IARA = [
  { id: 't1', user_id: 'iara', data: '2026-09-10', hora: '05:30', titulo: 'Ritual do Amanhecer', feito: false,
    comprovacao: { tipo: 'ritual', status: 'reprovada', valido: false, quando: '2026-09-10T08:34:12.000Z',
      veredito_ia: { motivo: 'Ritual perdido' },
      ...rastroDa({ tempoTelaS: 300, falhas: comFalha([], { o_que: 'video', erro: 'HTTP 413' }) }) } },
  { id: 't2', user_id: 'iara', data: '2026-09-10', hora: '09:00', titulo: 'Prospeccao ativa', feito: true,
    comprovacao: { tipo: 'instagram', status: 'aprovada_ia', valido: true, quando: '2026-09-10T12:04:00.000Z', ...rastroDa({ tempoTelaS: 180 }) } },
];

const laudoDaIara = () => montarLaudoPdf({ itens: DIA_DA_IARA, data: '2026-09-10', pessoaId: 'iara', nome: 'Iara', agora: AGORA });

test('o PDF sai de pé: monta, tem nome com data e vira bytes de PDF', () => {
  const { doc, arquivo } = laudoDaIara();
  assert.equal(arquivo, 'laudo-2026-09-10-iara.pdf');
  const buf = Buffer.from(doc.output('arraybuffer'));
  assert.equal(buf.subarray(0, 5).toString(), '%PDF-', 'não é um PDF');
  assert.ok(buf.length > 2000, 'o arquivo saiu vazio demais pra ter conteúdo');
});

test('🔴 A DEFESA DA IARA CHEGA IMPRESSA — o 413 e a hora com segundos', () => {
  // O laudo só presta se o papel disser o que o log da Vercel sabia e ninguém
  // lia. Sem estes dois, o PDF imprime "reprovada — ritual perdido" e quem
  // recebe conclui mal uso, que foi o que quase aconteceu de verdade.
  const t = texto(laudoDaIara().doc);
  assert.ok(t.includes('HTTP 413'), 'o erro técnico não foi impresso — o laudo voltou a acusar sem prova');
  // O que a pessoa reclamou tem que dar pra achar no papel: qual tarefa e o
  // que o sistema alegou. Sem o título e o motivo, o laudo é uma tabela de
  // horários — não dá pra cruzar com a reclamação de ninguém.
  assert.ok(t.includes('Ritual do Amanhecer'), 'sumiu o título da entrega — não dá pra saber de qual tarefa o laudo fala');
  assert.ok(t.includes('Ritual perdido'), 'sumiu o motivo alegado — o laudo não mostra mais o que o sistema disse');
  assert.ok(t.includes('05:34:12'), 'sumiram os segundos, e com eles a diferença entre perder e não perder o prazo');
  assert.ok(t.includes('falha t'), 'o veredito de falha técnica não chegou ao papel');
});

test('🔴 O AVISO ESTÁ EM TODA PÁGINA, não só na capa', () => {
  // PDF é lido em pedaço e fotografado numa página só. Se o aviso morasse na
  // capa, a folha que chega sozinha no grupo chegaria sem ele — e uma página
  // solta de laudo sem ressalva é exatamente uma sentença.
  const muitas = Array.from({ length: 40 }, (_, i) => ({
    id: `x${i}`, user_id: 'iara', data: '2026-09-10', hora: '09:00', titulo: `Entrega numero ${i}`, feito: true,
    comprovacao: { status: 'aprovada_ia', valido: true, quando: '2026-09-10T12:00:00.000Z', veredito_ia: { motivo: 'ok' }, ...rastroDa({ tempoTelaS: 120 }) },
  }));
  const { doc } = montarLaudoPdf({ itens: muitas, data: '2026-09-10', nome: 'Iara', agora: AGORA });
  const paginas = doc.internal.getNumberOfPages();
  assert.ok(paginas > 1, 'premissa: 40 entregas têm que virar mais de uma página');
  const t = texto(doc);
  const quantos = t.split('aponta onde olhar').length - 1;
  assert.equal(quantos, paginas, `o aviso apareceu ${quantos}x em ${paginas} páginas`);
  assert.ok(t.includes(`de ${paginas}`), 'a numeração de páginas não fecha com o total');
});

test('⚠️ o registro SEM RASTRO diz que não sabe, no papel', () => {
  const { doc } = montarLaudoPdf({
    itens: [{ titulo: 'Aprendizado', feito: false, comprovacao: { status: 'reprovada', veredito_ia: { motivo: 'curto demais' } } }],
    data: '2026-09-10', nome: 'Alguem', agora: AGORA,
  });
  const t = texto(doc);
  assert.ok(t.includes('sem rastro t'), 'a linha técnica saiu em branco — em branco se lê como "nada de anormal"');
  assert.ok(t.includes('anterior a 10/09/2026'), 'o papel não diz de quando é o silêncio');
});

test('🔴 o PDF nunca imprime a palavra que ele existe pra evitar', () => {
  // "mal uso" só pode aparecer dentro da frase que NEGA ("NÃO é mal uso").
  // Qualquer outra ocorrência seria o laudo dando o veredito que não é dele.
  const t = texto(laudoDaIara().doc);
  const ocorrencias = t.split('mal uso').length - 1;
  const negacoes = t.split(/N[ÃA]O é mal uso/).length - 1;   // sem grupo de captura: `split` devolveria a captura junto e inflaria a conta
  // ⚠️ premissa: sem ela o teste passaria VERDE no dia em que a frase
  // quebrasse de linha no meio de "mal uso" — 0 igual a 0, provando nada.
  assert.ok(ocorrencias >= 1, 'premissa: o veredito de falha técnica tem que estar no papel');
  assert.equal(ocorrencias, negacoes, 'apareceu "mal uso" fora da frase que nega — o laudo virou acusação');
  assert.ok(!/culpad|culpa d/i.test(t), 'o laudo passou a falar em culpa');
});

test('🔴 O PLACAR E O STATUS, os dois no papel — o caso da Elenice', () => {
  // 10/09, real: comprovação "reprovada" com `feito: true`. O motor do X-GAME
  // conta `feito`, então ela NÃO perdeu o dia. Um laudo que imprimisse só o
  // status faria o gestor "consertar" o que já estava certo — e o conserto
  // dele é escrever no banco.
  const { doc } = montarLaudoPdf({
    itens: [
      { titulo: 'Ritual', feito: true, hora: '05:30', comprovacao: { status: 'reprovada', quando: '2026-09-10T08:20:00.000Z', ...rastroDa({ tempoTelaS: 400 }) } },
      { titulo: 'Prospeccao', feito: true, hora: '09:00', comprovacao: { status: 'aprovada_ia', valido: true, quando: '2026-09-10T12:00:00.000Z', ...rastroDa({ tempoTelaS: 200 }) } },
    ],
    data: '2026-09-10', nome: 'Elenice', agora: AGORA,
  });
  const t = texto(doc);
  assert.ok(t.includes('apesar do status'), 'sumiu o aviso de que a entrega conta no placar mesmo reprovada');
  // O resumo imprime as DUAS contas justamente porque elas divergem aqui:
  // 1 aceita, 1 negada, mas 2 contam como feitas.
  assert.ok(t.includes('1 aceita(s)'), 'o resumo parou de imprimir a conta de aceitas');
  assert.ok(t.includes('1 negada(s)'), 'o resumo parou de imprimir a conta de negadas');
  assert.ok(t.includes('2 conta(m) como feita(s)'), 'o resumo escondeu a conta do placar — que é onde as duas divergem');
});

test('⚠️ dia vazio ainda gera um PDF que se explica', () => {
  const { doc, arquivo } = montarLaudoPdf({ itens: [], data: '2026-09-10', nome: 'Ninguem', agora: AGORA });
  assert.equal(arquivo, 'laudo-2026-09-10-ninguem.pdf');
  const t = texto(doc);
  // ⚠️ a frase precisa ser a da LISTA de entregas, não a do veredito: as duas
  // começam igual, e conferir só o começo deixava passar o sumiço da lista.
  assert.ok(t.includes('registrada neste dia'), 'a lista de entregas ficou muda no dia vazio');
  assert.ok(t.includes('Nenhuma comprova'), 'o dia vazio saiu como uma folha muda');
  assert.ok(t.includes('aponta onde olhar'), 'até a folha vazia precisa do aviso');
});

test('⚠️ o motor do PDF não fala com o banco nem decide conteúdo', () => {
  // Ele recebe o que a tela já tem na mão. Se um dia buscar sozinho, passa a
  // poder mostrar dado de gente que quem abriu não podia ver — e a permissão
  // (Fase 3) mora na tela, não aqui.
  const fonte = readFileSync(new URL('../src/lib/laudoEmPdf.js', import.meta.url), 'utf8');
  assert.ok(!/supabase|fetch\(|await /i.test(fonte), 'o gerador do PDF passou a buscar dado sozinho');
});
