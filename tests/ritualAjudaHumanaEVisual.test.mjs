// 🆘🎨 21/09/2026 — "APLICAR TUDO QUE TEM QUE APLICAR, DE FORMA DILIGENTE".
//
// Depois da auditoria do ritual (Sophia, 9 anos, 11 tentativas num só dia, 22
// no dia 17/09), o dono pediu, na sequência, quatro coisas:
//
//   1. Uma saída pra quem trava sozinha num loop de refazer — pedir ajuda a
//      um gestor, sem perder o direito de tentar de novo.
//   2. O painel de "precisa refazer/explicar" com um selo "Leia com atenção"
//      e o texto real da IA numa caixa clara e em negrito — "senão a pessoa
//      não lê".
//   3. A régua da IA revisada: pessoa real e visível não pode ser reprovada
//      só por falta de certeza absoluta de identidade (foi exatamente o que
//      pegou a Sophia hoje — a própria IA descreveu "uma criança sorrindo,
//      em pé", e mesmo assim reprovou).
//   4. Câmera da visualização maior (era um círculo de 160×160px) e uma barra
//      visual que não some depois dos primeiros 120s de gravação.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  REFAZER_ANTES_DE_AJUDA, precisaDeAjudaHumana, ajudaJaPedida, recadoDoBloco, blocosQuePedemAtencao,
} from '../src/lib/ritualEmBlocos.js';

const ler = (c) => semComentarios(readFileSync(new URL(`../${c}`, import.meta.url), 'utf8'));
const CRM = ler('src/components/licensing/CentralVendas/CrmMetodo.jsx');
const TELA = ler('src/components/licensing/CentralVendas/XGameRitualAmanhecer.jsx');
const PROMPT = readFileSync(new URL('../api/functions/xgameValidarPrint.js', import.meta.url), 'utf8');

// ─── a régua pura ────────────────────────────────────────────────────────

test('REFAZER_ANTES_DE_AJUDA é 3 — a Sophia bateu 11 e 22, não é cedo demais oferecer ajuda', () => {
  assert.equal(REFAZER_ANTES_DE_AJUDA, 3);
});

test('precisaDeAjudaHumana só liga depois do limite de refeitos NESTE bloco', () => {
  assert.equal(precisaDeAjudaHumana({ refeitos: { acordei: 2 } }, 'acordei'), false);
  assert.equal(precisaDeAjudaHumana({ refeitos: { acordei: 3 } }, 'acordei'), true);
  assert.equal(precisaDeAjudaHumana({ refeitos: { acordei: 11 } }, 'acordei'), true, 'caso real da Sophia hoje');
  // outro bloco não empresta a contagem
  assert.equal(precisaDeAjudaHumana({ refeitos: { visualizacao: 5 } }, 'acordei'), false);
  assert.equal(precisaDeAjudaHumana(null, 'acordei'), false);
});

test('ajudaJaPedida lê o carimbo por bloco', () => {
  const c = { ajuda_solicitada: { acordei: '2026-09-21T10:00:00Z' } };
  assert.equal(ajudaJaPedida(c, 'acordei'), true);
  assert.equal(ajudaJaPedida(c, 'visualizacao'), false);
  assert.equal(ajudaJaPedida(null, 'acordei'), false);
});

test('recadoDoBloco: sem passar de refeitos, o refazer continua exatamente como sempre foi', () => {
  const r = recadoDoBloco('acordei', { veredito: 'reprovada', motivo: 'x' });
  assert.equal(r.passo, 'refazer');
  assert.equal(r.podePedirAjuda, undefined);
  assert.equal(r.ajudaPedida, undefined);
  assert.match(r.titulo, /precisa refazer/);
});

test('recadoDoBloco: passando podePedirAjuda, o texto muda e reconhece o esforço', () => {
  const r = recadoDoBloco('acordei', { veredito: 'reprovada', motivo: 'x' }, { podePedirAjuda: true });
  assert.equal(r.podePedirAjuda, true);
  assert.match(r.titulo, /já tentou bastante/);
  assert.match(r.texto, /pedir pra um gestor olhar/);
});

test('recadoDoBloco: ajudaPedida vence podePedirAjuda — depois de pedir, não oferece pedir de novo', () => {
  const r = recadoDoBloco('acordei', { veredito: 'reprovada' }, { podePedirAjuda: true, ajudaPedida: true });
  assert.equal(r.ajudaPedida, true);
  assert.equal(r.podePedirAjuda, undefined, 'não pode oferecer os dois estados ao mesmo tempo');
  assert.match(r.titulo, /pedido de ajuda enviado/);
});

test('blocosQuePedemAtencao liga sozinho o podePedirAjuda quando bate o limite, e desliga quando já pediu', () => {
  const semLimite = { tipo: 'ritual', refeitos: { acordei: 2 }, blocos: { acordei: { veredito_ia: { veredito: 'reprovada' } } } };
  assert.equal(blocosQuePedemAtencao(semLimite)[0].podePedirAjuda, undefined);

  const comLimite = { tipo: 'ritual', refeitos: { acordei: 3 }, blocos: { acordei: { veredito_ia: { veredito: 'reprovada' } } } };
  assert.equal(blocosQuePedemAtencao(comLimite)[0].podePedirAjuda, true);

  const jaPediu = { ...comLimite, ajuda_solicitada: { acordei: '2026-09-21T10:00:00Z' } };
  const r = blocosQuePedemAtencao(jaPediu)[0];
  assert.equal(r.ajudaPedida, true);
  assert.equal(r.podePedirAjuda, undefined);
});

// ─── a fiação (CrmMetodo.jsx) ───────────────────────────────────────────

test('pedirAjudaNoRitual grava o carimbo por bloco sem mexer em status/valido/feito', () => {
  const i = CRM.indexOf('const pedirAjudaNoRitual = async (t, bloco) => {');
  assert.ok(i > 0, 'premissa: o handler existe');
  const f = CRM.indexOf('const salvarAcordei', i);
  const trecho = CRM.slice(i, f > i ? f : i + 900);
  assert.match(trecho, /ajuda_solicitada: \{ \.\.\.\(atual\.ajuda_solicitada \|\| \{\}\), \[bloco\]: new Date\(\)\.toISOString\(\) \}/);
  // 🔴 não pode tocar status/valido/feito — senão o ritual sai de "em
  // andamento" (visível na fila do gestor) sem ninguém ter decidido nada
  assert.ok(!/status: 'ritual_em_andamento'/.test(trecho), 'pedirAjudaNoRitual não deveria mexer no status');
  assert.match(trecho, /update\(t\.id, \{ comprovacao: nova \}\)/);
});

test('onPedirAjuda está conectado no componente, ao lado dos outros três handlers do ritual', () => {
  const i = CRM.indexOf('onExplicar={(bloco, texto, extra) => explicarBlocoDoRitual(t, bloco, texto, extra)}');
  const trecho = CRM.slice(i, i + 300);
  assert.match(trecho, /onRefazer=\{\(bloco\) => refazerBlocoDoRitual\(t, bloco\)\}/);
  assert.match(trecho, /onPedirAjuda=\{\(bloco\) => pedirAjudaNoRitual\(t, bloco\)\}/);
});

// ─── a tela (XGameRitualAmanhecer.jsx) ──────────────────────────────────

test('o painel tem o selo "Leia com atenção", sempre visível em qualquer estado', () => {
  assert.match(TELA, /Leia com atenção/);
  assert.match(TELA, /data-teste=\{`leia-com-atencao-\$\{r\.bloco\}`\}/);
});

test('o motivo real da IA ganha caixa PRÓPRIA, clara e em negrito — não é mais texto solto e apagado', () => {
  const i = TELA.indexOf('data-teste={`leia-com-atencao-${r.bloco}`}');
  const j = TELA.indexOf('r.texto', i);
  const trecho = TELA.slice(i, j);
  assert.match(trecho, /data-teste=\{`motivo-\$\{r\.bloco\}`\}/);
  // fundo quase branco + texto escuro e em negrito: o oposto do texto
  // translúcido de antes (`text-white\/85`), que é exatamente o que o dono
  // reclamou de não conseguir ler
  assert.match(trecho, /bg-white\/95/);
  assert.match(trecho, /font-bold/);
  assert.ok(!/text-white\/85/.test(trecho), 'o motivo voltou a ser texto apagado');
});

test('cada estado do painel (refazer/dúvida/pede ajuda/ajuda pedida) tem um tom de cor PRÓPRIO', () => {
  const i = TELA.indexOf('const tom = r.ajudaPedida');
  assert.ok(i > 0, 'premissa: a régua de cores por estado existe');
  const trecho = TELA.slice(i, i + 900);
  assert.match(trecho, /bg-sky-500\/20/, 'ajuda pedida devia ter tom próprio (azul)');
  assert.match(trecho, /bg-violet-500\/20/, 'pode pedir ajuda devia ter tom próprio (violeta)');
  assert.match(trecho, /bg-red-500\/20/, 'refazer continua vermelho, mais forte que antes');
  assert.match(trecho, /bg-amber-400\/20/, 'explicar/dúvida continua âmbar, mais forte que antes');
});

test('botão "Pedir ajuda a um gestor" aparece só no estado podePedirAjuda, e chama pedirAjuda', () => {
  assert.match(TELA, /data-teste=\{`pedir-ajuda-\$\{r\.bloco\}`\}/);
  const i = TELA.indexOf('data-teste={`pedir-ajuda-${r.bloco}`}');
  const trecho = TELA.slice(Math.max(0, i - 200), i + 50);
  assert.match(trecho, /onClick=\{\(\) => pedirAjuda\(r\.bloco\)\}/);
});

test('a tela tem o handler pedirAjuda chamando onPedirAjuda e atualizando o estado local', () => {
  assert.match(TELA, /const pedirAjuda = async \(bloco\) => \{/);
  assert.match(TELA, /const nova = await onPedirAjuda\?\.\(bloco\);/);
});

test('a câmera da visualização deixou de ser um círculo de 160×160 cortado', () => {
  assert.ok(!/w-40 h-40 rounded-full/.test(TELA), 'o quadradinho cortado continua no código');
  assert.match(TELA, /videoAoVivoRef\}[^/]*className="mx-auto w-full max-w-\[300px\] aspect-\[3\/4\] rounded-3xl object-cover/);
});

test('a barra de progresso do vídeo não some depois do mínimo — continua visível até o teto de segurança', () => {
  const i = TELA.indexOf("faltaDaVisualizacao(gravSeg) === 0 && (");
  assert.ok(i > 0);
  const trecho = TELA.slice(i, i + 1100);
  assert.match(trecho, /data-teste="barra-visualizacao-extra"/);
  assert.match(trecho, /gravSeg \/ VISUALIZACAO_TETO_SEG/);
});

// ─── o prompt da IA ──────────────────────────────────────────────────────

test('🔴 pessoa real e visível, sem prova de identidade, deixou de ser reprovação automática', () => {
  // era a régua "pessoa errada = reprovação direta" batendo em cima de gente
  // real só porque não dá pra confirmar 100% quem é — exatamente o caso da
  // Sophia, cuja foto a própria IA descreveu como "criança sorrindo, em pé"
  assert.match(PROMPT, /NÃO TENHO CERTEZA ABSOLUTA DE QUEM É/);
  assert.match(PROMPT, /trate como aprovada,\s*\nmesmo sem prova de identidade/);
});

test('a régua antiga de pessoa CLARAMENTE errada continua reprovando — não virou "aprova tudo"', () => {
  assert.match(PROMPT, /PESSOA ERRADA NA FOTO É REPROVAÇÃO, NÃO DÚVIDA/);
  assert.match(PROMPT, /sinal concreto e específico de que é outra\s*\npessoa/);
});

test('imagem sem NENHUMA pessoa (grama, animal, objeto) ganhou regra própria — pergunta antes de reprovar', () => {
  assert.match(PROMPT, /SE A IMAGEM NÃO MOSTRA NENHUMA PESSOA/);
  assert.match(PROMPT, /pode ser um frame ruim de um vídeo real/);
});
