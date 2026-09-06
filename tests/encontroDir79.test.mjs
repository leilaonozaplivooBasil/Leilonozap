import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ancoraDoEncontro, semanaVizinha, distanciaEmDias, seloDaData,
  nomeNaSala, funcaoConferida, descartesDoRoteiro, normalizarRoteiro,
  normalizarTreinamento, temTreinamento, materialEhLink, treinamentoDoTexto,
  slidesDoEncontro, promptDoRoteiro,
} from '../src/lib/encontro.js';
import { faseDoMes } from '../src/lib/documentoOficial.js';
import { segundaDaSemana } from '../src/lib/xperformance.js';

// ─── A ÂNCORA DA SEMANA ──────────────────────────────────────────────────────
// 06/09/2026 é DOMINGO; 07/09 é a segunda seguinte.

test('num domingo a tela abre na segunda DE AMANHÃ, não na que já passou', () => {
  assert.equal(ancoraDoEncontro('2026-09-06'), '2026-09-07');
  assert.notEqual(ancoraDoEncontro('2026-09-06'), segundaDaSemana('2026-09-06'));
});

test('na própria segunda, a âncora é HOJE — o dia do encontro segue sendo o dia', () => {
  assert.equal(ancoraDoEncontro('2026-09-07'), '2026-09-07');
});

test('na terça já aponta pra segunda seguinte — é a que se prepara', () => {
  assert.equal(ancoraDoEncontro('2026-09-08'), '2026-09-14');
});

test('o "fora do ciclo oficial" era FILHO da âncora errada, não um defeito à parte', () => {
  // a âncora velha caía em agosto, que não existe no Ciclo Executivo (começa 2026-09)
  assert.equal(faseDoMes(segundaDaSemana('2026-09-06').slice(0, 7)), null);
  // a âncora nova cai em setembro, e a fase aparece sozinha
  const fase = faseDoMes(ancoraDoEncontro('2026-09-06').slice(0, 7));
  assert.ok(fase, 'a âncora certa tem que cair dentro do ciclo');
  assert.equal(fase.fase, 'Estruturação');
});

test('dá pra andar pra trás — senão a segunda que passou ficaria inalcançável', () => {
  assert.equal(semanaVizinha('2026-09-07', -1), '2026-08-31');
  assert.equal(semanaVizinha('2026-09-07', 1), '2026-09-14');
  // duas semanas pra trás, andando de uma em uma
  assert.equal(semanaVizinha(semanaVizinha('2026-09-07', -1), -1), '2026-08-24');
});

test('data inválida não quebra a navegação', () => {
  assert.equal(semanaVizinha('banana', -1), null);
  assert.equal(distanciaEmDias('banana', '2026-09-06'), null);
  assert.equal(seloDaData('banana', '2026-09-06'), null);
});

test('o selo diz o que a pessoa precisa saber, e só', () => {
  assert.equal(seloDaData('2026-09-07', '2026-09-07').texto, 'é hoje');
  assert.equal(seloDaData('2026-09-07', '2026-09-06').texto, 'é amanhã');
  assert.equal(seloDaData('2026-09-14', '2026-09-06').texto, 'em 8 dias');
  assert.equal(seloDaData('2026-08-31', '2026-09-01').texto, 'foi ontem');
  assert.equal(seloDaData('2026-08-31', '2026-09-06').texto, 'há 6 dias');
});

test('"é hoje" é verde e o passado é apagado — a cor também informa', () => {
  assert.equal(seloDaData('2026-09-07', '2026-09-07').tom, 'agora');
  assert.equal(seloDaData('2026-09-07', '2026-09-06').tom, 'perto');
  assert.equal(seloDaData('2026-08-31', '2026-09-06').tom, 'passado');
});

// ─── A IA PRESA NOS FATOS ────────────────────────────────────────────────────

const SALA = [{ nome: 'Aline Ferreira' }, { nome: 'Luiz Santanna' }, { nome: 'Paulo Luciano' }];

test('nome que NÃO está na sala é descartado — é isso que mata a alucinação', () => {
  assert.equal(nomeNaSala('Fulano de Tal', SALA), null);
  assert.equal(nomeNaSala('Roberto', SALA), null);
});

test('casa pelo primeiro nome, porque a IA escreve "Aline" e a lista diz "Aline Ferreira"', () => {
  assert.equal(nomeNaSala('Aline', SALA), 'Aline Ferreira');
});

test('quem manda no nome é o CADASTRO, não como a IA escreveu', () => {
  assert.equal(nomeNaSala('ALINE FERREIRA', SALA), 'Aline Ferreira');
  assert.equal(nomeNaSala('aline', SALA), 'Aline Ferreira');
});

test('sala vazia não vira passe livre: sem lista, nenhum nome passa', () => {
  assert.equal(nomeNaSala('Aline', []), null);
  assert.equal(nomeNaSala('Aline', undefined), null);
  assert.equal(nomeNaSala('', SALA), null);
});

test('função só vale se for cargo oficial da casa', () => {
  assert.equal(funcaoConferida('CFO'), 'cfo');
  assert.equal(funcaoConferida('logistica'), 'logistica');
  assert.equal(funcaoConferida('xpto'), null);
  assert.equal(funcaoConferida(''), null);
});

test('o roteiro normalizado NÃO carrega gente inventada', () => {
  const bruto = { tema: 'x', reuniao: { topicos: [
    { titulo: 'Meta de compra', apresentador: 'Fulano de Tal', responsavel_funcao: 'xpto', minutos: 60 },
    { titulo: 'Financeiro', apresentador: 'Aline', responsavel_funcao: 'cfo', minutos: 60 },
  ] } };
  const r = normalizarRoteiro(bruto, { time: SALA, mes: '2026-09' });
  assert.equal(r.reuniao.topicos[0].apresentador, null, 'inventado tinha que virar nulo');
  assert.notEqual(r.reuniao.topicos[0].responsavel_funcao, 'xpto', 'função inventada não pode passar');
  assert.equal(r.reuniao.topicos[1].apresentador, 'Aline Ferreira', 'quem existe tem que ficar');
});

test('a tela consegue AVISAR o que foi descartado — silêncio é o que faz passar por verdade', () => {
  const bruto = { reuniao: { topicos: [
    { titulo: 'a', apresentador: 'Fulano de Tal', responsavel_funcao: 'xpto' },
    { titulo: 'b', apresentador: 'Aline', responsavel_funcao: 'cfo' },
  ] } };
  const d = descartesDoRoteiro(bruto, { time: SALA });
  assert.deepEqual(d.nomes, ['Fulano de Tal']);
  assert.deepEqual(d.funcoes, ['xpto']);
});

test('sem invenção, não há aviso (a tela não pode gritar à toa)', () => {
  const d = descartesDoRoteiro({ reuniao: { topicos: [{ titulo: 'a', apresentador: 'Aline', responsavel_funcao: 'cfo' }] } }, { time: SALA });
  assert.equal(d.nomes.length, 0);
  assert.equal(d.funcoes.length, 0);
});

test('o prompt PROÍBE inventar número — a raiz da alucinação', () => {
  const p = promptDoRoteiro({ pautas: ['Aline fala do financeiro'], mes: '2026-09', time: SALA });
  assert.match(p, /PROIBIDO INVENTAR/);
  assert.match(p, /N[ÃA]O invente n[úu]meros/i);
});

// ─── O TREINAMENTO ───────────────────────────────────────────────────────────

test('nome de quem treina, sozinho, NÃO é treinamento', () => {
  assert.equal(temTreinamento(normalizarTreinamento({}, { por: 'Aline' })), false);
  assert.equal(temTreinamento(null), false);
});

test('título, material ou passos — qualquer um já é treinamento de verdade', () => {
  assert.equal(temTreinamento({ titulo: 'Script' }), true);
  assert.equal(temTreinamento({ material: 'https://x.com/a' }), true);
  assert.equal(temTreinamento({ passos: ['abrir'] }), true);
});

test('importar de texto colado: 1ª linha é o título, link vira material, resto vira passo', () => {
  const t = treinamentoDoTexto('Script de abordagem\nhttps://drive.google.com/a\n1. Abrir com pergunta\n2. Escutar 2 min');
  assert.equal(t.titulo, 'Script de abordagem');
  assert.equal(t.material, 'https://drive.google.com/a');
  assert.deepEqual(t.passos, ['Abrir com pergunta', 'Escutar 2 min']);
});

test('texto vazio não inventa treinamento', () => {
  assert.equal(temTreinamento(treinamentoDoTexto('   \n  \n')), false);
});

test('link é reconhecido como link, texto colado não', () => {
  assert.equal(materialEhLink('https://x.com/a'), true);
  assert.equal(materialEhLink('abrir com uma pergunta'), false);
});

test('o slide do Apresentar usa o treinamento GRAVADO, não o que a IA rascunhou', () => {
  const comIA = slidesDoEncontro({ mes: '2026-09', treinamentoPor: 'Aline' }).find((x) => x.id === 'treinamento');
  const comMaterial = slidesDoEncontro({
    mes: '2026-09', treinamentoPor: 'Aline',
    treinamento: { titulo: 'Script de abordagem', material: 'https://x.com/a', passos: ['Abrir', 'Escutar'] },
  }).find((x) => x.id === 'treinamento');
  assert.equal(comMaterial.titulo, 'Script de abordagem');
  assert.notEqual(comMaterial.titulo, comIA.titulo, 'o gravado tem que vencer o rascunho da IA');
  assert.ok(comMaterial.corpo.includes('https://x.com/a'));
});

test('sem treinamento gravado, o Apresentar continua funcionando como antes', () => {
  const s = slidesDoEncontro({ mes: '2026-09', treinamentoPor: 'Aline' }).find((x) => x.id === 'treinamento');
  assert.ok(s, 'o slide não pode sumir');
  assert.match(s.sub, /45 minutos/);
});

test('os passos têm teto — treinamento colado gigante não estoura o slide', () => {
  const muitos = Array.from({ length: 30 }, (_, i) => `passo ${i}`);
  assert.equal(normalizarTreinamento({ passos: muitos }).passos.length, 12);
});

// ─── achado pela PROVA em navegador: sala vazia apagava nome legítimo ────────

test('sala DESCONHECIDA (lista vazia) não apaga nome nenhum — não sei ≠ não tem', () => {
  const bruto = { reuniao: { topicos: [{ titulo: 'a', apresentador: 'Luiz Santanna', minutos: 120 }] } };
  const r = normalizarRoteiro(bruto, { time: [], mes: '2026-09' });
  assert.equal(r.reuniao.topicos[0].apresentador, 'Luiz Santanna',
    'sem lista pra conferir, apagar o nome é pior que o defeito');
});

test('e sem lista a tela não pode alegar que descartou alguém', () => {
  const d = descartesDoRoteiro({ reuniao: { topicos: [{ titulo: 'a', apresentador: 'Qualquer Um' }] } }, { time: [] });
  assert.equal(d.nomes.length, 0);
});

test('com lista, a conferência volta a valer', () => {
  const d = descartesDoRoteiro({ reuniao: { topicos: [{ titulo: 'a', apresentador: 'Qualquer Um' }] } }, { time: SALA });
  assert.deepEqual(d.nomes, ['Qualquer Um']);
});
