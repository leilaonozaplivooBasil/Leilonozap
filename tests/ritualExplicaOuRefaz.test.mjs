// 🗣️ 16/09/2026 — EXPLICAR OU REFAZER.
//
// Ordem do dono: "sempre que reprovar ou for parcial, deve vir NA HORA um texto
// pedindo pra contextualizar (se explicar), e se seguir em dúvida, avisa e pede
// pra refazer (garantindo que a pessoa consiga refazer a etapa da dúvida com
// certeza)".
//
// ⚠️ ISTO REVERTE A DIR-89 DENTRO DO RITUAL: lá, dúvida que sobrava depois da
// explicação virava aprovação. Aqui vira pedido de refazer. Fora do ritual,
// `decisaoAposIA` continua com a régua antiga — e há teste disso aqui.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  passoDoBlocoJulgado, recadoDoBloco, blocosQuePedemAtencao, semBloco,
  podeRefazerBloco, proximoBloco, blocosFeitos,
} from '../src/lib/ritualEmBlocos.js';
import { decisaoAposIA } from '../src/lib/xgameValidacao.js';

const semComentarios = (f) => f.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const ler = (c) => semComentarios(readFileSync(new URL(`../${c}`, import.meta.url), 'utf8'));
const CRM = ler('src/components/licensing/CentralVendas/CrmMetodo.jsx');
const TELA = ler('src/components/licensing/CentralVendas/XGameRitualAmanhecer.jsx');
const PROMPT = readFileSync(new URL('../api/functions/xgameValidarPrint.js', import.meta.url), 'utf8');

const comVeredito = (bloco, veredito) => ({
  tipo: 'ritual', aberto_dia: '2026-09-16',
  blocos: {
    acordei: { quando: '2026-09-16T09:01:00Z', print_url: 'u' },
    gratidao: { quando: '2026-09-16T09:03:00Z' },
    visualizacao: { quando: '2026-09-16T09:06:00Z', video_path: 'v' },
    ...(bloco ? { [bloco]: { quando: '2026-09-16T09:06:00Z', video_path: 'v', print_url: 'u', veredito_ia: veredito } } : {}),
  },
});

// ─── a régua ───────────────────────────────────────────────────────────────

test('aprovada não pede nada', () => {
  assert.equal(passoDoBlocoJulgado({ veredito: 'aprovada' }), 'nada');
});

test('reprovada pede REFAZER direto — não adianta explicar imagem errada', () => {
  assert.equal(passoDoBlocoJulgado({ veredito: 'reprovada' }), 'refazer');
});

test('primeira dúvida pede EXPLICAR, com ou sem pergunta da IA', () => {
  assert.equal(passoDoBlocoJulgado({ veredito: 'duvida', pergunta_para_pessoa: 'em que cômodo?' }), 'explicar');
  // o dono pediu que o texto venha SEMPRE, não só quando a IA soube perguntar
  assert.equal(passoDoBlocoJulgado({ veredito: 'duvida' }), 'explicar');
});

test('🔴 dúvida que SOBREVIVE à explicação pede REFAZER (reverte a DIR-89 no ritual)', () => {
  assert.equal(passoDoBlocoJulgado({ veredito: 'duvida', explicou: true }), 'refazer');
});

test('fora do ritual, a DIR-89 continua valendo — dúvida residual aprova', () => {
  const d = decisaoAposIA({ veredito: 'duvida', motivo: 'x' }, { tentativa: 2 });
  assert.equal(d.acao, 'aprovar', 'a régua do resto do sistema foi alterada sem querer');
});

test('IA fora do ar não pede nada — ela nem olhou a imagem', () => {
  assert.equal(passoDoBlocoJulgado({ veredito: 'duvida', ia_indisponivel: true }), 'nada');
  assert.equal(passoDoBlocoJulgado({ veredito: 'reprovada', ia_indisponivel: true }), 'nada');
  assert.equal(passoDoBlocoJulgado(null), 'nada');
});

// ─── o recado ──────────────────────────────────────────────────────────────

test('o recado de dúvida usa a pergunta da IA quando existe', () => {
  const r = recadoDoBloco('visualizacao', { veredito: 'duvida', pergunta_para_pessoa: 'em que cômodo você estava?' });
  assert.equal(r.passo, 'explicar');
  assert.equal(r.texto, 'em que cômodo você estava?');
});

test('sem pergunta, o recado pede o contexto assim mesmo', () => {
  const r = recadoDoBloco('acordei', { veredito: 'duvida' });
  assert.match(r.texto, /me explica/i);
});

test('o recado de refazer promete que o resto continua salvo', () => {
  const r = recadoDoBloco('visualizacao', { veredito: 'reprovada', motivo: 'ambiente' });
  assert.equal(r.passo, 'refazer');
  assert.match(r.texto, /resto do seu ritual continua salvo/);
  assert.equal(r.motivo, 'ambiente');
});

test('bloco aprovado não vira recado', () => {
  assert.equal(recadoDoBloco('acordei', { veredito: 'aprovada' }), null);
});

test('a lista sai na ordem do ritual, não na ordem do objeto', () => {
  // 🔴 os blocos são INSERIDOS ao contrário de propósito: se a função varrer
  // `Object.keys` em vez de `BLOCOS`, ela devolve na ordem errada — e foi
  // exatamente essa mutação que sobreviveu quando o caso tinha a ordem certa.
  const c = { tipo: 'ritual', blocos: {} };
  c.blocos.visualizacao = { quando: 'z', veredito_ia: { veredito: 'reprovada' } };
  c.blocos.gratidao = { quando: 'y' };
  c.blocos.acordei = { quando: 'x', veredito_ia: { veredito: 'duvida' } };
  assert.deepEqual(Object.keys(c.blocos), ['visualizacao', 'gratidao', 'acordei'], 'premissa: inserido ao contrário');
  assert.deepEqual(blocosQuePedemAtencao(c).map((r) => r.bloco), ['acordei', 'visualizacao']);
});

// ─── refazer de verdade ────────────────────────────────────────────────────

test('🔴 tirar o bloco é o que DEVOLVE a pessoa pra ele', () => {
  const c = comVeredito('visualizacao', { veredito: 'reprovada' });
  assert.equal(proximoBloco(c), null, 'premissa: com os três blocos não falta nada');
  const depois = semBloco(c, 'visualizacao');
  assert.equal(proximoBloco(depois), 'visualizacao');
  // e os outros dois continuam em casa — é a promessa do dono
  assert.deepEqual(blocosFeitos(depois), ['acordei', 'gratidao']);
});

test('tirar um bloco não estraga a comprovação nem mexe nos outros', () => {
  const c = comVeredito(null);
  const depois = semBloco(c, 'gratidao');
  assert.equal(depois.tipo, 'ritual');
  assert.equal(depois.blocos.acordei.print_url, 'u');
  assert.equal(c.blocos.gratidao !== undefined, true, 'a original foi mutada');
});

test('só quem está em `refazer` pode refazer', () => {
  assert.equal(podeRefazerBloco(comVeredito('visualizacao', { veredito: 'reprovada' }), 'visualizacao'), true);
  assert.equal(podeRefazerBloco(comVeredito('visualizacao', { veredito: 'duvida', explicou: true }), 'visualizacao'), true);
  assert.equal(podeRefazerBloco(comVeredito('visualizacao', { veredito: 'duvida' }), 'visualizacao'), false);
  assert.equal(podeRefazerBloco(comVeredito('visualizacao', { veredito: 'aprovada' }), 'visualizacao'), false);
});

// ─── a fiação ──────────────────────────────────────────────────────────────

test('o painel aparece NA HORA, fora de qualquer passo', () => {
  // 🔴 comparar índices não serve: pôr `passo === P.FECHAMENTO &&` na frente
  // não muda a posição no arquivo. O que vale é a LINHA não ter guarda de passo.
  const linha = TELA.split('\n').find((l) => l.includes('blocosQuePedemAtencao(comprovacao).map'));
  assert.ok(linha, 'sumiu o painel do que a IA pediu');
  assert.ok(!/passo ===/.test(linha), `o painel voltou pra dentro de um passo: ${linha.trim()}`);
  const i = TELA.indexOf('blocosQuePedemAtencao(comprovacao).map');
  const j = TELA.indexOf('{passo === P.ABERTURA && (');
  assert.ok(i > 0 && j > i, 'o painel saiu de cima de tudo');
});

test('a segunda análise manda a explicação e diz que é a segunda rodada', () => {
  // 🔴 olhar o arquivo inteiro NÃO serve: `avaliarComIA` (o fluxo normal de
  // comprovação) já tinha `justificativa, tentativa: 2` desde a DIR-84, e a
  // asserção casava com ELE — tirar a linha do ritual passava batido.
  const i = CRM.indexOf('const explicarBlocoDoRitual');
  const f = CRM.indexOf('const refazerBlocoDoRitual');
  assert.ok(i > 0 && f > i, 'premissa: a segunda análise do ritual existe');
  const trecho = CRM.slice(i, f);
  assert.match(trecho, /justificativa, tentativa: 2/);
  assert.match(trecho, /explicou: true, justificativa/);
});

test('a segunda análise do "acordei" usa o print guardado', () => {
  assert.match(CRM, /if \(bloco === 'acordei' && doBloco\.print_url\) corpoDaImagem = \{ image_url: doBloco\.print_url \}/);
});

test('🔴 sem imagem pra rever, a saída é refazer — nunca inventar aprovação', () => {
  // o frame da visualização não vira arquivo: se a tela foi fechada, ele sumiu
  const i = CRM.indexOf('if (!corpoDaImagem) {');
  assert.ok(i > 0, 'sumiu o ramo de "não tenho imagem pra rever"');
  const trecho = CRM.slice(i, i + 400);
  // `marcar` é quem carimba `explicou: true`, e é isso que faz a régua cair em
  // refazer — o ramo tem que passar por ela, não escrever o veredito na mão.
  assert.match(trecho, /return marcar\(/, 'o ramo parou de passar por `marcar`');
  assert.ok(!/veredito: 'aprovada'/.test(trecho), 'passou a aprovar sem ver imagem');
  assert.match(CRM, /veredito_ia: \{ \.\.\.veredito, explicou: true, justificativa \}/,
    '`marcar` parou de carimbar que a pessoa já explicou');
  // e a régua, de fato, manda refazer nesse estado
  assert.equal(passoDoBlocoJulgado({ veredito: 'duvida', explicou: true }), 'refazer');
});

test('refazer volta o ritual pra "em andamento" e tira o ✓', () => {
  assert.match(CRM, /status: 'ritual_em_andamento',\s*\n\s*valido: false,\s*\n\s*refeitos:/);
  assert.match(CRM, /update\(t\.id, \{ feito: false, comprovacao: nova \}\)/);
});

test('refazer deixa rastro de quantas vezes — o laudo precisa ver a segunda entrega', () => {
  assert.match(CRM, /refeitos: \{ \.\.\.\(atual\.refeitos \|\| \{\}\), \[bloco\]: \(atual\.refeitos\?\.\[bloco\] \|\| 0\) \+ 1 \}/);
});

test('a tela limpa o que estava na mão antes de devolver pro bloco', () => {
  assert.match(TELA, /if \(bloco === 'visualizacao'\) \{ setVideoBlob\(null\); setFrameBlob\(null\);/);
  assert.match(TELA, /setPasso\(PASSO_DO_BLOCO\[bloco\]\)/);
});

test('o frame da segunda análise vem da MEMÓRIA da tela, não do cofre', () => {
  assert.match(TELA, /onExplicar\?\.\(bloco, texto, \{ frameBlob \}\)/);
  assert.match(CRM, /bloco === 'visualizacao' && frameBlob/);
});

// ─── o prompt ──────────────────────────────────────────────────────────────

test('🔴 pessoa errada na foto é REPROVAÇÃO, não dúvida', () => {
  assert.match(PROMPT, /PESSOA ERRADA NA FOTO É REPROVAÇÃO, NÃO DÚVIDA/);
  // e nas duas réguas que julgam imagem de gente
  assert.match(PROMPT, /quem aparece no frame CLARAMENTE não é a pessoa da tarefa/);
  assert.match(PROMPT, /foto for claramente de OUTRA PESSOA no lugar de quem fez a tarefa/);
});

test('a régua de não punir imagem ruim continua de pé', () => {
  assert.match(PROMPT, /não puna a falta de contexto visual como se fosse má-fé/);
});
